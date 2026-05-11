// sync.js — Firebase Auth + Firestore cross-device sync layer for Swiped.
//
// Mirrors every persisted localStorage key to a single per-user Firestore
// document at /users/{uid}. Local writes go up to the cloud (debounced).
// Cloud changes come back via onSnapshot, get written to localStorage, and
// then dispatched as a `swiped-state-external` event so the
// usePersistedState / useTweaks hooks in tweaks-panel.jsx can refresh.
//
// Auth: Google one-tap via signInWithRedirect (works in iOS / Android PWA
// standalone where popups are blocked) plus email magic-link as fallback.
//
// All state stays in localStorage so the app keeps working offline; the
// cloud is best-effort. Firestore offline persistence queues writes while
// disconnected and flushes when reconnected.

(function () {
  if (typeof window === 'undefined') return;

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyD9ZWGfiw0Ufw57Jv4o4f7e7oo1qCWC1kU',
    authDomain: 'swipe-planner-6ca65.firebaseapp.com',
    projectId: 'swipe-planner-6ca65',
    storageBucket: 'swipe-planner-6ca65.firebasestorage.app',
    messagingSenderId: '397713605550',
    appId: '1:397713605550:web:d93664f148a7f7f8ae3e3f',
  };

  // localStorage key → Firestore field name. Add a new entry here whenever
  // you add another persisted key; everything else is automatic.
  const SYNCED = {
    'swiped.tweaks':                  'tweaks',
    'swiped.school.semesters':        'schoolSemesters',
    'swiped.school.activeSemesterId': 'schoolActiveSemesterId',
    'swiped.weekly':                  'weekly',
    'swiped.weeklyActive':            'weeklyActive',
    'swiped.people':                  'people',
    'swiped.home':                    'home',
    'swiped.budget':                  'budget',
  };
  const LS_TO_FIELD = SYNCED;
  const FIELD_TO_LS = Object.fromEntries(Object.entries(SYNCED).map(([ls, f]) => [f, ls]));
  const PENDING_EMAIL_KEY = 'swiped.auth.pendingEmail';

  let auth = null;
  let db = null;
  let currentUser = null;
  let userDocRef = null;
  let unsubscribe = null;
  let suppressLocalUntil = 0;          // ignore swiped-state-set briefly after a remote push
  const pendingWrite = {};
  let writeTimer = null;
  let status = 'idle';                 // 'idle' | 'signing-in' | 'syncing' | 'error' | 'sent-email'
  let lastError = null;
  let lastSyncedAt = null;

  function emitStatus() {
    window.dispatchEvent(new CustomEvent('swiped-auth-change', {
      detail: { user: currentUser, status, error: lastError, lastSyncedAt },
    }));
  }

  function init() {
    if (typeof firebase === 'undefined') {
      console.warn('[swiped-sync] Firebase SDK not on window — sync disabled');
      return;
    }
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      try {
        // Persistent cache — writes queue offline, reads come from cache. The
        // synchronizeTabs flag lets us share the cache between multiple tabs
        // / PWA windows. Failure is harmless (multi-tab fallback).
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('[swiped-sync] init failed', e);
      lastError = e;
      status = 'error';
      emitStatus();
      return;
    }

    // Wire local-state listeners. usePersistedState / useTweaks both fire
    // 'swiped-state-set' on every change; we batch those up and push to
    // Firestore on a 600ms debounce.
    window.addEventListener('swiped-state-set', onLocalStateSet);
    // Cross-tab localStorage changes fire 'storage'. Treat them like local
    // state sets so writes from another tab also sync upstream.
    window.addEventListener('storage', onStorageEvent);

    // Complete email-link sign-in if the user arrived from a magic link.
    completeEmailLinkSignIn().catch(() => {});

    auth.onAuthStateChanged(handleAuthChange);

    // After signInWithRedirect bounces back, resolve the result so any
    // error surfaces. Firebase's own internal state has the user already.
    auth.getRedirectResult().catch((err) => {
      lastError = err;
      console.warn('[swiped-sync] redirect result error', err);
    });
  }

  function handleAuthChange(user) {
    currentUser = user;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (!user) {
      userDocRef = null;
      status = 'idle';
      emitStatus();
      return;
    }
    userDocRef = db.collection('users').doc(user.uid);
    status = 'syncing';
    emitStatus();

    // First-time seeding: if the user has localStorage data but no Firestore
    // doc yet, upload the local state so signing in on this device doesn't
    // wipe their work.
    userDocRef.get().then((snap) => {
      if (!snap.exists) {
        const seed = {};
        for (const lsKey of Object.keys(LS_TO_FIELD)) {
          const raw = localStorage.getItem(lsKey);
          if (raw == null) continue;
          try { seed[LS_TO_FIELD[lsKey]] = JSON.parse(raw); } catch { /* skip */ }
        }
        seed._meta = {
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        return userDocRef.set(seed);
      }
    }).catch((err) => { console.warn('[swiped-sync] seed failed', err); });

    // Subscribe to changes. Snapshots arrive both for our own writes (cheap)
    // and remote ones from other devices.
    unsubscribe = userDocRef.onSnapshot((snap) => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      suppressLocalUntil = Date.now() + 1500;
      let touched = 0;
      for (const field of Object.keys(data)) {
        if (field === '_meta') continue;
        const lsKey = FIELD_TO_LS[field];
        if (!lsKey) continue;
        const value = data[field];
        try {
          const serialized = JSON.stringify(value);
          if (localStorage.getItem(lsKey) !== serialized) {
            localStorage.setItem(lsKey, serialized);
            window.dispatchEvent(new CustomEvent('swiped-state-external', {
              detail: { key: lsKey, value },
            }));
            touched++;
          }
        } catch (e) {
          console.warn('[swiped-sync] apply failed for', lsKey, e);
        }
      }
      lastSyncedAt = Date.now();
      emitStatus();
    }, (err) => {
      console.warn('[swiped-sync] subscription error', err);
      lastError = err;
      status = 'error';
      emitStatus();
    });
  }

  function onLocalStateSet(e) {
    if (Date.now() < suppressLocalUntil) return;
    const detail = e && e.detail;
    if (!detail) return;
    const { key, value } = detail;
    if (!key || !(key in LS_TO_FIELD)) return;
    queueWrite(LS_TO_FIELD[key], value);
  }

  function onStorageEvent(e) {
    // Cross-tab change. Re-read the value and queue.
    if (!e.key || !(e.key in LS_TO_FIELD)) return;
    try {
      const raw = localStorage.getItem(e.key);
      const value = raw == null ? null : JSON.parse(raw);
      queueWrite(LS_TO_FIELD[e.key], value);
    } catch { /* ignore */ }
  }

  function queueWrite(field, value) {
    if (!currentUser || !userDocRef) return;
    pendingWrite[field] = value;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(flushWrites, 600);
  }

  function flushWrites() {
    writeTimer = null;
    if (!currentUser || !userDocRef) return;
    const keys = Object.keys(pendingWrite);
    if (keys.length === 0) return;
    const payload = {};
    for (const k of keys) payload[k] = pendingWrite[k];
    payload._meta = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    for (const k of keys) delete pendingWrite[k];
    userDocRef.set(payload, { merge: true }).catch((err) => {
      console.warn('[swiped-sync] write failed', err);
    });
  }

  // ── Sign-in helpers ────────────────────────────────────────────────────

  function signInGoogle() {
    if (!auth) return Promise.reject(new Error('Sync not initialized'));
    const provider = new firebase.auth.GoogleAuthProvider();
    status = 'signing-in';
    emitStatus();
    return auth.signInWithRedirect(provider);
  }

  function sendMagicLink(email) {
    if (!auth) return Promise.reject(new Error('Sync not initialized'));
    if (!email || !email.trim()) return Promise.reject(new Error('Email is required'));
    const settings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    };
    status = 'signing-in';
    emitStatus();
    return auth.sendSignInLinkToEmail(email.trim(), settings).then(() => {
      try { localStorage.setItem(PENDING_EMAIL_KEY, email.trim()); } catch { /* ignore */ }
      status = 'sent-email';
      emitStatus();
    }).catch((err) => {
      lastError = err;
      status = 'error';
      emitStatus();
      throw err;
    });
  }

  function completeEmailLinkSignIn() {
    if (!auth || !auth.isSignInWithEmailLink(window.location.href)) return Promise.resolve();
    let email = null;
    try { email = localStorage.getItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
    if (!email) {
      email = window.prompt('Confirm the email you used to sign in:');
    }
    if (!email) return Promise.resolve();
    return auth.signInWithEmailLink(email, window.location.href).then(() => {
      try { localStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
      // Strip the magic-link query params so refreshing doesn't try again.
      const clean = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', clean);
    }).catch((err) => {
      lastError = err;
      status = 'error';
      emitStatus();
      console.warn('[swiped-sync] magic-link sign-in failed', err);
    });
  }

  function signOut() {
    if (!auth) return Promise.resolve();
    return auth.signOut();
  }

  // Public surface — used by settings.jsx to render the sign-in UI.
  window.SwipedSync = {
    init,
    signInGoogle,
    sendMagicLink,
    signOut,
    get user() { return currentUser; },
    get status() { return status; },
    get lastSyncedAt() { return lastSyncedAt; },
  };

  // Auto-init. Firebase scripts are loaded synchronously before this one in
  // Swiped.html, so window.firebase is ready by the time we run.
  init();
})();

// sync.js — Supabase Auth + Postgres cross-device sync layer for Swiped.
//
// Mirrors every persisted localStorage key to a single per-user row in the
// `user_data` table (one big `data` jsonb column). Local writes go up to
// Supabase (debounced); cloud changes come back via a Realtime channel,
// get written to localStorage, and then dispatched as a
// `swiped-state-external` event so the usePersistedState / useTweaks
// hooks in tweaks-panel.jsx pick them up without a refresh.
//
// Auth: Google OAuth via signInWithOAuth (no third-party-cookie issues
// here — the redirect token comes back in the URL hash and is stored in
// first-party localStorage by the SDK, so iOS Safari standalone PWA
// works without any extra setup) + email magic-link as a fallback.

(function () {
  if (typeof window === 'undefined') return;

  const SUPABASE_URL = 'https://vzvhokeusirmfdphibny.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dtiuT84yho_7NDUJUyEk9Q_XXZhmGdF';

  // localStorage key → field name inside the user_data.data jsonb blob.
  // Add a new entry whenever you add another persisted key; everything
  // else (Realtime push, debounced upload, first-time seeding) follows.
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

  let client = null;
  let currentUser = null;
  let realtimeSub = null;
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
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('[swiped-sync] Supabase SDK not on window — sync disabled');
      return;
    }
    try {
      client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Detect OAuth + magic-link redirects automatically. The SDK reads
          // the token out of the URL hash, exchanges it for a session, and
          // strips the URL.
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.error('[swiped-sync] init failed', e);
      lastError = e;
      status = 'error';
      emitStatus();
      return;
    }

    // Wire local-state listeners. usePersistedState / useTweaks both fire
    // 'swiped-state-set' on every change; we batch those up and push to
    // Supabase on a 600ms debounce.
    window.addEventListener('swiped-state-set', onLocalStateSet);
    window.addEventListener('storage', onStorageEvent);

    // Subscribe to auth state changes (fires immediately with current
    // session, then on every sign-in / sign-out / token refresh).
    client.auth.onAuthStateChange((_event, session) => {
      handleAuthChange((session && session.user) || null);
    });

    // Kick off an initial getSession to settle persistSession / OAuth
    // callback resolution. onAuthStateChange will also fire for this; the
    // second call is a no-op.
    client.auth.getSession().then(({ data, error }) => {
      if (error) console.warn('[swiped-sync] getSession error', error);
      const user = data && data.session && data.session.user;
      if (user) handleAuthChange(user);
    }).catch((err) => {
      console.warn('[swiped-sync] getSession threw', err);
    });
  }

  async function handleAuthChange(user) {
    const sameUser = currentUser && user && currentUser.id === user.id;
    currentUser = user;
    if (!sameUser && realtimeSub) {
      try { await realtimeSub.unsubscribe(); } catch { /* ignore */ }
      realtimeSub = null;
    }
    if (!user) {
      status = 'idle';
      emitStatus();
      return;
    }
    if (sameUser && realtimeSub) {
      // Token refresh fired onAuthStateChange — nothing to re-sync.
      return;
    }
    status = 'syncing';
    emitStatus();

    // First-time seeding: if this user has localStorage data but no row
    // yet, upload the local state so signing in on the device you've been
    // using doesn't wipe anything. Otherwise pull the cloud data down.
    try {
      const { data: existing, error: selErr } = await client
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (selErr) {
        console.warn('[swiped-sync] initial select failed', selErr);
        lastError = selErr;
        status = 'error';
        emitStatus();
      } else if (!existing) {
        const seed = {};
        for (const lsKey of Object.keys(LS_TO_FIELD)) {
          const raw = localStorage.getItem(lsKey);
          if (raw == null) continue;
          try { seed[LS_TO_FIELD[lsKey]] = JSON.parse(raw); } catch { /* skip */ }
        }
        const { error: insErr } = await client
          .from('user_data')
          .insert({ user_id: user.id, data: seed });
        if (insErr && insErr.code !== '23505') { // 23505 = unique violation race; ignore
          console.warn('[swiped-sync] initial insert failed', insErr);
          lastError = insErr;
          status = 'error';
          emitStatus();
        }
      } else {
        applyRemoteData(existing.data || {});
      }
    } catch (e) {
      console.warn('[swiped-sync] seed/load failed', e);
    }

    // Subscribe to Realtime updates on this user's row. INSERT covers the
    // race where another tab / device created the row first; UPDATE
    // covers every subsequent edit.
    realtimeSub = client
      .channel(`user_data:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const data = (payload && payload.new && payload.new.data) || {};
        applyRemoteData(data);
      })
      .subscribe((s) => {
        // 'SUBSCRIBED' once the channel is live; anything else is in-flight.
        if (s === 'SUBSCRIBED') {
          lastSyncedAt = Date.now();
          status = 'syncing';
          emitStatus();
        }
      });
  }

  function applyRemoteData(data) {
    if (!data || typeof data !== 'object') return;
    suppressLocalUntil = Date.now() + 1500;
    for (const field of Object.keys(data)) {
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
        }
      } catch (e) {
        console.warn('[swiped-sync] apply failed for', lsKey, e);
      }
    }
    lastSyncedAt = Date.now();
    emitStatus();
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
    if (!e.key || !(e.key in LS_TO_FIELD)) return;
    try {
      const raw = localStorage.getItem(e.key);
      const value = raw == null ? null : JSON.parse(raw);
      queueWrite(LS_TO_FIELD[e.key], value);
    } catch { /* ignore */ }
  }

  function queueWrite(field, value) {
    if (!currentUser) return;
    pendingWrite[field] = value;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(flushWrites, 600);
  }

  async function flushWrites() {
    writeTimer = null;
    if (!currentUser || !client) return;
    const fields = Object.keys(pendingWrite);
    if (fields.length === 0) return;

    // Build the full data blob from the latest localStorage state and
    // overlay any pending writes (covers the case where a write landed
    // but the listener didn't fire). We send the entire object on every
    // flush — last-write-wins is fine for the data shapes here, and it's
    // simpler than per-field jsonb merges.
    const merged = {};
    for (const lsKey of Object.keys(LS_TO_FIELD)) {
      const raw = localStorage.getItem(lsKey);
      if (raw == null) continue;
      try { merged[LS_TO_FIELD[lsKey]] = JSON.parse(raw); } catch { /* skip */ }
    }
    for (const f of fields) merged[f] = pendingWrite[f];
    for (const f of fields) delete pendingWrite[f];

    try {
      const { error } = await client
        .from('user_data')
        .upsert({
          user_id: currentUser.id,
          data: merged,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) {
        console.warn('[swiped-sync] upsert failed', error);
        lastError = error;
        status = 'error';
        emitStatus();
      } else {
        lastSyncedAt = Date.now();
        emitStatus();
      }
    } catch (e) {
      console.warn('[swiped-sync] upsert threw', e);
      lastError = e;
      status = 'error';
      emitStatus();
    }
  }

  // ── Sign-in helpers ────────────────────────────────────────────────────

  async function signInGoogle() {
    if (!client) return Promise.reject(new Error('Sync not initialized'));
    status = 'signing-in';
    emitStatus();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) {
      lastError = error;
      status = 'error';
      emitStatus();
      throw error;
    }
  }

  async function sendMagicLink(email) {
    if (!client) return Promise.reject(new Error('Sync not initialized'));
    if (!email || !email.trim()) return Promise.reject(new Error('Email is required'));
    status = 'signing-in';
    emitStatus();
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
          shouldCreateUser: true,
        },
      });
      if (error) {
        lastError = error;
        status = 'error';
        emitStatus();
        throw error;
      }
      status = 'sent-email';
      emitStatus();
    } catch (e) {
      lastError = e;
      status = 'error';
      emitStatus();
      throw e;
    }
  }

  async function signOut() {
    if (!client) return;
    return client.auth.signOut();
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

  // Auto-init. Supabase script is loaded synchronously before this one in
  // Swiped.html, so window.supabase is ready by the time we run.
  init();
})();

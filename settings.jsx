// settings.jsx — In-app Settings sheet for customizing sections.
// Slides up from bottom. Rename, reorder, change icon (preset or upload),
// remove, and add new sections from the template library.

function SettingsSheet({
  open, sections, onChange, onClose, accent, tf, onResetSchoolData,
  userName, onUserName,
  icsLinks = {}, onIcsUrl,
}) {
  const [editing, setEditing] = React.useState(null); // section index being icon-edited

  const updateAt = (i, patch) => onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeAt = (i) => onChange(sections.filter((_, idx) => idx !== i));
  const moveUp = (i) => {
    if (i === 0) return;
    const next = sections.slice();
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  const moveDown = (i) => {
    if (i === sections.length - 1) return;
    const next = sections.slice();
    [next[i + 1], next[i]] = [next[i], next[i + 1]];
    onChange(next);
  };

  const addTemplate = (key) => {
    const lib = SECTION_LIB[key];
    if (!lib) return;
    const cap = key[0].toUpperCase() + key.slice(1);
    onChange([...sections, {
      id: key + '_' + Date.now(),
      name: cap, iconKey: lib.icon, contentKey: key,
    }]);
  };
  const addBlank = () => {
    onChange([...sections, {
      id: 'custom_' + Date.now(),
      name: 'New section', iconKey: 'spark', contentKey: 'work',
    }]);
  };

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(11,11,14,0.55)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#FAFAF7',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        maxHeight: '88%',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.36s cubic-bezier(.2,.7,.1,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
      }}>
        {/* grab handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(11,11,14,0.15)' }} />
        </div>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px',
        }}>
          <div>
            <div style={{
              fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
            }}>Settings</div>
            <div style={{
              fontFamily: tf.display, fontStyle: 'italic',
              fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 4,
            }}>Your wheel</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            appearance: 'none', border: 0, background: 'rgba(11,11,14,0.06)',
            width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0B0B0E',
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 9 9 2 M2 2 9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {/* sync — email + password auth via Supabase (see sync.js). */}
          <SyncSection tf={tf} accent={accent} />

          {/* Local backup — JSON export / import. Belt-and-suspenders for
              users who want a copy independent of cloud sync. */}
          <BackupSection tf={tf} accent={accent} />

          {/* user name — used for Home's "Welcome <first name>" headline */}
          {onUserName && (
            <div style={{ marginBottom: 22 }}>
              <Label tf={tf}>Your name</Label>
              <input
                value={userName || ''}
                onChange={(e) => onUserName(e.target.value)}
                placeholder="Add your name"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '0.5px solid rgba(11,11,14,0.12)',
                  background: '#fff', borderRadius: 12,
                  padding: '12px 14px', outline: 'none',
                  fontFamily: tf.family, fontSize: 15, color: '#0B0B0E',
                }}
              />
              <div style={{
                marginTop: 6, fontFamily: tf.mono, fontSize: 9.5,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(11,11,14,0.45)',
              }}>
                Shown on the Home section as "Welcome <span style={{ color: accent }}>{(userName || '').trim().split(/\s+/)[0] || 'name'}</span>"
              </div>
            </div>
          )}

          {/* current sections */}
          <Label tf={tf}>In your wheel · {sections.length}</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {sections.map((s, i) => (
              <SectionRow
                key={s.id}
                section={s}
                accent={accent}
                tf={tf}
                onName={(name) => updateAt(i, { name })}
                onContent={(contentKey) => updateAt(i, { contentKey })}
                onIcon={(patch) => updateAt(i, patch)}
                onRemove={sections.length > 1 ? () => removeAt(i) : null}
                onUp={i > 0 ? () => moveUp(i) : null}
                onDown={i < sections.length - 1 ? () => moveDown(i) : null}
                editingIcon={editing === i}
                onEditIcon={() => setEditing(editing === i ? null : i)}
                icsUrl={icsLinks[s.id] || ''}
                onIcsUrl={onIcsUrl ? ((url) => onIcsUrl(s.id, url)) : null}
              />
            ))}
          </div>

          {/* add new */}
          <Label tf={tf}>Add</Label>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
          }}>
            {Object.keys(SECTION_LIB)
              // Person + work are meant to be added multiple times (two jobs,
              // multiple people), so they always stay in the Add grid. Every
              // other template hides once a same-named section already exists
              // — keeps the list tidy without preventing legitimate dupes.
              .filter((k) => k === 'person' || k === 'work'
                || !sections.some((s) => s.contentKey === k && s.name.toLowerCase() === k))
              .map((k) => {
                const lib = SECTION_LIB[k];
                const cap = k[0].toUpperCase() + k.slice(1);
                return (
                  <button key={k}
                    onClick={() => addTemplate(k)}
                    style={{
                      appearance: 'none', border: '0.5px solid rgba(11,11,14,0.1)',
                      background: '#fff', borderRadius: 12, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 18, height: 18, color: '#0B0B0E' }}>
                      {Icon[lib.icon] || Icon.target}
                    </div>
                    <div>
                      <div style={{ fontFamily: tf.family, fontSize: 13.5, fontWeight: 500 }}>{cap}</div>
                      <div style={{ fontFamily: tf.mono, fontSize: 9.5, letterSpacing: '0.1em',
                                    textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)', marginTop: 2 }}>
                        Template
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
          <button onClick={addBlank} style={{
            appearance: 'none', width: '100%', border: '1px dashed rgba(11,11,14,0.22)',
            background: 'transparent', borderRadius: 12, padding: '12px 14px',
            cursor: 'pointer', color: 'rgba(11,11,14,0.6)',
            fontFamily: tf.family, fontSize: 13,
          }}>
            + Blank section (pick template + icon after)
          </button>

          <div style={{
            marginTop: 22, fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(11,11,14,0.35)', textAlign: 'center',
          }}>
            Have 2 jobs? Add Work twice and rename each.
          </div>

          {/* Danger zone — wipe persisted section data back to defaults. */}
          {onResetSchoolData && (
            <div style={{
              marginTop: 28, paddingTop: 18,
              borderTop: '0.5px solid rgba(11,11,14,0.1)',
            }}>
              <div style={{
                fontFamily: tf.mono, fontSize: 9.5, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
                marginBottom: 10,
              }}>
                Reset data
              </div>
              <button
                onClick={onResetSchoolData}
                style={{
                  appearance: 'none', width: '100%', cursor: 'pointer',
                  border: '0.5px solid rgba(11,11,14,0.18)',
                  background: 'transparent', borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: tf.family, fontSize: 14, color: '#0B0B0E',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                  <span style={{ fontWeight: 500 }}>Reset school data</span>
                  <span style={{
                    fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.08em',
                    color: 'rgba(11,11,14,0.5)',
                  }}>
                    Restores seed semesters, classes, weekly tasks &amp; notes
                  </span>
                </span>
                <span style={{
                  fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(11,11,14,0.5)',
                }}>
                  Reset →
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ tf, children }) {
  return (
    <div style={{
      fontFamily: tf.mono, fontSize: 9.5, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
      marginBottom: 8, marginTop: 4,
    }}>{children}</div>
  );
}

function SectionRow({ section, accent, tf, onName, onContent, onIcon, onRemove,
                      onUp, onDown, editingIcon, onEditIcon,
                      icsUrl = '', onIcsUrl }) {
  const fileRef = React.useRef(null);
  const isWeekly = section.contentKey === 'work' || section.contentKey === 'school';
  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      onIcon({ iconData: r.result, iconKey: null });
      onEditIcon(); // close picker
    };
    r.readAsDataURL(f);
  };

  return (
    <div style={{
      background: '#fff', border: '0.5px solid rgba(11,11,14,0.08)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        {/* icon (clickable to edit) */}
        <button onClick={onEditIcon} aria-label="Change icon" style={{
          appearance: 'none', border: '0.5px solid rgba(11,11,14,0.1)',
          background: 'rgba(11,11,14,0.04)', width: 36, height: 36, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, color: '#0B0B0E',
          outline: editingIcon ? `2px solid ${accent}` : 'none',
          outlineOffset: 1,
        }}>
          {section.iconData
            ? <img src={section.iconData} alt="" style={{
                width: section.contentKey === 'person' ? 28 : 22,
                height: section.contentKey === 'person' ? 28 : 22,
                objectFit: section.contentKey === 'person' ? 'cover' : 'contain',
                borderRadius: section.contentKey === 'person' ? '50%' : 0,
              }} />
            : <div style={{ width: 20, height: 20 }}>{Icon[section.iconKey] || Icon.spark}</div>}
        </button>

        {/* name */}
        <input
          value={section.name}
          onChange={(e) => onName(e.target.value)}
          style={{
            flex: 1, minWidth: 0, border: 0, background: 'transparent',
            fontFamily: tf.family, fontSize: 15, fontWeight: 500,
            color: '#0B0B0E', outline: 'none', padding: 0,
            letterSpacing: '-0.01em',
          }}
        />

        {/* controls */}
        <div style={{ display: 'flex', gap: 2 }}>
          {onUp && <IconBtn onClick={onUp} label="Move up">
            <path d="M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeLinejoin="round" />
          </IconBtn>}
          {onDown && <IconBtn onClick={onDown} label="Move down">
            <path d="M3 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeLinejoin="round" />
          </IconBtn>}
          {onRemove && <IconBtn onClick={onRemove} label="Remove">
            <path d="M2 3h6 M3 3v4 M5 3v4 M7 3v4 M2 1h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </IconBtn>}
        </div>
      </div>

      {/* template + icon picker */}
      {editingIcon && (
        <div style={{ padding: '4px 12px 12px', borderTop: '0.5px solid rgba(11,11,14,0.06)' }}>
          {/* template */}
          <div style={{
            fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
            margin: '10px 0 6px',
          }}>Template (data shown inside)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.keys(SECTION_LIB).map((k) => {
              const sel = section.contentKey === k;
              return (
                <button key={k} onClick={() => onContent(k)} style={{
                  appearance: 'none', border: sel ? `1px solid ${accent}` : '0.5px solid rgba(11,11,14,0.12)',
                  background: sel ? 'rgba(59,110,255,0.08)' : '#fff', borderRadius: 999,
                  padding: '4px 10px', cursor: 'pointer',
                  fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.08em',
                  color: sel ? accent : 'rgba(11,11,14,0.7)', textTransform: 'uppercase',
                }}>{k}</button>
              );
            })}
          </div>

          {/* icon */}
          <div style={{
            fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
            margin: '4px 0 6px',
          }}>Icon</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {ICON_KEYS.map((k) => {
              const sel = !section.iconData && section.iconKey === k;
              return (
                <button key={k} onClick={() => onIcon({ iconKey: k, iconData: null })} style={{
                  appearance: 'none', aspectRatio: '1', border: sel ? `1.5px solid ${accent}` : '0.5px solid rgba(11,11,14,0.12)',
                  background: '#fff', borderRadius: 9, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: sel ? accent : '#0B0B0E',
                }}>
                  <div style={{ width: 18, height: 18 }}>{Icon[k]}</div>
                </button>
              );
            })}
            <button onClick={() => fileRef.current?.click()} style={{
              appearance: 'none', aspectRatio: '1',
              border: section.iconData ? `1.5px solid ${accent}` : '1px dashed rgba(11,11,14,0.25)',
              background: section.iconData ? '#fff' : 'transparent', borderRadius: 9, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(11,11,14,0.55)', overflow: 'hidden', padding: 0,
            }}>
              {section.iconData
                ? <img src={section.iconData} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                : (<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 11V3 M4 7l4-4 4 4 M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>)}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* External calendar (ICS) — Outlook / Google / any RFC-5545 feed.
          Available on Work and School sections (the ones with a weekly
          view). Pasted URL is fetched through a CORS proxy on demand,
          parsed client-side, and rendered as read-only event rows in
          the weekly tasks list. */}
      {isWeekly && onIcsUrl && (
        <div style={{
          borderTop: '0.5px solid rgba(11,11,14,0.06)',
          padding: '10px 12px 12px',
          background: 'rgba(11,11,14,0.02)',
        }}>
          <div style={{
            fontFamily: tf.mono, fontSize: 9.5, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(11,11,14,0.5)',
            marginBottom: 6,
          }}>
            External calendar (Outlook ICS)
          </div>
          <input
            value={icsUrl}
            onChange={(e) => onIcsUrl(e.target.value)}
            placeholder="https://outlook.live.com/.../calendar.ics"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{
              appearance: 'none', boxSizing: 'border-box', width: '100%',
              border: '0.5px solid rgba(11,11,14,0.18)',
              background: '#fff', borderRadius: 8,
              padding: '8px 10px', outline: 'none',
              fontFamily: tf.mono, fontSize: 11.5,
              color: '#0B0B0E',
            }}
          />
          <div style={{
            marginTop: 6, fontFamily: tf.mono, fontSize: 9,
            letterSpacing: '0.08em', color: 'rgba(11,11,14,0.45)',
            lineHeight: 1.4,
          }}>
            Outlook → Calendar → Share → Publish to web → ICS link.
            Events appear read-only in the weekly Tasks list.
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      appearance: 'none', border: 0, background: 'transparent',
      width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(11,11,14,0.5)',
    }}>
      <svg width="11" height="11" viewBox="0 0 10 10">{children}</svg>
    </button>
  );
}

// Reads the latest auth state from window.SwipedSync (set by sync.js) and
// subscribes to `swiped-auth-change` events so the UI re-renders on sign-
// in / sign-out and after each successful Firestore sync.
function useAuthState() {
  const [state, setState] = React.useState(() => {
    const s = (typeof window !== 'undefined' && window.SwipedSync) || null;
    return {
      user: s ? s.user : null,
      status: s ? s.status : 'idle',
      lastSyncedAt: s ? s.lastSyncedAt : null,
      error: null,
    };
  });
  React.useEffect(() => {
    const onChange = (e) => {
      const detail = (e && e.detail) || {};
      setState({
        user: detail.user || null,
        status: detail.status || 'idle',
        lastSyncedAt: detail.lastSyncedAt || null,
        error: detail.error || null,
      });
    };
    window.addEventListener('swiped-auth-change', onChange);
    return () => window.removeEventListener('swiped-auth-change', onChange);
  }, []);
  return state;
}

function SyncSection({ tf, accent }) {
  const sync = (typeof window !== 'undefined' && window.SwipedSync) || null;
  const { user, status, lastSyncedAt, error } = useAuthState();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  if (!sync) {
    // Sync SDK didn't load or sync.js failed to init. Hide section to
    // avoid offering a feature that won't work.
    return null;
  }

  const syncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  const onSignIn = (e) => {
    e?.preventDefault?.();
    if (!email.trim() || !password) return;
    setBusy(true);
    sync.signInPassword(email.trim(), password)
      .then(() => { setPassword(''); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const onSignUp = () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    sync.signUpPassword(email.trim(), password)
      .then(() => { setPassword(''); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };
  const onSignOut = () => {
    setBusy(true);
    sync.signOut().finally(() => setBusy(false));
  };
  const [resetMsg, setResetMsg] = React.useState(null);
  const onForgotPassword = () => {
    const addr = email.trim();
    if (!addr) { setResetMsg({ kind: 'err', text: 'Enter your email above first.' }); return; }
    if (!sync.sendPasswordReset) { setResetMsg({ kind: 'err', text: 'Reset not available.' }); return; }
    setBusy(true);
    sync.sendPasswordReset(addr)
      .then(() => setResetMsg({ kind: 'ok', text: `Reset link sent to ${addr}. Check your spam folder if it doesn't arrive in a minute.` }))
      .catch((err) => setResetMsg({ kind: 'err', text: err.message || 'Could not send reset email.' }))
      .finally(() => setBusy(false));
  };
  const canSubmit = email.trim() && password && !busy;

  return (
    <div style={{ marginBottom: 22 }}>
      <Label tf={tf}>Cross-device sync</Label>
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(11,11,14,0.1)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
                  marginBottom: 2,
                }}>Signed in as</div>
                <div style={{
                  fontFamily: tf.family, fontSize: 14, color: '#0B0B0E',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{user.email || user.displayName || 'Anonymous'}</div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status === 'error' ? '#FA8072'
                  : (status === 'syncing' || status === 'signing-in') ? '#E8C547'
                  : accent,
                flexShrink: 0, alignSelf: 'center',
              }} title={status} />
            </div>
            <div style={{
              fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(11,11,14,0.5)',
            }}>
              {syncedLabel ? `Last synced at ${syncedLabel}` : 'Connecting…'}
            </div>
            <button
              onClick={onSignOut}
              disabled={busy}
              style={{
                appearance: 'none', cursor: busy ? 'default' : 'pointer',
                border: '0.5px solid rgba(11,11,14,0.18)',
                background: 'transparent', color: '#0B0B0E',
                padding: '10px 14px', borderRadius: 10,
                fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontWeight: 600,
                opacity: busy ? 0.5 : 1,
              }}
            >Sign out</button>
            {status === 'error' && error && (
              <div style={{
                fontFamily: tf.mono, fontSize: 11, letterSpacing: '0.04em',
                color: '#A03030', lineHeight: 1.4,
                background: 'rgba(160,48,48,0.08)',
                border: '0.5px solid rgba(160,48,48,0.25)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                Sync error: {error.message || String(error)}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{
              fontFamily: tf.family, fontSize: 13.5, color: '#0B0B0E',
              lineHeight: 1.4,
            }}>
              Sign in to keep semesters, classes, weekly tasks, contacts and budgets in sync across your devices.
            </div>
            <form onSubmit={onSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  appearance: 'none', boxSizing: 'border-box', width: '100%',
                  border: '0.5px solid rgba(11,11,14,0.18)',
                  background: '#fff', borderRadius: 10,
                  padding: '10px 12px', outline: 'none',
                  fontFamily: tf.family, fontSize: 14, color: '#0B0B0E',
                }}
              />
              <input
                type="password" autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                style={{
                  appearance: 'none', boxSizing: 'border-box', width: '100%',
                  border: '0.5px solid rgba(11,11,14,0.18)',
                  background: '#fff', borderRadius: 10,
                  padding: '10px 12px', outline: 'none',
                  fontFamily: tf.family, fontSize: 14, color: '#0B0B0E',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    appearance: 'none', cursor: canSubmit ? 'pointer' : 'default',
                    border: 0, background: accent, color: '#0B0B0E',
                    padding: '11px 14px', borderRadius: 10,
                    fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
                    textTransform: 'uppercase', fontWeight: 600,
                    opacity: canSubmit ? 1 : 0.5,
                  }}
                >Sign in</button>
                <button
                  type="button"
                  onClick={onSignUp}
                  disabled={!canSubmit}
                  style={{
                    appearance: 'none', cursor: canSubmit ? 'pointer' : 'default',
                    border: '0.5px solid rgba(11,11,14,0.18)',
                    background: 'transparent', color: '#0B0B0E',
                    padding: '11px 14px', borderRadius: 10,
                    fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
                    textTransform: 'uppercase', fontWeight: 600,
                    opacity: canSubmit ? 1 : 0.5,
                  }}
                >Create account</button>
              </div>
            </form>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              gap: 8,
            }}>
              <div style={{
                fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(11,11,14,0.4)',
              }}>
                First time? Tap Create account.
              </div>
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={busy}
                style={{
                  appearance: 'none', border: 0, background: 'transparent',
                  cursor: busy ? 'default' : 'pointer', padding: 0,
                  fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: accent, fontWeight: 600,
                  opacity: busy ? 0.5 : 1,
                }}
              >Forgot password?</button>
            </div>
            {resetMsg && (
              <div style={{
                fontFamily: tf.family, fontSize: 12.5, lineHeight: 1.45,
                color: resetMsg.kind === 'ok' ? 'rgba(11,11,14,0.7)' : '#A03030',
                background: resetMsg.kind === 'ok' ? 'rgba(79,168,98,0.1)' : 'rgba(160,48,48,0.08)',
                border: `0.5px solid ${resetMsg.kind === 'ok' ? 'rgba(79,168,98,0.3)' : 'rgba(160,48,48,0.25)'}`,
                borderRadius: 10, padding: '10px 12px',
              }}>
                {resetMsg.text}
              </div>
            )}
            {status === 'sent-email' && (
              <div style={{
                fontFamily: tf.family, fontSize: 12.5, lineHeight: 1.45,
                color: 'rgba(11,11,14,0.65)',
                background: 'rgba(232,197,71,0.12)',
                border: '0.5px solid rgba(232,197,71,0.35)',
                borderRadius: 10, padding: '10px 12px',
              }}>
                Account created — confirm your email to finish.
                <strong> Check your spam / junk folder</strong> if you
                don't see it in a minute. Once confirmed, sign in with the
                password you just set.
              </div>
            )}
            {status === 'error' && error && (
              <div style={{
                fontFamily: tf.mono, fontSize: 11, letterSpacing: '0.06em',
                color: '#A03030',
              }}>
                {error.message || 'Sign-in failed. Try again.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Backup — export every Swiped-owned localStorage key as a single JSON
// file, or import one back. Independent of cloud sync; works offline.
// Useful for: transferring to a new account/email, archiving a snapshot,
// or recovering from an accidental data wipe.
function BackupSection({ tf, accent }) {
  const [status, setStatus] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const isOurKey = (k) => /^swiped\./.test(k) || /^firebase:/.test(k);

  const onExport = () => {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!isOurKey(k)) continue;
        data[k] = localStorage.getItem(k);
      }
      const payload = {
        kind: 'swiped-backup', version: 1,
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swiped-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const keys = Object.keys(data).length;
      setStatus({ kind: 'ok', text: `Exported ${keys} key${keys === 1 ? '' : 's'}. Save the file somewhere safe (Drive, iCloud, email).` });
    } catch (err) {
      setStatus({ kind: 'err', text: err.message || 'Export failed.' });
    }
  };

  const onPickFile = () => { fileInputRef.current && fileInputRef.current.click(); };

  const onImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        if (parsed.kind !== 'swiped-backup' || !parsed.data || typeof parsed.data !== 'object') {
          throw new Error('Not a Swiped backup file.');
        }
        const ok = window.confirm(
          `Restore ${Object.keys(parsed.data).length} entries from ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString() : 'this file'}?\n\nThis overwrites your current sections, tasks, contacts, and budget with the backup.`
        );
        if (!ok) return;
        // Wipe existing swiped.* keys first so removed entries don't linger.
        const drop = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (isOurKey(k)) drop.push(k);
        }
        drop.forEach((k) => localStorage.removeItem(k));
        Object.keys(parsed.data).forEach((k) => {
          localStorage.setItem(k, parsed.data[k]);
        });
        setStatus({ kind: 'ok', text: 'Restored. Reloading…' });
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        setStatus({ kind: 'err', text: err.message || 'Could not read that file.' });
      }
    };
    reader.onerror = () => setStatus({ kind: 'err', text: 'Could not read that file.' });
    reader.readAsText(file);
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <Label tf={tf}>Backup</Label>
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(11,11,14,0.1)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{
          fontFamily: tf.family, fontSize: 13.5, color: '#0B0B0E',
          lineHeight: 1.4,
        }}>
          Save a JSON snapshot of all your sections, tasks, contacts, and
          budgets. Restore it later on this device or any other.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={onExport}
            style={{
              appearance: 'none', cursor: 'pointer',
              border: 0, background: accent, color: '#0B0B0E',
              padding: '11px 14px', borderRadius: 10,
              fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontWeight: 600,
            }}
          >Export</button>
          <button
            onClick={onPickFile}
            style={{
              appearance: 'none', cursor: 'pointer',
              border: '0.5px solid rgba(11,11,14,0.18)',
              background: 'transparent', color: '#0B0B0E',
              padding: '11px 14px', borderRadius: 10,
              fontFamily: tf.mono, fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontWeight: 600,
            }}
          >Import</button>
        </div>
        <input
          ref={fileInputRef} type="file" accept="application/json,.json"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
        {status && (
          <div style={{
            fontFamily: tf.family, fontSize: 12.5, lineHeight: 1.45,
            color: status.kind === 'ok' ? 'rgba(11,11,14,0.7)' : '#A03030',
            background: status.kind === 'ok' ? 'rgba(79,168,98,0.1)' : 'rgba(160,48,48,0.08)',
            border: `0.5px solid ${status.kind === 'ok' ? 'rgba(79,168,98,0.3)' : 'rgba(160,48,48,0.25)'}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SettingsSheet });

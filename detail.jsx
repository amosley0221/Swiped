// detail.jsx — Full detail view that appears after liquid swipe-up.
// Black background, white text. Quick-add, stats, tasks, log, note.

function DetailView({ section, content, accent, onClose, onCloseDragStart, visible, progress = 1 }) {
  const [tasks, setTasks] = React.useState(content.tasks);
  const [log, setLog] = React.useState(content.log);
  const [note, setNote] = React.useState(content.note);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    setTasks(content.tasks);
    setLog(content.log);
    setNote(content.note);
  }, [section.id]);

  const toggle = (id) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const add = () => {
    if (!draft.trim()) return;
    const nextId = (tasks[0]?.id || 0) + 1;
    setTasks((ts) => [{ id: nextId + 1000, title: draft.trim(), done: false }, ...ts]);
    setLog((l) => [{ t: 'Just now', text: `+ ${draft.trim()}` }, ...l]);
    setDraft('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    add();
  };

  // Content fades in/out with the sheet's vertical travel. We start showing
  // the content early (~15% open) so it reads as part of the dragged card,
  // not something that snaps in after the sheet is already in place.
  const contentOpacity = visible
    ? 1
    : Math.max(0, Math.min(1, (progress - 0.15) / 0.35));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: visible ? 'auto' : 'none',
        opacity: contentOpacity,
        transition: visible ? 'opacity 0.18s ease-out' : 'none',
        color: '#FAFAF7',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 24px 90px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top drag-handle bar — pull down to close, like a pull tab */}
      <div
        onPointerDown={onCloseDragStart}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 70,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 8, touchAction: 'none',
          pointerEvents: visible ? 'auto' : 'none',
          zIndex: 2,
        }}
      >
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.25)',
        }} />
      </div>

      {/* Top bar: close + section name */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, marginTop: 14, position: 'relative', zIndex: 3,
      }}>
        <button
          onPointerDown={onCloseDragStart}
          aria-label="Close (drag down)"
          style={{
            appearance: 'none', border: 0, background: 'rgba(255,255,255,0.08)',
            color: '#FAFAF7', width: 34, height: 34, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', touchAction: 'none',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10 10 2 M2 2 10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(250,250,247,0.5)',
        }}>
          {section.name}
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 32, height: 32, color: accent }}>
          {section.iconData
            ? <img src={section.iconData} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            : (Icon[section.iconKey] || Icon.target)}
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 42, lineHeight: '0.95', fontWeight: 400, fontStyle: 'italic',
          letterSpacing: '-0.02em',
        }}>
          {content.headline}
        </div>
      </div>

      {/* Quick-add */}
      <form onSubmit={onSubmit} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 14,
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        marginBottom: 22,
      }}>
        <div style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.45)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 3v10 M3 8h10" />
          </svg>
        </div>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Quick add to this section…"
          style={{
            flex: 1, background: 'transparent', border: 0, outline: 'none',
            color: '#FAFAF7', fontFamily: 'Geist, ui-sans-serif, system-ui',
            fontSize: 14, padding: 0,
          }}
        />
        {draft && (
          <button
            type="submit"
            style={{
              appearance: 'none', border: 0, padding: '4px 10px',
              background: accent, color: '#0B0B0E',
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}
          >Add</button>
        )}
      </form>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 22,
                    background: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        {content.stats.map((s, i) => (
          <div key={i} style={{
            background: '#0B0B0E', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,250,247,0.45)',
            }}>{s.label}</div>
            <div style={{
              fontFamily: 'Geist, ui-sans-serif, system-ui',
              fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scroll region */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginRight: -8, paddingRight: 8 }}>
        {/* Tasks */}
        <SectionTitle>Tasks · {tasks.filter((t) => !t.done).length} open</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              style={{
                appearance: 'none', border: 0, background: 'transparent', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                color: t.done ? 'rgba(250,250,247,0.4)' : '#FAFAF7',
                cursor: 'pointer',
                fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                border: t.done ? `1.5px solid ${accent}` : '1.5px solid rgba(255,255,255,0.3)',
                background: t.done ? accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                {t.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5 4 7 8 3" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                textDecoration: t.done ? 'line-through' : 'none',
                textDecorationColor: 'rgba(250,250,247,0.4)',
                textDecorationThickness: '1px',
              }}>{t.title}</span>
            </button>
          ))}
        </div>

        {/* Log */}
        <SectionTitle>Recent</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          {log.map((e, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14,
              padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              alignItems: 'baseline',
            }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 11, color: 'rgba(250,250,247,0.45)',
                fontVariantNumeric: 'tabular-nums',
              }}>{e.t}</div>
              <div style={{ fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 13.5 }}>
                {e.text}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <SectionTitle>Note</SectionTitle>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'none',
            background: 'rgba(255,255,255,0.05)', color: '#FAFAF7',
            border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12,
            padding: 12, outline: 'none',
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 17, lineHeight: 1.45, fontStyle: 'italic',
            letterSpacing: '-0.01em',
          }}
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
      color: 'rgba(250,250,247,0.45)',
      marginBottom: 10, marginTop: 2,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { DetailView });

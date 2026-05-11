// detail.jsx — Full detail view that appears after liquid swipe-up.
// Black background, white text. Quick-add, stats, tasks, log, note.
// Per-section extension: when the school section is open we also render the
// SchoolClasses GPA tracker (semester dropdown + class list + computed GPA).

const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};
// '—' sits in the list as "not graded yet" — counted in totals but skipped in GPA math.
const GRADE_OPTIONS = ['—', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

function calcGPA(classes) {
  let pts = 0, cr = 0;
  for (const c of classes) {
    const g = GRADE_POINTS[c.grade];
    const credits = Number(c.credits) || 0;
    if (g === undefined || credits <= 0) continue;
    pts += g * credits;
    cr += credits;
  }
  return cr > 0 ? { gpa: pts / cr, credits: cr } : { gpa: null, credits: 0 };
}

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

  // The wrapper clips this view to the curved sheet outline, so content is
  // already revealed along the curve as it stretches up. No opacity fade
  // needed — just stay fully drawn while the sheet is active.
  const contentOpacity = 1;

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
        {(section.contentKey || section.id) === 'school' && (
          <SchoolClasses
            key={section.id}
            initial={content.semesters || []}
            accent={accent}
          />
        )}

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

function SchoolClasses({ initial, accent }) {
  const [semesters, setSemesters] = React.useState(() =>
    initial.length ? initial : [{ id: 'sem_' + Date.now(), name: 'New semester', classes: [] }]
  );
  const [activeId, setActiveId] = React.useState(semesters[0]?.id);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newCredits, setNewCredits] = React.useState('3');
  const [newGrade, setNewGrade] = React.useState('—');

  const active = semesters.find((s) => s.id === activeId) || semesters[0];
  const semGPA = calcGPA(active?.classes || []);
  const cumGPA = calcGPA(semesters.flatMap((s) => s.classes));

  const setActiveClasses = (updater) => {
    setSemesters((prev) =>
      prev.map((s) => (s.id === active.id ? { ...s, classes: updater(s.classes) } : s))
    );
  };

  const addClass = (e) => {
    e?.preventDefault?.();
    const name = newName.trim();
    if (!name) return;
    const credits = Math.max(0, Math.min(12, Number(newCredits) || 0));
    setActiveClasses((cs) => [
      ...cs,
      { id: Date.now(), name, credits, grade: newGrade },
    ]);
    setNewName('');
    setNewCredits('3');
    setNewGrade('—');
  };

  const updateClass = (id, patch) => {
    setActiveClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeClass = (id) => {
    setActiveClasses((cs) => cs.filter((c) => c.id !== id));
  };

  const addSemester = () => {
    const year = new Date().getFullYear();
    const id = 'sem_' + Date.now();
    const next = { id, name: `New semester ${year}`, classes: [] };
    setSemesters((prev) => [next, ...prev]);
    setActiveId(id);
    setMenuOpen(false);
  };

  const renameActive = (name) => {
    setSemesters((prev) => prev.map((s) => (s.id === active.id ? { ...s, name } : s)));
  };

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: '#FAFAF7',
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 13,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <SectionTitle>Classes</SectionTitle>
        <div style={{
          display: 'flex', gap: 14, alignItems: 'baseline',
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(250,250,247,0.45)',
        }}>
          <span>
            Cum&nbsp;
            <span style={{ color: '#FAFAF7', fontVariantNumeric: 'tabular-nums' }}>
              {cumGPA.gpa == null ? '—' : cumGPA.gpa.toFixed(2)}
            </span>
          </span>
        </div>
      </div>

      {/* Semester selector */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            appearance: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: '#FAFAF7',
            width: '100%', padding: '12px 14px', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', textAlign: 'left',
            fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,250,247,0.45)',
            }}>Semester</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{active?.name || '—'}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 18, fontWeight: 500, color: accent,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {semGPA.gpa == null ? '—' : semGPA.gpa.toFixed(2)}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
              <path d="M3 4.5 6 8 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: '#15151A',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            zIndex: 5,
          }}>
            {semesters.map((s) => {
              const isActive = s.id === active?.id;
              const g = calcGPA(s.classes);
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveId(s.id); setMenuOpen(false); }}
                  style={{
                    appearance: 'none', border: 0, background: 'transparent',
                    color: '#FAFAF7', width: '100%', padding: '11px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: isActive ? accent : 'rgba(255,255,255,0.18)',
                    }} />
                    {s.name}
                  </span>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace, monospace',
                    fontSize: 12, color: 'rgba(250,250,247,0.55)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {g.gpa == null ? '—' : g.gpa.toFixed(2)}
                  </span>
                </button>
              );
            })}
            <button
              onClick={addSemester}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: accent, width: '100%', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              + Add semester
            </button>
          </div>
        )}
      </div>

      {/* Inline rename of active semester */}
      <input
        value={active?.name || ''}
        onChange={(e) => renameActive(e.target.value)}
        placeholder="Semester name"
        style={{
          ...fieldStyle, width: '100%', marginBottom: 12,
          fontStyle: 'italic',
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 18,
          background: 'transparent', border: 0,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 0, padding: '4px 0',
        }}
      />

      {/* Class list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {(active?.classes || []).length === 0 && (
          <div style={{
            color: 'rgba(250,250,247,0.4)', fontSize: 13,
            padding: '12px 0',
          }}>
            No classes yet. Add one below.
          </div>
        )}
        {(active?.classes || []).map((c) => (
          <div key={c.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 60px 70px 28px',
            gap: 8, alignItems: 'center',
            padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <input
              value={c.name}
              onChange={(e) => updateClass(c.id, { name: e.target.value })}
              style={{
                background: 'transparent', border: 0, outline: 'none',
                color: '#FAFAF7', fontSize: 14,
                fontFamily: 'Geist, ui-sans-serif, system-ui',
                minWidth: 0,
              }}
            />
            <input
              type="number" inputMode="numeric" min="0" max="12" step="1"
              value={c.credits}
              onChange={(e) => updateClass(c.id, { credits: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
              style={{
                background: 'transparent', border: 0, outline: 'none',
                color: '#FAFAF7', fontSize: 13, textAlign: 'right',
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 0,
              }}
            />
            <select
              value={c.grade}
              onChange={(e) => updateClass(c.id, { grade: e.target.value })}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                background: 'rgba(255,255,255,0.08)', color: '#FAFAF7',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 8px',
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 12, fontWeight: 600,
                textAlign: 'center', textAlignLast: 'center',
                outline: 'none',
              }}
            >
              {GRADE_OPTIONS.map((g) => <option key={g} value={g} style={{ background: '#15151A' }}>{g}</option>)}
            </select>
            <button
              onClick={() => removeClass(c.id)}
              aria-label="Remove class"
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: 'rgba(250,250,247,0.4)', cursor: 'pointer',
                padding: 0, fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ))}
      </div>

      {/* Credits summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'rgba(250,250,247,0.45)',
        marginBottom: 16,
      }}>
        <span>{(active?.classes || []).length} classes · {(active?.classes || []).reduce((n, c) => n + (Number(c.credits) || 0), 0)} credits</span>
        <span>graded {semGPA.credits} cr</span>
      </div>

      {/* Add class form */}
      <form
        onSubmit={addClass}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 70px auto',
          gap: 8, alignItems: 'stretch',
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Class name"
          style={fieldStyle}
        />
        <input
          type="number" inputMode="numeric" min="0" max="12" step="1"
          value={newCredits}
          onChange={(e) => setNewCredits(e.target.value)}
          placeholder="Cr"
          style={{ ...fieldStyle, textAlign: 'right',
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums' }}
        />
        <select
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value)}
          style={{
            ...fieldStyle, appearance: 'none', WebkitAppearance: 'none',
            textAlign: 'center', textAlignLast: 'center',
            fontFamily: 'Geist Mono, ui-monospace, monospace', fontWeight: 600,
          }}
        >
          {GRADE_OPTIONS.map((g) => <option key={g} value={g} style={{ background: '#15151A' }}>{g}</option>)}
        </select>
        <button
          type="submit"
          disabled={!newName.trim()}
          style={{
            appearance: 'none', border: 0, padding: '0 14px',
            background: newName.trim() ? accent : 'rgba(255,255,255,0.08)',
            color: newName.trim() ? '#0B0B0E' : 'rgba(250,250,247,0.4)',
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            borderRadius: 8, fontWeight: 600,
            cursor: newName.trim() ? 'pointer' : 'default',
          }}
        >Add</button>
      </form>
    </div>
  );
}

Object.assign(window, { DetailView });

// detail.jsx — Full detail view that appears after liquid swipe-up.
// Black background, salmon-pink text. Icons and the semester-picker GPA
// stay white so they read as accents on top of the salmon copy.

const FG_PINK = '#FA8072';   // salmon — primary text inside the detail view
const FG_WHITE = '#FAFAF7';  // explicit white for icons + GPA chip

function DetailView({
  section, content, accent, onClose, onCloseDragStart, visible, progress = 1,
  schoolSemesters, setSchoolSemesters,
  schoolActiveSemesterId, selectSchoolSemester,
  schoolWeeks, setSchoolWeeks, schoolActiveWeekKey, setSchoolActiveWeekKey,
  peopleData, setPeopleData,
  userName, setUserName,
  sections, updateSection,
}) {
  const isSchool = (section.contentKey || section.id) === 'school';
  const isPerson = (section.contentKey || section.id) === 'person';
  const isHome = (section.contentKey || section.id) === 'home';

  // Non-school sections still keep their own in-memory tasks/log/note,
  // refreshed when you swipe to a different section.
  const [localTasks, setLocalTasks] = React.useState(content.tasks);
  const [localLog, setLocalLog] = React.useState(content.log);
  const [localNote, setLocalNote] = React.useState(content.note);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!isSchool) {
      setLocalTasks(content.tasks);
      setLocalLog(content.log);
      setLocalNote(content.note);
    }
  }, [section.id, isSchool]);

  // For school, the week store is the source of truth. Read/write helpers
  // act on the currently-active week.
  const weekData = isSchool
    ? (schoolWeeks[schoolActiveWeekKey] || { tasks: [], log: [], note: '' })
    : null;
  const updateActiveWeek = React.useCallback((updater) => {
    setSchoolWeeks((prev) => {
      const cur = prev[schoolActiveWeekKey] || { tasks: [], log: [], note: '' };
      return { ...prev, [schoolActiveWeekKey]: updater(cur) };
    });
  }, [setSchoolWeeks, schoolActiveWeekKey]);

  const tasks = isSchool ? weekData.tasks : localTasks;
  const log = isSchool ? weekData.log : localLog;
  const note = isSchool ? weekData.note : localNote;

  const toggle = (id) => {
    if (isSchool) {
      updateActiveWeek((w) => ({
        ...w,
        tasks: w.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }));
    } else {
      setLocalTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    }
  };

  const removeTask = (id) => {
    if (isSchool) {
      updateActiveWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    } else {
      setLocalTasks((ts) => ts.filter((t) => t.id !== id));
    }
  };

  const setNote = (v) => {
    if (isSchool) {
      updateActiveWeek((w) => ({ ...w, note: v }));
    } else {
      setLocalNote(v);
    }
  };

  const add = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    const newTask = { id: Date.now(), title: text, done: false };
    const newLog = { t: 'Just now', text: `+ ${text}` };
    if (isSchool) {
      updateActiveWeek((w) => ({
        ...w,
        tasks: [newTask, ...w.tasks],
        log: [newLog, ...w.log],
      }));
    } else {
      setLocalTasks((ts) => [newTask, ...ts]);
      setLocalLog((l) => [newLog, ...l]);
    }
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
        color: FG_PINK,
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
            color: FG_PINK, width: 34, height: 34, borderRadius: '50%',
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
          color: 'rgba(250,128,114,0.5)',
        }}>
          {isPerson ? 'Person' : isHome ? 'Home' : section.name}
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 22 }}>
        <div style={{
          width: 32, height: 32, color: FG_WHITE,
          borderRadius: isPerson ? '50%' : 0, overflow: 'hidden',
        }}>
          {section.iconData
            ? <img src={section.iconData} alt="" style={{
                width: 32, height: 32,
                objectFit: isPerson ? 'cover' : 'contain',
              }} />
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

      {/* Quick-add — hidden for person and home sections, which have their own editors */}
      {!isPerson && !isHome && (
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
            placeholder={isSchool ? 'Quick add to this week…' : 'Quick add to this section…'}
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              color: FG_PINK, fontFamily: 'Geist, ui-sans-serif, system-ui',
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
      )}

      {/* Stats — fits 1 / 2 / 3 columns to whatever the section publishes,
          and hides itself entirely when there's nothing to show. */}
      {content.stats && content.stats.length > 0 && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: content.stats.length === 1 ? '1fr'
          : content.stats.length === 2 ? '1fr 1fr'
          : '1fr 1fr 1fr',
        gap: 1, marginBottom: 22,
        background: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden',
      }}>
        {content.stats.map((s, i) => (
          <div key={i} style={{
            background: '#0B0B0E', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(250,128,114,0.45)',
            }}>{s.label}</div>
            <div style={{
              fontFamily: 'Geist, ui-sans-serif, system-ui',
              fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>{s.value}</div>
          </div>
        ))}
      </div>
      )}

      {/* Scroll region */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginRight: -8, paddingRight: 8 }}>
        {isSchool && schoolSemesters && (
          <SchoolClasses
            semesters={schoolSemesters}
            onChange={setSchoolSemesters}
            activeId={schoolActiveSemesterId}
            onSelect={selectSchoolSemester}
            accent={accent}
          />
        )}

        {isHome ? (
          <HomeDetails
            userName={userName}
            setUserName={setUserName}
            accent={accent}
            sections={sections}
            peopleData={peopleData}
            setPeopleData={setPeopleData}
          />
        ) : isPerson ? (
          <PersonDetails
            section={section}
            peopleData={peopleData}
            setPeopleData={setPeopleData}
            accent={accent}
          />
        ) : isSchool ? (
          <WeeklyView
            weekKey={schoolActiveWeekKey}
            setWeekKey={setSchoolActiveWeekKey}
            tasks={tasks}
            log={log}
            note={note}
            onToggle={toggle}
            onRemove={removeTask}
            onNoteChange={setNote}
            accent={accent}
          />
        ) : (
          <>
            <SectionTitle>Tasks · {tasks.filter((t) => !t.done).length} open</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} accent={accent} onToggle={toggle} />
              ))}
            </div>

            <SectionTitle>Recent</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
              {log.map((e, i) => (
                <LogRow key={i} entry={e} />
              ))}
            </div>

            <SectionTitle>Note</SectionTitle>
            <NoteField value={note} onChange={setNote} />
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, accent, onToggle, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
      color: task.done ? 'rgba(250,128,114,0.4)' : '#FAFAF7',
    }}>
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        style={{
          appearance: 'none', border: 0, background: 'transparent',
          padding: 0, cursor: 'pointer', flexShrink: 0,
          width: 18, height: 18, borderRadius: 5,
          borderStyle: 'solid', borderWidth: '1.5px',
          borderColor: task.done ? accent : 'rgba(255,255,255,0.3)',
          backgroundColor: task.done ? accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5 4 7 8 3" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span style={{
        flex: 1, minWidth: 0,
        textDecoration: task.done ? 'line-through' : 'none',
        textDecorationColor: 'rgba(250,128,114,0.4)',
        textDecorationThickness: '1px',
      }}>{task.title}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(task.id)}
          aria-label="Remove task"
          style={{
            appearance: 'none', border: 0, background: 'transparent',
            color: 'rgba(250,128,114,0.35)', cursor: 'pointer',
            padding: 4, lineHeight: 1, fontSize: 16,
          }}
        >×</button>
      )}
    </div>
  );
}

function LogRow({ entry }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14,
      padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      alignItems: 'baseline',
    }}>
      <div style={{
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 11, color: 'rgba(250,128,114,0.45)',
        fontVariantNumeric: 'tabular-nums',
      }}>{entry.t}</div>
      <div style={{ fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 13.5 }}>
        {entry.text}
      </div>
    </div>
  );
}

function NoteField({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Anything to remember this week…"
      style={{
        width: '100%', boxSizing: 'border-box', resize: 'none',
        background: 'rgba(255,255,255,0.05)', color: FG_PINK,
        border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12,
        padding: 12, outline: 'none',
        fontFamily: '"Instrument Serif", Georgia, serif',
        fontSize: 17, lineHeight: 1.45, fontStyle: 'italic',
        letterSpacing: '-0.01em',
      }}
    />
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
      color: 'rgba(250,128,114,0.45)',
      marginBottom: 10, marginTop: 2,
    }}>
      {children}
    </div>
  );
}

function SchoolClasses({ semesters, onChange, activeId, onSelect, accent }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newCredits, setNewCredits] = React.useState('3');
  const [newGrade, setNewGrade] = React.useState('—');

  // If the active semester is deleted (or list is empty on mount), pick a
  // sane fallback. The pick is dispatched to the parent so the weekly view
  // can react too.
  React.useEffect(() => {
    if (semesters.length === 0) return;
    if (!semesters.find((s) => s.id === activeId)) {
      onSelect(semesters[0].id);
    }
  }, [semesters, activeId, onSelect]);

  const activeIdx = Math.max(0, semesters.findIndex((s) => s.id === activeId));
  const active = semesters[activeIdx] || semesters[0];
  const semGPA = calcGPA(active?.classes || []);
  // Progressive: this semester + every older one (newer-first array → older
  // semesters live at higher indices), skipping any future entries.
  const cumGPA = calcProgressiveGPA(semesters, activeIdx);

  const setActiveClasses = (updater) => {
    if (!active) return;
    onChange(semesters.map((s) => (s.id === active.id ? { ...s, classes: updater(s.classes) } : s)));
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
    // New semesters default to future — they're added for planning. One tap
    // on the toggle below flips them to current/past so they count for GPA.
    const next = { id, name: `New semester ${year}`, isFuture: true, classes: [] };
    onChange([next, ...semesters]);
    onSelect(id);
    setMenuOpen(false);
  };

  const renameActive = (name) => {
    if (!active) return;
    onChange(semesters.map((s) => (s.id === active.id ? { ...s, name } : s)));
  };

  const toggleFuture = () => {
    if (!active) return;
    onChange(semesters.map((s) => (s.id === active.id ? { ...s, isFuture: !s.isFuture } : s)));
  };

  const removeSemester = (id) => {
    const next = semesters.filter((s) => s.id !== id);
    onChange(next);
    if (id === activeId) {
      onSelect(next[0]?.id);
    }
  };

  // Move semester at index `i` toward `dir` (-1 = newer/up, +1 = older/down).
  const moveSemester = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= semesters.length) return;
    const next = semesters.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: FG_PINK,
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 13,
    boxSizing: 'border-box',
  };
  const iconBtn = (disabled) => ({
    appearance: 'none', border: 0, background: 'transparent',
    width: 26, height: 26, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: disabled ? 'rgba(250,128,114,0.18)' : 'rgba(250,128,114,0.55)',
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <SectionTitle>Classes</SectionTitle>
        <div
          title="Cumulative GPA through this semester (skips future semesters)"
          style={{
            display: 'flex', gap: 14, alignItems: 'baseline',
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(250,128,114,0.45)',
          }}
        >
          <span>
            Cum through&nbsp;
            <span style={{ color: FG_PINK, fontVariantNumeric: 'tabular-nums' }}>
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
            background: 'rgba(255,255,255,0.05)', color: FG_PINK,
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
              color: 'rgba(250,128,114,0.45)',
            }}>Semester</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{active?.name || '—'}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {active?.isFuture ? (
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 5,
                border: `0.5px solid ${accent}`, color: accent,
              }}>Future</span>
            ) : (
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 18, fontWeight: 500, color: FG_WHITE,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {semGPA.gpa == null ? '—' : semGPA.gpa.toFixed(2)}
              </span>
            )}
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
            {semesters.map((s, i) => {
              const isActive = s.id === active?.id;
              const g = calcGPA(s.classes);
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    alignItems: 'center', gap: 4,
                    padding: '4px 6px 4px 14px',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <button
                    onClick={() => { onSelect(s.id); setMenuOpen(false); }}

                    style={{
                      appearance: 'none', border: 0, background: 'transparent',
                      color: FG_PINK, padding: '8px 0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', textAlign: 'left', gap: 10,
                      fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: isActive ? accent : 'rgba(255,255,255,0.18)',
                      }} />
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: s.isFuture ? 'rgba(250,128,114,0.65)' : '#FAFAF7',
                        fontStyle: s.isFuture ? 'italic' : 'normal',
                      }}>{s.name}</span>
                      {s.isFuture && (
                        <span style={{
                          fontFamily: 'Geist Mono, ui-monospace, monospace',
                          fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: accent, opacity: 0.85,
                          padding: '1px 5px', borderRadius: 3,
                          border: `0.5px solid ${accent}`,
                        }}>Future</span>
                      )}
                    </span>
                    <span style={{
                      fontFamily: 'Geist Mono, ui-monospace, monospace',
                      fontSize: 12, fontVariantNumeric: 'tabular-nums',
                      color: s.isFuture ? 'rgba(250,128,114,0.3)' : 'rgba(250,128,114,0.55)',
                    }}>
                      {s.isFuture ? '—' : (g.gpa == null ? '—' : g.gpa.toFixed(2))}
                    </span>
                  </button>
                  <button
                    onClick={() => moveSemester(i, -1)}
                    disabled={i === 0}
                    aria-label="Move newer"
                    style={iconBtn(i === 0)}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 6 5 3.5 7.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSemester(i, 1)}
                    disabled={i === semesters.length - 1}
                    aria-label="Move older"
                    style={iconBtn(i === semesters.length - 1)}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2.5 4 5 6.5 7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeSemester(s.id)}
                    aria-label="Delete semester"
                    style={{
                      ...iconBtn(false),
                      color: 'rgba(250,128,114,0.45)',
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 9 9 2 M2 2 9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
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

      {/* Inline rename + future toggle for the active semester */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        borderBottom: '0.5px solid rgba(255,255,255,0.08)', paddingBottom: 4,
      }}>
        <input
          value={active?.name || ''}
          onChange={(e) => renameActive(e.target.value)}
          placeholder="Semester name"
          style={{
            flex: 1, minWidth: 0,
            fontStyle: 'italic',
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 18, color: FG_PINK,
            background: 'transparent', border: 0, outline: 'none',
            padding: '4px 0',
          }}
        />
        <button
          onClick={toggleFuture}
          aria-pressed={active?.isFuture ? 'true' : 'false'}
          title="Future semesters are excluded from GPA"
          style={{
            appearance: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999,
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
            background: active?.isFuture ? accent : 'transparent',
            color: active?.isFuture ? '#0B0B0E' : 'rgba(250,128,114,0.55)',
            border: active?.isFuture ? `0.5px solid ${accent}` : '0.5px solid rgba(255,255,255,0.15)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: active?.isFuture ? '#0B0B0E' : 'rgba(250,128,114,0.35)',
          }} />
          Future
        </button>
      </div>

      {/* Class list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {(active?.classes || []).length === 0 && (
          <div style={{
            color: 'rgba(250,128,114,0.4)', fontSize: 13,
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
                color: FG_PINK, fontSize: 14,
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
                color: FG_PINK, fontSize: 13, textAlign: 'right',
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
                background: 'rgba(255,255,255,0.08)', color: FG_PINK,
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
                color: 'rgba(250,128,114,0.4)', cursor: 'pointer',
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
        color: 'rgba(250,128,114,0.45)',
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
            color: newName.trim() ? '#0B0B0E' : 'rgba(250,128,114,0.4)',
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

// Weekly view: horizontal swipe (or arrows / calendar) moves between weeks;
// each week has its own tasks, recent log, and note. Reads/writes go through
// the props (state lives in app.jsx so it survives sheet close/reopen).
function WeeklyView({
  weekKey: activeKey, setWeekKey,
  tasks, log, note,
  onToggle, onRemove, onNoteChange,
  accent,
}) {
  const weekDate = parseWeekKey(activeKey);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [dragX, setDragX] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const dragRef = React.useRef(null);

  const goWeek = React.useCallback((dir) => {
    const next = new Date(weekDate);
    next.setDate(next.getDate() + dir * 7);
    setWeekKey(weekKey(next));
  }, [weekDate, setWeekKey]);

  // Pointer-based horizontal swipe. We only steal the gesture once it's
  // clearly horizontal so the vertical scroll inside the sheet still works,
  // and we bail out entirely if the user starts inside a form control.
  const onPointerDown = (e) => {
    const tag = e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, captured: false, dx: 0 };
  };
  const onPointerMove = (e) => {
    const s = dragRef.current;
    if (!s) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.captured) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null;
        return;
      }
      if (Math.abs(dx) > 12) s.captured = true;
    }
    if (s.captured) {
      s.dx = dx;
      setDragX(dx);
    }
  };
  const onPointerUp = () => {
    const s = dragRef.current;
    dragRef.current = null;
    if (!s || !s.captured) { setDragX(0); return; }
    const W = 320; // approx container width — only used as a commit threshold
    setAnimating(true);
    if (Math.abs(s.dx) > W * 0.22) {
      // Drag right (positive dx) → previous week; drag left → next week.
      goWeek(s.dx > 0 ? -1 : 1);
    }
    setDragX(0);
    setTimeout(() => setAnimating(false), 240);
  };

  const start = weekDate;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const fmtMonth = (d) => d.toLocaleString('en-US', { month: 'short' });
  const label = sameMonth
    ? `${fmtMonth(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    : `${fmtMonth(start)} ${start.getDate()} – ${fmtMonth(end)} ${end.getDate()}, ${end.getFullYear()}`;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Week header — prev / picker / next */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 12,
      }}>
        <button
          onClick={() => goWeek(-1)}
          aria-label="Previous week"
          style={weekNavBtn}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          style={{
            flex: 1, appearance: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: FG_PINK,
            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            fontFamily: 'Geist, ui-sans-serif, system-ui',
          }}
        >
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(250,128,114,0.45)',
          }}>Week of</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        </button>
        <button
          onClick={() => goWeek(1)}
          aria-label="Next week"
          style={weekNavBtn}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {calendarOpen && (
        <CalendarPicker
          selected={weekDate}
          onPick={(d) => { setWeekKey(weekKey(d)); setCalendarOpen(false); }}
          onClose={() => setCalendarOpen(false)}
          accent={accent}
        />
      )}

      {/* Swipe container */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
      >
        <div style={{
          transform: `translate3d(${dragX}px, 0, 0)`,
          transition: animating ? 'transform 0.22s ease-out' : 'none',
          opacity: 1 - Math.min(0.35, Math.abs(dragX) / 800),
          willChange: 'transform',
        }}>
          <SectionTitle>Tasks · {tasks.filter((t) => !t.done).length} open</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            {tasks.length === 0 && (
              <div style={{
                color: 'rgba(250,128,114,0.4)', fontSize: 13,
                padding: '12px 0',
              }}>No tasks for this week. Add one above.</div>
            )}
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} accent={accent} onToggle={onToggle} onRemove={onRemove} />
            ))}
          </div>

          <SectionTitle>Recent</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            {log.length === 0 && (
              <div style={{
                color: 'rgba(250,128,114,0.35)', fontSize: 12,
                padding: '6px 0', fontFamily: 'Geist Mono, ui-monospace, monospace',
                letterSpacing: '0.06em',
              }}>Nothing logged yet.</div>
            )}
            {log.map((e, i) => <LogRow key={i} entry={e} />)}
          </div>

          <SectionTitle>Note</SectionTitle>
          <NoteField value={note} onChange={onNoteChange} />
        </div>
      </div>

      {/* Hint */}
      <div style={{
        marginTop: 12, textAlign: 'center',
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(250,128,114,0.3)',
      }}>
        ← swipe to change week →
      </div>
    </div>
  );
}

const weekNavBtn = {
  appearance: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: FG_PINK,
  width: 36, height: 36, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0, flexShrink: 0,
};

function CalendarPicker({ selected, onPick, onClose, accent }) {
  const [viewMonth, setViewMonth] = React.useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const goMonth = (dir) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + dir, 1));
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const selWeekStart = +startOfWeek(selected);

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  // Monday-first weekday for the 1st of the month: Sun=0 → 6, Mon=1 → 0, etc.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{
      background: '#15151A',
      border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 14, padding: 14, marginBottom: 12,
      boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <button onClick={() => goMonth(-1)} aria-label="Previous month" style={weekNavBtn}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontStyle: 'italic', fontSize: 22, color: FG_PINK,
        }}>
          {viewMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={() => goMonth(1)} aria-label="Next month" style={weekNavBtn}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
        marginBottom: 6,
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'rgba(250,128,114,0.4)',
      }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
          const cellWeek = +startOfWeek(cellDate);
          const inSelectedWeek = cellWeek === selWeekStart;
          const isToday = +cellDate === +today;
          return (
            <button
              key={i}
              onClick={() => onPick(cellDate)}
              style={{
                appearance: 'none', border: 0, cursor: 'pointer',
                background: inSelectedWeek ? accent : 'transparent',
                color: inSelectedWeek ? '#0B0B0E'
                  : (isToday ? accent : FG_PINK),
                fontWeight: isToday ? 600 : 400,
                fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                padding: '10px 0', borderRadius: 8,
                transition: 'background 0.15s',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 10, gap: 8,
      }}>
        <button
          onClick={() => { onPick(new Date()); }}
          style={{
            appearance: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: FG_PINK,
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >This week</button>
        <button
          onClick={onClose}
          style={{
            appearance: 'none', border: 0,
            background: 'transparent', color: 'rgba(250,128,114,0.55)',
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >Close</button>
      </div>
    </div>
  );
}

// Person sections (people on the scroll wheel). The wheel shows only the
// first name (parsed from section.name); this view edits the full name plus
// phones / emails / birthday / socials / notes. All edits are persisted via
// the parent's peopleData map (keyed by section id) in app.jsx.
// Common social platforms surfaced as quick-add chips. Unrecognized platforms
// fall through socialUrl() and just don't get a clickable link icon.
const SOCIAL_PLATFORMS = [
  'Instagram', 'X', 'TikTok', 'Twitch', 'YouTube',
  'Snapchat', 'LinkedIn', 'Threads',
];

function socialUrl(platform, handle) {
  if (!handle) return null;
  const h = handle.replace(/^@/, '').trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(handle)) return handle;
  const p = (platform || '').toLowerCase().trim();
  if (p.includes('instagram') || p === 'ig') return `https://instagram.com/${h}`;
  if (p === 'x' || p.includes('twitter')) return `https://x.com/${h}`;
  if (p.includes('tiktok')) return `https://www.tiktok.com/@${h}`;
  if (p.includes('twitch')) return `https://twitch.tv/${h}`;
  if (p.includes('youtube') || p === 'yt') return `https://www.youtube.com/@${h}`;
  if (p.includes('snap')) return `https://www.snapchat.com/add/${h}`;
  if (p.includes('linkedin') || p === 'li') return `https://www.linkedin.com/in/${h}`;
  if (p.includes('threads')) return `https://www.threads.net/@${h}`;
  if (p.includes('facebook') || p === 'fb') return `https://www.facebook.com/${h}`;
  if (p.includes('github') || p === 'gh') return `https://github.com/${h}`;
  return null;
}

function openLink(href) {
  if (!href || typeof window === 'undefined') return;
  // On mobile, tel: and mailto: hand off to the dialer / mail client. Web
  // links open in a new tab; iOS Safari may then deep-link into installed
  // apps (e.g. Instagram, YouTube) when their universal-link is registered.
  window.open(href, '_blank', 'noopener,noreferrer');
}

function PersonDetails({ section, peopleData, setPeopleData, accent }) {
  const data = peopleData[section.id] || {
    phones: [], emails: [], socials: [], birthday: '', notes: '', reminders: [],
  };
  const [newReminder, setNewReminder] = React.useState('');

  const patch = (updater) => {
    setPeopleData((prev) => {
      const cur = prev[section.id] || { phones: [], emails: [], socials: [], birthday: '', notes: '', reminders: [] };
      return { ...prev, [section.id]: updater(cur) };
    });
  };

  const addReminder = (e) => {
    e?.preventDefault?.();
    const text = newReminder.trim();
    if (!text) return;
    patch((c) => ({ ...c, reminders: [{ id: Date.now() + Math.random(), text, done: false, createdAt: Date.now() }, ...(c.reminders || [])] }));
    setNewReminder('');
  };
  const toggleReminder = (id) => {
    patch((c) => ({ ...c, reminders: (c.reminders || []).map((r) => (r.id === id ? { ...r, done: !r.done } : r)) }));
  };
  const removeReminder = (id) => {
    patch((c) => ({ ...c, reminders: (c.reminders || []).filter((r) => r.id !== id) }));
  };

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: FG_PINK,
    borderRadius: 10,
    padding: '10px 12px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 14,
    boxSizing: 'border-box',
  };
  const labelStyle = {
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'rgba(250,128,114,0.55)',
  };
  const xBtnStyle = {
    appearance: 'none', border: 0, background: 'transparent',
    color: 'rgba(250,128,114,0.45)', cursor: 'pointer',
    padding: 4, fontSize: 16, lineHeight: 1, flexShrink: 0,
  };
  const openBtnStyle = (enabled) => ({
    appearance: 'none',
    border: `0.5px solid ${enabled ? accent : 'rgba(255,255,255,0.1)'}`,
    background: 'transparent',
    color: enabled ? accent : 'rgba(250,128,114,0.25)',
    cursor: enabled ? 'pointer' : 'default',
    width: 28, height: 28, borderRadius: 7, padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });
  const addLinkStyle = {
    appearance: 'none', border: 0, background: 'transparent',
    color: accent, cursor: 'pointer', padding: '6px 0',
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
    fontWeight: 600,
  };
  const OpenIcon = (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 9 9 3 M5 3h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const addRow = (key, seed) => patch((c) => ({ ...c, [key]: [...(c[key] || []), { id: Date.now() + Math.random(), ...seed }] }));
  const updateRow = (key, id, p) => patch((c) => ({ ...c, [key]: (c[key] || []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const removeRow = (key, id) => patch((c) => ({ ...c, [key]: (c[key] || []).filter((r) => r.id !== id) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Reminders — open ones bubble up to the Home section until checked off. */}
      <div>
        <SectionTitle>Reminders · {(data.reminders || []).filter((r) => !r.done).length} open</SectionTitle>
        <form onSubmit={addReminder} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          padding: '8px 10px', borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.12)',
        }}>
          <input
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            placeholder="Follow up with them about…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              color: FG_PINK, fontFamily: 'Geist, ui-sans-serif, system-ui',
              fontSize: 14,
            }}
          />
          {newReminder.trim() && (
            <button type="submit" style={{
              appearance: 'none', border: 0, padding: '4px 10px',
              background: accent, color: '#0B0B0E',
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}>Add</button>
          )}
        </form>
        {(data.reminders || []).length === 0 && (
          <div style={{
            color: 'rgba(250,128,114,0.4)', fontSize: 13, padding: '4px 0',
          }}>No reminders yet.</div>
        )}
        {(data.reminders || []).map((r) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <button
              onClick={() => toggleReminder(r.id)}
              aria-label={r.done ? 'Mark not done' : 'Mark done'}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                padding: 0, cursor: 'pointer', flexShrink: 0,
                width: 18, height: 18, borderRadius: 5,
                borderStyle: 'solid', borderWidth: '1.5px',
                borderColor: r.done ? accent : 'rgba(255,255,255,0.3)',
                backgroundColor: r.done ? accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {r.done && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5 4 7 8 3" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span style={{
              flex: 1, fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
              color: r.done ? 'rgba(250,128,114,0.4)' : FG_PINK,
              textDecoration: r.done ? 'line-through' : 'none',
              textDecorationColor: 'rgba(250,128,114,0.4)',
              textDecorationThickness: '1px',
            }}>{r.text}</span>
            <button
              onClick={() => removeReminder(r.id)}
              aria-label="Remove reminder"
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: 'rgba(250,128,114,0.35)', cursor: 'pointer',
                padding: 4, fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ))}
      </div>

      {/* Phones — tap the ↗ to launch the dialer */}
      <div>
        <SectionTitle>Phones</SectionTitle>
        {(data.phones || []).map((p) => {
          const cleaned = (p.value || '').replace(/\s+/g, '');
          const href = cleaned ? `tel:${cleaned}` : null;
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 28px 28px',
              gap: 8, marginBottom: 8, alignItems: 'center',
            }}>
              <input
                value={p.label} placeholder="Mobile"
                onChange={(e) => updateRow('phones', p.id, { label: e.target.value })}
                style={{ ...fieldStyle, ...labelStyle, color: 'rgba(250,128,114,0.7)', padding: '8px 10px' }}
              />
              <input
                type="tel" inputMode="tel"
                value={p.value} placeholder="+1 555 0123"
                onChange={(e) => updateRow('phones', p.id, { value: e.target.value })}
                style={fieldStyle}
              />
              <button
                onClick={() => openLink(href)} disabled={!href}
                aria-label="Call" style={openBtnStyle(!!href)}
              >{OpenIcon}</button>
              <button onClick={() => removeRow('phones', p.id)} aria-label="Remove" style={xBtnStyle}>×</button>
            </div>
          );
        })}
        <button onClick={() => addRow('phones', { label: 'Mobile', value: '' })} style={addLinkStyle}>
          + Add phone
        </button>
      </div>

      {/* Emails — tap the ↗ to open the mail client */}
      <div>
        <SectionTitle>Emails</SectionTitle>
        {(data.emails || []).map((m) => {
          const v = (m.value || '').trim();
          const href = v ? `mailto:${v}` : null;
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 28px 28px',
              gap: 8, marginBottom: 8, alignItems: 'center',
            }}>
              <input
                value={m.label} placeholder="Personal"
                onChange={(e) => updateRow('emails', m.id, { label: e.target.value })}
                style={{ ...fieldStyle, ...labelStyle, color: 'rgba(250,128,114,0.7)', padding: '8px 10px' }}
              />
              <input
                type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
                value={m.value} placeholder="name@example.com"
                onChange={(e) => updateRow('emails', m.id, { value: e.target.value })}
                style={fieldStyle}
              />
              <button
                onClick={() => openLink(href)} disabled={!href}
                aria-label="Email" style={openBtnStyle(!!href)}
              >{OpenIcon}</button>
              <button onClick={() => removeRow('emails', m.id)} aria-label="Remove" style={xBtnStyle}>×</button>
            </div>
          );
        })}
        <button onClick={() => addRow('emails', { label: 'Personal', value: '' })} style={addLinkStyle}>
          + Add email
        </button>
      </div>

      {/* Birthday */}
      <div>
        <SectionTitle>Birthday</SectionTitle>
        <input
          type="date"
          value={data.birthday || ''}
          onChange={(e) => patch((c) => ({ ...c, birthday: e.target.value }))}
          style={{ ...fieldStyle, width: '100%', colorScheme: 'dark' }}
        />
      </div>

      {/* Socials — quick-add chips per platform (Twitch & YouTube included),
          and ↗ opens the platform's profile URL (deep-links to the native
          app on iOS when the universal-link handler is registered). */}
      <div>
        <SectionTitle>Social</SectionTitle>
        {(data.socials || []).map((s) => {
          const href = socialUrl(s.platform, s.handle);
          return (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr 28px 28px',
              gap: 8, marginBottom: 8, alignItems: 'center',
            }}>
              <input
                value={s.platform} placeholder="Instagram"
                onChange={(e) => updateRow('socials', s.id, { platform: e.target.value })}
                style={{ ...fieldStyle, ...labelStyle, color: 'rgba(250,128,114,0.7)', padding: '8px 10px' }}
              />
              <input
                value={s.handle} placeholder="@handle"
                autoCapitalize="off" autoCorrect="off"
                onChange={(e) => updateRow('socials', s.id, { handle: e.target.value })}
                style={fieldStyle}
              />
              <button
                onClick={() => openLink(href)} disabled={!href}
                aria-label="Open profile" style={openBtnStyle(!!href)}
              >{OpenIcon}</button>
              <button onClick={() => removeRow('socials', s.id)} aria-label="Remove" style={xBtnStyle}>×</button>
            </div>
          );
        })}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {SOCIAL_PLATFORMS.map((plat) => (
            <button
              key={plat}
              onClick={() => addRow('socials', { platform: plat, handle: '' })}
              style={{
                appearance: 'none',
                border: '0.5px dashed rgba(255,255,255,0.18)',
                background: 'transparent', color: accent, cursor: 'pointer',
                padding: '6px 10px', borderRadius: 999,
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >+ {plat}</button>
          ))}
          <button
            onClick={() => addRow('socials', { platform: '', handle: '' })}
            style={{
              appearance: 'none',
              border: '0.5px dashed rgba(255,255,255,0.18)',
              background: 'transparent', color: 'rgba(250,128,114,0.7)', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 999,
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}
          >+ Other</button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <SectionTitle>Notes</SectionTitle>
        <NoteField
          value={data.notes || ''}
          onChange={(v) => patch((c) => ({ ...c, notes: v }))}
        />
      </div>

    </div>
  );
}

// Home / welcome section. The brief panel and detail headline read
// "Welcome <first name>" (with the first name accent-colored). This editor
// changes that name and surfaces every open person-reminder across the wheel
// — they sit at the top until checked off, at which point they drop out of
// the home feed but stay in the source person's reminders list.
function HomeDetails({ userName, setUserName, accent, sections, peopleData, setPeopleData }) {
  // Collect open reminders across every person section so the user sees them
  // in one place on Home. Each entry remembers which person it came from so
  // toggling done writes back to the right people-data bucket.
  const reminders = React.useMemo(() => {
    const out = [];
    for (const sec of sections || []) {
      if ((sec.contentKey || sec.id) !== 'person') continue;
      const pd = peopleData && peopleData[sec.id];
      if (!pd || !pd.reminders) continue;
      for (const r of pd.reminders) {
        if (!r.done) out.push({ ...r, sectionId: sec.id, person: sec });
      }
    }
    // Newest-added first.
    return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [sections, peopleData]);

  const completeReminder = (sectionId, id) => {
    setPeopleData((prev) => {
      const cur = prev[sectionId];
      if (!cur || !cur.reminders) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...cur,
          reminders: cur.reminders.map((r) => (r.id === id ? { ...r, done: true } : r)),
        },
      };
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {reminders.length > 0 && (
        <div>
          <SectionTitle>Reminders · {reminders.length} open</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {reminders.map((r) => (
              <div key={`${r.sectionId}-${r.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
              }}>
                <button
                  onClick={() => completeReminder(r.sectionId, r.id)}
                  aria-label="Mark done"
                  style={{
                    appearance: 'none', border: 0, background: 'transparent',
                    padding: 0, cursor: 'pointer', flexShrink: 0,
                    width: 18, height: 18, borderRadius: 5,
                    borderStyle: 'solid', borderWidth: '1.5px',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'transparent',
                    transition: 'all 0.15s',
                  }}
                />
                {/* Avatar mini-thumb */}
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  overflow: 'hidden', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: FG_WHITE,
                }}>
                  {r.person?.iconData
                    ? <img src={r.person.iconData} alt="" style={{ width: 22, height: 22, objectFit: 'cover' }} />
                    : <div style={{ width: 14, height: 14 }}>{Icon[r.person?.iconKey] || Icon.user}</div>}
                </div>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace, monospace',
                    fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'rgba(250,128,114,0.55)',
                  }}>
                    {r.person?.name || 'Person'}
                  </span>
                  <span style={{
                    fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
                    color: FG_PINK, lineHeight: 1.25,
                  }}>{r.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle>Your name</SectionTitle>
        <input
          value={userName || ''}
          onChange={(e) => setUserName && setUserName(e.target.value)}
          placeholder="Your name"
          autoCapitalize="words"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)', color: FG_PINK,
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '12px 14px', outline: 'none',
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontStyle: 'italic', fontSize: 20,
          }}
        />
        <div style={{
          marginTop: 8, fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(250,128,114,0.55)',
        }}>
          Home greets you with your first name in <span style={{ color: accent }}>accent</span>.
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '16px 18px',
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic',
          fontSize: 22, color: FG_PINK, marginBottom: 6,
        }}>
          Make it yours.
        </div>
        <div style={{
          fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 13.5,
          color: 'rgba(250,128,114,0.65)', lineHeight: 1.5,
        }}>
          Open Settings (gear, top-right) to add new sections — work, classes,
          people — reorder the dial, change accent or typeface, or upload custom
          icons. Swipe the dial below to navigate between sections.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DetailView });

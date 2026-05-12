// detail.jsx — Full detail view that appears after liquid swipe-up.
// Black background, salmon-pink text. Icons and the semester-picker GPA
// stay white so they read as accents on top of the salmon copy.

const FG_PINK = '#FA8072';   // salmon — primary text inside the detail view
const FG_WHITE = '#FAFAF7';  // explicit white for icons + GPA chip

function DetailView({
  section, content, accent, onClose, onCloseDragStart, visible, progress = 1,
  schoolSemesters, setSchoolSemesters,
  schoolActiveSemesterId, selectSchoolSemester,
  weeklyData, setWeeklyData, weeklyActiveKey, setWeeklyActiveKey,
  peopleData, setPeopleData,
  userName, setUserName,
  sections, updateSection,
  homeData, setHomeData,
  budgetData, setBudgetData,
  healthData, setHealthData,
  travelData, setTravelData,
  workoutsData, setWorkoutsData,
  mealsData, setMealsData,
  icsEvents, icsLinks, onIcsRefresh,
  scale = 1,
}) {
  // Scale a handful of the most-visible chrome elements in the detail view
  // (top-bar section label, headline, section titles) so the sheet reads
  // comfortably on the Fold cover screen alongside the already-scaled
  // brief panel. Component-internal type stays at its phone baseline.
  const s = scale;
  const isSchool = (section.contentKey || section.id) === 'school';
  const isWork = (section.contentKey || section.id) === 'work';
  const isPerson = (section.contentKey || section.id) === 'person';
  const isHome = (section.contentKey || section.id) === 'home';
  const isBudget = (section.contentKey || section.id) === 'budget';
  const isHealth = (section.contentKey || section.id) === 'health';
  const isTravel = (section.contentKey || section.id) === 'travel';
  const isWorkouts = (section.contentKey || section.id) === 'workouts';
  const isMeals = (section.contentKey || section.id) === 'meals';
  // Both work and school run the weekly view (calendar + per-week
  // tasks/log/note + horizontal swipe between weeks).
  const isWeekly = isSchool || isWork;

  // Non-weekly sections still keep their own in-memory tasks/log/note,
  // refreshed when you swipe to a different section.
  const [localTasks, setLocalTasks] = React.useState(content.tasks);
  const [localLog, setLocalLog] = React.useState(content.log);
  const [localNote, setLocalNote] = React.useState(content.note);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!isWeekly) {
      setLocalTasks(content.tasks);
      setLocalLog(content.log);
      setLocalNote(content.note);
    }
  }, [section.id, isWeekly]);

  // For weekly sections, the per-section week store is the source of truth.
  // Read/write helpers act on the section's currently-active week.
  const sectionId = section.id;
  const sectionWeekly = (weeklyData && weeklyData[sectionId]) || {};
  const sectionActiveWeekKey = (weeklyActiveKey && weeklyActiveKey[sectionId]) || weekKey(new Date());
  const weekData = isWeekly
    ? (sectionWeekly[sectionActiveWeekKey] || { tasks: [], log: [], note: '' })
    : null;
  const updateActiveWeek = React.useCallback((updater) => {
    setWeeklyData((prev) => {
      const sec = prev[sectionId] || {};
      const cur = sec[sectionActiveWeekKey] || { tasks: [], log: [], note: '' };
      return { ...prev, [sectionId]: { ...sec, [sectionActiveWeekKey]: updater(cur) } };
    });
  }, [setWeeklyData, sectionId, sectionActiveWeekKey]);
  const setSectionWeekKey = React.useCallback((k) => {
    setWeeklyActiveKey((prev) => ({ ...prev, [sectionId]: k }));
  }, [setWeeklyActiveKey, sectionId]);

  const tasks = isWeekly ? weekData.tasks : localTasks;
  const log = isWeekly ? weekData.log : localLog;
  const note = isWeekly ? weekData.note : localNote;

  // Wraps a log array with a new entry timestamped right now. Tasks added /
  // completed in weekly mode get a Recent line so the user can see what
  // they did this week without us having to hardcode anything.
  const logged = (existing, text) => [
    { id: Date.now() + Math.random(), when: Date.now(), text },
    ...(existing || []),
  ];

  const toggle = (id) => {
    if (isWeekly) {
      updateActiveWeek((w) => {
        const task = w.tasks.find((t) => t.id === id);
        const nextTasks = w.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
        // Log a check entry only when transitioning open → done.
        if (task && !task.done) {
          return { ...w, tasks: nextTasks, log: logged(w.log, `✓ ${task.title}`) };
        }
        return { ...w, tasks: nextTasks };
      });
    } else {
      setLocalTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    }
  };

  const removeTask = (id) => {
    if (isWeekly) {
      updateActiveWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    } else {
      setLocalTasks((ts) => ts.filter((t) => t.id !== id));
    }
  };

  const setNote = (v) => {
    if (isWeekly) {
      updateActiveWeek((w) => ({ ...w, note: v }));
    } else {
      setLocalNote(v);
    }
  };

  const add = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    const newTask = { id: Date.now(), title: text, done: false };
    if (isWeekly) {
      updateActiveWeek((w) => ({
        ...w,
        tasks: [newTask, ...w.tasks],
        log: logged(w.log, `+ ${text}`),
      }));
    } else {
      setLocalTasks((ts) => [newTask, ...ts]);
      setLocalLog((l) => [{ id: Date.now() + Math.random(), when: Date.now(), text: `+ ${text}` }, ...l]);
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

      {/* Top bar: just the section name, centered. Closing is done by
          dragging the top handle bar down (or with a downward fling on the
          handle's pull tab) — one mechanism, less visual noise. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18, marginTop: 14, position: 'relative', zIndex: 3,
      }}>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 13 * s, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(250,128,114,0.5)',
        }}>
          {isPerson ? 'Person' : isHome ? 'Home' : isBudget ? 'Budget' : section.name}
        </div>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 * s, marginBottom: 22 * s }}>
        <div style={{
          width: 32 * s, height: 32 * s, color: FG_WHITE,
          borderRadius: isPerson ? '50%' : 0, overflow: 'hidden',
        }}>
          {section.iconData
            ? <img src={section.iconData} alt="" style={{
                width: 32 * s, height: 32 * s,
                objectFit: isPerson ? 'cover' : 'contain',
              }} />
            : (Icon[section.iconKey] || Icon.target)}
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 42 * s, lineHeight: '0.95', fontWeight: 400, fontStyle: 'italic',
          letterSpacing: '-0.02em',
        }}>
          {content.headline}
        </div>
      </div>

      {/* Quick-add — hidden for sections with their own editors */}
      {!isPerson && !isHome && !isBudget && !isHealth && !isTravel && !isWorkouts && !isMeals && (
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
            placeholder={isWeekly ? 'Quick add to this week…' : 'Quick add to this section…'}
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
            homeData={homeData}
            setHomeData={setHomeData}
          />
        ) : isBudget ? (
          <BudgetDetails
            data={budgetData}
            setData={setBudgetData}
            accent={accent}
          />
        ) : isPerson ? (
          <PersonDetails
            section={section}
            peopleData={peopleData}
            setPeopleData={setPeopleData}
            accent={accent}
          />
        ) : isHealth ? (
          <HealthDetails
            sectionId={section.id}
            healthData={healthData}
            setHealthData={setHealthData}
            accent={accent}
          />
        ) : isTravel ? (
          <TravelDetails
            sectionId={section.id}
            travelData={travelData}
            setTravelData={setTravelData}
            accent={accent}
          />
        ) : isWorkouts ? (
          <WorkoutsDetails
            sectionId={section.id}
            workoutsData={workoutsData}
            setWorkoutsData={setWorkoutsData}
            accent={accent}
          />
        ) : isMeals ? (
          <MealsDetails
            sectionId={section.id}
            mealsData={mealsData}
            setMealsData={setMealsData}
            accent={accent}
          />
        ) : isWeekly ? (
          <WeeklyView
            weekKey={sectionActiveWeekKey}
            setWeekKey={setSectionWeekKey}
            tasks={tasks}
            log={log}
            note={note}
            onToggle={toggle}
            onRemove={removeTask}
            onNoteChange={setNote}
            accent={accent}
            events={(icsEvents && icsEvents[section.id] && icsEvents[section.id].events) || []}
            icsError={(icsEvents && icsEvents[section.id] && icsEvents[section.id].error) || null}
            icsTotalParsed={(icsEvents && icsEvents[section.id] && icsEvents[section.id].totalParsed) || 0}
            icsBytes={(icsEvents && icsEvents[section.id] && icsEvents[section.id].bytes) || 0}
            icsRawVeventMatches={(icsEvents && icsEvents[section.id] && icsEvents[section.id].rawVeventMatches) || 0}
            icsConfigured={!!(icsLinks && icsLinks[section.id])}
            onIcsRefresh={onIcsRefresh}
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

// Compact relative-time formatter used by the Recent log. "Just now" within a
// minute, "Nm" / "Nh" later in the day, weekday name within a week, otherwise
// "Mmm D".
function formatRelativeWhen(when) {
  if (!when || typeof when !== 'number') return null;
  const diff = Date.now() - when;
  if (diff < 0) return 'Just now';
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return new Date(when).toLocaleDateString('en-US', { weekday: 'short' });
  return new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Read-only event row sourced from an ICS feed. Renders inline in the same
// list as user tasks so the "Tasks · N open" count covers both. No
// checkbox / delete — events live in the source calendar, edit there.
function EventRow({ event }) {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  const dow = start.toLocaleDateString('en-US', { weekday: 'short' });
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const endTime = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const isAllDay = start.getHours() === 0 && start.getMinutes() === 0
    && end && (end - start) >= 86_300_000; // ~24h
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      fontFamily: 'Geist, ui-sans-serif, system-ui', fontSize: 14,
      color: FG_PINK,
    }}>
      {/* Calendar icon stands in for the checkbox to mark this as a
          read-only Outlook event rather than a checkable task. */}
      <div style={{
        flexShrink: 0, width: 18, height: 18, borderRadius: 5,
        border: '1.5px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(250,128,114,0.55)', marginTop: 2,
      }} title="From Outlook (read-only)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18 M8 3v4 M16 3v4" />
        </svg>
      </div>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10.5, letterSpacing: '0.06em',
            color: 'rgba(250,128,114,0.55)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>
            {dow} · {isAllDay ? 'All day' : (endTime ? `${startTime}–${endTime}` : startTime)}
          </span>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.summary}
          </span>
        </span>
        {event.location && (
          <span style={{
            fontSize: 11.5, color: 'rgba(250,128,114,0.5)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            @ {event.location}
          </span>
        )}
      </span>
    </div>
  );
}

function LogRow({ entry }) {
  // Prefer real timestamps. Legacy entries (pre-migration) had a hardcoded
  // `t` string like "Tue" — fall back to that when present so existing data
  // still renders something useful.
  const label = formatRelativeWhen(entry.when) || entry.t || '—';
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
      }}>{label}</div>
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
      fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase',
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
  events = [],   // read-only ICS events for the active week, already filtered
  icsError = null,
  icsTotalParsed = 0,
  icsBytes = 0,
  icsRawVeventMatches = 0,
  icsConfigured = false,
  onIcsRefresh,
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
          {(() => {
            const openTasks = tasks.filter((t) => !t.done).length;
            const totalOpen = openTasks + (events ? events.length : 0);
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <SectionTitle>Tasks · {totalOpen} open</SectionTitle>
                {icsConfigured && onIcsRefresh && (
                  <button
                    onClick={onIcsRefresh}
                    style={{
                      appearance: 'none', border: 0, background: 'transparent',
                      color: accent, cursor: 'pointer', padding: 0,
                      fontFamily: 'Geist Mono, ui-monospace, monospace',
                      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >Refresh calendar</button>
                )}
              </div>
            );
          })()}
          {/* Diagnostic — only when the feed is configured but nothing showed
              up in this week. Tells the user whether the feed was empty, or
              had events outside this week (e.g., calendar's all-events lives
              in a different range). */}
          {icsConfigured && !icsError && events.length === 0 && (
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.06em',
              color: 'rgba(250,128,114,0.55)',
              padding: '6px 0 10px',
              lineHeight: 1.5,
            }}>
              {icsTotalParsed === 0 && icsRawVeventMatches === 0
                ? `Calendar loaded · 0 events in feed · ${icsBytes} bytes (proxy may be returning a stub — try Refresh, or in Outlook tap Reset links and republish)`
                : icsTotalParsed === 0 && icsRawVeventMatches > 0
                ? `Parser missed ${icsRawVeventMatches} VEVENT entries (${icsBytes} bytes) — bug, send the ICS link to debug`
                : `Calendar loaded · ${icsTotalParsed} event${icsTotalParsed === 1 ? '' : 's'} in feed, none this week`}
            </div>
          )}
          {icsError && (
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 11, letterSpacing: '0.04em',
              color: '#A03030', lineHeight: 1.4,
              background: 'rgba(160,48,48,0.08)',
              border: '0.5px solid rgba(160,48,48,0.25)',
              borderRadius: 8, padding: '8px 10px',
              marginBottom: 10,
            }}>
              Calendar fetch failed: {icsError}
            </div>
          )}
          {(() => {
            // Split events into "today" and "rest of week" so the user sees
            // what's actually happening now without scrolling past every
            // other day. Today is highlighted with an accent-colored header.
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const eventsToday = (events || []).filter((e) => {
              const d = new Date(e.start);
              return d >= today && d < tomorrow;
            });
            const eventsRest = (events || []).filter((e) => !eventsToday.includes(e));
            return (
              <>
                {eventsToday.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{
                      fontFamily: 'Geist Mono, ui-monospace, monospace',
                      fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: accent, marginBottom: 8,
                    }}>
                      Today · {eventsToday.length} meeting{eventsToday.length === 1 ? '' : 's'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {eventsToday.map((e) => <EventRow key={e.uid} event={e} />)}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
                  {/* Rest of the week's events (read-only, sorted
                      chronologically). They live in the source calendar. */}
                  {eventsRest.map((e) => <EventRow key={e.uid} event={e} />)}
                  {tasks.length === 0 && (!events || events.length === 0) && (
                    <div style={{
                      color: 'rgba(250,128,114,0.4)', fontSize: 13,
                      padding: '12px 0',
                    }}>No tasks for this week. Add one above.</div>
                  )}
                  {tasks.map((t) => (
                    <TaskRow key={t.id} task={t} accent={accent} onToggle={onToggle} onRemove={onRemove} />
                  ))}
                </div>
              </>
            );
          })()}

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
  // In standalone-PWA mode, window.open('_blank') spawns an empty in-app
  // browser overlay that lingers after the OS hands the URL off to a
  // native app (the universal-link case for Instagram, Twitch, YouTube,
  // etc., or tel: / mailto: routing to the dialer / mail client). Using
  // location.href instead lets the OS take over without leaving an empty
  // overlay behind: iOS / Android both treat cross-origin navigation in
  // standalone mode as "open in the system browser" — which is exactly
  // what triggers the universal-link handoff — without actually navigating
  // the PWA away from Swiped.
  //
  // In a regular browser tab we still want target=_blank behavior so the
  // user doesn't lose their place in Swiped.
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
  if (isStandalone) {
    window.location.href = href;
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

// Shared contact-card block. Renders phones / emails / birthday / socials /
// notes against any { phones, emails, socials, birthday, notes } record.
// Used by both PersonDetails (one entry per person section) and HomeDetails
// (your own profile).
function ContactCard({ data, patch, accent }) {
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
    <React.Fragment>
      {/* Phones — tap ↗ to launch the dialer */}
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

      {/* Emails — tap ↗ to open the mail client */}
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

      {/* Socials — quick-add chips per platform (Twitch + YouTube included).
          ↗ opens the platform's profile URL, which deep-links into the
          native app on iOS when universal-link handlers are registered. */}
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
    </React.Fragment>
  );
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

      {/* Contact card — phones, emails, birthday, socials, notes. */}
      <ContactCard data={data} patch={patch} accent={accent} />
    </div>
  );
}

// Home / welcome section. The brief panel and detail headline read
// "Welcome <first name>" (with the first name accent-colored). This editor
// changes that name, surfaces every open person-reminder across the wheel
// (they sit at the top until checked off), and lets the user fill in their
// own contact card — phones, emails, birthday, socials, notes — that they
// can tap to launch.
function HomeDetails({
  userName, setUserName, accent,
  sections, peopleData, setPeopleData,
  homeData, setHomeData,
}) {
  const homePatch = React.useCallback((updater) => {
    setHomeData((prev) => updater(prev || { phones: [], emails: [], socials: [], birthday: '', notes: '' }));
  }, [setHomeData]);

  const safeHome = homeData || { phones: [], emails: [], socials: [], birthday: '', notes: '' };
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

      {/* Your contact card — same shape as a person section, except it's
          yours. Phones, emails, birthday, socials, and notes all tap-through
          to the appropriate app via the ↗ buttons. */}
      <ContactCard data={safeHome} patch={homePatch} accent={accent} />
    </div>
  );
}

// Budget section — three spreadsheet-style tables (accounts, monthly
// income, upcoming bills) plus a free-form notes field. All numbers in the
// brief panel + stats grid (Balance / Income / Due ≤7d) are derived from
// this data in app.jsx, so editing here updates the wheel immediately.
function BudgetDetails({ data, setData, accent }) {
  const safe = data || { accounts: [], income: [], bills: [], subscriptions: [], notes: '' };

  const patch = React.useCallback((updater) => {
    setData((prev) => updater(prev || { accounts: [], income: [], bills: [], subscriptions: [], notes: '' }));
  }, [setData]);

  const addRow = (key, seed) => patch((c) => ({ ...c, [key]: [...(c[key] || []), { id: Date.now() + Math.random(), ...seed }] }));
  const updateRow = (key, id, p) => patch((c) => ({ ...c, [key]: (c[key] || []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const removeRow = (key, id) => patch((c) => ({ ...c, [key]: (c[key] || []).filter((r) => r.id !== id) }));

  const fmt = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString('en-US', {
      style: 'currency', currency: 'USD',
      maximumFractionDigits: v < 1000 ? 2 : 0,
    });
  };

  // Accounts split by kind. Credit cards aren't liquid funds in the
  // traditional sense, but their available credit is spendable — so we
  // roll it into Total balance alongside cash. Used credit + utilization
  // are still surfaced per-card below.
  const cashAccounts = safe.accounts.filter((a) => (a.kind || 'cash') !== 'credit');
  const creditAccounts = safe.accounts.filter((a) => a.kind === 'credit');
  const cashTotal = cashAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const totalCreditLimit = creditAccounts.reduce((s, a) => s + (Number(a.limit) || 0), 0);
  const totalCreditAvail = creditAccounts.reduce((s, a) => s + (Number(a.available) || 0), 0);
  const totalCreditUsed = Math.max(0, totalCreditLimit - totalCreditAvail);
  const totalBalance = cashTotal + totalCreditAvail;
  const monthlyIncomeNet = safe.income.reduce((s, i) => s + monthlyNetIncome(i), 0);
  const yearlyIncomeNet = monthlyIncomeNet * 12;
  // Bills now carry a frequency (default 'monthly'). 'one-time' entries
  // don't recur and are excluded from the yearly projection (but still
  // surface in Due ≤7d). 'yearly' amounts are divided by 12.
  const billsMonthly = safe.bills.reduce((s, b) => {
    const amt = Number(b.amount) || 0;
    const f = b.frequency || 'monthly';
    if (f === 'yearly') return s + amt / 12;
    if (f === 'one-time') return s;
    return s + amt;
  }, 0);
  const yearlyBills = billsMonthly * 12;
  const billsTotal = billsMonthly; // alias used in Year Overview below
  // Subscriptions normalize Monthly + Yearly entries to a single monthly
  // figure (yearly ÷ 12), then flow into the Year Overview alongside bills.
  const subsMonthly = (safe.subscriptions || []).reduce((s, sub) => {
    const amt = Number(sub.amount) || 0;
    return s + (sub.frequency === 'yearly' ? amt / 12 : amt);
  }, 0);
  const subsYearly = subsMonthly * 12;
  const monthlyOut = billsMonthly + subsMonthly;
  const yearlyOut = yearlyBills + subsYearly;
  const monthlyNet = monthlyIncomeNet - monthlyOut;
  const yearlyNet = monthlyNet * 12;

  const baseField = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: FG_PINK,
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 14,
    boxSizing: 'border-box',
    minWidth: 0,
  };
  const moneyField = {
    ...baseField,
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  };
  const colHeadStyle = {
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'rgba(250,128,114,0.45)',
    paddingBottom: 4,
  };
  const xBtn = {
    appearance: 'none', border: 0, background: 'transparent',
    color: 'rgba(250,128,114,0.4)', cursor: 'pointer',
    padding: 4, fontSize: 16, lineHeight: 1, flexShrink: 0,
  };
  const addBtn = {
    appearance: 'none', border: 0, background: 'transparent',
    color: accent, cursor: 'pointer', padding: '6px 0', marginTop: 4,
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
    fontWeight: 600,
  };
  const sumStyle = {
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(250,128,114,0.55)',
  };

  // Sort bills by due date ascending; ones without a date drift to the bottom.
  // Sort bills by their *next* upcoming date (after auto-advancing past
  // monthly / yearly dates forward) so the row at the top is whatever's
  // really due next, not whatever's stored. Bills with no date sink.
  const sortedBills = safe.bills.slice().sort((a, b) => {
    const da = nextRenewal({ renewalDate: a.dueDate, frequency: a.frequency || 'monthly' });
    const db = nextRenewal({ renewalDate: b.dueDate, frequency: b.frequency || 'monthly' });
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  // Mini row used inside the Year overview card.
  const overviewRow = (label, yearly, monthly, opts = {}) => {
    const valueColor = opts.color || FG_WHITE;
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        alignItems: 'baseline', gap: 14,
        padding: '8px 0',
        borderTop: opts.divider ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
      }}>
        <span style={{
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(250,128,114,0.55)',
        }}>{label}</span>
        <span style={{
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.06em',
          color: 'rgba(250,128,114,0.45)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(monthly)}<span style={{ marginLeft: 2 }}>/mo</span>
        </span>
        <span style={{
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          fontSize: 17, fontWeight: 500, color: valueColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(yearly)}<span style={{
            fontSize: 10, color: 'rgba(250,128,114,0.45)', marginLeft: 4,
          }}>/yr</span>
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Year overview — rolls income (net), bills, and the resulting cash
          flow up to a yearly view. Bills are projected as monthly recurring
          for now. Net flips red when bills outpace income. */}
      <div style={{
        border: '0.5px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 14, padding: '12px 14px',
      }}>
        <SectionTitle>Year overview</SectionTitle>
        {overviewRow('Income · net', yearlyIncomeNet, monthlyIncomeNet, { color: accent })}
        {overviewRow('Bills', yearlyBills, billsTotal, { divider: true })}
        {overviewRow('Subscriptions', subsYearly, subsMonthly, { divider: true })}
        {overviewRow('Net', yearlyNet, monthlyNet, {
          divider: true,
          color: monthlyNet >= 0 ? accent : '#FA8072',
        })}
      </div>

      {/* Accounts — bank / brokerage / wallet, anything that holds money.
          Credit cards live in the same `accounts` list (kind: 'credit') but
          render as cards below with limit + available instead of balance. */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Accounts · {safe.accounts.length}</SectionTitle>
          <span style={sumStyle}>
            Total&nbsp;<span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(cashTotal)}</span>
          </span>
        </div>
        {cashAccounts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 28px', gap: 8 }}>
            <div style={colHeadStyle}>Name</div>
            <div style={{ ...colHeadStyle, textAlign: 'right' }}>Balance</div>
            <div />
          </div>
        )}
        {cashAccounts.map((a) => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 28px',
            gap: 8, marginBottom: 8, alignItems: 'center',
          }}>
            <input
              value={a.name} placeholder="Checking"
              onChange={(e) => updateRow('accounts', a.id, { name: e.target.value })}
              style={baseField}
            />
            <input
              type="number" inputMode="decimal" step="0.01"
              value={a.balance ?? ''} placeholder="0.00"
              onChange={(e) => updateRow('accounts', a.id, { balance: e.target.value })}
              style={moneyField}
            />
            <button onClick={() => removeRow('accounts', a.id)} aria-label="Remove" style={xBtn}>×</button>
          </div>
        ))}
        <button onClick={() => addRow('accounts', { name: '', balance: '', kind: 'cash' })} style={addBtn}>
          + Add account
        </button>

        {/* Credit cards — separate visual block within Accounts. Each card
            stores its limit and currently-available credit; used + utilization
            are derived. They don't contribute to Total balance above. */}
        <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(250,128,114,0.55)',
              }}>
                Credit cards{creditAccounts.length > 0 ? ` · ${creditAccounts.length}` : ''}
              </div>
              {creditAccounts.length > 0 && (
                <span style={sumStyle}>
                  Avail&nbsp;<span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalCreditAvail)}</span>
                  &nbsp;/&nbsp;
                  <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalCreditLimit)}</span>
                </span>
              )}
            </div>
            <div style={{ height: 8 }} />
            {creditAccounts.map((c) => {
              const limit = Number(c.limit) || 0;
              const avail = Number(c.available) || 0;
              const used = Math.max(0, limit - avail);
              const util = limit > 0 ? Math.min(1, used / limit) : 0;
              const utilColor = util >= 0.7 ? '#E8704A'
                : util >= 0.3 ? '#E8C547'
                : accent;
              // Auto-advance the stored due date month-by-month so the
              // displayed "next due" is always in the future. We don't write
              // the rolled value back here — that happens on blur (below) so
              // the patch doesn't fire on every render.
              const nextDue = nextRenewal({ renewalDate: c.dueDate, frequency: 'monthly' });
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const daysAway = nextDue ? Math.round((nextDue - today) / 86_400_000) : null;
              const overdue = daysAway != null && daysAway < 0;
              return (
                <div key={c.id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: 12, marginBottom: 10,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
                    <input
                      value={c.name} placeholder="Chase Sapphire, Amex, …"
                      onChange={(e) => updateRow('accounts', c.id, { name: e.target.value })}
                      style={baseField}
                    />
                    <button onClick={() => removeRow('accounts', c.id)} aria-label="Remove" style={xBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={colHeadStyle}>Limit</div>
                      <input
                        type="number" inputMode="decimal" step="0.01"
                        value={c.limit ?? ''} placeholder="0.00"
                        onChange={(e) => updateRow('accounts', c.id, { limit: e.target.value })}
                        style={{ ...moneyField, width: '100%', maxWidth: 130, alignSelf: 'flex-start', padding: '8px 14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={colHeadStyle}>Available</div>
                      <input
                        type="number" inputMode="decimal" step="0.01"
                        value={c.available ?? ''} placeholder="0.00"
                        onChange={(e) => updateRow('accounts', c.id, { available: e.target.value })}
                        style={{ ...moneyField, width: '100%', maxWidth: 130, alignSelf: 'flex-start', padding: '8px 14px' }}
                      />
                    </div>
                  </div>
                  {/* Payment due — separate from limit/available so users
                      can track the statement balance owed each month. The
                      due date auto-advances monthly; the amount stays put
                      across rollover so the prior balance carries until the
                      user updates it. */}
                  <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={colHeadStyle}>Amount due</div>
                      <input
                        type="number" inputMode="decimal" step="0.01"
                        value={c.amountDue ?? ''} placeholder="0.00"
                        onChange={(e) => updateRow('accounts', c.id, { amountDue: e.target.value })}
                        style={moneyField}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={colHeadStyle}>Due</div>
                      <input
                        type="date"
                        value={c.dueDate || ''}
                        onChange={(e) => updateRow('accounts', c.id, { dueDate: e.target.value })}
                        onBlur={(e) => {
                          if (!e.target.value) return;
                          const rolled = nextRenewalISO({ renewalDate: e.target.value, frequency: 'monthly' });
                          if (rolled && rolled !== e.target.value) {
                            updateRow('accounts', c.id, { dueDate: rolled });
                          }
                        }}
                        style={{ ...baseField, colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  {nextDue && (
                    <div style={{
                      fontFamily: 'Geist Mono, ui-monospace, monospace',
                      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: overdue ? '#E8704A'
                        : daysAway != null && daysAway <= 7 ? '#E8C547'
                        : 'rgba(250,128,114,0.45)',
                      textAlign: 'right',
                    }}>
                      {overdue ? `Overdue · was ${nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : daysAway === 0 ? 'Due today'
                        : daysAway === 1 ? 'Due tomorrow'
                        : daysAway != null && daysAway <= 30 ? `Due in ${daysAway} days`
                        : `Due ${nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  )}
                  {limit > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{
                        fontFamily: 'Geist Mono, ui-monospace, monospace',
                        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'rgba(250,128,114,0.45)',
                        display: 'flex', justifyContent: 'space-between',
                      }}>
                        <span>Used&nbsp;<span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(used)}</span></span>
                        <span style={{ color: utilColor, fontVariantNumeric: 'tabular-nums' }}>{Math.round(util * 100)}%</span>
                      </div>
                      <div style={{
                        height: 4, borderRadius: 2,
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${util * 100}%`, height: '100%',
                          background: utilColor,
                          transition: 'width 200ms ease',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => addRow('accounts', { name: '', limit: '', available: '', kind: 'credit' })} style={addBtn}>
              + Add credit card
            </button>
          </div>
      </div>

      {/* Income — per-source cards. Pick hourly or salaried, fill in the
          relevant amount + frequency, and we'll normalize everything to a
          monthly net total (using a ~22% average tax rate). */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Income · net</SectionTitle>
          <span style={sumStyle}>
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyIncomeNet)}</span>&nbsp;/ mo
            &nbsp;·&nbsp;
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(yearlyIncomeNet)}</span>&nbsp;/ yr
          </span>
        </div>
        {safe.income.map((i) => {
          const payType = i.payType || 'salaried';
          const gross = monthlyGrossIncome(i);
          const net = monthlyNetIncome(i);
          const taxRate = isFinite(Number(i.taxRate)) ? Number(i.taxRate) : DEFAULT_INCOME_TAX_RATE;
          const chip = (active, onClick, label) => (
            <button onClick={onClick} style={{
              appearance: 'none', cursor: 'pointer', flex: 1,
              padding: '7px 10px', borderRadius: 8,
              border: `0.5px solid ${active ? accent : 'rgba(255,255,255,0.15)'}`,
              background: active ? 'rgba(79,168,98,0.12)' : 'transparent',
              color: active ? accent : 'rgba(250,128,114,0.7)',
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: 600,
            }}>{label}</button>
          );
          return (
            <div key={i.id} style={{
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: 12, marginBottom: 10,
              display: 'flex', flexDirection: 'column', gap: 10,
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
                <input
                  value={i.source} placeholder="Salary, Side gig, …"
                  onChange={(e) => updateRow('income', i.id, { source: e.target.value })}
                  style={baseField}
                />
                <button onClick={() => removeRow('income', i.id)} aria-label="Remove" style={xBtn}>×</button>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {chip(payType === 'salaried',
                  () => updateRow('income', i.id, { payType: 'salaried' }),
                  'Salaried')}
                {chip(payType === 'hourly',
                  () => updateRow('income', i.id, { payType: 'hourly' }),
                  'Hourly')}
              </div>

              {payType === 'salaried' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={colHeadStyle}>Gross / period</div>
                    <input
                      type="number" inputMode="decimal" step="0.01"
                      value={i.amount ?? ''} placeholder="0.00"
                      onChange={(e) => updateRow('income', i.id, { amount: e.target.value })}
                      style={moneyField}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={colHeadStyle}>Frequency</div>
                    <select
                      value={i.frequency || 'monthly'}
                      onChange={(e) => updateRow('income', i.id, { frequency: e.target.value })}
                      style={{
                        ...baseField, appearance: 'none', WebkitAppearance: 'none',
                        fontFamily: 'Geist, ui-sans-serif, system-ui',
                      }}
                    >
                      {INCOME_FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value} style={{ background: '#15151A' }}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={colHeadStyle}>Rate / hour</div>
                    <input
                      type="number" inputMode="decimal" step="0.01"
                      value={i.hourlyRate ?? ''} placeholder="0.00"
                      onChange={(e) => updateRow('income', i.id, { hourlyRate: e.target.value })}
                      style={moneyField}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={colHeadStyle}>Hours / week</div>
                    <input
                      type="number" inputMode="decimal" step="0.5" min="0" max="168"
                      value={i.hoursPerWeek ?? ''} placeholder="40"
                      onChange={(e) => updateRow('income', i.id, { hoursPerWeek: e.target.value })}
                      style={moneyField}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8, alignItems: 'center' }}>
                <div style={{ ...colHeadStyle, paddingBottom: 0 }}>Avg tax rate</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number" inputMode="numeric" step="1" min="0" max="60"
                    value={i.taxRate ?? ''}
                    placeholder={String(DEFAULT_INCOME_TAX_RATE)}
                    onChange={(e) => updateRow('income', i.id, { taxRate: e.target.value })}
                    style={{ ...moneyField, padding: '6px 8px' }}
                  />
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace, monospace',
                    fontSize: 11, color: 'rgba(250,128,114,0.5)',
                  }}>%</span>
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '0.5px solid rgba(255,255,255,0.06)',
              }}>
                <span style={sumStyle}>
                  After {taxRate}% taxes
                </span>
                <span style={{
                  fontFamily: 'Geist Mono, ui-monospace, monospace',
                  fontSize: 17, fontWeight: 500, color: FG_WHITE,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt(net)}
                  <span style={{
                    fontSize: 10, color: 'rgba(250,128,114,0.45)',
                    marginLeft: 4,
                  }}>/mo</span>
                  &nbsp;·&nbsp;
                  {fmt(net * 12)}
                  <span style={{
                    fontSize: 10, color: 'rgba(250,128,114,0.45)',
                    marginLeft: 4,
                  }}>/yr</span>
                </span>
              </div>
              {gross > 0 && (
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace, monospace',
                  fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(250,128,114,0.4)', textAlign: 'right',
                  marginTop: -6,
                }}>
                  gross {fmt(gross)} / mo · {fmt(gross * 12)} / yr
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={() => addRow('income', {
            source: '', payType: 'salaried', amount: '',
            frequency: 'monthly', taxRate: '',
          })}
          style={addBtn}
        >
          + Add income
        </button>
      </div>

      {/* Upcoming bills — sorted by the *next* date after frequency
          advance, so monthly / yearly bills self-update. */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Upcoming bills</SectionTitle>
          <span style={sumStyle}>
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(billsMonthly)}</span>&nbsp;/ mo
            &nbsp;·&nbsp;
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(yearlyBills)}</span>&nbsp;/ yr
          </span>
        </div>
        {sortedBills.map((b) => {
          const next = nextRenewal({ renewalDate: b.dueDate, frequency: b.frequency || 'monthly' });
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const daysAway = next ? Math.round((next - today) / 86_400_000) : null;
          const overdue = daysAway != null && daysAway < 0;
          return (
            <div key={b.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: 12, marginBottom: 10,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
                <input
                  value={b.name} placeholder="Rent, Electric, Internet, …"
                  onChange={(e) => updateRow('bills', b.id, { name: e.target.value })}
                  style={baseField}
                />
                <button onClick={() => removeRow('bills', b.id)} aria-label="Remove" style={xBtn}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Amount</div>
                  <input
                    type="number" inputMode="decimal" step="0.01"
                    value={b.amount ?? ''} placeholder="0.00"
                    onChange={(e) => updateRow('bills', b.id, { amount: e.target.value })}
                    style={moneyField}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Frequency</div>
                  <select
                    value={b.frequency || 'monthly'}
                    onChange={(e) => {
                      const freq = e.target.value;
                      // Re-roll the stored date for the new frequency (skip
                      // for one-time, which keeps the original date).
                      const merged = { ...b, frequency: freq };
                      const rolled = freq === 'one-time'
                        ? b.dueDate
                        : nextRenewalISO({ renewalDate: b.dueDate, frequency: freq });
                      const patch = { frequency: freq };
                      if (rolled) patch.dueDate = rolled;
                      updateRow('bills', b.id, patch);
                    }}
                    style={{
                      ...baseField, appearance: 'none', WebkitAppearance: 'none',
                      fontFamily: 'Geist, ui-sans-serif, system-ui',
                    }}
                  >
                    <option value="monthly" style={{ background: '#15151A' }}>Monthly</option>
                    <option value="yearly" style={{ background: '#15151A' }}>Yearly</option>
                    <option value="one-time" style={{ background: '#15151A' }}>One-time</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Due</div>
                  <input
                    type="date"
                    value={b.dueDate || ''}
                    onChange={(e) => updateRow('bills', b.id, { dueDate: e.target.value })}
                    onBlur={(e) => {
                      if (!e.target.value) return;
                      const freq = b.frequency || 'monthly';
                      if (freq === 'one-time') return; // never advance one-times
                      const rolled = nextRenewalISO({ renewalDate: e.target.value, frequency: freq });
                      if (rolled && rolled !== e.target.value) {
                        updateRow('bills', b.id, { dueDate: rolled });
                      }
                    }}
                    style={{ ...baseField, colorScheme: 'dark' }}
                  />
                </div>
              </div>
              {next && (
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace, monospace',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: overdue ? '#E8704A'
                    : daysAway != null && daysAway <= 7 ? '#E8C547'
                    : 'rgba(250,128,114,0.45)',
                  textAlign: 'right',
                }}>
                  {overdue ? `Overdue · was ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : daysAway === 0 ? 'Due today'
                    : daysAway === 1 ? 'Due tomorrow'
                    : daysAway != null && daysAway <= 30 ? `Due in ${daysAway} days`
                    : `Due ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </div>
              )}
            </div>
          );
        })}
        <button onClick={() => addRow('bills', { name: '', amount: '', dueDate: '', frequency: 'monthly' })} style={addBtn}>
          + Add bill
        </button>
      </div>

      {/* Subscriptions — recurring services. Frequency lets you enter
          monthly amounts at face value or annual plans as Yearly (which
          we divide by 12 for the monthly + Year Overview totals). */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Subscriptions</SectionTitle>
          <span style={sumStyle}>
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(subsMonthly)}</span>&nbsp;/ mo
            &nbsp;·&nbsp;
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{fmt(subsYearly)}</span>&nbsp;/ yr
          </span>
        </div>
        {(safe.subscriptions || []).map((sub) => {
          const next = nextRenewal(sub);
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const daysAway = next ? Math.round((next - today) / 86_400_000) : null;
          return (
            <div key={sub.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: 12, marginBottom: 10,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
                <input
                  value={sub.name} placeholder="Netflix, Spotify, …"
                  onChange={(e) => updateRow('subscriptions', sub.id, { name: e.target.value })}
                  style={baseField}
                />
                <button onClick={() => removeRow('subscriptions', sub.id)} aria-label="Remove" style={xBtn}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Amount</div>
                  <input
                    type="number" inputMode="decimal" step="0.01"
                    value={sub.amount ?? ''} placeholder="0.00"
                    onChange={(e) => updateRow('subscriptions', sub.id, { amount: e.target.value })}
                    style={moneyField}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Frequency</div>
                  <select
                    value={sub.frequency || 'monthly'}
                    onChange={(e) => {
                      const freq = e.target.value;
                      // Re-roll the renewal date forward for the new frequency
                      // so the displayed "next" stays in the future.
                      const merged = { ...sub, frequency: freq };
                      const rolled = nextRenewalISO(merged);
                      const patch = { frequency: freq };
                      if (rolled) patch.renewalDate = rolled;
                      updateRow('subscriptions', sub.id, patch);
                    }}
                    style={{
                      ...baseField, appearance: 'none', WebkitAppearance: 'none',
                      fontFamily: 'Geist, ui-sans-serif, system-ui',
                    }}
                  >
                    <option value="monthly" style={{ background: '#15151A' }}>Monthly</option>
                    <option value="yearly" style={{ background: '#15151A' }}>Yearly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={colHeadStyle}>Next renewal</div>
                  <input
                    type="date"
                    value={sub.renewalDate || ''}
                    onChange={(e) => updateRow('subscriptions', sub.id, { renewalDate: e.target.value })}
                    onBlur={(e) => {
                      // After the picker closes, advance any past date forward
                      // to its next upcoming occurrence given the frequency,
                      // so the row always shows when you'll next be charged.
                      if (!e.target.value) return;
                      const rolled = nextRenewalISO({ renewalDate: e.target.value, frequency: sub.frequency });
                      if (rolled && rolled !== e.target.value) {
                        updateRow('subscriptions', sub.id, { renewalDate: rolled });
                      }
                    }}
                    style={{ ...baseField, colorScheme: 'dark' }}
                  />
                </div>
              </div>
              {next && (
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace, monospace',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: daysAway != null && daysAway <= 7
                    ? '#E8C547'
                    : 'rgba(250,128,114,0.45)',
                  textAlign: 'right',
                }}>
                  {daysAway === 0 ? 'Renews today'
                    : daysAway === 1 ? 'Renews tomorrow'
                    : daysAway != null && daysAway <= 30 ? `Renews in ${daysAway} days`
                    : `Renews ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={() => addRow('subscriptions', { name: '', amount: '', frequency: 'monthly', renewalDate: '' })}
          style={addBtn}
        >
          + Add subscription
        </button>
      </div>

      {/* Notes */}
      <div>
        <SectionTitle>Notes</SectionTitle>
        <NoteField
          value={safe.notes || ''}
          onChange={(v) => patch((c) => ({ ...c, notes: v }))}
        />
      </div>
    </div>
  );
}

// Health — manual daily entry for steps + sleep, with last-7-day charts.
// Sleep stored in minutes for easy delta math; the input lets the user enter
// hours + minutes separately. Until we ship a native HealthKit bridge this
// is the source of truth; both the wheel brief and the charts read straight
// from healthData[sectionId][YYYY-MM-DD].
function HealthDetails({ sectionId, healthData, setHealthData, accent }) {
  const FG_PINK = '#FA8072';
  const FG_WHITE = '#FAFAF7';
  const todayKey = new Date().toISOString().slice(0, 10);
  // Selected day — defaults to today but the user can pick any past date to
  // backfill a missed entry. Charts always show the 7-day window ending today
  // so a backfill immediately surfaces in the trend.
  const [selectedKey, setSelectedKey] = React.useState(todayKey);

  const days = React.useMemo(() => {
    const out = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base); d.setDate(base.getDate() - i);
      out.push(d);
    }
    return out;
  }, [todayKey]);

  const entries = (healthData && healthData[sectionId]) || {};
  const activeEntry = entries[selectedKey] || {};
  // Custom metrics list lives at __metrics so it doesn't collide with the
  // ISO-date keys used for daily entries. Values for a given metric go into
  // each day's entry under entry.custom[metricId].
  const customMetrics = entries.__metrics || [];

  const updateActive = (patch) => {
    setHealthData((prev) => {
      const sec = { ...((prev && prev[sectionId]) || {}) };
      sec[selectedKey] = { ...(sec[selectedKey] || {}), ...patch };
      return { ...(prev || {}), [sectionId]: sec };
    });
  };

  const updateActiveCustom = (metricId, value) => {
    setHealthData((prev) => {
      const sec = { ...((prev && prev[sectionId]) || {}) };
      const day = { ...(sec[selectedKey] || {}) };
      day.custom = { ...(day.custom || {}), [metricId]: value };
      sec[selectedKey] = day;
      return { ...(prev || {}), [sectionId]: sec };
    });
  };

  const addCustomMetric = (name, unit) => {
    const cleanName = (name || '').trim();
    if (!cleanName) return;
    const metric = { id: Date.now() + Math.random(), name: cleanName, unit: (unit || '').trim() };
    setHealthData((prev) => {
      const sec = { ...((prev && prev[sectionId]) || {}) };
      sec.__metrics = [...(sec.__metrics || []), metric];
      return { ...(prev || {}), [sectionId]: sec };
    });
  };

  const removeCustomMetric = (metricId) => {
    setHealthData((prev) => {
      const sec = { ...((prev && prev[sectionId]) || {}) };
      sec.__metrics = (sec.__metrics || []).filter((m) => m.id !== metricId);
      return { ...(prev || {}), [sectionId]: sec };
    });
  };

  const [newMetricName, setNewMetricName] = React.useState('');
  const [newMetricUnit, setNewMetricUnit] = React.useState('');

  const stepsValue = activeEntry.steps != null ? String(activeEntry.steps) : '';
  const sleepMin = Number(activeEntry.sleepMinutes) || 0;
  const sleepHours = sleepMin > 0 ? Math.floor(sleepMin / 60) : '';
  const sleepMinutesPart = sleepMin > 0 ? sleepMin % 60 : '';

  const isToday = selectedKey === todayKey;
  const selectedDate = (() => {
    const [y, m, d] = selectedKey.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  })();
  const cardTitle = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const stepsSeries = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const v = entries[key]?.steps;
    return { date: d, value: v != null && v !== '' ? Number(v) : null };
  });
  const sleepSeries = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const v = entries[key]?.sleepMinutes;
    return { date: d, value: v != null && v !== '' ? Number(v) : null };
  });

  const baseField = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: FG_PINK,
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 14,
    boxSizing: 'border-box',
    minWidth: 0,
  };
  const moneyField = {
    ...baseField,
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  };
  const colHeadStyle = {
    fontFamily: 'Geist Mono, ui-monospace, monospace',
    fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'rgba(250,128,114,0.45)',
    paddingBottom: 4,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 8,
        }}>
          <SectionTitle>{cardTitle}</SectionTitle>
          {!isToday && (
            <button
              onClick={() => setSelectedKey(todayKey)}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: accent, cursor: 'pointer', padding: 0,
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Jump to today
            </button>
          )}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={colHeadStyle}>Date</div>
            <input
              type="date"
              value={selectedKey}
              max={todayKey}
              onChange={(e) => { if (e.target.value) setSelectedKey(e.target.value); }}
              style={{ ...baseField, colorScheme: 'dark' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={colHeadStyle}>Steps</div>
            <input
              type="number" inputMode="numeric" step="1" min="0"
              value={stepsValue} placeholder="0"
              onChange={(e) => updateActive({ steps: e.target.value })}
              style={moneyField}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={colHeadStyle}>Sleep</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="number" inputMode="numeric" step="1" min="0" max="24"
                value={sleepHours} placeholder="h"
                onChange={(e) => {
                  const h = Math.max(0, Number(e.target.value) || 0);
                  const m = Number(sleepMinutesPart) || 0;
                  updateActive({ sleepMinutes: h * 60 + m });
                }}
                style={moneyField}
              />
              <input
                type="number" inputMode="numeric" step="1" min="0" max="59"
                value={sleepMinutesPart} placeholder="m"
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                  const h = Number(sleepHours) || 0;
                  updateActive({ sleepMinutes: h * 60 + m });
                }}
                style={moneyField}
              />
            </div>
          </div>

          {/* Custom metrics — water intake, weight, miles run, calories,
              anything else the user wants to track. Each row stores its
              value for the currently-selected date; the metric definition
              itself is section-level. */}
          {customMetrics.map((m) => {
            const cur = (activeEntry.custom && activeEntry.custom[m.id]);
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}>
                  <div style={colHeadStyle}>
                    {m.name}{m.unit ? ` · ${m.unit}` : ''}
                  </div>
                  <button
                    onClick={() => removeCustomMetric(m.id)}
                    aria-label={`Remove ${m.name}`}
                    style={{
                      appearance: 'none', border: 0, background: 'transparent',
                      color: 'rgba(250,128,114,0.4)', cursor: 'pointer',
                      padding: 0, fontSize: 14, lineHeight: 1,
                    }}
                  >×</button>
                </div>
                <input
                  type="number" inputMode="decimal" step="0.01"
                  value={cur != null ? String(cur) : ''}
                  placeholder="0"
                  onChange={(e) => updateActiveCustom(m.id, e.target.value)}
                  style={moneyField}
                />
              </div>
            );
          })}

          {/* Add-metric inline form. Name is required; unit is optional
              (e.g. "Water" with no unit, "Weight" + "lb", "Run" + "mi"). */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 56px', gap: 8,
            paddingTop: 6, borderTop: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <input
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              placeholder="Add metric (e.g. Water)"
              style={baseField}
            />
            <input
              value={newMetricUnit}
              onChange={(e) => setNewMetricUnit(e.target.value)}
              placeholder="unit"
              style={baseField}
            />
            <button
              onClick={() => {
                if (!newMetricName.trim()) return;
                addCustomMetric(newMetricName, newMetricUnit);
                setNewMetricName('');
                setNewMetricUnit('');
              }}
              style={{
                appearance: 'none', border: 0,
                background: accent, color: '#0B0B0E',
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                padding: '6px 10px',
              }}
            >Add</button>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Steps · last 7 days</SectionTitle>
        <StepsLineChart series={stepsSeries} accent={accent} />
      </div>

      <div>
        <SectionTitle>Sleep · last 7 days</SectionTitle>
        <SleepBarChart series={sleepSeries} accent={accent} />
      </div>
    </div>
  );
}

// SVG line chart for steps. Treats missing days as gaps (no point drawn) so
// a single logged day doesn't get connected to zeros on either side.
function StepsLineChart({ series, accent }) {
  const W = 320, H = 120, PAD_L = 28, PAD_R = 8, PAD_T = 12, PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const values = series.map((s) => s.value).filter((v) => v != null);
  const maxV = Math.max(1000, ...values);
  const xFor = (i) => PAD_L + (series.length <= 1 ? innerW / 2 : (innerW * i) / (series.length - 1));
  const yFor = (v) => PAD_T + innerH - (v / maxV) * innerH;
  // Build a path that breaks on null values.
  let d = '';
  let pen = false;
  series.forEach((p, i) => {
    if (p.value == null) { pen = false; return; }
    const cmd = pen ? 'L' : 'M';
    d += `${cmd}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)} `;
    pen = true;
  });
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 12, padding: 12,
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B}
          stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        {/* y-axis ticks: 0 and max */}
        <text x={PAD_L - 6} y={H - PAD_B + 3} textAnchor="end"
          fill="rgba(250,128,114,0.45)" fontSize="9"
          fontFamily="Geist Mono, ui-monospace, monospace">0</text>
        <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end"
          fill="rgba(250,128,114,0.45)" fontSize="9"
          fontFamily="Geist Mono, ui-monospace, monospace">{maxV.toLocaleString('en-US')}</text>
        {/* line */}
        {d && (
          <path d={d.trim()} fill="none" stroke={accent} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {/* points */}
        {series.map((p, i) => p.value != null && (
          <circle key={i} cx={xFor(i)} cy={yFor(p.value)} r="3" fill={accent} />
        ))}
        {/* x-axis day labels */}
        {series.map((p, i) => (
          <text key={i} x={xFor(i)} y={H - 6} textAnchor="middle"
            fill="rgba(250,128,114,0.55)" fontSize="9"
            fontFamily="Geist Mono, ui-monospace, monospace">
            {p.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Bar chart for sleep. Heights in hours; bar color follows accent. Missing
// days render as a faint outline at zero so the absence is visible.
function SleepBarChart({ series, accent }) {
  const W = 320, H = 130, PAD_L = 28, PAD_R = 8, PAD_T = 12, PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const hours = series.map((s) => (s.value || 0) / 60);
  const maxV = Math.max(8, Math.ceil(Math.max(...hours, 0)));
  const slot = innerW / series.length;
  const barW = Math.max(8, slot * 0.5);
  const xFor = (i) => PAD_L + slot * i + (slot - barW) / 2;
  const yFor = (h) => PAD_T + innerH - (h / maxV) * innerH;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 12, padding: 12,
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B}
          stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        <text x={PAD_L - 6} y={H - PAD_B + 3} textAnchor="end"
          fill="rgba(250,128,114,0.45)" fontSize="9"
          fontFamily="Geist Mono, ui-monospace, monospace">0h</text>
        <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end"
          fill="rgba(250,128,114,0.45)" fontSize="9"
          fontFamily="Geist Mono, ui-monospace, monospace">{maxV}h</text>
        {series.map((p, i) => {
          const h = (p.value || 0) / 60;
          const y = yFor(h);
          const height = (H - PAD_B) - y;
          return (
            <g key={i}>
              {p.value == null ? (
                <rect x={xFor(i)} y={H - PAD_B - 2} width={barW} height={2}
                  fill="rgba(255,255,255,0.12)" rx="1" />
              ) : (
                <rect x={xFor(i)} y={y} width={barW} height={Math.max(2, height)}
                  fill={accent} rx="2" />
              )}
              <text x={xFor(i) + barW / 2} y={H - 6} textAnchor="middle"
                fill="rgba(250,128,114,0.55)" fontSize="9"
                fontFamily="Geist Mono, ui-monospace, monospace">
                {p.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Shared form-field styles used by Travel / Workouts / Meals.
const HEALTH_FIELD_STYLES = (() => {
  const baseField = {
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    color: '#FA8072',
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'Geist, ui-sans-serif, system-ui',
    fontSize: 14,
    boxSizing: 'border-box',
    minWidth: 0,
  };
  return {
    baseField,
    moneyField: {
      ...baseField,
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right',
    },
    colHeadStyle: {
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'rgba(250,128,114,0.45)',
      paddingBottom: 4,
    },
    xBtn: {
      appearance: 'none', border: 0, background: 'transparent',
      color: 'rgba(250,128,114,0.4)', cursor: 'pointer',
      padding: 4, fontSize: 16, lineHeight: 1, flexShrink: 0,
    },
    addBtn: (accent) => ({
      appearance: 'none', border: 0, background: 'transparent',
      color: accent, cursor: 'pointer', padding: '6px 0', marginTop: 4,
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
      fontWeight: 600,
    }),
  };
})();

// Travel — list of trips with destination, dates, confirmations, packing.
function TravelDetails({ sectionId, travelData, setTravelData, accent }) {
  const FG_WHITE = '#FAFAF7';
  const { baseField, colHeadStyle, xBtn, addBtn } = HEALTH_FIELD_STYLES;

  const stored = (travelData && travelData[sectionId]);
  const trips = (stored ? stored.trips : SECTION_LIB.travel.trips) || [];

  const patch = (updater) => {
    setTravelData((prev) => {
      const sec = (prev && prev[sectionId]) || { trips: SECTION_LIB.travel.trips || [] };
      return { ...(prev || {}), [sectionId]: updater(sec) };
    });
  };
  const updateTrip = (id, p) => patch((c) => ({ ...c, trips: c.trips.map((t) => t.id === id ? { ...t, ...p } : t) }));
  const removeTrip = (id) => patch((c) => ({ ...c, trips: c.trips.filter((t) => t.id !== id) }));
  const addTrip = () => patch((c) => ({
    ...c,
    trips: [...(c.trips || []), { id: Date.now() + Math.random(), destination: '', startDate: '', endDate: '', confirmations: '', notes: '', packing: [] }],
  }));
  const updatePack = (tripId, packId, p) => patch((c) => ({
    ...c,
    trips: c.trips.map((t) => t.id !== tripId ? t
      : { ...t, packing: (t.packing || []).map((pk) => pk.id === packId ? { ...pk, ...p } : pk) }),
  }));
  const removePack = (tripId, packId) => patch((c) => ({
    ...c,
    trips: c.trips.map((t) => t.id !== tripId ? t
      : { ...t, packing: (t.packing || []).filter((pk) => pk.id !== packId) }),
  }));
  const addPack = (tripId, item) => patch((c) => ({
    ...c,
    trips: c.trips.map((t) => t.id !== tripId ? t
      : { ...t, packing: [...(t.packing || []), { id: Date.now() + Math.random(), item, packed: false }] }),
  }));

  // Sort trips by start date ascending; trips without dates sink.
  const sortedTrips = trips.slice().sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate) - new Date(b.startDate);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <SectionTitle>Trips · {trips.length}</SectionTitle>
      {sortedTrips.map((tr) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = tr.startDate ? new Date(tr.startDate) : null;
        const end = tr.endDate ? new Date(tr.endDate) : start;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(0, 0, 0, 0);
        let dateHint = null;
        if (start) {
          if (today >= start && end && today <= end) {
            const total = Math.round((end - start) / 86_400_000) + 1;
            const dayN = Math.round((today - start) / 86_400_000) + 1;
            dateHint = `Day ${dayN} of ${total}`;
          } else if (start > today) {
            const delta = Math.round((start - today) / 86_400_000);
            dateHint = delta === 0 ? 'Today' : delta === 1 ? 'Tomorrow' : `In ${delta} days`;
          } else {
            dateHint = `Past · ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          }
        }
        const packedDone = (tr.packing || []).filter((p) => p.packed).length;
        const packedTotal = (tr.packing || []).length;
        return (
          <div key={tr.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
              <input
                value={tr.destination} placeholder="Destination"
                onChange={(e) => updateTrip(tr.id, { destination: e.target.value })}
                style={baseField}
              />
              <button onClick={() => removeTrip(tr.id)} aria-label="Remove trip" style={xBtn}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={colHeadStyle}>Depart</div>
                <input type="date" value={tr.startDate || ''}
                  onChange={(e) => updateTrip(tr.id, { startDate: e.target.value })}
                  style={{ ...baseField, colorScheme: 'dark' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={colHeadStyle}>Return</div>
                <input type="date" value={tr.endDate || ''}
                  onChange={(e) => updateTrip(tr.id, { endDate: e.target.value })}
                  style={{ ...baseField, colorScheme: 'dark' }}
                />
              </div>
            </div>
            {dateHint && (
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(250,128,114,0.55)', textAlign: 'right',
              }}>{dateHint}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={colHeadStyle}>Confirmations</div>
              <input value={tr.confirmations || ''} placeholder="Flight #, hotel res, …"
                onChange={(e) => updateTrip(tr.id, { confirmations: e.target.value })}
                style={baseField}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={colHeadStyle}>Notes</div>
              <textarea value={tr.notes || ''} placeholder="Plans, reminders…"
                onChange={(e) => updateTrip(tr.id, { notes: e.target.value })}
                rows={2}
                style={{ ...baseField, resize: 'vertical', minHeight: 48, fontFamily: 'Geist, ui-sans-serif, system-ui' }}
              />
            </div>
            <div>
              <div style={{ ...colHeadStyle, display: 'flex', justifyContent: 'space-between' }}>
                <span>Packing</span>
                <span style={{ color: 'rgba(250,128,114,0.55)' }}>{packedDone} / {packedTotal}</span>
              </div>
              {(tr.packing || []).map((p) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '18px 1fr 24px', gap: 8,
                  alignItems: 'center', padding: '5px 0',
                  borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                }}>
                  <button
                    onClick={() => updatePack(tr.id, p.id, { packed: !p.packed })}
                    aria-label={p.packed ? 'Mark not packed' : 'Mark packed'}
                    style={{
                      appearance: 'none', padding: 0, cursor: 'pointer',
                      width: 18, height: 18, borderRadius: 5,
                      borderStyle: 'solid', borderWidth: '1.5px',
                      borderColor: p.packed ? accent : 'rgba(255,255,255,0.3)',
                      backgroundColor: p.packed ? accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {p.packed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5 4 7 8 3" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <input value={p.item}
                    onChange={(e) => updatePack(tr.id, p.id, { item: e.target.value })}
                    style={{
                      ...baseField, padding: '4px 6px', fontSize: 13,
                      background: 'transparent', border: 0,
                      textDecoration: p.packed ? 'line-through' : 'none',
                      color: p.packed ? 'rgba(250,128,114,0.5)' : '#FA8072',
                    }}
                  />
                  <button onClick={() => removePack(tr.id, p.id)} aria-label="Remove item" style={xBtn}>×</button>
                </div>
              ))}
              <PackingAdder onAdd={(v) => addPack(tr.id, v)} addBtnStyle={addBtn(accent)} baseField={baseField} />
            </div>
          </div>
        );
      })}
      <button onClick={addTrip} style={addBtn(accent)}>+ Add trip</button>
    </div>
  );
}

function PackingAdder({ onAdd, addBtnStyle, baseField }) {
  const [draft, setDraft] = React.useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (!v) return; onAdd(v); setDraft(''); }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 56px', gap: 8, marginTop: 6 }}
    >
      <input value={draft} placeholder="Add packing item"
        onChange={(e) => setDraft(e.target.value)}
        style={{ ...baseField, padding: '6px 8px', fontSize: 13 }}
      />
      <button type="submit" style={{ ...addBtnStyle, padding: '4px 0', margin: 0, textAlign: 'right' }}>Add</button>
    </form>
  );
}

// Workouts — chronological list of sessions with date + type + duration.
function WorkoutsDetails({ sectionId, workoutsData, setWorkoutsData, accent }) {
  const FG_WHITE = '#FAFAF7';
  const { baseField, moneyField, colHeadStyle, xBtn, addBtn } = HEALTH_FIELD_STYLES;

  const stored = (workoutsData && workoutsData[sectionId]);
  const sessions = (stored ? stored.sessions : SECTION_LIB.workouts.sessions) || [];

  const patch = (updater) => {
    setWorkoutsData((prev) => {
      const sec = (prev && prev[sectionId]) || { sessions: SECTION_LIB.workouts.sessions || [] };
      return { ...(prev || {}), [sectionId]: updater(sec) };
    });
  };
  const updateS = (id, p) => patch((c) => ({ ...c, sessions: c.sessions.map((s) => s.id === id ? { ...s, ...p } : s) }));
  const removeS = (id) => patch((c) => ({ ...c, sessions: c.sessions.filter((s) => s.id !== id) }));
  const addS = () => patch((c) => ({
    ...c,
    sessions: [{ id: Date.now() + Math.random(), date: new Date().toISOString().slice(0, 10), type: '', duration: '', notes: '' }, ...(c.sessions || [])],
  }));

  // Aggregate totals — useful header summary.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
  let weekCount = 0, weekMinutes = 0, monthCount = 0;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  sessions.forEach((s) => {
    if (!s.date) return;
    const d = new Date(s.date); d.setHours(0, 0, 0, 0);
    if (d >= weekStart) { weekCount++; weekMinutes += Number(s.duration) || 0; }
    if (d >= monthStart) monthCount++;
  });
  const sorted = sessions.slice().sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>This week</SectionTitle>
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(250,128,114,0.55)',
          }}>
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{weekCount}</span>&nbsp;sessions&nbsp;·&nbsp;
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{weekMinutes}</span>&nbsp;min
            &nbsp;·&nbsp;
            <span style={{ color: FG_WHITE, fontVariantNumeric: 'tabular-nums' }}>{monthCount}</span>&nbsp;this&nbsp;mo
          </span>
        </div>
      </div>

      {sorted.map((s) => (
        <div key={s.id} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px', gap: 8, alignItems: 'center' }}>
            <input value={s.type} placeholder="Run, Lift, Yoga, …"
              onChange={(e) => updateS(s.id, { type: e.target.value })}
              style={baseField}
            />
            <button onClick={() => removeS(s.id)} aria-label="Remove session" style={xBtn}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={colHeadStyle}>Date</div>
              <input type="date" value={s.date || ''}
                onChange={(e) => updateS(s.id, { date: e.target.value })}
                style={{ ...baseField, colorScheme: 'dark' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={colHeadStyle}>Minutes</div>
              <input type="number" inputMode="numeric" step="1" min="0"
                value={s.duration ?? ''} placeholder="0"
                onChange={(e) => updateS(s.id, { duration: e.target.value })}
                style={moneyField}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={colHeadStyle}>Notes</div>
            <input value={s.notes || ''} placeholder="Distance, weight, mood…"
              onChange={(e) => updateS(s.id, { notes: e.target.value })}
              style={baseField}
            />
          </div>
        </div>
      ))}
      <button onClick={addS} style={addBtn(accent)}>+ Log session</button>
    </div>
  );
}

// Meals & Groceries — weekly plan (mon..sun × breakfast/lunch/dinner) and
// a free-form grocery list. Grocery items toggle done; rendered separately.
const MEAL_DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];
function MealsDetails({ sectionId, mealsData, setMealsData, accent }) {
  const FG_WHITE = '#FAFAF7';
  const { baseField, colHeadStyle, xBtn, addBtn } = HEALTH_FIELD_STYLES;

  const stored = (mealsData && mealsData[sectionId]);
  const week = (stored ? stored.week : SECTION_LIB.meals.week) || {};
  const grocery = (stored ? stored.grocery : SECTION_LIB.meals.grocery) || [];

  const todayIdx = (new Date().getDay() + 6) % 7;

  const patch = (updater) => {
    setMealsData((prev) => {
      const sec = (prev && prev[sectionId]) || {
        week: SECTION_LIB.meals.week,
        grocery: SECTION_LIB.meals.grocery,
      };
      return { ...(prev || {}), [sectionId]: updater(sec) };
    });
  };
  const updateMeal = (dayKey, slot, value) => patch((c) => ({
    ...c,
    week: { ...(c.week || {}), [dayKey]: { ...((c.week || {})[dayKey] || {}), [slot]: value } },
  }));
  const addGrocery = (item, qty) => patch((c) => ({
    ...c,
    grocery: [...(c.grocery || []), { id: Date.now() + Math.random(), item, qty: qty || '', got: false }],
  }));
  const updateGrocery = (id, p) => patch((c) => ({ ...c, grocery: c.grocery.map((g) => g.id === id ? { ...g, ...p } : g) }));
  const removeGrocery = (id) => patch((c) => ({ ...c, grocery: c.grocery.filter((g) => g.id !== id) }));
  const clearGotten = () => patch((c) => ({ ...c, grocery: c.grocery.filter((g) => !g.got) }));

  const [newItem, setNewItem] = React.useState('');
  const [newQty, setNewQty] = React.useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionTitle>This week</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEAL_DAYS.map((d, i) => {
            const dayData = week[d.key] || {};
            const isToday = i === todayIdx;
            return (
              <div key={d.key} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${isToday ? accent : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 12, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace, monospace',
                  fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: isToday ? accent : 'rgba(250,128,114,0.55)',
                }}>{d.label}{isToday ? ' · today' : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8, alignItems: 'center' }}>
                  <div style={colHeadStyle}>Breakfast</div>
                  <input value={dayData.breakfast || ''} placeholder=""
                    onChange={(e) => updateMeal(d.key, 'breakfast', e.target.value)}
                    style={baseField}
                  />
                  <div style={colHeadStyle}>Lunch</div>
                  <input value={dayData.lunch || ''} placeholder=""
                    onChange={(e) => updateMeal(d.key, 'lunch', e.target.value)}
                    style={baseField}
                  />
                  <div style={colHeadStyle}>Dinner</div>
                  <input value={dayData.dinner || ''} placeholder=""
                    onChange={(e) => updateMeal(d.key, 'dinner', e.target.value)}
                    style={baseField}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle>Grocery</SectionTitle>
          {grocery.some((g) => g.got) && (
            <button onClick={clearGotten} style={{
              appearance: 'none', border: 0, background: 'transparent',
              color: accent, cursor: 'pointer', padding: 0,
              fontFamily: 'Geist Mono, ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: 600,
            }}>Clear checked</button>
          )}
        </div>
        {grocery.map((g) => (
          <div key={g.id} style={{
            display: 'grid', gridTemplateColumns: '18px 1fr 80px 24px', gap: 8,
            alignItems: 'center', padding: '6px 0',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => updateGrocery(g.id, { got: !g.got })}
              aria-label={g.got ? 'Mark not bought' : 'Mark bought'}
              style={{
                appearance: 'none', padding: 0, cursor: 'pointer',
                width: 18, height: 18, borderRadius: 5,
                borderStyle: 'solid', borderWidth: '1.5px',
                borderColor: g.got ? accent : 'rgba(255,255,255,0.3)',
                backgroundColor: g.got ? accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {g.got && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5 4 7 8 3" stroke="#0B0B0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
            <input value={g.item}
              onChange={(e) => updateGrocery(g.id, { item: e.target.value })}
              style={{
                ...baseField, padding: '4px 6px', fontSize: 14,
                background: 'transparent', border: 0,
                textDecoration: g.got ? 'line-through' : 'none',
                color: g.got ? 'rgba(250,128,114,0.5)' : '#FA8072',
              }}
            />
            <input value={g.qty || ''} placeholder="qty"
              onChange={(e) => updateGrocery(g.id, { qty: e.target.value })}
              style={{
                ...baseField, padding: '4px 6px', fontSize: 12,
                background: 'transparent', border: 0,
                color: 'rgba(250,128,114,0.7)', textAlign: 'right',
              }}
            />
            <button onClick={() => removeGrocery(g.id)} aria-label="Remove" style={xBtn}>×</button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = newItem.trim(); if (!v) return;
            addGrocery(v, newQty.trim());
            setNewItem(''); setNewQty('');
          }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 80px 56px', gap: 8, marginTop: 6 }}
        >
          <input value={newItem} placeholder="Add item"
            onChange={(e) => setNewItem(e.target.value)}
            style={{ ...baseField, padding: '6px 8px', fontSize: 13 }}
          />
          <input value={newQty} placeholder="qty"
            onChange={(e) => setNewQty(e.target.value)}
            style={{ ...baseField, padding: '6px 8px', fontSize: 13 }}
          />
          <button type="submit" style={{ ...addBtn(accent), padding: '4px 0', margin: 0, textAlign: 'right' }}>Add</button>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { DetailView });

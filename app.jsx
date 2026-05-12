// app.jsx — Swiped main app. Composes Wheel + LiquidReveal + DetailView and
// owns gesture state, currentIdx (with snap inertia), liquid progress.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4FA862",
  "wheelSize": 280,
  "wheelSpacing": 26,
  "liquid": "paint",
  "typeface": "modern",
  "userName": "",
  "sections": [
    {"id":"work","name":"Work","iconKey":"briefcase","contentKey":"work"},
    {"id":"budget","name":"Budget","iconKey":"dollar","contentKey":"budget"},
    {"id":"home","name":"Home","iconKey":"home","contentKey":"home"},
    {"id":"school","name":"School","iconKey":"cap","contentKey":"school"},
    {"id":"notes","name":"Notes","iconKey":"notebook","contentKey":"notes"}
  ]
}/*EDITMODE-END*/;

const TYPEFACES = {
  modern: {
    family: "'Geist', ui-sans-serif, system-ui, sans-serif",
    display: "'Instrument Serif', Georgia, serif",
    mono: "'Geist Mono', ui-monospace, SF Mono, monospace",
  },
  editorial: {
    family: "'Newsreader', Georgia, serif",
    display: "'Newsreader', Georgia, serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  utility: {
    family: "'JetBrains Mono', ui-monospace, monospace",
    display: "'JetBrains Mono', ui-monospace, monospace",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  geometric: {
    family: "'DM Sans', ui-sans-serif, system-ui",
    display: "'DM Sans', ui-sans-serif, system-ui",
    mono: "'DM Mono', ui-monospace, monospace",
  },
};

function useViewport() {
  // Prefer visualViewport when available — it reflects the *actually visible*
  // area (after browser chrome, keyboard, fold state) and updates on Fold
  // transitions where `window.innerHeight` sometimes reports a stale value
  // from the previously-active screen.
  const read = () => {
    if (typeof window === 'undefined') return { w: 0, h: 0 };
    const vv = window.visualViewport;
    return vv
      ? { w: Math.round(vv.width), h: Math.round(vv.height) }
      : { w: window.innerWidth, h: window.innerHeight };
  };
  const [vp, setVp] = React.useState(read);
  React.useEffect(() => {
    const onR = () => setVp(read());
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onR);
    }
    // Some foldable launches paint once with stale dimensions cached from
    // the previously-active screen, then settle a frame or two later — kick
    // a re-measure once we're mounted to catch the corrected size.
    const t1 = setTimeout(onR, 60);
    const t2 = setTimeout(onR, 300);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('orientationchange', onR);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onR);
      }
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return vp;
}

function useTweenIndex(targetIdx, onArrive) {
  // tweens currentIdx toward targetIdx using rAF
  const [idx, setIdx] = React.useState(targetIdx);
  const idxRef = React.useRef(targetIdx);
  const raf = React.useRef(null);
  const arrivedRef = React.useRef(false);

  React.useEffect(() => {
    arrivedRef.current = false;
    cancelAnimationFrame(raf.current);
    const tick = () => {
      const cur = idxRef.current;
      const delta = targetIdx - cur;
      if (Math.abs(delta) < 0.001) {
        idxRef.current = targetIdx;
        setIdx(targetIdx);
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          onArrive && onArrive(targetIdx);
        }
        return;
      }
      // critically-damped-ish ease
      const next = cur + delta * 0.18;
      idxRef.current = next;
      setIdx(next);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [targetIdx]);

  // direct-set during drag
  const setDirect = React.useCallback((v) => {
    cancelAnimationFrame(raf.current);
    idxRef.current = v;
    setIdx(v);
  }, []);

  return [idx, setDirect];
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { w: vw, h: vh } = useViewport();
  // Stage fills the viewport. On a foldable/tablet/desktop the wheel and
  // brief content scale up so the design doesn't look like a tiny strip in
  // the middle of a wide screen.
  const W = vw;
  const H = vh;
  // 440 is the design baseline (typical phone). On anything wider, scale
  // the wheel radius + protrusion proportionally, capped at 1.8x so the
  // wheel doesn't take over a desktop monitor.
  // Scale by whichever dimension is the limiting factor. A width-only scale
  // looks correct on a tall narrow viewport (Fold cover, 980×2151) but
  // blows up on a Fold inner unfolded screen (≈1900×900) where the browser
  // still reports a wide viewport but the vertical space is much shorter
  // — width-only would scale everything large and bury the brief panel
  // under the wheel. Taking the min keeps the inner Fold at phone-baseline
  // while the cover still hits the cap. Cap raised to 2.0 so the cover's
  // tall-narrow physical screen reads comfortably.
  const stageScale = Math.min(2.0, Math.max(1, Math.min(W / 440, H / 860)));

  const sections = t.sections;

  // First-load index: jump to whichever section is the user's "home" (added
  // to the wheel as a centered default). Falls back to index 0 if the user
  // has removed home from their layout.
  const [targetIdx, setTargetIdx] = React.useState(() => {
    const i = sections.findIndex((s) => (s.contentKey || s.id) === 'home');
    return i >= 0 ? i : 0;
  });

  // One-time migration: anyone who installed Swiped before the Home section
  // existed will have a persisted sections list without it. Insert home at
  // the middle index on first load after this build (and jump the wheel
  // there), then never again — so a user who later removes home won't see
  // it re-appear.
  React.useEffect(() => {
    try {
      if (localStorage.getItem('swiped.migrations.home') === '1') return;
      const has = sections.some((s) => (s.contentKey || s.id) === 'home');
      if (!has) {
        const homeSection = { id: 'home', name: 'Home', iconKey: 'home', contentKey: 'home' };
        const mid = Math.floor(sections.length / 2);
        setTweak('sections', [...sections.slice(0, mid), homeSection, ...sections.slice(mid)]);
        setTargetIdx(mid);
      }
      localStorage.setItem('swiped.migrations.home', '1');
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdxDirect] = useTweenIndex(targetIdx);

  // All persisted to localStorage so semesters, classes, per-week
  // tasks/notes and the active selection survive closing the PWA, switching
  // sections, and developer redeploys.
  const [schoolSemesters, setSchoolSemesters] = usePersistedState(
    'swiped.school.semesters',
    () => SECTION_LIB.school.semesters
  );
  const [schoolActiveSemesterId, setSchoolActiveSemesterId] = usePersistedState(
    'swiped.school.activeSemesterId',
    () => SECTION_LIB.school.semesters[0]?.id
  );
  // Per-section weekly data: { [sectionId]: { [weekKey]: { tasks, log, note } } }.
  // Both School and Work use this — keyed by section.id so multiple
  // instances (two jobs, two schools) each get their own week store.
  const [weeklyData, setWeeklyData] = usePersistedState('swiped.weekly', () => {
    const defaultSem = SECTION_LIB.school.semesters[0];
    const defaultDate = (defaultSem && semesterDefaultWeek(defaultSem.name)) || new Date();
    return {
      school: {
        [weekKey(defaultDate)]: {
          tasks: SECTION_LIB.school.tasks,
          log: [],
          note: SECTION_LIB.school.note,
        },
      },
    };
  });
  const [weeklyActiveKey, setWeeklyActiveKey] = usePersistedState('swiped.weeklyActive', () => {
    const defaultSem = SECTION_LIB.school.semesters[0];
    const defaultDate = (defaultSem && semesterDefaultWeek(defaultSem.name)) || new Date();
    return { school: weekKey(defaultDate) };
  });

  // Migration from the old school-only weekly keys to the per-section
  // structure. Drops hardcoded log seed entries (those without a `when`
  // timestamp) so the Recent feed reflects real events instead of stub data.
  React.useEffect(() => {
    try {
      if (localStorage.getItem('swiped.migrations.weeklyById') === '1') return;
      const oldWeeksRaw = localStorage.getItem('swiped.school.weeks');
      const oldActiveRaw = localStorage.getItem('swiped.school.activeWeekKey');
      if (oldWeeksRaw) {
        const oldWeeks = JSON.parse(oldWeeksRaw);
        const cleaned = {};
        for (const k of Object.keys(oldWeeks)) {
          const v = oldWeeks[k] || {};
          cleaned[k] = {
            tasks: v.tasks || [],
            log: (v.log || []).filter((e) => e && e.when),
            note: v.note || '',
          };
        }
        setWeeklyData((prev) => ({ ...prev, school: { ...(prev.school || {}), ...cleaned } }));
      }
      if (oldActiveRaw) {
        try {
          const oldKey = JSON.parse(oldActiveRaw);
          setWeeklyActiveKey((prev) => ({ ...prev, school: oldKey }));
        } catch (e) { /* ignore */ }
      }
      localStorage.removeItem('swiped.school.weeks');
      localStorage.removeItem('swiped.school.activeWeekKey');
      localStorage.setItem('swiped.migrations.weeklyById', '1');
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // People sections — { [sectionId]: { phones, emails, birthday, notes, socials, reminders } }.
  // Keys are the section id (one entry per "person" section on the wheel).
  const [peopleData, setPeopleData] = usePersistedState('swiped.people', () => ({}));

  // Your own contact card — phones, emails, birthday, socials, notes for the
  // Home section. Persisted as a single object (there's only one of you).
  const [homeData, setHomeData] = usePersistedState('swiped.home', () => ({
    phones: [], emails: [], socials: [], birthday: '', notes: '',
  }));

  // Budget section — bank accounts, monthly income sources, and upcoming
  // bills. Entirely user-entered; brief panel + detail stats are derived
  // from this object (no hardcoded numbers anymore).
  const [budgetData, setBudgetData] = usePersistedState('swiped.budget', () => ({
    accounts: [], income: [], bills: [], notes: '',
  }));

  // Mutate the currently-selected section (used by PersonDetails so people
  // can rename + change avatar inline without going to Settings).
  const updateSelectedSection = (patch) => {
    const next = sections.map((s, i) => (i === safeIdx ? { ...s, ...patch } : s));
    setTweak('sections', next);
  };

  // Picking a semester also jumps the weekly view to that semester's default
  // week (first week of Jan/Jun/Aug, or today if the semester is current).
  // User can still navigate freely afterward.
  const selectSchoolSemester = (id) => {
    setSchoolActiveSemesterId(id);
    const sem = schoolSemesters.find((s) => s.id === id);
    if (sem) {
      const def = semesterDefaultWeek(sem.name);
      if (def) {
        const schoolSec = sections.find((s) => (s.contentKey || s.id) === 'school');
        const schoolId = schoolSec?.id || 'school';
        setWeeklyActiveKey((prev) => ({ ...prev, [schoolId]: weekKey(def) }));
      }
    }
  };

  // Wipe every persisted section field back to the seed defaults — school
  // (semesters / classes / weekly tasks / notes), people (contacts), and
  // your own home contact card. Behind a confirm so it's not accidentally
  // tappable.
  const resetSchoolData = () => {
    const ok = typeof window !== 'undefined' && window.confirm(
      'Reset section data? This clears your semesters, classes, weekly tasks, notes, person contacts, and your home contact card.'
    );
    if (!ok) return;
    try {
      localStorage.removeItem('swiped.school.semesters');
      localStorage.removeItem('swiped.school.activeSemesterId');
      localStorage.removeItem('swiped.weekly');
      localStorage.removeItem('swiped.weeklyActive');
      localStorage.removeItem('swiped.people');
      localStorage.removeItem('swiped.home');
      localStorage.removeItem('swiped.budget');
    } catch (e) { /* ignore */ }
    const seedSemesters = SECTION_LIB.school.semesters;
    const seedSem = seedSemesters[0];
    const seedDate = (seedSem && semesterDefaultWeek(seedSem.name)) || new Date();
    const seedKey = weekKey(seedDate);
    setSchoolSemesters(seedSemesters);
    setSchoolActiveSemesterId(seedSem?.id);
    setWeeklyData({
      school: {
        [seedKey]: {
          tasks: SECTION_LIB.school.tasks,
          log: [],
          note: SECTION_LIB.school.note,
        },
      },
    });
    setWeeklyActiveKey({ school: seedKey });
    setPeopleData({});
    setHomeData({ phones: [], emails: [], socials: [], birthday: '', notes: '' });
    setBudgetData({ accounts: [], income: [], bills: [], notes: '' });
  };

  // Sheet gesture state. `finger` is the live (or last) pointer position;
  // `progress` is the open ratio (0=hidden, 1=fully covering). Together they
  // drive the curved sheet path: peak rides at `finger`, edges trail below.
  const [liquid, setLiquid] = React.useState({ active: false, progress: 0, finger: null });
  const [detailOpen, setDetailOpen] = React.useState(false);
  const liquidRef = React.useRef(liquid);
  liquidRef.current = liquid;

  // When wheel reports a drag, set idx directly
  const onWheelDrag = (newIdx) => {
    setIdxDirect(Math.max(-0.4, Math.min(sections.length - 1 + 0.4, newIdx)));
  };
  const onWheelSettle = (snap) => {
    setTargetIdx(snap);
    // pulse tick — done via CSS class toggle on accent dot below
    setPulseKey((k) => k + 1);
  };

  const [pulseKey, setPulseKey] = React.useState(0);

  // Elastic open: the peak of the sheet's top edge tracks the finger; the
  // edges trail with a lag that shrinks as progress nears 1. Past the
  // halfway mark (or a quick upward fling) it commits open.
  const onLiquidStart = ({ startX, startY }) => {
    setLiquid({ active: true, progress: 0, finger: { x: startX, y: startY } });
    const startTime = performance.now();
    const move = (ev) => {
      const dy = startY - ev.clientY;
      const p = Math.max(0, Math.min(1, dy / H));
      setLiquid((l) => ({ ...l, progress: p, finger: { x: ev.clientX, y: ev.clientY } }));
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const dy = startY - (ev.clientY ?? startY);
      const elapsed = performance.now() - startTime;
      const velocity = dy / Math.max(50, elapsed);
      const cur = liquidRef.current;
      if (cur.progress > 0.45 || (velocity > 1.2 && cur.progress > 0.15)) {
        animateSheet(cur, { progress: 1, fingerY: 0 }, 280, () => setDetailOpen(true));
      } else {
        animateSheet(cur, { progress: 0, fingerY: H }, 220, () => {
          setLiquid({ active: false, progress: 0, finger: null });
        });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Tween both progress AND finger.y to targets simultaneously. Needed so the
  // curved peak flattens to the top (or sinks to the bottom) during snaps.
  const animateSheet = (from, target, duration, done) => {
    const startT = performance.now();
    const fromP = from.progress;
    const fromY = from.finger?.y ?? H;
    const fingerX = from.finger?.x ?? W / 2;
    const opening = target.progress > fromP;
    const tick = () => {
      const k = Math.min(1, (performance.now() - startT) / duration);
      const eased = opening ? 1 - Math.pow(1 - k, 3) : Math.pow(k, 2);
      const p = fromP + (target.progress - fromP) * eased;
      const fy = fromY + (target.fingerY - fromY) * eased;
      setLiquid((l) => ({ ...l, progress: p, finger: { x: fingerX, y: fy } }));
      if (k < 1) requestAnimationFrame(tick);
      else done && done();
    };
    requestAnimationFrame(tick);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    animateSheet(liquidRef.current, { progress: 0, fingerY: H }, 320, () => {
      setLiquid({ active: false, progress: 0, finger: null });
    });
  };

  // Elastic close: grab the top handle (or X) and pull the sheet down. The
  // peak follows the finger, edges trail behind. Past the halfway point (or a
  // quick downward fling) it commits closed.
  const onCloseDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = performance.now();
    let moved = false;
    let lastY = startY;
    setDetailOpen(false);
    setLiquid({ active: true, progress: 1, finger: { x: startX, y: startY } });

    const move = (ev) => {
      lastY = ev.clientY;
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      const p = Math.max(0, Math.min(1, 1 - dy / H));
      setLiquid((l) => ({ ...l, progress: p, finger: { x: ev.clientX, y: ev.clientY } }));
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const dy = (ev.clientY ?? lastY) - startY;
      const elapsed = performance.now() - startTime;
      const velocity = dy / Math.max(50, elapsed); // positive = downward fling
      const cur = liquidRef.current;
      if (!moved) {
        animateSheet(cur, { progress: 0, fingerY: H }, 320, () => {
          setLiquid({ active: false, progress: 0, finger: null });
        });
        return;
      }
      const commit = cur.progress < 0.55 || (velocity > 1.0 && cur.progress < 0.85);
      if (commit) {
        animateSheet(cur, { progress: 0, fingerY: H }, 280, () => {
          setLiquid({ active: false, progress: 0, finger: null });
        });
      } else {
        animateSheet(cur, { progress: 1, fingerY: 0 }, 220, () => setDetailOpen(true));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const selectedIdx = Math.round(idx);
  const safeIdx = Math.max(0, Math.min(sections.length - 1, selectedIdx));
  const selected = sections[safeIdx];
  const contentKey = selected?.contentKey || selected?.id;
  const baseContent = SECTION_LIB[contentKey] || SECTION_LIB.work;

  // For school, derive the live stats: overall GPA + total non-future credits.
  // For person, headline becomes the full name and stats show live counts +
  // days-until-birthday. Other sections use the seeded content as-is.
  const content = React.useMemo(() => {
    if (contentKey === 'school') {
      const overall = calcOverallGPA(schoolSemesters);
      const gpaStr = overall.gpa == null ? '—' : overall.gpa.toFixed(2);
      const dueStat = baseContent.stats.find((s) => /due/i.test(s.label))
        || baseContent.stats[1]
        || { label: 'Due ≤7d', value: '0' };
      return {
        ...baseContent,
        stats: [
          { label: 'GPA', value: gpaStr },
          { label: 'Credits', value: String(overall.credits) },
          dueStat,
        ],
        semesters: schoolSemesters,
      };
    }
    if (contentKey === 'budget') {
      const bd = budgetData || { accounts: [], income: [], bills: [] };
      const totalBalance = (bd.accounts || []).reduce((s, a) => s + (Number(a.balance) || 0), 0);
      // Income totals are post-tax monthly: each entry's gross is normalized
      // to a per-month figure based on its pay type + frequency, then the
      // average tax rate (default 22%) is subtracted.
      const monthlyIncome = (bd.income || []).reduce((s, i) => s + monthlyNetIncome(i), 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const sevenOut = new Date(today); sevenOut.setDate(today.getDate() + 7);
      const due7d = (bd.bills || []).reduce((s, b) => {
        if (!b.dueDate) return s;
        const d = new Date(b.dueDate);
        if (isNaN(+d)) return s;
        if (d >= today && d <= sevenOut) return s + (Number(b.amount) || 0);
        return s;
      }, 0);
      const fmt = (n) => n === 0 ? '$0'
        : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1000 ? 2 : 0 });
      const accountCount = (bd.accounts || []).length;
      return {
        ...baseContent,
        headline: 'This month',
        brief: accountCount === 0
          ? 'Add an account to start'
          : `${fmt(totalBalance)} across ${accountCount} account${accountCount === 1 ? '' : 's'}`,
        stats: [
          { label: 'Balance', value: fmt(totalBalance) },
          { label: 'Income', value: monthlyIncome > 0 ? `${fmt(monthlyIncome)}/mo` : '—' },
          { label: 'Due ≤7d', value: due7d > 0 ? fmt(due7d) : '—' },
        ],
      };
    }
    if (contentKey === 'home') {
      const firstName = (t.userName || '').trim().split(/\s+/)[0] || '';
      const sectionCount = sections.length;
      return {
        ...baseContent,
        headline: firstName
          ? (<><span>Welcome </span><span style={{ color: t.accent }}>{firstName}</span></>)
          : 'Welcome',
        brief: firstName
          ? 'Swipe the dial to explore your sections.'
          : 'Swipe up to set your name and personalize Swiped.',
        stats: [
          { label: 'Sections', value: String(sectionCount) },
          {
            label: 'Today',
            value: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          },
          {
            label: 'Time',
            value: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          },
        ],
      };
    }
    if (contentKey === 'person') {
      const pd = peopleData[selected?.id] || { phones: [], emails: [], socials: [], birthday: '', notes: '', reminders: [] };
      // Age (years) computed from birthday year — only stat shown for people.
      let age = null;
      if (pd.birthday) {
        const [y, m, d] = pd.birthday.split('-').map(Number);
        if (y && m && d) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          age = today.getFullYear() - y;
          const before = (today.getMonth() + 1 < m) || (today.getMonth() + 1 === m && today.getDate() < d);
          if (before) age--;
        }
      }
      const open = (pd.reminders || []).filter((r) => !r.done).length;
      return {
        ...baseContent,
        headline: selected?.name || baseContent.headline,
        brief: open
          ? `${open} reminder${open === 1 ? '' : 's'}`
          : (age != null ? `${age} years old` : 'Add their details'),
        // Drop the phone/email counters — keep only Age when birthday is set.
        stats: age != null ? [{ label: 'Age', value: String(age) }] : [],
      };
    }
    return baseContent;
  }, [contentKey, baseContent, schoolSemesters, peopleData, selected, t.userName, t.accent, sections.length, budgetData]);

  // For the wheel's icon lookup, ensure each section has a valid iconKey
  const wheelSections = sections.map((s) => ({
    ...s,
    iconKey: s.iconKey || SECTION_LIB[s.contentKey || s.id]?.icon || 'target',
  }));

  // Wheel scales with the stage so it stays a comfortable size on a phone
  // and grows on a foldable / tablet. The user's steepness tweak still
  // controls relative shape; stageScale just multiplies through.
  const radius = t.wheelSize * stageScale;
  const protrusion = 175 * stageScale; // top of dial stays put; radius controls steepness
  const tf = TYPEFACES[t.typeface] || TYPEFACES.modern;

  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Track velocity (signed) for slosh
  const [velocity, setVelocity] = React.useState(0);
  const lastIdxRef = React.useRef(idx);
  const lastTRef = React.useRef(performance.now());
  React.useEffect(() => {
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastTRef.current) / 1000);
    const v = (idx - lastIdxRef.current) / dt;
    lastIdxRef.current = idx;
    lastTRef.current = now;
    setVelocity((prev) => prev + (v - prev) * 0.5);
  }, [idx]);
  // decay
  React.useEffect(() => {
    const i = setInterval(() => setVelocity((v) => v * 0.85), 60);
    return () => clearInterval(i);
  }, []);

  // Brief content fade key (transitions when idx changes)
  const briefKey = safeIdx;

  // Curved sheet outline shared by the background and the DetailView clip-path.
  const sheetPathD = sheetPath({
    progress: liquid.progress,
    finger: liquid.finger,
    W, H,
  });

  return (
    <div
      style={{
        position: 'relative',
        width: W, height: H,
        background: '#FAFAF7',
        overflow: 'hidden',
        margin: '0 auto',
        fontFamily: tf.family,
        color: '#0B0B0E',
        // smooth subpixel
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: `${54 * stageScale}px ${24 * stageScale}px 0`, // status bar / notch + scale with viewport
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 4,
      }}>
        <div style={{
          fontFamily: tf.mono, fontSize: 13 * stageScale, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
        }}>
          Swiped
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * stageScale }}>
          <div style={{
            fontFamily: tf.mono, fontSize: 13 * stageScale, letterSpacing: '0.14em',
            color: 'rgba(11,11,14,0.45)', fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            style={{
              appearance: 'none', border: '0.5px solid rgba(11,11,14,0.1)',
              background: 'rgba(255,255,255,0.6)',
              width: 30 * stageScale, height: 30 * stageScale,
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', padding: 0,
              color: 'rgba(11,11,14,0.6)',
            }}
          >
            <svg width={14 * stageScale} height={14 * stageScale} viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 1v2 M7 11v2 M1 7h2 M11 7h2 M2.8 2.8l1.4 1.4 M9.8 9.8l1.4 1.4 M2.8 11.2l1.4-1.4 M9.8 4.2l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brief / main content (above wheel). Top-aligned with a gap that
          scales with H but caps — keeps the content in the upper third on
          tall viewports (Fold cover, tablet) instead of sitting at the
          middle with a giant blank zone above it, while keeping a sane
          offset below the top bar on shorter phones. */}
      <div style={{
        position: 'absolute',
        top: Math.max(120, Math.min(280, (H - protrusion - 40) * 0.15)),
        left: 0, right: 0,
        bottom: protrusion + 40,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        padding: '0 28px',
        zIndex: 3,
      }}>
        <BriefPanel
          key={briefKey}
          section={selected}
          content={content}
          accent={t.accent}
          tf={tf}
          pulseKey={pulseKey}
          scale={stageScale}
        />
      </div>

      {/* Section dots / progress (between brief and wheel) */}
      <SectionDots
        sections={wheelSections}
        index={idx}
        accent={t.accent}
        bottom={protrusion + 28 * stageScale}
        scale={stageScale}
      />
      {/* small upward arrow chip floating above wheel — touch handle hint */}

      {/* Wheel */}
      <Wheel
        sections={wheelSections}
        index={idx}
        radius={radius}
        sectionAngle={t.wheelSpacing}
        accent={t.accent}
        width={W}
        height={H}
        protrusion={protrusion}
        velocity={velocity}
        onDrag={onWheelDrag}
        onSettle={onWheelSettle}
        onLiquidStart={onLiquidStart}
        scale={stageScale}
      />

      {/* Hint */}
      <SwipeHint
        visible={!liquid.active && !detailOpen}
        protrusion={protrusion}
        tf={tf}
        scale={stageScale}
      />

      {/* Sheet — black curved panel. Top edge peaks at the finger; the edges
          trail below by a lag that shrinks as the sheet nears fully open. */}
      <LiquidReveal path={sheetPathD} progress={liquid.progress} />

      {/* Detail content lives inside the same clip-path, so its visible edge
          follows the curve. The inner div translates the content down to the
          peak so text rides at the fingertip while the corners stretch up
          from below along the curve. */}
      {(detailOpen || liquid.progress > 0.02) && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 40,
            clipPath: sheetPathD ? `path('${sheetPathD}')` : 'none',
            WebkitClipPath: sheetPathD ? `path('${sheetPathD}')` : 'none',
            pointerEvents: detailOpen ? 'auto' : 'none',
            willChange: 'clip-path',
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
              transform: `translate3d(0, ${Math.max(0, liquid.finger?.y ?? 0)}px, 0)`,
              willChange: 'transform',
            }}
          >
            <DetailView
              section={selected}
              content={content}
              accent={t.accent}
              visible={detailOpen}
              progress={liquid.progress}
              onClose={closeDetail}
              onCloseDragStart={onCloseDragStart}
              schoolSemesters={schoolSemesters}
              setSchoolSemesters={setSchoolSemesters}
              schoolActiveSemesterId={schoolActiveSemesterId}
              selectSchoolSemester={selectSchoolSemester}
              weeklyData={weeklyData}
              setWeeklyData={setWeeklyData}
              weeklyActiveKey={weeklyActiveKey}
              setWeeklyActiveKey={setWeeklyActiveKey}
              peopleData={peopleData}
              setPeopleData={setPeopleData}
              userName={t.userName}
              setUserName={(v) => setTweak('userName', v)}
              sections={sections}
              updateSection={updateSelectedSection}
              homeData={homeData}
              setHomeData={setHomeData}
              budgetData={budgetData}
              setBudgetData={setBudgetData}
              scale={stageScale}
            />
          </div>
        </div>
      )}

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Style">
          <TweakColor
            label="Accent"
            value={t.accent}
            options={['#4FA862', '#3B6EFF', '#FF5A1F', '#E8C547', '#0B0B0E']}
            onChange={(v) => setTweak('accent', v)}
          />
          <TweakRadio
            label="Typeface"
            value={t.typeface}
            options={[
              { value: 'modern', label: 'Modern' },
              { value: 'editorial', label: 'Editorial' },
              { value: 'utility', label: 'Utility' },
              { value: 'geometric', label: 'Geometric' },
            ]}
            onChange={(v) => setTweak('typeface', v)}
          />
        </TweakSection>
        <TweakSection label="Wheel">
          <TweakSlider
            label="Steepness" value={t.wheelSize} min={220} max={460} step={5} unit=""
            onChange={(v) => setTweak('wheelSize', v)}
          />
          <TweakSlider
            label="Spacing" value={t.wheelSpacing} min={18} max={36} step={1} unit="°"
            onChange={(v) => setTweak('wheelSpacing', v)}
          />
        </TweakSection>
        <TweakSection label="Sheet">
          <TweakButton
            label="Preview swipe-up"
            onClick={() => {
              const start = { progress: 0, finger: { x: W / 2, y: H - 200 } };
              setLiquid({ active: true, ...start });
              animateSheet(start, { progress: 1, fingerY: 0 }, 600, () => setDetailOpen(true));
            }}
          />
        </TweakSection>
        <TweakSection label="Sections">
          <TweakButton label="Open settings…" onClick={() => setSettingsOpen(true)} />
        </TweakSection>
      </TweaksPanel>

      <SettingsSheet
        open={settingsOpen}
        sections={t.sections}
        onChange={(v) => setTweak('sections', v)}
        onClose={() => setSettingsOpen(false)}
        accent={t.accent}
        tf={tf}
        onResetSchoolData={resetSchoolData}
        userName={t.userName}
        onUserName={(v) => setTweak('userName', v)}
      />
    </div>
  );
}

function BriefPanel({ section, content, accent, tf, pulseKey, scale = 1 }) {
  // Scale typography + icon proportionally with the wheel so the brief
  // reads at a comfortable physical size on Fold cover / tablet viewports
  // where the CSS px-per-inch density is much higher than a phone.
  const s = scale;
  // animated mount: fade + slight slide
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.32s ease-out, transform 0.32s ease-out',
        display: 'flex', flexDirection: 'column', gap: 14 * s,
      }}
    >
      {/* big icon — circular avatar for person sections so uploaded photos
          read as profile pics */}
      <div style={{
        width: 44 * s, height: 44 * s, color: accent, marginBottom: 6 * s,
        borderRadius: section.contentKey === 'person' ? '50%' : 0,
        overflow: 'hidden',
      }}>
        {section.iconData
          ? <img src={section.iconData} alt="" style={{
              width: 44 * s, height: 44 * s,
              objectFit: section.contentKey === 'person' ? 'cover' : 'contain',
            }} />
          : (Icon[section.iconKey] || Icon.target)}
      </div>
      {/* section name in mono — literal section name for everything except
          person sections (where section.name is a person's full name, so we
          surface a generic "Person" label instead). */}
      <div style={{
        fontFamily: tf.mono, fontSize: 11 * s, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'rgba(11,11,14,0.5)',
      }}>
        {section.contentKey === 'person' ? 'Person' : section.name}
      </div>
      {/* headline (serif italic) */}
      <div style={{
        fontFamily: tf.display, fontStyle: 'italic',
        fontSize: 56 * s, lineHeight: '0.95', letterSpacing: '-0.025em',
        fontWeight: 400, color: '#0B0B0E',
        textWrap: 'pretty',
      }}>
        {content.headline}
      </div>
      {/* brief */}
      <div style={{
        fontFamily: tf.family, fontSize: 17 * s, lineHeight: 1.35,
        color: 'rgba(11,11,14,0.62)', letterSpacing: '-0.01em',
        textWrap: 'pretty',
      }}>
        {content.brief}
      </div>

      {/* mini stat strip — skipped entirely when stats is empty (e.g. a
          person with no birthday set has nothing to surface here yet). */}
      {content.stats && content.stats.length > 0 && (
        <div style={{ display: 'flex', gap: 18 * s, marginTop: 16 * s }}>
          {content.stats.slice(0, 3).map((s2, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 * s, minWidth: 0 }}>
              <div style={{
                fontFamily: tf.mono, fontSize: 9 * s, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(11,11,14,0.4)',
                whiteSpace: 'nowrap',
              }}>{s2.label}</div>
              <div style={{
                fontFamily: tf.family, fontSize: 16 * s, fontWeight: 500,
                letterSpacing: '-0.01em', color: '#0B0B0E',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>{s2.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionDots({ sections, index, accent, bottom, scale = 1 }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom,
      display: 'flex', justifyContent: 'center', gap: 6 * scale,
      zIndex: 3, pointerEvents: 'none',
    }}>
      {sections.map((s, i) => {
        const dist = Math.abs(i - index);
        const isSelected = dist < 0.5;
        return (
          <div key={s.id} style={{
            width: (isSelected ? 16 : 4) * scale,
            height: 4 * scale,
            borderRadius: 2 * scale,
            background: isSelected ? accent : 'rgba(11,11,14,0.18)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        );
      })}
    </div>
  );
}

function SwipeHint({ visible, protrusion, tf, scale = 1 }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      bottom: protrusion + 60 * scale,
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 8,
      opacity: visible ? 0.6 : 0,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6 * scale,
        color: 'rgba(11,11,14,0.5)',
        fontFamily: tf.mono, fontSize: 9 * scale, letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        <svg width={8 * scale} height={10 * scale} viewBox="0 0 8 10" fill="none">
          <path d="M4 9 V1 M1 4l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ whiteSpace: 'nowrap' }}>Hold &amp; swipe up</span>
      </div>
    </div>
  );
}

function SectionEditor({ sections, onChange }) {
  const AVAILABLE = ['work', 'budget', 'school', 'goals', 'notes', 'health', 'habits', 'tasks', 'reading'];
  const used = new Set(sections.map((s) => s.contentKey || s.id));
  const remove = (i) => onChange(sections.filter((_, idx) => idx !== i));
  const rename = (i, name) => onChange(sections.map((s, idx) => (idx === i ? { ...s, name } : s)));
  const add = (key) => {
    const lib = SECTION_LIB[key];
    if (!lib) return;
    const cap = key[0].toUpperCase() + key.slice(1);
    onChange([
      ...sections,
      { id: key + '_' + Date.now(), name: cap, iconKey: lib.icon, contentKey: key },
    ]);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sections.map((s, i) => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 6px', background: 'rgba(0,0,0,0.04)', borderRadius: 6,
        }}>
          <input
            value={s.name}
            onChange={(e) => rename(i, e.target.value)}
            style={{
              flex: 1, border: 0, background: 'transparent',
              font: 'inherit', outline: 'none', minWidth: 0,
            }}
          />
          <button
            onClick={() => remove(i)}
            style={{
              appearance: 'none', border: 0, background: 'transparent',
              color: 'rgba(0,0,0,0.4)', cursor: 'pointer', padding: '0 4px',
              fontSize: 14, lineHeight: 1,
            }}
          >✕</button>
        </div>
      ))}
      {AVAILABLE.filter((k) => !used.has(k)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {AVAILABLE.filter((k) => !used.has(k)).map((k) => (
            <button
              key={k}
              onClick={() => add(k)}
              style={{
                appearance: 'none', border: '0.5px dashed rgba(0,0,0,0.2)',
                background: 'transparent', borderRadius: 5,
                padding: '3px 8px', font: 'inherit', cursor: 'pointer',
                color: 'rgba(0,0,0,0.6)',
              }}
            >+ {k}</button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { App, TWEAK_DEFAULTS });

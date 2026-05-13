// app.jsx — Swiped main app. Composes Wheel + LiquidReveal + DetailView and
// owns gesture state, currentIdx (with snap inertia), liquid progress.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4FA862",
  "wheelSize": 280,
  "wheelSpacing": 26,
  "liquid": "paint",
  "typeface": "modern",
  "userName": "",
  "icsLinks": {},
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
  // Quick-jump picker overlay — opened from the grid icon next to the
  // section dots when there are 7+ sections (small dots become fiddly).
  const [pickerOpen, setPickerOpen] = React.useState(false);
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

  // ICS events cache: { [sectionId]: { events, fetchedAt, error } }. Not
  // persisted — re-fetched on demand from the URL stored in tweaks.icsLinks
  // for the section currently being viewed, scoped to its active week.
  const [icsEvents, setIcsEvents] = React.useState({});

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
    accounts: [], income: [], bills: [], subscriptions: [], notes: '',
  }));

  // Per-health-section daily entries: { [sectionId]: { 'YYYY-MM-DD': { steps, sleepMinutes } } }.
  // Manual until we wrap in Capacitor and pull from HealthKit; today's entry
  // drives the wheel brief and the last-7-day chart in the detail view.
  const [healthData, setHealthData] = usePersistedState('swiped.health', () => ({}));

  // Per-section data for travel / workouts / meals. All three are seeded
  // from SECTION_LIB the first time a section of that type is added (see
  // the seedSectionData helper below) so users see a working example.
  const [travelData, setTravelData] = usePersistedState('swiped.travel', () => ({}));
  const [workoutsData, setWorkoutsData] = usePersistedState('swiped.workouts', () => ({}));
  const [mealsData, setMealsData] = usePersistedState('swiped.meals', () => ({}));

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

  // Fetch ICS events for the currently-active weekly section whenever the
  // section, its configured ICS URL, or the active week changes. Cached
  // 15min by ics.js so navigation doesn't hammer the proxy.
  const safeIdxForIcs = Math.max(0, Math.min(sections.length - 1, Math.round(targetIdx)));
  const activeSectionForIcs = sections[safeIdxForIcs];
  const activeSectionContentKey = activeSectionForIcs?.contentKey || activeSectionForIcs?.id;
  const activeSectionId = activeSectionForIcs?.id;
  const isActiveWeekly = activeSectionContentKey === 'work' || activeSectionContentKey === 'school';
  const activeIcsUrl = (t.icsLinks && t.icsLinks[activeSectionId]) || '';
  const activeWeekKeyForIcs = (weeklyActiveKey && weeklyActiveKey[activeSectionId]) || weekKey(new Date());

  // Bump to force-refetch the ICS feed (bypasses the 15-min cache and
  // wipes the cache entry first). Surfaced as a Refresh button in the
  // weekly view header so users can pull fresh after publishing changes.
  const [icsRefreshTick, setIcsRefreshTick] = React.useState(0);

  React.useEffect(() => {
    if (!isActiveWeekly || !activeIcsUrl || !window.SwipedICS) return;
    let cancelled = false;
    const rangeStart = parseWeekKey(activeWeekKeyForIcs);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    const force = icsRefreshTick > 0;
    window.SwipedICS.getEvents(activeIcsUrl, rangeStart, rangeEnd, { force })
      .then((result) => {
        if (cancelled) return;
        // result is { events, totalParsed, bytes, rawVeventMatches, sourceProxy }.
        const events = Array.isArray(result) ? result : (result.events || []);
        const totalParsed = Array.isArray(result) ? events.length : (result.totalParsed || 0);
        const bytes = Array.isArray(result) ? 0 : (result.bytes || 0);
        const rawVeventMatches = Array.isArray(result) ? 0 : (result.rawVeventMatches || 0);
        const sourceProxy = Array.isArray(result) ? null : (result.sourceProxy || null);
        setIcsEvents((prev) => ({
          ...prev,
          [activeSectionId]: { events, totalParsed, bytes, rawVeventMatches, sourceProxy, fetchedAt: Date.now(), error: null },
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setIcsEvents((prev) => ({
          ...prev,
          [activeSectionId]: { events: [], totalParsed: 0, fetchedAt: Date.now(), error: err.message || String(err) },
        }));
      });
    return () => { cancelled = true; };
  }, [isActiveWeekly, activeIcsUrl, activeSectionId, activeWeekKeyForIcs, icsRefreshTick]);

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
    setBudgetData({ accounts: [], income: [], bills: [], subscriptions: [], notes: '' });
    setHealthData({});
    setTravelData({});
    setWorkoutsData({});
    setMealsData({});
  };

  // Sheet gesture state. `finger` is the live pointer position; `progress`
  // is the open ratio (0=wheel resting on screen, 1=wheel fully lifted off
  // the top, revealing the DetailView page sitting behind it). The wheel
  // itself rises with the finger — there's no separate page rising from
  // below. `lift` is the px the wheel container is translated upward.
  const [liquid, setLiquid] = React.useState({ active: false, progress: 0, finger: null, lift: 0 });
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

  // Liquid drag: pinch the dial's icon and lift it; the WHEEL ITSELF rises
  // with the finger 1:1, with a soft squish past the threshold. The
  // DetailView sits underneath the whole time and becomes visible as the
  // wheel slides up away from the bottom. Note: liftMax is computed inside
  // the handler so it can read `protrusion`, which is declared further
  // down the component body; if we computed it up here, `protrusion` would
  // still be undefined (TDZ → NaN) and the wheel would never lift.
  const onLiquidStart = ({ startX, startY }) => {
    const wheelTotalHeight = (175 * stageScale) + 80; // mirrors `protrusion + 80`
    const liftMax = Math.max(H * 0.6, wheelTotalHeight + 100);
    setLiquid({ active: true, progress: 0, finger: { x: startX, y: startY }, lift: 0 });
    const startTime = performance.now();
    const move = (ev) => {
      const dy = startY - ev.clientY;
      const raw = Math.max(0, dy);
      // 1:1 follow up to liftMax, then asymptotic squish past the threshold.
      // No leading damping — the wheel must visibly leave the bottom even
      // on tiny drags, or the gesture feels broken.
      const lift = raw < liftMax
        ? raw
        : liftMax + (raw - liftMax) * 0.2;
      const p = Math.max(0, Math.min(1, lift / liftMax));
      setLiquid((l) => ({ ...l, progress: p, finger: { x: ev.clientX, y: ev.clientY }, lift }));
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const dy = startY - (ev.clientY ?? startY);
      const elapsed = performance.now() - startTime;
      const velocity = dy / Math.max(50, elapsed);
      const cur = liquidRef.current;
      if (cur.progress > 0.4 || (velocity > 1.0 && cur.progress > 0.1)) {
        // Commit: wheel finishes its rise off the top of the screen, with
        // a small overshoot for the jelly settle.
        animateLift(cur, 1, 260, () => setDetailOpen(true));
      } else {
        // Bounce back down to the dial.
        animateLift(cur, 0, 220, () => {
          setLiquid({ active: false, progress: 0, finger: null, lift: 0 });
        });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Tween wheel lift toward a target progress (0..1). Opening eases out with
  // a slight elastic curve so the wheel feels rubbery; closing eases in.
  const animateLift = (from, targetP, duration, done) => {
    // Recompute liftMax here for the same reason as onLiquidStart — using
    // the outer-scope `protrusion` directly is TDZ-NaN at this point.
    const liftMax = Math.max(H * 0.6, (175 * stageScale) + 80 + 100);
    const startT = performance.now();
    const fromP = from.progress;
    const fromLift = from.lift || 0;
    const targetLift = targetP * liftMax;
    const opening = targetP > fromP;
    const tick = () => {
      const k = Math.min(1, (performance.now() - startT) / duration);
      let eased;
      if (opening) {
        // Slight overshoot for elastic settle (back-out).
        const s = 1.4;
        eased = 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
      } else {
        eased = Math.pow(k, 2);
      }
      const lift = fromLift + (targetLift - fromLift) * eased;
      const p = fromP + (targetP - fromP) * eased;
      setLiquid((l) => ({ ...l, progress: p, lift }));
      if (k < 1) requestAnimationFrame(tick);
      else done && done();
    };
    requestAnimationFrame(tick);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    animateLift(liquidRef.current, 0, 320, () => {
      setLiquid({ active: false, progress: 0, finger: null, lift: 0 });
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
      // Live "due this week" count = open user-added tasks + read-only ICS
      // events imported for the active week. Replaces the seeded "3" so the
      // wheel brief reflects what's actually on the plate.
      const schoolId = selected?.id || 'school';
      const wk = (weeklyActiveKey && weeklyActiveKey[schoolId]) || weekKey(new Date());
      const weekStore = (weeklyData[schoolId] && weeklyData[schoolId][wk]) || { tasks: [] };
      const openTasks = (weekStore.tasks || []).filter((t2) => !t2.done).length;
      const eventCount = (icsEvents[schoolId]?.events || []).length;
      const dueCount = openTasks + eventCount;
      return {
        ...baseContent,
        brief: dueCount === 0
          ? 'No assignments due'
          : `${dueCount} assignment${dueCount === 1 ? '' : 's'} due`,
        stats: [
          { label: 'GPA', value: gpaStr },
          { label: 'Credits', value: String(overall.credits) },
          { label: 'Due ≤7d', value: String(dueCount) },
        ],
        semesters: schoolSemesters,
      };
    }
    if (contentKey === 'work') {
      // Live stats — replaces the seeded "3h 12m / 4-of-6 blocks / 4h 02m
      // avg" numbers with counts derived from the active week's tasks and
      // the imported ICS feed.
      const workId = selected?.id || 'work';
      const wk = (weeklyActiveKey && weeklyActiveKey[workId]) || weekKey(new Date());
      const weekStore = (weeklyData[workId] && weeklyData[workId][wk]) || { tasks: [] };
      const openTasks = (weekStore.tasks || []).filter((t2) => !t2.done).length;
      const events = icsEvents[workId]?.events || [];
      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      // Past meetings (end < now) move to the Recent section in the detail
      // view and don't count toward "open" or the Today / Week stats.
      const upcomingEvents = events.filter((e) => new Date(e.end) >= now);
      const eventsToday = upcomingEvents.filter((e) => {
        const d = new Date(e.start);
        return d >= today && d < tomorrow;
      }).length;
      const totalToday = eventsToday + openTasks;
      return {
        ...baseContent,
        brief: totalToday === 0
          ? 'No meetings today'
          : eventsToday > 0 && openTasks > 0
          ? `${eventsToday} meeting${eventsToday === 1 ? '' : 's'} · ${openTasks} task${openTasks === 1 ? '' : 's'}`
          : eventsToday > 0
          ? `${eventsToday} meeting${eventsToday === 1 ? '' : 's'} today`
          : `${openTasks} task${openTasks === 1 ? '' : 's'} this week`,
        stats: [
          { label: 'Today', value: String(eventsToday) },
          { label: 'Tasks', value: String(openTasks) },
          { label: 'Week', value: String(upcomingEvents.length) },
        ],
      };
    }
    if (contentKey === 'budget') {
      const bd = budgetData || { accounts: [], income: [], bills: [] };
      // Total balance = cash account balances + available credit on credit
      // cards (kind: 'credit'). Available credit is spendable, so the wheel
      // brief surfaces the full liquid + credit headroom.
      const totalBalance = (bd.accounts || []).reduce((s, a) => {
        if (a.kind === 'credit') return s + (Number(a.available) || 0);
        return s + (Number(a.balance) || 0);
      }, 0);
      // Income totals are post-tax monthly: each entry's gross is normalized
      // to a per-month figure based on its pay type + frequency, then the
      // average tax rate (default 22%) is subtracted.
      const monthlyIncome = (bd.income || []).reduce((s, i) => s + monthlyNetIncome(i), 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const sevenOut = new Date(today); sevenOut.setDate(today.getDate() + 7);
      // Bills now carry a frequency too — nextRenewal advances stored
      // monthly / yearly dates forward so a forgotten "2026-05-01" rent
      // still surfaces correctly when its next-month due date hits the
      // 7-day window. One-time bills don't auto-advance.
      const billsDue7d = (bd.bills || []).reduce((s, b) => {
        const d = nextRenewal({ renewalDate: b.dueDate, frequency: b.frequency || 'monthly' });
        if (!d) return s;
        if (d >= today && d <= sevenOut) return s + (Number(b.amount) || 0);
        return s;
      }, 0);
      // Subscription renewals coming up in the next 7 days. nextRenewal()
      // rolls a stored past date forward by the frequency, so old entries
      // that haven't been refreshed still report the correct upcoming charge.
      const subsDue7d = (bd.subscriptions || []).reduce((s, sub) => {
        const d = nextRenewal(sub);
        if (!d) return s;
        if (d >= today && d <= sevenOut) return s + (Number(sub.amount) || 0);
        return s;
      }, 0);
      // Credit card payments — auto-advancing monthly date + Amount due
      // entered per card. Included in Due ≤7d alongside bills and subs so
      // the wheel brief reflects the full upcoming outflow.
      const creditDue7d = (bd.accounts || []).reduce((s, a) => {
        if (a.kind !== 'credit') return s;
        const d = nextRenewal({ renewalDate: a.dueDate, frequency: 'monthly' });
        if (!d) return s;
        if (d >= today && d <= sevenOut) return s + (Number(a.amountDue) || 0);
        return s;
      }, 0);
      const due7d = billsDue7d + subsDue7d + creditDue7d;
      const fmt = (n) => n === 0 ? '$0'
        : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1000 ? 2 : 0 });
      const accountCount = (bd.accounts || []).length;
      // List of every individual outflow falling inside the next 7 days,
      // sorted by date. Rendered under the stat strip so the user sees what
      // makes up the Due ≤7d total at a glance.
      const upcoming = [];
      (bd.bills || []).forEach((b) => {
        const d = nextRenewal({ renewalDate: b.dueDate, frequency: b.frequency || 'monthly' });
        if (d && d >= today && d <= sevenOut) {
          upcoming.push({ kind: 'bill', name: b.name || 'Bill', amount: Number(b.amount) || 0, date: d });
        }
      });
      (bd.subscriptions || []).forEach((sub) => {
        const d = nextRenewal(sub);
        if (d && d >= today && d <= sevenOut) {
          upcoming.push({ kind: 'sub', name: sub.name || 'Subscription', amount: Number(sub.amount) || 0, date: d });
        }
      });
      (bd.accounts || []).forEach((a) => {
        if (a.kind !== 'credit') return;
        const d = nextRenewal({ renewalDate: a.dueDate, frequency: 'monthly' });
        if (d && d >= today && d <= sevenOut) {
          upcoming.push({ kind: 'credit', name: a.name || 'Credit card', amount: Number(a.amountDue) || 0, date: d });
        }
      });
      upcoming.sort((a, b) => a.date - b.date);
      return {
        ...baseContent,
        headline: 'This month',
        // Brief line removed — stats sit directly under the headline now,
        // and the upcoming list (below) replaces the prose summary.
        brief: null,
        stats: [
          { label: 'Balance', value: fmt(totalBalance) },
          { label: 'Income', value: monthlyIncome > 0 ? `${fmt(monthlyIncome)}/mo` : '—' },
          { label: 'Due ≤7d', value: due7d > 0 ? fmt(due7d) : '—' },
        ],
        extras: upcoming.map((u) => ({
          label: u.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          name: u.name,
          value: fmt(u.amount),
        })),
      };
    }
    if (contentKey === 'home') {
      const firstName = (t.userName || '').trim().split(/\s+/)[0] || '';
      // Roll the user's other sections into a single "what needs attention"
      // list. Sections with nothing pending stay hidden so this is a true
      // priority feed instead of a per-section dashboard.
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(today); endOfTomorrow.setDate(today.getDate() + 2);
      const sevenOut = new Date(today); sevenOut.setDate(today.getDate() + 7);
      const threeOut = new Date(today); threeOut.setDate(today.getDate() + 3);
      const homeExtras = [];
      sections.forEach((sec) => {
        const ck = sec.contentKey || sec.id;
        if (ck === 'home') return;
        if (ck === 'work') {
          const wk = (weeklyActiveKey && weeklyActiveKey[sec.id]) || weekKey(new Date());
          const weekStore = (weeklyData[sec.id] && weeklyData[sec.id][wk]) || { tasks: [] };
          const openTasks = (weekStore.tasks || []).filter((tt) => !tt.done).length;
          const events = icsEvents[sec.id]?.events || [];
          // Today + tomorrow window for meetings (calendar events tend to be
          // time-sensitive; tasks aren't dated so they roll up at the week).
          const dueEvents = events.filter((e) => {
            const d = new Date(e.start);
            return d >= today && d < endOfTomorrow;
          }).length;
          const parts = [];
          if (dueEvents > 0) parts.push(`${dueEvents} meeting${dueEvents === 1 ? '' : 's'}`);
          if (openTasks > 0) parts.push(`${openTasks} task${openTasks === 1 ? '' : 's'}`);
          if (parts.length) {
            homeExtras.push({ name: sec.name, label: 'Today & tomorrow', value: parts.join(' · ') });
          }
        } else if (ck === 'school') {
          const wk = (weeklyActiveKey && weeklyActiveKey[sec.id]) || weekKey(new Date());
          const weekStore = (weeklyData[sec.id] && weeklyData[sec.id][wk]) || { tasks: [] };
          const openTasks = (weekStore.tasks || []).filter((tt) => !tt.done).length;
          const events = icsEvents[sec.id]?.events || [];
          const total = openTasks + events.length;
          if (total > 0) {
            homeExtras.push({ name: sec.name, label: 'Next 7 days', value: `${total} due` });
          }
        } else if (ck === 'budget') {
          const bd = budgetData || {};
          let count = 0;
          (bd.bills || []).forEach((b) => {
            const d = nextRenewal({ renewalDate: b.dueDate, frequency: b.frequency || 'monthly' });
            if (d && d >= today && d <= threeOut) count++;
          });
          (bd.subscriptions || []).forEach((sub) => {
            const d = nextRenewal(sub);
            if (d && d >= today && d <= threeOut) count++;
          });
          (bd.accounts || []).forEach((a) => {
            if (a.kind !== 'credit') return;
            const d = nextRenewal({ renewalDate: a.dueDate, frequency: 'monthly' });
            if (d && d >= today && d <= threeOut) count++;
          });
          if (count > 0) {
            homeExtras.push({ name: sec.name, label: 'Next 3 days', value: `${count} due` });
          }
        } else if (ck === 'person') {
          const pd = peopleData[sec.id] || {};
          const open = (pd.reminders || []).filter((r) => !r.done).length;
          if (open > 0) {
            homeExtras.push({ name: sec.name, label: 'Reminders', value: `${open} open` });
          }
        }
      });
      return {
        ...baseContent,
        headline: firstName
          ? (<><span>Welcome </span><span style={{ color: t.accent }}>{firstName}</span></>)
          : 'Welcome',
        // Empty state: keep a single short line so the panel isn't bare.
        // Otherwise the headline sits directly above the extras list.
        brief: firstName
          ? (homeExtras.length === 0 ? 'All caught up.' : null)
          : 'Swipe up to set your name and personalize Swiped.',
        stats: [],
        extras: homeExtras,
      };
    }
    if (contentKey === 'health') {
      // Today's manual entry drives the stats. Sleep stored in minutes;
      // formatted as "Xh YY" to match the seeded copy.
      const sectionId = selected?.id || 'health';
      const dayKey = new Date().toISOString().slice(0, 10);
      const today = (healthData[sectionId] && healthData[sectionId][dayKey]) || {};
      const stepsVal = today.steps != null && today.steps !== ''
        ? Number(today.steps).toLocaleString('en-US') : '—';
      const sleepMin = Number(today.sleepMinutes) || 0;
      const sleepStr = sleepMin > 0
        ? `${Math.floor(sleepMin / 60)}h ${String(sleepMin % 60).padStart(2, '0')}` : '—';
      return {
        ...baseContent,
        brief: stepsVal === '—' && sleepStr === '—'
          ? 'Tap to log today’s steps and sleep'
          : `${stepsVal === '—' ? '0' : stepsVal} steps · ${sleepStr === '—' ? 'no sleep logged' : sleepStr + ' sleep'}`,
        stats: [
          { label: 'Steps', value: stepsVal },
          { label: 'Sleep', value: sleepStr },
        ],
      };
    }
    if (contentKey === 'travel') {
      const sectionId = selected?.id || 'travel';
      const stored = travelData[sectionId];
      const trips = (stored ? stored.trips : SECTION_LIB.travel.trips) || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
      // Categorize: current trip (today inside [start, end]) or next upcoming.
      let current = null;
      let next = null;
      let nextDelta = Infinity;
      let tripsThisYear = 0;
      let daysThisYear = 0;
      trips.forEach((tr) => {
        const start = tr.startDate ? new Date(tr.startDate) : null;
        const end = tr.endDate ? new Date(tr.endDate) : start;
        if (!start) return;
        start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
        if (start >= yearStart && start < yearEnd) {
          tripsThisYear++;
          daysThisYear += Math.max(1, Math.round((end - start) / 86_400_000) + 1);
        }
        if (today >= start && today <= end) current = { trip: tr, start, end };
        else if (start > today) {
          const delta = Math.round((start - today) / 86_400_000);
          if (delta < nextDelta) { nextDelta = delta; next = { trip: tr, start, end, delta }; }
        }
      });
      let brief = 'No trips planned';
      let nextLabel = '—';
      if (current) {
        const total = Math.round((current.end - current.start) / 86_400_000) + 1;
        const dayN = Math.round((today - current.start) / 86_400_000) + 1;
        brief = `In ${current.trip.destination || '—'} · Day ${dayN} of ${total}`;
        nextLabel = 'Now';
      } else if (next) {
        brief = next.delta === 0 ? `${next.trip.destination} today`
          : next.delta === 1 ? `${next.trip.destination} tomorrow`
          : `${next.trip.destination} in ${next.delta} days`;
        nextLabel = next.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return {
        ...baseContent,
        brief,
        stats: [
          { label: 'Next', value: nextLabel },
          { label: `Trips ${String(today.getFullYear()).slice(-2)}`, value: String(tripsThisYear) },
          { label: 'Days', value: String(daysThisYear) },
        ],
      };
    }
    if (contentKey === 'workouts') {
      const sectionId = selected?.id || 'workouts';
      const stored = workoutsData[sectionId];
      const sessions = (stored ? stored.sessions : SECTION_LIB.workouts.sessions) || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      // Monday-anchored week start.
      const dow = (today.getDay() + 6) % 7; // 0 = Monday
      const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      let weekCount = 0;
      let weekMinutes = 0;
      const dateSet = new Set();
      sessions.forEach((s) => {
        if (!s.date) return;
        const d = new Date(s.date); d.setHours(0, 0, 0, 0);
        dateSet.add(d.toISOString().slice(0, 10));
        if (d >= weekStart && d < weekEnd) {
          weekCount++;
          weekMinutes += Number(s.duration) || 0;
        }
      });
      // Streak — consecutive days back from today with at least one session.
      let streak = 0;
      const cursor = new Date(today);
      while (dateSet.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      const hours = Math.floor(weekMinutes / 60);
      const mins = weekMinutes % 60;
      const durStr = weekMinutes === 0 ? '0m'
        : hours === 0 ? `${mins}m`
        : `${hours}h ${mins}m`;
      return {
        ...baseContent,
        brief: weekCount === 0
          ? 'No workouts yet this week'
          : `${weekCount} session${weekCount === 1 ? '' : 's'} · ${durStr}`,
        stats: [
          { label: 'This wk', value: String(weekCount) },
          { label: 'Minutes', value: String(weekMinutes) },
          { label: 'Streak', value: streak === 0 ? '—' : `${streak}d` },
        ],
      };
    }
    if (contentKey === 'meals') {
      const sectionId = selected?.id || 'meals';
      const stored = mealsData[sectionId];
      const week = (stored ? stored.week : SECTION_LIB.meals.week) || {};
      const grocery = (stored ? stored.grocery : SECTION_LIB.meals.grocery) || [];
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const todayIdx = (new Date().getDay() + 6) % 7; // 0=Mon
      const todayKey = dayKeys[todayIdx];
      const todayDinner = (week[todayKey] && week[todayKey].dinner) || '';
      const planned = dayKeys.reduce((s, k) => s + ((week[k] && week[k].dinner) ? 1 : 0), 0);
      const eatingOut = dayKeys.reduce((s, k) => {
        const d = (week[k] && week[k].dinner) || '';
        return s + (/\bout\b|takeout|restaurant|delivery/i.test(d) ? 1 : 0);
      }, 0);
      const groceryLeft = grocery.filter((g) => !g.got).length;
      return {
        ...baseContent,
        brief: todayDinner
          ? `Tonight: ${todayDinner}`
          : (planned > 0 ? 'Nothing planned tonight' : 'Plan some meals'),
        stats: [
          { label: 'Planned', value: `${planned} / 7` },
          { label: 'Grocery', value: groceryLeft > 0 ? `${groceryLeft} left` : '—' },
          { label: 'Eating out', value: String(eatingOut) },
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
  }, [contentKey, baseContent, schoolSemesters, peopleData, selected, t.userName, t.accent, sections.length, budgetData, weeklyData, weeklyActiveKey, icsEvents, healthData, travelData, workoutsData, mealsData]);

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
        // Fade out only late in the drag — the brief should still be
        // legible while the wheel is rising under the user's finger, and
        // only disappear as the page underneath comes into view.
        opacity: Math.max(0, 1 - Math.max(0, (liquid.progress - 0.5) / 0.5)),
        transform: liquid.lift ? `translate3d(0, ${-liquid.lift * 0.25}px, 0)` : undefined,
        willChange: liquid.lift ? 'transform, opacity' : undefined,
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

      {/* Section dots / progress (between brief and wheel) — fade with brief
          as the wheel rises so the lifted dial is the only thing in motion. */}
      <div style={{
        opacity: Math.max(0, 1 - Math.max(0, (liquid.progress - 0.5) / 0.5)),
        transform: liquid.lift ? `translate3d(0, ${-liquid.lift * 0.5}px, 0)` : undefined,
        transition: liquid.active ? undefined : 'opacity 0.18s ease',
      }}>
        <SectionDots
          sections={wheelSections}
          index={idx}
          accent={t.accent}
          bottom={protrusion + 28 * stageScale}
          scale={stageScale}
          onJump={(i) => setTargetIdx(i)}
          onOpenPicker={() => setPickerOpen(true)}
        />
      </div>
      {/* small upward arrow chip floating above wheel — touch handle hint */}

      {/* Wheel — rises with the finger during a liquid drag */}
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
        lift={liquid.lift || 0}
      />

      {/* Hint */}
      <SwipeHint
        visible={!liquid.active && !detailOpen}
        protrusion={protrusion}
        tf={tf}
        scale={stageScale}
      />

      {/* (No separate dark sheet — the wheel itself rises during the drag
          and reveals the DetailView sitting behind it.) */}

      {/* Detail content lives behind the wheel and is revealed as the wheel
          follows the curve. The inner div translates the content down to the
          peak so text rides at the fingertip while the corners stretch up
          from below along the curve. */}
      {(detailOpen || (liquid.active && liquid.progress > 0.5)) && (
        <div
          style={{
            // Sits behind the rising wheel during the drag (z=4 < wheel z=5)
            // so the wheel reveals the page underneath as it lifts. Once
            // the gesture commits, jump to z=40 so the detail captures all
            // pointer events and overlays the rest of the chrome. The
            // panel is held invisible until progress passes 0.7, then
            // ramps in quickly — so the page only appears once the wheel
            // is nearly off-screen, not during the early drag.
            position: 'absolute', inset: 0,
            zIndex: detailOpen ? 40 : 4,
            background: '#0B0B0E',
            opacity: detailOpen ? 1 : Math.max(0, (liquid.progress - 0.7) / 0.3),
            pointerEvents: detailOpen ? 'auto' : 'none',
            willChange: 'opacity',
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 0,
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
              healthData={healthData}
              setHealthData={setHealthData}
              travelData={travelData}
              setTravelData={setTravelData}
              workoutsData={workoutsData}
              setWorkoutsData={setWorkoutsData}
              mealsData={mealsData}
              setMealsData={setMealsData}
              icsEvents={icsEvents}
              icsLinks={t.icsLinks || {}}
              onIcsRefresh={() => setIcsRefreshTick((n) => n + 1)}
              scale={stageScale}
            />
          </div>
        </div>
      )}

      {/* Quick-jump section picker — only mounted when open */}
      {pickerOpen && (
        <SectionPicker
          sections={wheelSections}
          activeIdx={Math.round(idx)}
          accent={t.accent}
          onPick={(i) => { setTargetIdx(i); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
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
        icsLinks={t.icsLinks || {}}
        onIcsUrl={(sectionId, url) => {
          const next = { ...(t.icsLinks || {}) };
          if (url) next[sectionId] = url; else delete next[sectionId];
          setTweak('icsLinks', next);
        }}
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
      {/* brief — hidden when null (e.g. budget, which renders an upcoming
          list under the stats instead of a prose summary). */}
      {content.brief && (
        <div style={{
          fontFamily: tf.family, fontSize: 17 * s, lineHeight: 1.35,
          color: 'rgba(11,11,14,0.62)', letterSpacing: '-0.01em',
          textWrap: 'pretty',
        }}>
          {content.brief}
        </div>
      )}

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

      {/* extras — section-specific list rendered under the stat strip.
          Budget uses this to surface each individual bill / subscription /
          credit-card payment falling inside the next 7 days. */}
      {content.extras && content.extras.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * s, marginTop: 14 * s }}>
          {content.extras.map((x, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              alignItems: 'baseline', gap: 12 * s,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 * s, minWidth: 0 }}>
                <div style={{
                  fontFamily: tf.family, fontSize: 14 * s, fontWeight: 500,
                  letterSpacing: '-0.01em', color: '#0B0B0E',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{x.name}</div>
                <div style={{
                  fontFamily: tf.mono, fontSize: 9 * s, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(11,11,14,0.4)',
                  whiteSpace: 'nowrap',
                }}>{x.label}</div>
              </div>
              <div style={{
                fontFamily: tf.family, fontSize: 14 * s, fontWeight: 500,
                letterSpacing: '-0.01em', color: '#0B0B0E',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>{x.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionDots({ sections, index, accent, bottom, scale = 1, onJump, onOpenPicker }) {
  // Strip overlays the wheel's top-center area. To avoid stealing the
  // wheel's natural rotate / lift gestures, only the individual dots and
  // the grid button accept pointer events; the strip itself is transparent
  // to taps + drags, so anything that misses a dot falls through to the
  // wheel below.
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 6 * scale, zIndex: 10, pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6 * scale,
        padding: `${6 * scale}px ${2 * scale}px`,
      }}>
        {sections.map((s, i) => {
          const dist = Math.abs(i - index);
          const isSelected = dist < 0.5;
          return (
            <button
              key={s.id}
              onClick={() => onJump && onJump(i)}
              aria-label={`Jump to ${s.name}`}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                padding: `${6 * scale}px ${4 * scale}px`,
                cursor: 'pointer', lineHeight: 0,
                pointerEvents: 'auto',
              }}
            >
              <div style={{
                width: (isSelected ? 16 : 4) * scale,
                height: 4 * scale,
                borderRadius: 2 * scale,
                background: isSelected ? accent : 'rgba(11,11,14,0.18)',
                transition: 'width 0.25s ease, background 0.25s ease',
              }} />
            </button>
          );
        })}
      </div>
      {/* Grid icon — only when the wheel has enough sections that tapping
          individual dots gets fiddly. Opens an overlay picker. */}
      {sections.length >= 7 && (
        <button
          onClick={onOpenPicker}
          aria-label="All sections"
          style={{
            appearance: 'none', border: 0, background: 'transparent',
            padding: `${10 * scale}px ${8 * scale}px`,
            cursor: 'pointer', color: 'rgba(11,11,14,0.55)', lineHeight: 0,
            pointerEvents: 'auto',
          }}
        >
          <svg width={14 * scale} height={14 * scale} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Section picker overlay — surfaced from the grid button next to the
// section dots when a user has 7+ sections in the wheel. Renders all
// sections in a 3-column grid (icon + name); tapping one jumps the wheel
// straight there instead of dragging through every position.
function SectionPicker({ sections, activeIdx, accent, onPick, onClose }) {
  // Trap-clicks: the backdrop closes; the card stops propagation so
  // taps inside don't accidentally dismiss.
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(11,11,14,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: '#15151A',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 18, padding: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(250,128,114,0.55)',
          }}>Jump to section</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              appearance: 'none', border: 0, background: 'transparent',
              color: 'rgba(250,128,114,0.4)', cursor: 'pointer',
              padding: 0, fontSize: 18, lineHeight: 1,
            }}
          >×</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        }}>
          {sections.map((s, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={s.id}
                onClick={() => onPick(i)}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${isActive ? accent : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 12, padding: '12px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  color: '#FA8072', minWidth: 0,
                }}
              >
                <div style={{
                  width: 26, height: 26,
                  color: isActive ? accent : 'rgba(250,250,247,0.85)',
                  borderRadius: (s.contentKey || s.id) === 'person' ? '50%' : 0,
                  overflow: 'hidden',
                }}>
                  {s.iconData
                    ? <img src={s.iconData} alt="" style={{
                        width: 26, height: 26,
                        objectFit: (s.contentKey || s.id) === 'person' ? 'cover' : 'contain',
                      }} />
                    : (Icon[s.iconKey] || Icon.target)}
                </div>
                <div style={{
                  fontFamily: 'Geist, ui-sans-serif, system-ui',
                  fontSize: 12, fontWeight: 500,
                  color: isActive ? accent : '#FA8072',
                  textAlign: 'center',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  width: '100%',
                }}>
                  {(s.contentKey || s.id) === 'person' ? (s.name || 'Person') : s.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
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
  const AVAILABLE = ['work', 'budget', 'school', 'goals', 'notes', 'health', 'habits', 'tasks', 'reading', 'travel', 'workouts', 'meals'];
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

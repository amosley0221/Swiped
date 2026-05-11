// app.jsx — Swiped main app. Composes Wheel + LiquidReveal + DetailView and
// owns gesture state, currentIdx (with snap inertia), liquid progress.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4FA862",
  "wheelSize": 280,
  "wheelSpacing": 26,
  "liquid": "paint",
  "typeface": "modern",
  "sections": [
    {"id":"work","name":"Work","iconKey":"briefcase","contentKey":"work"},
    {"id":"budget","name":"Budget","iconKey":"dollar","contentKey":"budget"},
    {"id":"school","name":"School","iconKey":"cap","contentKey":"school"},
    {"id":"goals","name":"Goals","iconKey":"target","contentKey":"goals"},
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
  const [vp, setVp] = React.useState(() => ({
    w: window.innerWidth, h: window.innerHeight,
  }));
  React.useEffect(() => {
    const onR = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
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
  // Clamp to mobile width on desktop. The "stage" is the actual app viewport.
  const W = Math.min(vw, 440);
  const H = vh;

  const sections = t.sections;
  const [targetIdx, setTargetIdx] = React.useState(0);
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
  const [schoolWeeks, setSchoolWeeks] = usePersistedState(
    'swiped.school.weeks',
    () => {
      const defaultSem = SECTION_LIB.school.semesters[0];
      const defaultDate = (defaultSem && semesterDefaultWeek(defaultSem.name)) || new Date();
      return {
        [weekKey(defaultDate)]: {
          tasks: SECTION_LIB.school.tasks,
          log: SECTION_LIB.school.log,
          note: SECTION_LIB.school.note,
        },
      };
    }
  );
  const [schoolActiveWeekKey, setSchoolActiveWeekKey] = usePersistedState(
    'swiped.school.activeWeekKey',
    () => {
      const defaultSem = SECTION_LIB.school.semesters[0];
      const defaultDate = (defaultSem && semesterDefaultWeek(defaultSem.name)) || new Date();
      return weekKey(defaultDate);
    }
  );

  // Picking a semester also jumps the weekly view to that semester's default
  // week (first week of Jan/Jun/Aug, or today if the semester is current).
  // User can still navigate freely afterward.
  const selectSchoolSemester = (id) => {
    setSchoolActiveSemesterId(id);
    const sem = schoolSemesters.find((s) => s.id === id);
    if (sem) {
      const def = semesterDefaultWeek(sem.name);
      if (def) setSchoolActiveWeekKey(weekKey(def));
    }
  };

  // Wipe every persisted school field back to the seed defaults. Behind a
  // confirm so it's not accidentally tappable.
  const resetSchoolData = () => {
    const ok = typeof window !== 'undefined' && window.confirm(
      'Reset school data? This clears your semesters, classes, weekly tasks, and notes.'
    );
    if (!ok) return;
    try {
      localStorage.removeItem('swiped.school.semesters');
      localStorage.removeItem('swiped.school.activeSemesterId');
      localStorage.removeItem('swiped.school.weeks');
      localStorage.removeItem('swiped.school.activeWeekKey');
    } catch (e) { /* ignore */ }
    const seedSemesters = SECTION_LIB.school.semesters;
    const seedSem = seedSemesters[0];
    const seedDate = (seedSem && semesterDefaultWeek(seedSem.name)) || new Date();
    const seedKey = weekKey(seedDate);
    setSchoolSemesters(seedSemesters);
    setSchoolActiveSemesterId(seedSem?.id);
    setSchoolWeeks({
      [seedKey]: {
        tasks: SECTION_LIB.school.tasks,
        log: SECTION_LIB.school.log,
        note: SECTION_LIB.school.note,
      },
    });
    setSchoolActiveWeekKey(seedKey);
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
  // "Credits" sits right after GPA so the headline + detail grid read
  // GPA / Credits / Due. Both numbers exclude any semester marked Future.
  const content = React.useMemo(() => {
    if (contentKey !== 'school') return baseContent;
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
  }, [contentKey, baseContent, schoolSemesters]);

  // For the wheel's icon lookup, ensure each section has a valid iconKey
  const wheelSections = sections.map((s) => ({
    ...s,
    iconKey: s.iconKey || SECTION_LIB[s.contentKey || s.id]?.icon || 'target',
  }));

  const radius = t.wheelSize;
  const protrusion = 175; // fixed — top of dial stays put; radius controls steepness
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
        padding: '54px 24px 0', // accounts for status bar / notch
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 4,
      }}>
        <div style={{
          fontFamily: tf.mono, fontSize: 10.5, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'rgba(11,11,14,0.45)',
        }}>
          Swiped
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontFamily: tf.mono, fontSize: 10.5, letterSpacing: '0.14em',
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
              background: 'rgba(255,255,255,0.6)', width: 30, height: 30,
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', padding: 0,
              color: 'rgba(11,11,14,0.6)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 1v2 M7 11v2 M1 7h2 M11 7h2 M2.8 2.8l1.4 1.4 M9.8 9.8l1.4 1.4 M2.8 11.2l1.4-1.4 M9.8 4.2l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brief / main content (above wheel) */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: H - protrusion - 40,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
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
        />
      </div>

      {/* Section dots / progress (between brief and wheel) */}
      <SectionDots
        sections={wheelSections}
        index={idx}
        accent={t.accent}
        bottom={protrusion + 28}
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
      />

      {/* Hint */}
      <SwipeHint visible={!liquid.active && !detailOpen} protrusion={protrusion} tf={tf} />

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
              schoolWeeks={schoolWeeks}
              setSchoolWeeks={setSchoolWeeks}
              schoolActiveWeekKey={schoolActiveWeekKey}
              setSchoolActiveWeekKey={setSchoolActiveWeekKey}
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
      />
    </div>
  );
}

function BriefPanel({ section, content, accent, tf, pulseKey }) {
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
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* big icon */}
      <div style={{ width: 44, height: 44, color: accent, marginBottom: 6 }}>
        {section.iconData
          ? <img src={section.iconData} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          : (Icon[section.iconKey] || Icon.target)}
      </div>
      {/* section name in mono */}
      <div style={{
        fontFamily: tf.mono, fontSize: 11, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'rgba(11,11,14,0.5)',
      }}>
        {section.name}
      </div>
      {/* headline (serif italic) */}
      <div style={{
        fontFamily: tf.display, fontStyle: 'italic',
        fontSize: 56, lineHeight: '0.95', letterSpacing: '-0.025em',
        fontWeight: 400, color: '#0B0B0E',
        textWrap: 'pretty',
      }}>
        {content.headline}
      </div>
      {/* brief */}
      <div style={{
        fontFamily: tf.family, fontSize: 17, lineHeight: 1.35,
        color: 'rgba(11,11,14,0.62)', letterSpacing: '-0.01em',
        textWrap: 'pretty',
      }}>
        {content.brief}
      </div>

      {/* mini stat strip */}
      <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
        {content.stats.slice(0, 3).map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{
              fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(11,11,14,0.4)',
              whiteSpace: 'nowrap',
            }}>{s.label}</div>
            <div style={{
              fontFamily: tf.family, fontSize: 16, fontWeight: 500,
              letterSpacing: '-0.01em', color: '#0B0B0E',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionDots({ sections, index, accent, bottom }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom,
      display: 'flex', justifyContent: 'center', gap: 6,
      zIndex: 3, pointerEvents: 'none',
    }}>
      {sections.map((s, i) => {
        const dist = Math.abs(i - index);
        const isSelected = dist < 0.5;
        return (
          <div key={s.id} style={{
            width: isSelected ? 16 : 4, height: 4, borderRadius: 2,
            background: isSelected ? accent : 'rgba(11,11,14,0.18)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        );
      })}
    </div>
  );
}

function SwipeHint({ visible, protrusion, tf }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      bottom: protrusion + 60,
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 8,
      opacity: visible ? 0.6 : 0,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'rgba(11,11,14,0.5)',
        fontFamily: tf.mono, fontSize: 9, letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
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

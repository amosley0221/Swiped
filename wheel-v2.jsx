// wheel.jsx — Half-circular black wheel at the bottom.
// Pivot is below the screen. Sections sit on the arc; the section at -π/2 (top)
// is "selected". Horizontal drag rotates; vertical drag is intercepted by the
// parent for liquid reveal.

const RAD = (d) => (d * Math.PI) / 180;

function Wheel({
  sections,        // [{ id, name, iconKey }]
  index,           // float index (currentIdx, can be fractional during drag)
  radius,          // wheel radius
  sectionAngle,    // degrees between sections (e.g. 26)
  accent,          // accent color for selected
  width,           // viewport width
  height,          // viewport height (used for pivot positioning)
  protrusion,      // how many px the wheel pokes above screen-bottom (visible dial height)
  velocity = 0,    // signed scroll velocity (index/sec) — drives slosh
  onDrag,          // (deltaIndex) => void   incremental during pointer drag
  onSettle,        // (snappedIdx) => void   when fling settles
  onLiquidStart,   // ({startX, startY}) => start liquid gesture
  scale = 1,       // typography + icon scale (matches the brief panel's stageScale)
  lift = 0,        // px translated up during a liquid drag (wheel "rises" with finger)
  finger = null,   // { x, y } pointer position during a liquid drag
}) {
  const cx = width / 2;
  const cy = height + (radius - protrusion); // pivot below screen
  const sectionAngleRad = RAD(sectionAngle);

  const dragRef = React.useRef(null);
  const indexRef = React.useRef(index);
  indexRef.current = index;

  const onPointerDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let mode = null; // 'rotate' | 'liquid' | null
    let lastX = startX;
    let lastT = performance.now();
    let velocity = 0; // index units / second
    const startIdx = indexRef.current;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!mode) {
        // Commit to liquid as soon as the gesture has a clear upward
        // component — small dy is enough, and we don't need it to
        // dominate dx as long as the user is actually moving up. This
        // is the priority gesture; rotate only wins for clearly
        // horizontal moves with negligible vertical travel.
        if (dy < -6 && Math.abs(dy) >= Math.abs(dx) * 0.6) {
          mode = 'liquid';
          onLiquidStart && onLiquidStart({ startX, startY, currentY: ev.clientY });
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.4) mode = 'rotate';
      }
      if (mode === 'rotate') {
        // dx → angle change at top of arc → index change
        const dIdx = -dx / (radius * sectionAngleRad);
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        velocity = ((ev.clientX - lastX) / dt) * 1000 / (radius * sectionAngleRad) * -1;
        lastX = ev.clientX;
        lastT = now;
        onDrag(startIdx + dIdx);
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (mode === 'rotate') {
        // Snap to whichever section is closest to where the user let go, no
        // velocity projection — that way the section lines up under the blue
        // selection tick instead of overshooting on a hard flick.
        const snapped = Math.max(0, Math.min(sections.length - 1, Math.round(indexRef.current)));
        onSettle(snapped);
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Per-icon spring physics — each icon has its own "perceived" wheel
  // index that springs toward the actual `index`. Stiffness drops with
  // distance from the selected position, so the icon under the user's
  // finger tracks tightly while icons further out trail behind. Picture
  // a blanket being dragged across the floor: the bit you hold moves
  // immediately, the rest follows with lag.
  const iconStatesRef = React.useRef([]);
  // Keep the per-icon state array in sync with sections; preserve any
  // existing animation state across renders.
  if (iconStatesRef.current.length !== sections.length) {
    const arr = iconStatesRef.current;
    while (arr.length < sections.length) {
      arr.push({ perceivedIdx: arr.length, velocity: 0 });
    }
    arr.length = sections.length;
  }
  const [, setSpringTick] = React.useState(0);
  const animRef = React.useRef({ raf: 0, running: false });

  React.useEffect(() => {
    if (animRef.current.running) return;
    animRef.current.running = true;
    const step = () => {
      const target = indexRef.current;
      const states = iconStatesRef.current;
      let anyMoving = false;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (!s) continue;
        // Subtle per-icon lag — closer to the selected slot follows
        // tightly, outer icons drift slightly behind. Damping kept high
        // so springs settle without overshoot/bounce.
        const dist = Math.abs(i - target);
        const stiffness = Math.max(0.12, 0.30 - dist * 0.03);
        const damping = 0.55;
        const dx = target - s.perceivedIdx;
        s.velocity = s.velocity * damping + dx * stiffness;
        s.perceivedIdx += s.velocity;
        if (Math.abs(dx) > 0.003 || Math.abs(s.velocity) > 0.003) {
          anyMoving = true;
        } else {
          // Snap to target once spring is essentially done so the wheel
          // settles cleanly at integer indices for snap-to-green-line.
          s.perceivedIdx = target;
          s.velocity = 0;
        }
      }
      setSpringTick((t) => (t + 1) & 0xffff);
      if (anyMoving) {
        animRef.current.raf = requestAnimationFrame(step);
      } else {
        animRef.current.running = false;
      }
    };
    animRef.current.raf = requestAnimationFrame(step);
    return () => {};
  }, [index]);

  // Render sections within ±90° of top — each icon uses its OWN spring
  // position, not the wheel's global index, so they can drift relative
  // to each other during fast rotation.
  const visible = [];
  for (let i = 0; i < sections.length; i++) {
    const myIdx = (iconStatesRef.current[i] && iconStatesRef.current[i].perceivedIdx) ?? i;
    const delta = (i - myIdx) * sectionAngleRad;
    if (Math.abs(delta) > RAD(95)) continue;
    const angle = -Math.PI / 2 + delta;
    // Place the icon/label cluster inside the dial, not on the rim.
    const rInner = radius - 38;
    const x = cx + rInner * Math.cos(angle);
    const y = cy + rInner * Math.sin(angle);
    // distance from top (0 = selected). Use the wheel's actual index
    // here so icon-size/opacity respond to the *intended* selection,
    // not the spring's transient lag — otherwise sizes pulse during
    // the trailing animation.
    const offset = Math.abs(i - index);
    const opacity = Math.max(0, 1 - offset * 0.35);
    const scale = Math.max(0.55, 1 - offset * 0.18);
    visible.push({ i, x, y, angle, opacity, scale, section: sections[i] });
  }

  // Slime / bell shape — the wheel's outline is a closed path whose
  // peak follows the finger during a liquid drag. At rest the peak
  // sits at the natural dial top (cx, H-protrusion) and the sides
  // anchor at the screen bottom corners, so the silhouette reads as
  // the original dial arc. As the user drags, finger.x slides the
  // peak sideways and finger.y lifts it; the sides creep up at a
  // fraction of the lift rate so the bell stretches taller and
  // slightly inward — slime being pulled by a fingertip.
  const liftN = Number(lift) || 0;
  const peakX = (finger && typeof finger.x === 'number') ? finger.x : cx;
  const restPeakY = height - protrusion;
  const peakY = (finger && typeof finger.y === 'number')
    ? Math.max(0, finger.y)
    : Math.max(0, restPeakY - liftN);
  // Side anchors creep up at ~30% of lift. Stays at screen bottom
  // when fully at rest so the dial silhouette matches what it was.
  const sidesY = Math.max(0, height - liftN * 0.3);
  // Bell half-width — widest at rest (=W/2 so anchors at screen
  // edges), narrows slightly as it lifts so the bell becomes more
  // peaked.
  const liftFrac = Math.min(1, liftN / Math.max(150, height * 0.4));
  const halfWidth = Math.max(width * 0.4, width / 2 - liftFrac * width * 0.1);
  const leftAnchor = Math.max(0, peakX - halfWidth);
  const rightAnchor = Math.min(width, peakX + halfWidth);
  // Cubic bezier control offsets — these set the bell's "roundness".
  // Matches the curvature of the original circle dial when at rest.
  const cp = halfWidth * 0.55;
  const r = (n) => n.toFixed(1);
  const dialPath = [
    `M 0 ${r(height + 20)}`,
    `L 0 ${r(sidesY)}`,
    `L ${r(leftAnchor)} ${r(sidesY)}`,
    `C ${r(leftAnchor + cp)} ${r(sidesY)}, ${r(peakX - cp)} ${r(peakY)}, ${r(peakX)} ${r(peakY)}`,
    `C ${r(peakX + cp)} ${r(peakY)}, ${r(rightAnchor - cp)} ${r(sidesY)}, ${r(rightAnchor)} ${r(sidesY)}`,
    `L ${r(width)} ${r(sidesY)}`,
    `L ${r(width)} ${r(height + 20)}`,
    'Z',
  ].join(' ');
  // Recompute icon positions to ride the bell. Selected icon glues to
  // the peak; others orbit around it on a virtual arc whose center is
  // shifted toward the finger so the whole cluster leans with the
  // gesture. Spring lag from iconStatesRef still applies on the
  // index axis, so outer icons trail behind during fast rotation.
  const peakSelectedIdx = Math.round(index);
  const iconRecomputed = visible.map((v) => {
    if (v.i === peakSelectedIdx) {
      // Selected icon glued to the peak — that's the slime tip.
      return { ...v, x: peakX, y: peakY };
    }
    // Others: rotated around the lifted center. Center is the peak
    // shifted down by the original dial's radius along the local
    // "up" direction (just straight down here for simplicity).
    const localCx = peakX;
    const localCy = peakY + (radius - 38);
    return {
      ...v,
      x: localCx + (radius - 38) * Math.cos(v.angle),
      y: localCy + (radius - 38) * Math.sin(v.angle),
    };
  });
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        // Container always fills the screen height — the bell peak can
        // rise anywhere up to y=0 during a slime drag, and the icons
        // are positioned in viewport-y, so we need the full canvas.
        // Pointer events on the dial-only region are filtered below
        // so this big container doesn't swallow gestures at the top.
        height: liftN > 0 ? height : protrusion + 80,
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      <svg
        width={width} height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="dialShine" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id="dialEdge" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* dial body — bell / slime shape whose peak follows the finger.
            At rest the bell sits at the natural dial position; during a
            lift the peak rides the finger position (x and y both), and
            the sides creep up at a fraction of the lift rate so the
            silhouette stretches taller and narrower. */}
        <path d={dialPath} fill="#0B0B0E" />
        {/* selection indicator — small tick above the bell's peak */}
        <line
          x1={peakX} y1={peakY - 16}
          x2={peakX} y2={peakY - 8}
          stroke={accent} strokeWidth="2" strokeLinecap="round"
        />
        <circle cx={peakX} cy={peakY - 22} r="2.5" fill={accent} />
      </svg>

      {/* section icons — absolutely positioned divs in viewport-y space
          (container is bottom-anchored at full height). */}
      {iconRecomputed.map(({ i, x, y, opacity, scale, section }) => {
        const isSelected = Math.abs(i - index) < 0.5;
        return (
          <div
            key={section.id}
            style={{
              position: 'absolute',
              left: x, top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              transition: 'opacity 0.18s ease-out',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: isSelected ? '#FAFAF7' : 'rgba(250,250,247,0.55)',
              willChange: 'transform, opacity',
            }}
          >
            <div style={{
              width: 26 * scale, height: 26 * scale, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: section.contentKey === 'person' ? '50%' : 0,
              overflow: 'hidden',
            }}>
              {section.iconData
                ? <img src={section.iconData} alt="" style={{
                    width: (section.contentKey === 'person' ? 26 : 22) * scale,
                    height: (section.contentKey === 'person' ? 26 : 22) * scale,
                    objectFit: section.contentKey === 'person' ? 'cover' : 'contain',
                    filter: isSelected ? 'none' : 'opacity(0.6)',
                  }} />
                : (Icon[section.iconKey] || Icon.target)}
            </div>
            <div
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontStyle: 'italic',
                fontSize: (isSelected ? 24 : 19) * scale,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                lineHeight: 1,
                transition: 'font-size 0.2s ease',
                textShadow: isSelected ? '0 1px 8px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {/* Wheel shows only the first name for people (section.name on
                  a person section is the full name; the rest is reserved for
                  the detail headline). */}
              {section.contentKey === 'person'
                ? (section.name || '').split(/\s+/)[0]
                : section.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiquidSlosh({ cx, cy, R, width, height, protrusion, velocity, accent }) {
  const [phase, setPhase] = React.useState(0);
  const [dampedV, setDampedV] = React.useState(0);
  const raf = React.useRef(null);
  const vRef = React.useRef(0);

  React.useEffect(() => {
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      // approach target velocity with spring damping
      vRef.current = vRef.current + (velocity - vRef.current) * Math.min(1, dt * 6);
      setDampedV(vRef.current);
      setPhase((p) => p + dt * (1.4 + Math.abs(vRef.current) * 0.3));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [velocity]);

  // Build a wave along the visible top arc of the dial.
  // For each x across the visible width, find the arc-y at that x: y = cy - sqrt(R^2 - (x-cx)^2)
  // Then add a velocity-tilted, time-animated sinusoidal offset DOWNWARDS (into the dial).
  const N = 26;
  const minX = 0;
  const maxX = width;
  const tilt = Math.max(-12, Math.min(12, dampedV * 6));   // px tilt across width
  const amp = Math.min(8, 2 + Math.abs(dampedV) * 1.6);    // wave amplitude
  const freq = 0.022;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = minX + (i / N) * (maxX - minX);
    const dx = x - cx;
    if (dx * dx > R * R) continue;
    const yArc = cy - Math.sqrt(R * R - dx * dx);
    const tiltOff = ((x - cx) / (width / 2)) * tilt;
    const wave = Math.sin(x * freq + phase * 2.4) * amp
               + Math.sin(x * freq * 1.7 - phase * 1.6) * amp * 0.4;
    pts.push({ x, y: yArc + 14 + wave + tiltOff });
  }
  if (pts.length < 2) return null;

  // Smooth bezier path along pts, then close down through the dial body.
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${cy + R}`;
  d += ` L ${pts[0].x} ${cy + R} Z`;

  return (
    <g style={{ mixBlendMode: 'normal' }}>
      <path d={d} fill="rgba(0,0,0,0.55)" />
      {/* highlight ridge */}
      <path
        d={pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
    </g>
  );
}

Object.assign(window, { Wheel });

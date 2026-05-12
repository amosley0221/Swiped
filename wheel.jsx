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
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.2 && dy < 0) {
          mode = 'liquid';
          onLiquidStart && onLiquidStart({ startX, startY, currentY: ev.clientY });
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          return;
        }
        if (Math.abs(dx) > 6) mode = 'rotate';
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

  // Render sections within ±90° of top
  const visible = [];
  for (let i = 0; i < sections.length; i++) {
    const delta = (i - index) * sectionAngleRad;
    if (Math.abs(delta) > RAD(95)) continue;
    const angle = -Math.PI / 2 + delta;
    // Place the icon/label cluster inside the dial, not on the rim.
    const rInner = radius - 38;
    const x = cx + rInner * Math.cos(angle);
    const y = cy + rInner * Math.sin(angle);
    // distance from top (0 = selected)
    const offset = Math.abs(i - index);
    const opacity = Math.max(0, 1 - offset * 0.35);
    const scale = Math.max(0.55, 1 - offset * 0.18);
    visible.push({ i, x, y, angle, opacity, scale, section: sections[i] });
  }

  // Dial path — a black filled circle, but only the top portion shows above the
  // screen edge. We render as <circle>; overflow is clipped by the parent.
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: protrusion + 80, // gesture zone slightly taller than visible dial
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 5,
      }}
    >
      <svg
        width={width} height={protrusion + 80}
        viewBox={`0 ${height - protrusion - 80} ${width} ${protrusion + 80}`}
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
        {/* dial body */}
        <circle cx={cx} cy={cy} r={radius} fill="#0B0B0E" />
        {/* subtle inner ring (rim track where icons sit) */}
        <circle
          cx={cx} cy={cy} r={radius - 6}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        />
        <circle
          cx={cx} cy={cy} r={radius - 56}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
        />
        {/* liquid slosh — a wave layer at the top of the dial that wobbles
            with scroll velocity and time. Subtle when idle, animated when scrolling. */}
        <LiquidSlosh
          cx={cx} cy={cy} R={radius}
          width={width} height={height} protrusion={protrusion}
          velocity={velocity} accent={accent}
        />
        {/* top highlight */}
        <circle cx={cx} cy={cy} r={radius} fill="url(#dialShine)" />
        {/* selection indicator — small tick at 12 o'clock outside dial */}
        <line
          x1={cx} y1={cy - radius - 12}
          x2={cx} y2={cy - radius - 4}
          stroke={accent} strokeWidth="2" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy - radius - 16} r="2.5" fill={accent} />
      </svg>

      {/* section icons — absolutely positioned divs, easier for SVG icon swap */}
      {visible.map(({ i, x, y, opacity, scale, section }) => {
        const isSelected = Math.abs(i - index) < 0.5;
        // Rotate icon so it stays "upright" relative to wheel? Keep upright to viewer.
        return (
          <div
            key={section.id}
            style={{
              position: 'absolute',
              left: x, top: y - (height - protrusion - 80),
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
                fontSize: (isSelected ? 20 : 16) * scale,
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

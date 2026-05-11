// liquid.jsx — Liquid swipe-up reveal. SVG fill that rises from the bottom.
// Style is one of: 'paint' | 'water' | 'blob' | 'metaballs'.
//
// progress: 0 → 1, drives fill height + wave intensity
// active: whether gesture is in progress (animates phase)

function smoothWavePath(W, H, yTop, controls) {
  // Cubic-bezier wave across W, ending in a filled rect to (0,H) (0,H).
  let d = `M 0 ${controls[0].y}`;
  for (let i = 1; i < controls.length; i++) {
    const p0 = controls[i - 1];
    const p1 = controls[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  d += ` L ${W} ${H} L 0 ${H} Z`;
  return d;
}

function LiquidReveal({
  progress,        // 0..1
  W, H,
  style = 'paint',
  origin,          // { x, y } — pointer x where gesture started (for paint pull point)
  accent = '#3B6EFF',
}) {
  const [phase, setPhase] = React.useState(0);
  const raf = React.useRef(null);

  React.useEffect(() => {
    const tick = () => {
      setPhase((p) => p + (style === 'water' ? 0.06 : style === 'metaballs' ? 0.04 : 0.025));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [style]);

  if (progress <= 0.001) return null;

  // base fill line
  const yTop = H * (1 - progress);
  const originX = origin?.x ?? W / 2;

  let pathD = '';
  let extras = null; // additional circles / drips merged via goo

  if (style === 'paint') {
    // Thick gloopy paint — viscous, slow. Pulled from origin point.
    // Higher amplitude near origin, decays outwards.
    const N = 14;
    const controls = [];
    const amp = 22 + 14 * Math.min(1, progress * 2);
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      // distance from origin (0..1)
      const distNorm = Math.min(1, Math.abs(x - originX) / (W * 0.55));
      const pull = (1 - distNorm) * 30 * Math.min(1, progress * 1.5); // origin sags upward
      const wob = Math.sin(x * 0.018 + phase * 0.6) * amp * 0.4
                + Math.sin(x * 0.04 + phase * 0.4) * amp * 0.3;
      controls.push({ x, y: yTop + wob - pull });
    }
    pathD = smoothWavePath(W, H, yTop, controls);
    // Two dangling drips that hang from the wave near origin (gooed)
    if (progress > 0.15) {
      const dripBaseY = yTop - 16;
      extras = (
        <g>
          <circle
            cx={originX - 36 + Math.sin(phase * 0.5) * 4}
            cy={dripBaseY + 18 - progress * 8}
            r={9 + Math.sin(phase * 0.8) * 1.5}
            fill="#0B0B0E"
          />
          <circle
            cx={originX + 44 + Math.cos(phase * 0.4) * 3}
            cy={dripBaseY + 26 - progress * 6}
            r={11 + Math.cos(phase * 0.7) * 1.2}
            fill="#0B0B0E"
          />
          <circle
            cx={originX + 4 + Math.sin(phase * 0.3) * 6}
            cy={dripBaseY - 8 - progress * 4}
            r={6}
            fill="#0B0B0E"
          />
        </g>
      );
    }
  } else if (style === 'water') {
    // Water/ink — fast, splashy edges, smaller amplitude with high frequency.
    const N = 22;
    const controls = [];
    const amp = 10 + 6 * progress;
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const wob = Math.sin(x * 0.05 + phase * 1.5) * amp
                + Math.sin(x * 0.11 + phase * 2.1) * amp * 0.5;
      controls.push({ x, y: yTop + wob });
    }
    pathD = smoothWavePath(W, H, yTop, controls);
    // scattered droplet splashes
    if (progress > 0.1) {
      extras = (
        <g>
          {[0.18, 0.34, 0.58, 0.78].map((fx, i) => (
            <circle
              key={i}
              cx={W * fx + Math.sin(phase * 1.4 + i) * 6}
              cy={yTop - 18 - i * 6 - Math.abs(Math.sin(phase * 1.2 + i)) * 10}
              r={3 + (i % 2) * 1.5}
              fill="#0B0B0E"
              opacity={progress}
            />
          ))}
        </g>
      );
    }
  } else if (style === 'blob') {
    // Soft blob — one big smooth bump, no extras.
    const N = 18;
    const controls = [];
    const bumpHeight = 38 * Math.min(1, progress * 1.4);
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      // gaussian-ish bump around originX
      const distNorm = (x - originX) / (W * 0.45);
      const bump = Math.exp(-distNorm * distNorm * 1.6) * bumpHeight;
      controls.push({ x, y: yTop - bump + Math.sin(phase * 0.3 + x * 0.01) * 4 });
    }
    pathD = smoothWavePath(W, H, yTop, controls);
  } else if (style === 'metaballs') {
    // Metaballs — separate blobs rising, joined by goo. The base "fill" is a
    // shorter line; the merging happens through the circles above it.
    pathD = `M 0 ${H} L ${W} ${H} L ${W} ${H - Math.max(0, progress * 60 - 20)} L 0 ${H - Math.max(0, progress * 60 - 20)} Z`;
    const blobs = [
      { x: 0.18, r: 38, off: 0 },
      { x: 0.38, r: 30, off: 0.4 },
      { x: 0.55, r: 44, off: 0.15 },
      { x: 0.72, r: 32, off: 0.55 },
      { x: 0.88, r: 36, off: 0.3 },
    ];
    extras = (
      <g>
        {blobs.map((b, i) => {
          const localProg = Math.max(0, progress - b.off);
          const y = H - localProg * (H * 1.1) + Math.sin(phase * 0.8 + i) * 4;
          return (
            <circle
              key={i}
              cx={W * b.x + Math.sin(phase * 0.5 + i * 0.7) * 8}
              cy={y}
              r={b.r}
              fill="#0B0B0E"
            />
          );
        })}
      </g>
    );
  }

  const useGoo = style !== 'blob';

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30,
      }}
    >
      <defs>
        <filter id="liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation={style === 'metaballs' ? 8 : 6} />
          <feColorMatrix
            values={`1 0 0 0 0
                     0 1 0 0 0
                     0 0 1 0 0
                     0 0 0 ${style === 'metaballs' ? 22 : 18} ${style === 'metaballs' ? -11 : -9}`}
          />
        </filter>
      </defs>
      <g filter={useGoo ? 'url(#liquid-goo)' : undefined}>
        <path d={pathD} fill="#0B0B0E" />
        {extras}
      </g>
      {/* accent dot riding on top — gives "pulled" feel */}
      {progress < 0.9 && style === 'paint' && (
        <circle cx={originX} cy={yTop - 28 * progress} r="3" fill={accent} opacity={1 - progress} />
      )}
    </svg>
  );
}

Object.assign(window, { LiquidReveal });

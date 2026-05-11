// liquid.jsx — Elastic section sheet. The top edge curves around the finger:
// peak follows the finger's (x, y); the edges trail downward with a lag that
// shrinks as progress approaches 1, so by the time the sheet is fully open
// the top edge is flat at y=0.
//
// `sheetPath` produces an SVG path string for the sheet's outline. It's used
// both as the LiquidReveal background's clip-path and as the clip-path for
// the DetailView wrapper, so the content fades in along the same curve.

function sheetPath({ progress, finger, W, H }) {
  if (!finger || progress <= 0.001) return null;
  const fx = Math.max(0, Math.min(W, finger.x));
  const fy = Math.max(0, Math.min(H, finger.y));
  // Edges trail below the finger by `lagAmount` px. The lag shrinks as the
  // sheet approaches fully open, so the curve flattens out near the end.
  const lagAmount = (1 - progress) * H * 0.55;
  const lagY = Math.min(H + 20, fy + lagAmount);
  // Bump width widens with progress so the curve broadens as the sheet opens.
  const sigma = W * (0.22 + 0.5 * progress);
  const twoSigmaSq = 2 * sigma * sigma;

  const N = 28;
  const pts = new Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * W;
    const dx = x - fx;
    const decay = 1 - Math.exp(-(dx * dx) / twoSigmaSq);
    pts[i] = [x, fy + decay * (lagY - fy)];
  }

  // Smooth path: cubic between sample points with mid-x control handles.
  let d = `M 0 ${H + 20} L 0 ${pts[0][1]}`;
  for (let i = 1; i <= N; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  d += ` L ${W} ${H + 20} Z`;
  return d;
}

function LiquidReveal({ path, progress }) {
  if (!path || progress <= 0.001) return null;
  const clip = `path('${path}')`;
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        background: '#0B0B0E',
        clipPath: clip,
        WebkitClipPath: clip,
        pointerEvents: 'none',
        zIndex: 30,
        willChange: 'clip-path',
      }}
    />
  );
}

Object.assign(window, { LiquidReveal, sheetPath });

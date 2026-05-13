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
  // Bell half-width: tight at low progress so the sheet starts as a small
  // bump under the finger, widening as it opens until the curve is flat.
  const halfWidth = W * (0.22 + 0.7 * progress);
  // Control-point distance — tunes how rounded the bell is. ~0.55 gives a
  // soft, smooth bell that's neither pointy nor too plateaued.
  const cp = halfWidth * 0.55;
  const leftAnchor = fx - halfWidth;
  const rightAnchor = fx + halfWidth;

  // Two cubics meeting at (fx, fy) with horizontal tangents on both sides —
  // C1-continuous at the peak and at the anchors. No sampling, no scallops.
  const r = (n) => n.toFixed(1);
  let d = `M 0 ${r(H + 20)}`;
  d += ` L 0 ${r(lagY)}`;
  d += ` L ${r(leftAnchor)} ${r(lagY)}`;
  d += ` C ${r(leftAnchor + cp)} ${r(lagY)}, ${r(fx - cp)} ${r(fy)}, ${r(fx)} ${r(fy)}`;
  d += ` C ${r(fx + cp)} ${r(fy)}, ${r(rightAnchor - cp)} ${r(lagY)}, ${r(rightAnchor)} ${r(lagY)}`;
  d += ` L ${r(W)} ${r(lagY)}`;
  d += ` L ${r(W)} ${r(H + 20)} Z`;
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

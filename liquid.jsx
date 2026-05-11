// liquid.jsx — Section sheet that follows the finger.
// Slides up from below the screen as the user drags up on the wheel, and
// slides back down when they pull the close handle. progress: 0 = fully
// hidden below screen, 1 = fully covering the viewport.

function LiquidReveal({ progress, W, H }) {
  if (progress <= 0.001) return null;
  const ty = (1 - progress) * H;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0, right: 0, top: 0,
        width: '100%', height: H,
        transform: `translate3d(0, ${ty}px, 0)`,
        background: '#0B0B0E',
        borderRadius: progress < 0.985 ? '28px 28px 0 0' : '0',
        boxShadow: '0 -24px 60px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        zIndex: 30,
        willChange: 'transform',
      }}
    />
  );
}

Object.assign(window, { LiquidReveal });

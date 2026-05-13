// liquid.jsx — Section sheet reveal. The metaphor: the user pinches the
// section's icon on the dial and drags it up. The icon visually follows
// the finger while a rounded-top card rises behind it; on release the
// card springs up to fill the screen and the icon fades away into the
// detail-view header position.
//
// sheetPath returns the SVG path string for the sheet's outline, used as
// the clip-path for both the dark backdrop and the DetailView wrapper so
// the content reveals along the same curve.

function sheetPath({ progress, finger, W, H }) {
  if (!finger || progress <= 0.001) return null;
  const fx = Math.max(0, Math.min(W, finger.x));
  const fy = Math.max(0, Math.min(H, finger.y));
  // Card top sits a hair below the finger so the icon can ride above its
  // edge like a sticker peeled off a page. As progress nears 1 the offset
  // collapses to 0 so the card finishes flush with the viewport top.
  const offset = (1 - progress) * 26;
  const topY = Math.max(0, fy + offset);
  // Rounded top corners. Radius shrinks as the sheet finishes opening so
  // the final state is square against the status bar / screen edge.
  const radius = Math.max(2, 24 * (1 - progress * 0.9));
  // A subtle dip toward the finger keeps a hint of the original drag
  // metaphor without the heavy bell shape. cpY pulls the top edge down
  // slightly at the finger x, with the dip flattening as we open.
  const dipY = topY + (1 - progress) * 8;
  const cpL = Math.max(0, fx - W * 0.3);
  const cpR = Math.min(W, fx + W * 0.3);

  const r = (n) => n.toFixed(1);
  let d = `M 0 ${r(H + 20)}`;
  d += ` L 0 ${r(topY + radius)}`;
  d += ` Q 0 ${r(topY)} ${r(radius)} ${r(topY)}`;
  d += ` L ${r(cpL)} ${r(topY)}`;
  d += ` Q ${r(fx)} ${r(dipY)} ${r(cpR)} ${r(topY)}`;
  d += ` L ${r(W - radius)} ${r(topY)}`;
  d += ` Q ${r(W)} ${r(topY)} ${r(W)} ${r(topY + radius)}`;
  d += ` L ${r(W)} ${r(H + 20)} Z`;
  return d;
}

function LiquidReveal({ path, progress, finger, section, accent, scale = 1 }) {
  if (!path || progress <= 0.001) return null;
  const clip = `path('${path}')`;
  // Drag indicator — render the section icon floating at the finger while
  // dragging, so the gesture reads as "lifting the icon out of the dial".
  // Fades out once the sheet is mostly open (the detail view's own header
  // takes over visually).
  const showIcon = finger && progress < 0.9;
  const iconOpacity = Math.max(0, 1 - Math.max(0, (progress - 0.7) / 0.2));
  const iconScale = 1 + Math.min(0.15, progress * 0.2);
  const iconSize = 48 * scale * iconScale;
  return (
    <>
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
      {showIcon && section && (
        <div
          style={{
            position: 'absolute',
            left: finger.x - iconSize / 2,
            top: finger.y - iconSize - 18 * scale,
            width: iconSize, height: iconSize,
            borderRadius: 14 * scale,
            background: 'rgba(11,11,14,0.92)',
            border: `0.5px solid ${accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
            boxShadow: `0 ${10 * scale}px ${28 * scale}px rgba(0,0,0,0.45)`,
            opacity: iconOpacity,
            transform: `scale(${iconScale})`,
            transformOrigin: '50% 100%',
            pointerEvents: 'none',
            zIndex: 31,
            willChange: 'transform, opacity, left, top',
          }}
        >
          {section.iconData ? (
            <img
              src={section.iconData} alt=""
              style={{
                width: iconSize * 0.7, height: iconSize * 0.7,
                objectFit: (section.contentKey || section.id) === 'person' ? 'cover' : 'contain',
                borderRadius: (section.contentKey || section.id) === 'person' ? '50%' : 0,
              }}
            />
          ) : (
            <div style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}>
              {(typeof window !== 'undefined' && window.Icon && window.Icon[section.iconKey]) || null}
            </div>
          )}
        </div>
      )}
    </>
  );
}

Object.assign(window, { LiquidReveal, sheetPath });

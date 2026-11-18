// Frame B's artwork, drawn in code (#55): a small dome above the cartouche, an
// eight-point star between Ayahs and a tailpiece after the last. All of it is
// decoration, hidden from assistive technology, and drawn in the frame's gold
// (currentColor).

/** The points of an eight-point star centred on (x, y) with outer radius r. */
const starPoints = (x: number, y: number, r: number) =>
  Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 ? r * 0.5 : r;
    const angle = (Math.PI / 8) * i;
    return `${(x + radius * Math.sin(angle)).toFixed(2)},${(y - radius * Math.cos(angle)).toFixed(2)}`;
  }).join(" ");

const ORNAMENT_STAR = starPoints(60, 10, 8);
/** The tailpiece's star, shared with the Link preview picture (link-preview-picture.tsx). */
export const TAILPIECE_STAR = starPoints(100, 20, 11);

/** A small eight-point star between two rules: the ornament between Ayahs. */
export function Ornament({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 20" aria-hidden="true" focusable="false">
      <path d="M8 10 H46 M74 10 H112" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <polygon points={ORNAMENT_STAR} fill="currentColor" opacity="0.85" />
    </svg>
  );
}

/** A generic dome (no real mosque) on a drum, its finial above. */
export function Dome({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 70" aria-hidden="true" focusable="false">
      <path d="M60 2 v10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="5" r="2.5" fill="currentColor" />
      <path d="M60 12 C72 20 92 28 94 50 H26 C28 28 48 20 60 12Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="20" y="50" width="80" height="8" fill="currentColor" opacity="0.5" />
      <path d="M0 66 H120" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** The tailpiece: a star in a lozenge, flanked by tapering rules. */
export function Tailpiece({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 40" aria-hidden="true" focusable="false">
      <path d="M10 20 L76 18 V22 Z M190 20 L124 18 V22 Z" fill="currentColor" opacity="0.7" />
      <path d="M100 2 L118 20 L100 38 L82 20 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <polygon points={TAILPIECE_STAR} fill="currentColor" />
    </svg>
  );
}

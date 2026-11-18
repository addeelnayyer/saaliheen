// Saaliheen's frame for a Link preview picture drawn with next/og: frame B's
// light look (the star-pattern band around a paper sheet, the dome above the
// cartouche, the tailpiece and the Saaliheen name). A Share page's picture
// (#57) and a Theme page's (#132) put their own English words in it. Nothing
// here draws Quranic Arabic or loads an Arabic typeface (ADR 0007): Satori
// drops harakat, reverses the word order and refuses the Indo-Pak typeface.

import type { ReactNode } from "react";
import { STRINGS } from "./strings";
import { TAILPIECE_STAR } from "./share/ornaments";

/** Every Link preview picture's size. */
export const PICTURE_SIZE = { width: 1200, height: 630 };

/** Frame B's light look, as share.module.css sets it. */
const GOLD = "#b0882f";
const PAPER = "#fbf4e2";
const INK = "#2b2116";
const BAND = "#1f3b2f";
const PAGE = "#e9dfc6";

/** The band's repeating eight-point star, as share.module.css draws it. */
const STAR_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><g fill='none' stroke='#d1ad55' stroke-width='1.2'><rect x='9' y='9' width='14' height='14'/><rect x='9' y='9' width='14' height='14' transform='rotate(45 16 16)'/><circle cx='16' cy='16' r='2.5' fill='#d1ad55'/></g></svg>",
)}")`;

/** The small dome on its drum, as ornaments.tsx draws it. */
function Dome() {
  return (
    <svg width="132" height="77" viewBox="0 0 120 70">
      <path d="M60 2 v10" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="60" cy="5" r="2.5" fill={GOLD} />
      <path d="M60 12 C72 20 92 28 94 50 H26 C28 28 48 20 60 12Z" fill={GOLD} fillOpacity="0.2" stroke={GOLD} strokeWidth="1.5" />
      <rect x="20" y="50" width="80" height="8" fill={GOLD} opacity="0.5" />
      <path d="M0 66 H120" stroke={GOLD} strokeWidth="1" />
    </svg>
  );
}

/** The tailpiece: a star in a lozenge, flanked by tapering rules, as ornaments.tsx draws it. */
function Tailpiece() {
  return (
    <svg width="160" height="32" viewBox="0 0 200 40">
      <path d="M10 20 L76 18 V22 Z M190 20 L124 18 V22 Z" fill={GOLD} opacity="0.7" />
      <path d="M100 2 L118 20 L100 38 L82 20 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <polygon points={TAILPIECE_STAR} fill={GOLD} />
    </svg>
  );
}

/** What the headpiece's cartouche writes: a gold line in capitals, then any title below it. */
export interface Headpiece {
  label: string;
  title?: string;
}

/** The headpiece: the dome above a rounded cartouche; larger when it is all the sheet holds. */
function Head({ head, large }: { head: Headpiece; large: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Dome />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 640,
          maxWidth: 960,
          padding: large ? "20px 56px" : "14px 48px",
          border: `2px solid ${GOLD}`,
          borderRadius: 999,
          background: "rgba(176, 136, 47, 0.1)",
        }}
      >
        <div style={{ display: "flex", color: GOLD, fontSize: large ? 40 : 30, letterSpacing: 4, textTransform: "uppercase" }}>{head.label}</div>
        {head.title && (
          <div style={{ display: "flex", marginTop: 6, color: INK, fontSize: large ? 42 : 34, textAlign: "center" }}>{head.title}</div>
        )}
      </div>
    </div>
  );
}

/** The text below the headpiece. */
function Body({ text }: { text: string }) {
  return <div style={{ display: "flex", color: INK, fontSize: 30, lineHeight: 1.45, textAlign: "center", maxWidth: 900 }}>{text}</div>;
}

/** The tailpiece above the Saaliheen name. */
function Foot() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Tailpiece />
      <div style={{ display: "flex", color: GOLD, fontSize: 20, letterSpacing: 8, textTransform: "uppercase" }}>{STRINGS.brand}</div>
    </div>
  );
}

/**
 * The paper sheet inside its fine gold rule and double inner rule: the
 * headpiece, the body text, then the foot. With no body text, the headpiece
 * stands larger in the middle.
 */
function Sheet({ head, body }: { head: Headpiece; body?: string }) {
  return (
    <div style={{ display: "flex", flex: 1, padding: 6, background: PAPER, border: `1px solid ${GOLD}` }}>
      <div style={{ display: "flex", flex: 1, padding: 2, border: `1.5px solid ${GOLD}` }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 56px 14px",
            border: `1.5px solid ${GOLD}`,
          }}
        >
          {body ? <Head head={head} large={false} /> : <div style={{ display: "flex" }} />}
          {body ? <Body text={body} /> : <Head head={head} large />}
          <Foot />
        </div>
      </div>
    </div>
  );
}

/** The picture: the page colour around a gold-lined star band around the sheet. */
export function FramedPicture({ head, body }: { head: Headpiece; body?: string }): ReactNode {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 14, background: PAGE }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: 30,
          border: `3px solid ${GOLD}`,
          borderRadius: 6,
          backgroundColor: BAND,
          backgroundImage: STAR_PATTERN,
          backgroundSize: "32px 32px",
          backgroundRepeat: "repeat",
        }}
      >
        <Sheet head={head} body={body} />
      </div>
    </div>
  );
}

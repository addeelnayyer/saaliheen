// The app's colours for the system's light and dark appearance: the website's
// design tokens (apps/web/src/app/globals.css). Apart from ./theme.ts, which
// picks between them, so the app's scenarios can read them in Node.

export const LIGHT = {
  paper: "#FFFFFF",
  tint: "#F5F7F4",
  ink: "#1C211E",
  muted: "#6A726D",
  line: "#ECEFEA",
  accent: "#2F6A55",
  onAccent: "#FFFFFF",
  hi: "#E3EFE8",
  chip: "#EDF3EF",
  madani: "#8A5A1C",
  madaniBg: "#F7EFE2",
  scrim: "rgba(14, 20, 17, .45)",
  /** The Recited Word's Ayah, marked faintly: the accent at 5% (the website's .ayah[data-recited]). */
  recitedAyah: "rgba(47, 106, 85, .05)",
  /** Allah reference colour (#151): the gold an Allah reference's Arabic is shown in, the website's --allah. */
  allah: "#A87A0A",
  /** Known words colour (#253): the green a Known Root's Word card is tinted in. The website has none yet (#250), so these greens are the app's, chosen for #250's contrast. */
  known: "#DDF0E3",
  /** A tinted Word card's Word meaning: the muted grey darkened to read at 4.5:1 on the green. */
  knownMeaning: "#5A625D",
  /** The pale tint a Root dialog marks the tapped Word's Lemma, Spelling and Word location in (#323): the lilac the website's Root page draws a Spelling's Words on, --root-word. */
  rootWord: "#EFE9F7",
};

export const DARK: typeof LIGHT = {
  paper: "#111412",
  tint: "#1A1E1C",
  ink: "#E6EAE7",
  muted: "#9AA39E",
  line: "#232926",
  accent: "#85C5A8",
  onAccent: "#111412",
  hi: "#1E2F27",
  chip: "#1C2622",
  madani: "#DFB878",
  madaniBg: "#2A2318",
  scrim: "rgba(0, 0, 0, .62)",
  recitedAyah: "rgba(133, 197, 168, .05)",
  allah: "#E3B84F",
  known: "#1A3426",
  knownMeaning: "#9AA39E",
  rootWord: "#2C2540",
};

export type Colors = typeof LIGHT;

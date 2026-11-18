// Hide Word meanings (#256): while it is on, a Surah page in Study shows no
// Word card's Word meaning (surah.module.css), and a Word card tapped while no
// Recitation plays shows its own until it is tapped again (recitation.tsx
// hears the taps). The cards shown are marked data-revealed here, never
// rendered by React, as the Ayahs are many and memoised; leaving the page or
// switching the setting off hides them all again (word-taps.ts).

const REVEALED = "data-revealed";

/** Whether Hide Word meanings is on now, from <html>. */
export const meaningsHidden = () => document.documentElement.getAttribute("data-hide-word-meanings") === "on";

/** Shows the Word meaning of the Word card at `location`, or hides it again if shown. */
export function toggleMeaning(location: string) {
  document.getElementById(location)?.toggleAttribute(REVEALED);
}

/** Hides every Word meaning shown by a tap again. */
export const hideShownMeanings = () => document.querySelectorAll(`[${REVEALED}]`).forEach((card) => card.removeAttribute(REVEALED));

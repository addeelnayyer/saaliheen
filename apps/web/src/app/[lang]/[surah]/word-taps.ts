// In Flowing a Word is tapped to listen from it (#126), and in Study with Hide
// Word meanings on (#256) a Word card is tapped to show its meaning, so there
// each Word is a button the keyboard reaches with Tab and taps with Enter or
// Space (recitation.tsx listens for those keys, as it does for taps).
// Otherwise Study's Word cards stay as they were, out of the Tab order. The
// Ayahs are many and memoised, so this is set on the page's Word cards here,
// never rendered by React: again whenever the Ayah layout or Hide Word
// meanings changes and whenever Ayahs arrive (a Surah opened in parts, #24).
// Switching Hide Word meanings off, or leaving the page, hides the meanings
// shown by a tap again.

import { parseAyahLayout } from "../settings";
import { hideShownMeanings, meaningsHidden } from "./word-meanings";

/** A Surah page's Word cards: the elements with ids inside its Ayah sections (their Word locations). */
const WORDS = "main section[id] [id]";

/** Whether the page shows the Ayah layout Flowing now. */
export const isFlowing = () => parseAyahLayout(document.documentElement.getAttribute("data-ayah-layout")) === "flowing";

/** Makes `word` a button the keyboard reaches, or a Word card as Study draws it. */
function setTappable(word: Element, on: boolean) {
  if (on === word.hasAttribute("tabindex")) return;
  if (on) {
    word.setAttribute("tabindex", "0");
    word.setAttribute("role", "button");
  } else {
    word.removeAttribute("tabindex");
    word.removeAttribute("role");
  }
}

/**
 * Makes every Word on the page a button the keyboard reaches while the layout
 * is Flowing or Word meanings are hidden, and keeps it so, hiding the meanings
 * shown by a tap once Word meanings are no longer hidden; returns what stops it
 * (hiding them too).
 */
export function keepWordsTappable(): () => void {
  const apply = () => {
    const hidden = meaningsHidden();
    if (!hidden) hideShownMeanings();
    const on = isFlowing() || hidden;
    document.querySelectorAll(WORDS).forEach((word) => setTappable(word, on));
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ayah-layout", "data-hide-word-meanings"] });
  observer.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    hideShownMeanings();
  };
}

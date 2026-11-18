// Known words colour (#250, #251): the green tint behind every known Word in
// Quran Analysis. A Surah page's Word card names its Root's letters
// (data-root-letters) or, with no Root, its particle (data-particle-lemma or
// data-particle-spelling), the same on every reader's page, and one <style> in
// <head> tints the cards of the Known Roots and Known particles;
// surah.module.css draws the tint on the Surah page alone, and only while
// data-known-words-colour is on. The pre-paint script (settings.ts) writes that
// style from the stored Known words before <body> exists, and every mark
// writes it again (known-words.ts), so no Word is drawn again for a mark.

/** The browser storage name of the Known words. */
export const KNOWN_WORDS_STORED_AS = "qwt-known-words";

/** The id of the <style> holding the Known words' tint. */
export const KNOWN_WORDS_STYLE = "known-words-tint";

/**
 * The style tinting the Words of every Known Root and Known particle in the
 * stored Known words `stored`: for each entry the newer wins, a tie going to
 * the unmark, and malformed entries (a text over 64 characters, a markedAt not
 * in whole milliseconds) are left out (the rules of @saaliheen/known-words,
 * ADR 0057). Self-contained (it references nothing outside itself) so it can
 * also run in the pre-paint script.
 */
export function knownWordsStyle(stored: string | null): string {
  let list: unknown;
  try {
    list = JSON.parse(stored ?? "[]");
  } catch {
    return "";
  }
  if (!Array.isArray(list)) return "";
  // The Word card attribute naming each kind of entry.
  const attributes: Record<string, string> = { root: "data-root-letters", lemma: "data-particle-lemma", spelling: "data-particle-spelling" };
  const winners = new Map<string, { kind: string; text: string; known: boolean; markedAt: number }>();
  for (const entry of list) {
    const { kind, text, known, markedAt } = (entry ?? {}) as Record<string, unknown>;
    if (typeof kind !== "string" || !Object.hasOwn(attributes, kind) || typeof text !== "string" || text === "" || text.length > 64 || typeof known !== "boolean" || !Number.isSafeInteger(markedAt) || (markedAt as number) < 0) continue;
    const key = `${kind}\u0000${text}`;
    const held = winners.get(key);
    if (!held || (markedAt as number) > held.markedAt || (markedAt === held.markedAt && !known)) winners.set(key, { kind, text, known, markedAt: markedAt as number });
  }
  // A CSS string: a quote and a backslash escaped, a line break written as its code.
  const quoted = (text: string) => `"${text.replace(/["\\]/g, "\\$&").replace(/[\n\r\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}"`;
  const selectors = [...winners.values()].filter((w) => w.known).map((w) => `[${attributes[w.kind]}=${quoted(w.text)}]`);
  return selectors.length ? `${selectors.join(",")}{--known-word-tint:var(--known-word)}` : "";
}

/** Puts `css` in the Known words' <style>, adding it to <head> the first time. Self-contained, as knownWordsStyle. */
export function paintKnownWords(id: string, css: string) {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

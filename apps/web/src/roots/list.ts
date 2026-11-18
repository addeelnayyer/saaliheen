// The Roots list's rules (#290): every Root under its first letter, the
// letters and the Roots under each in Arabic alphabetical order, and the
// search that narrows it. A search with Arabic letters finds the Roots that
// hold them in a row, spaces and vowel marks aside (ر ح م, رحم and رَحِمَ all
// find ر ح م); any other finds the Roots whose transliteration holds it,
// folded as the Surah index folds a Latin name: in any case, without accents,
// hyphens or spaces (rhm finds r-ḥ-m).

import { foldLatin } from "@saaliheen/dataset/index-search";
import type { ListedRootRow } from "@saaliheen/dataset/types";
import { compareRootLetters, firstLetterOf, hasLetters } from "@saaliheen/known-words";

/** `roots` under their first letters, the letters and the Roots under each in Arabic alphabetical order. */
export function rootsByLetter(roots: ListedRootRow[]): { letter: string; roots: ListedRootRow[] }[] {
  const groups: { letter: string; roots: ListedRootRow[] }[] = [];
  for (const root of [...roots].sort((a, b) => compareRootLetters(a.letters, b.letters))) {
    const letter = firstLetterOf(root.letters);
    if (groups.at(-1)?.letter !== letter) groups.push({ letter, roots: [] });
    groups.at(-1)!.roots.push(root);
  }
  return groups;
}

/** The Roots of `roots` that `search` finds, in their order; all of them for a blank search. */
export function findRoots(search: string, roots: ListedRootRow[]): ListedRootRow[] {
  const query = search.trim();
  if (!query) return roots;
  if (/[؀-ۿ]/.test(query)) return roots.filter((root) => hasLetters(root.letters, query));
  const folded = foldLatin(query);
  return folded ? roots.filter((root) => foldLatin(root.transliteration).includes(folded)) : [];
}

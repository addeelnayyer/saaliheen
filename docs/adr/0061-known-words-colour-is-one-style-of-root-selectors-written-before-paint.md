# Known words colour is one style of Root selectors, written before paint

Known words colour (#250) tints the Words of a reader's Known Roots, which live only in the browser (ADR 0057), while the Surah pages are prerendered and cached the same for every reader. So the page never learns which Words are known: each Word card names its Root's letters (`data-root-letters`), the same on every page, and one `<style id="known-words-tint">` in `<head>` holds an attribute selector per Known Root setting `--known-word-tint`. The reader settings' pre-paint script writes it from the stored Known words before `<body>` exists, beside the settings' `<html>` attributes, and every mark, in any tab, writes it again. `surah.module.css` draws the tint only under `.reader` and only while `data-known-words-colour` is on, so Share pages, Theme pages, the Supplications page, the Iltifat pages and the Passage editor, whose cards carry no Root letters or sit outside `.reader`, never show it. Known particles later joined the same style (#251; see Consequences).

## Considered options

- Mark each known Word card from React once the page runs: the green would appear a frame late, and every mark would draw the Surah's cards again.
- A class per Known Root on `<html>`: Root letters are Arabic with spaces, so they would have to be encoded, and the CSS would still need one rule per Root, written at run time.

## Consequences

The style grows with the Known Roots, one short selector each; a reader who knows every Root has well over a thousand, which the browser matches without trouble. The pre-paint script carries its own copy of the Known words merge rule (newer entry wins, a tie to the unmark), as `knownWordsStyle` cannot import `@saaliheen/known-words` and still run inline.

Known particles are tinted the same way (#251): a rootless Word card names its particle by its kind, `data-particle-lemma` or `data-particle-spelling`, holding the particle's text, and `knownWordsStyle` writes one selector per Known particle beside those of the Known Roots. Marking مِن tints مِنْ, وَمِن and مِنْهُمْ alike, as each card names the Lemma, not its own Spelling.

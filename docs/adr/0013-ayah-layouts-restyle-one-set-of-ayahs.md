# Quran Analysis's Ayah layouts restyle one set of Ayahs

A Surah page draws its Ayahs once, each Passage's Ayahs grouped, and Study and Flowing are two ways of setting out that same set, chosen by the Ayah layout on `<html>` before first paint (#125). Every Ayah and Word keeps one id, so Word location links, the Reading place, the Recited Word and the Root dialog work the same in both layouts, and switching never re-renders a long Surah's thousands of Words. The one exception is the Ayah translations: Study shows each after its Ayah, and Flowing shows a Passage's as one paragraph after its Arabic, so each Ayah translation is in the page twice and the layout not in use hides its copy from sight and from screen readers. Two copies of the translations are cheaper than two copies of the Arabic.

## Considered Options

- Drawing Flowing as a second copy of the Ayahs, shown in place of Study's: rejected because it doubles the Arabic, the heaviest part of the page, and gives each Word two ids.
- Rendering only the chosen layout on the client: rejected because the page is static and the choice is per device, so the first paint would show the wrong layout, or nothing, until hydration.

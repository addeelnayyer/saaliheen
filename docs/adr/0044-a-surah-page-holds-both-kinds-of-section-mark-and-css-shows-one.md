# A Surah page holds both kinds of Section mark, and CSS shows one

Section marks ([0020](0020-section-marks-are-drawn-from-qul-data-not-printed-signs.md), #194) let a reader choose Hizb quarters or Rukus. The builder reads QUL's Rub' al-Hizb file (`data/qul/quran-metadata-rub.json`) and Ruku file (`data/qul/quran-metadata-ruku.json`) and writes each Surah's marks, labelled, into its Surah file as `sectionMarks: { hizbQuarters, rukus }`, each list in Ayah order; no new endpoint serves them. On the website the choice is a per-device reader setting stored as `qwt-section-marks` (`"ruku"`, or nothing for Hizb quarters; anything but `"ruku"` reads as Hizb quarters) and put on `<html>` as `data-section-marks` (`hizb` or `ruku`) by the pre-paint script, like the Ayah layout. It does not follow the Account. The mobile app keeps the same key and the same reading rule in its device storage.

A Surah page, whole or opened in parts, draws every Hizb quarter mark and every Ruku mark of its Surah from the Surah's `sectionMarks`, each just before its Ayah's section, so above any Passage heading at that Ayah, in both Ayah layouts. The stylesheet hides the kind `data-section-marks` does not name with `display: none`, which also hides it from screen readers. This follows [0013](0013-ayah-layouts-restyle-one-set-of-ayahs.md): the page is static and the choice is per device, so drawing only the chosen kind would paint the wrong marks until hydration, and switching would draw the Ayahs again. A Surah opened in parts ([0005](0005-surahs-open-in-parts-inside-the-app.md)) gets the Surah's `sectionMarks` from its opening page, not from its part files, so the parts keep their shape and a direct load still gets the whole page with its marks. The mobile app has no first paint to protect, so its Surah screen lists only the chosen kind.

## Consequences

- Each mark is in the page whichever kind is shown: a few dozen small elements even in Al-Baqarah.
- Switching changes one attribute on `<html>`; no Ayah is rendered again.
- Section marks are a new part of the static Quran dataset, kept under [0001](0001-static-quran-dataset.md)'s rules until the Quran text moves into Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md), #172). That move must carry them: the import loads them from the same two QUL files, and the Surah shape both clients read keeps `sectionMarks`.

## Considered Options

- Rendering only the chosen kind on the client: rejected for the same reason as 0013's, a wrong first paint.
- Carrying the marks in each Surah part: rejected, as it changes the part files' published shape for data the page already holds.

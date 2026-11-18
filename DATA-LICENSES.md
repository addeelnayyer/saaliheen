# Data, fonts and translations: sources and licences

The [LICENSE](LICENSE) (MIT) covers Saaliheen's own code and the data Saaliheen made itself. It does **not** cover the third-party material below. Each item keeps its own copyright and terms, and anyone reusing it must follow those terms, not the MIT licence.

The website's Credits page (`apps/web/src/app/[lang]/credits/page.tsx`) gives the same credits to readers.

Status key: **Licensed** means published terms allow redistribution, under the conditions listed. **No stated terms** means the publisher gives no licence; it is included in good faith and will be removed on request. **Restricted** means the holder's terms do not allow redistribution without their permission.

## Quran text, word data and recitation timings: Quranic Universal Library (QUL)

- **Files:** `apps/web/data/qul/*.json`, `apps/web/data/qul/word-lemma.db`, `apps/web/data/qul/word-root.db`
- **Source:** [QUL by Tarteel](https://qul.tarteel.ai). This covers the QPC Hafs word-by-word text, the Digital Khatt Indo-Pak text, the English and Urdu word-by-word meanings, the Surah, Juz, Rub, Ruku and Sajda metadata, the word lemmas and roots, and the Yasser Ad-Dussary recitation timings.
- **Licence:** No stated terms. QUL says its resources [vary in their copyright status](https://qul.tarteel.ai/faq), and each one used here reports no copyright information. QUL's own MIT licence covers its code, not these datasets.
- **Conditions:** Credit QUL by Tarteel. The roots and lemmas likely derive from the Quranic Arabic Corpus (below), so credit that too.

## Uthmani typeface: KFGQPC Uthmanic Hafs (V22)

- **Files:** `apps/web/data/qul/fonts/UthmanicHafs_V22.woff2`, `apps/mobile/assets/fonts/UthmanicHafs_V22.ttf`
- **Holder:** © 2010 King Fahd Glorious Quran Printing Complex (KFGQPC)
- **Licence:** Licensed under the KFGQPC Electronic End-User License Agreement embedded in the font. It allows free use, copying and distribution.
- **Conditions:** Do not sell the font, and do not modify, alter or translate it. Keep it unchanged, with its embedded notice.

## Indo-Pak typeface: DigitalKhatt IndoPak

- **Files:** `apps/web/data/qul/fonts/DigitalKhattIndoPak.otf`, `apps/mobile/assets/fonts/DigitalKhattIndoPak.otf`
- **Holder:** © 2024-2025 Amine Anane and © 2024-2025 Tarteel Inc.
- **Licence:** Licensed under the [SIL Open Font License 1.1](https://openfontlicense.org). The full text sits beside each copy as `DigitalKhattIndoPak-OFL.txt`. Source: [DigitalKhatt/indopakfont](https://github.com/DigitalKhatt/indopakfont).
- **Conditions:** Keep the copyright notice and the licence with the font. Do not sell the font on its own.

## Urdu typeface: Dubai

- **Files:** `apps/mobile/assets/fonts/Dubai-Regular.ttf`, `apps/web/src/typefaces/Dubai-Regular.woff2` (converted from the TTF)
- **Holder:** © 2017 Dubai Executive Council. All rights reserved.
- **Licence:** Restricted. The [Dubai Font](https://www.dubaifont.com) EULA is free to use in apps and sites, but it does not allow further distribution of the font files without the Council's written consent.
- **Not included in this repository.** Download Dubai Regular from [dubaifont.com](https://www.dubaifont.com) under its EULA, then place it as described in [MISSING-FILES.md](MISSING-FILES.md).

## English Ayah translation: Saheeh International

- **File:** `apps/web/data/qul/en-sahih-international-inline-footnotes.json`
- **Holder:** © Abul-Qasim Publishing House (1997) and Al-Muntada Al-Islami (2004)
- **Licence:** Restricted. All rights reserved; the printed edition forbids reproduction without the publisher's written permission. [Tanzil](https://tanzil.net/trans/) distributes it for non-commercial use only.
- **Not included in this repository.** Download it from QUL (translation 193) under its holder's terms, then place it as described in [MISSING-FILES.md](MISSING-FILES.md).

## Urdu Ayah translation: Fateh Muhammad Jalandhari

- **File:** `apps/web/data/qul/ur-fatah-muhammad-jalandhari-simple.json`
- **Holder:** Fateh Muhammad Jalandhari (born 1864). The copyright status is unverified and may be public domain because of the translation's age.
- **Licence:** No stated terms. QUL gives none, and [Tanzil](https://tanzil.net/trans/) distributes its translations for non-commercial use only.
- **Conditions:** Credit the translator. Treat reuse as non-commercial unless the work is confirmed to be in the public domain.

## Word grammar: Quranic Arabic Corpus (morphology, version 0.4)

- **File:** `apps/web/data/quran-morphology.txt`. This is the corrected copy from [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology) at commit `8f38b39`, with the Corpus's copyright notice added at the top. That repository publishes no licence of its own.
- **Holder:** Quranic Arabic Corpus, © 2011 Kais Dukes
- **Licence:** Licensed under the GNU General Public License, with the Corpus's extra terms in the file header and at [corpus.quran.com/download](https://corpus.quran.com/download/).
- **Conditions:**
  - Copy only verbatim: the Corpus's terms say "CHANGING IT IS NOT ALLOWED".
  - Name the Quranic Arabic Corpus as the source and link to [corpus.quran.com](https://corpus.quran.com).
  - Keep the copyright notice in every copy.
  - The Corpus builds on the [Tanzil](https://tanzil.net) Quran text, so credit Tanzil too.
- **Note:** The file has mustafa0x's corrections and is not the verbatim v0.4 file, which the verbatim condition may not allow.

## Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim

- **Files:** none of the full Tafsir. It is loaded into the database by `apps/web/scripts/load-tafsir.ts`, not committed. `apps/web/features/api/tafsir-sample.json` holds a short English excerpt (2:1–2:5 and 108:1–3) for tests. `apps/mobile/features/tafsir-sample-ur.json` holds made-up placeholder text.
- **Holder:** Tafsir Center for Quranic Studies. Publisher: Dar Al-Mokhtasar for Publishing and Distribution.
- **Licence:** The excerpt is used under [QuranEnc](https://quranenc.com)'s republishing terms.
- **Conditions:** Do not modify the excerpt. Credit the Tafsir Center and QuranEnc.com, and state the edition.

## Saaliheen's own data (MIT, under [LICENSE](LICENSE))

- `apps/web/data/roots.json`: hand-approved meanings for each Spelling.
- `apps/web/data/allah-references.json`: hand-marked Word locations that refer to Allah.
- `apps/web/data/indopak-juz-starts.json`: where the Indo-Pak Juz begin.
- `apps/web/data/quran_supplications_categorized.json` and `apps/web/data/supplications/`: the Supplications and their Speakers.
- `apps/web/data/iltifat/quran_iltifat_person_shifts_2.json`: the Iltifat catalogue. Its verse references and shift directions follow the lists in M. A. S. Abdel Haleem, "Grammatical Shift for Rhetorical Purposes: Iltifāt and Related Features in the Qur'ān", *Bulletin of SOAS* 55, no. 3 (1992): 407–432, [doi:10.1017/S0041977X00003621](https://doi.org/10.1017/S0041977X00003621). Its explanations are Saaliheen's own.
- `apps/web/scripts/content/0008-load-themes-file.json`: the Themes.

If you hold rights in anything here and want it credited differently or removed, please open an issue.

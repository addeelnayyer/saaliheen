@issue-172
Feature: The Quran imported into Postgres
  The import is the dataset builder's transform with its checks, writing
  normalized rows into Neon (ADR 0011, ADR 0049): every Surah with QUL's
  metadata and its Section marks, every Ayah with its Indo-Pak end and its
  Ayah translations, every Word by Word location with its text in both Scripts
  (ADR 0002) and QUL's Word meanings (ADR 0003), and each Surah's Recitation
  timings (ADR 0010). An Ayah's Word count is the number of its Words. These
  scenarios replace the dataset seam's scenarios for this data: they read the
  rows back from the run's own Postgres and hold them to the committed
  sources, and to what the builder makes of them. Expected text is read from
  the sources, never typed.

  Background:
    Given a Postgres holding the import of the committed sources

  @AC-1 @AC-8
  Scenario: All 114 Surahs are imported, in order, with QUL's metadata and their Ayahs
    Then for each of the 114 Surahs the metadata's Ayah count is the number of Ayahs the QPC Hafs text has
    And the database holds Surahs 1 to 114 in order, each with the metadata's Ayah count and that many Ayahs
    And the database holds 6236 Ayahs in all
    And each Surah's Ayahs are numbered from 1 to its Ayah count
    And each Surah's Arabic and Latin name, revelation place and Bismillah are the builder's

  @AC-1 @AC-8
  Scenario: Word 1:1:1 has its Uthmani and Indo-Pak text
    When I look up the imported Word at "1:1:1"
    Then its Uthmani text is the QPC Hafs text at that Word location
    And its Indo-Pak text is the Digital Khatt Indopak text at that Word location
    And its Uthmani and Indo-Pak texts differ

  @AC-1 @AC-8
  Scenario: Every Word is imported in both Scripts, and Ayah-end markers are not Words
    Then the QPC Hafs and Digital Khatt Indopak texts list the same Word locations
    And the imported Word locations are exactly the QPC Hafs Word locations that are not Ayah-end markers
    And every imported Word has the QPC Hafs text and the Digital Khatt Indopak text at its Word location, less the printed ۞ ADR 0020 removes
    And the QPC Hafs text has 6236 Ayah-end markers
    And imported Ayah 1:1 holds exactly these Words
      | location |
      | 1:1:1    |
      | 1:1:2    |
      | 1:1:3    |
      | 1:1:4    |

  @AC-1 @AC-8
  Scenario: Each Ayah keeps its Indo-Pak end-of-Ayah text
    Then every imported Ayah's Indo-Pak end is Digital Khatt's text at the Ayah's Ayah-end marker, less the Ruku sign ADR 0020 removes
    And every imported Ayah's Indo-Pak end starts with the end-of-Ayah sign U+06DD
    And imported Ayah 1:1's Indo-Pak end is that sign alone, and Ayah 1:2's carries the number 1
    And imported Ayah 7:206's Indo-Pak end carries the sajdah sign U+08DB

  @AC-1 @AC-8
  Scenario: Word 1:5:2 has QUL's Urdu and English Word meaning
    When I look up the imported Word at "1:5:2"
    Then QUL has an Urdu and an English Word meaning at that Word location
    And the Word's meaning is exactly QUL's Urdu and English Word meaning at that Word location

  @AC-1 @AC-8
  Scenario: Every Word's meanings and Root tag are the builder's
    Then every imported Word's Urdu and English Word meaning and Root tag are the builder's for that Word location

  @AC-1 @AC-8
  Scenario: Every Ayah's Ayah translations are imported, the English without its footnotes
    Then every imported Ayah's Urdu Ayah translation is Jalandhari's text for that Ayah, unchanged
    And every imported Ayah's English Ayah translation is Saheeh International's text for that Ayah with each inline footnote removed
    And all 6236 imported English Ayah translations are non-empty text
    And no imported English Ayah translation contains the footnote opening "[["
    And no imported English Ayah translation contains the footnote closing "]]"
    And the imported English Ayah translation of 1:2 keeps each of Saheeh International's single-bracket insertions in 1:2

  @AC-1 @AC-8
  Scenario: Each Ayah's Word count is the number of its Words
    Then each imported Ayah's Word count is the number of Words the builder gives that Ayah
    And Ayah 1:1's Word count is 4

  @AC-1 @AC-8
  Scenario: Each Surah's Section marks are imported
    Then each imported Surah's Hizb quarter marks and Ruku marks are the builder's
    And the imported Surahs hold 240 Hizb quarter marks and 558 Ruku marks in all
    And imported Surah 63's Hizb quarter marks are exactly
      | ayah | label     |
      | 4    | ¼ Hizb 56 |
    And imported Surah 63's Ruku marks are exactly
      | ayah | label                 |
      | 1    | Ruku 1 of 2 · 8 Ayahs |
      | 9    | Ruku 2 of 2 · 3 Ayahs |

  @AC-1 @AC-8
  Scenario: Every Surah's Recitation timings are imported from the source
    Then the database holds 114 Recitations, Surah 1 first, each by "Yasser ad-Dussary"
    And each imported Recitation streams "https://audio-cdn.tarteel.ai/quran/surah/yasserAlDosari/murattal/mp3/<nnn>.mp3"
    And each imported Recitation times every Ayah of its Surah, from the source's start and end of that Ayah
    And each imported Ayah's Word timings are the source's, in the order the Reciter says them
    And the imported Word timings of 2:9 run through Words 1 to 9, then 6 to 10

  @AC-1 @AC-8
  Scenario: The import holds exactly what the builder makes of the committed sources
    Then the Surahs, Ayahs, Words and Section marks read back from the database are the builder's, in order
    And the Recitations read back from the database are the builder's, in order

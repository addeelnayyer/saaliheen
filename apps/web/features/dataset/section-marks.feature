@issue-194
Feature: Each Surah's Section marks
  The dataset builder draws Section marks from QUL's data, not from the signs
  printed into each Script's text (ADR 0020). Each Surah carries two lists,
  the same in both Scripts: its Hizb quarters, read from QUL's Rub' al-Hizb
  file (quran-metadata-rub.json), and its Rukus, read from QUL's Ruku file
  (quran-metadata-ruku.json). Each mark names the Ayah it stands above and
  its label:
  - a Hizb quarter is labelled by its place in its Hizb: Hizb N, ¼ Hizb N,
    ½ Hizb N or ¾ Hizb N, where QUL's quarter number q is in Hizb ⌈q / 4⌉ and
    its place is (q − 1) mod 4;
  - a Ruku is labelled "Ruku n of N · c Ayahs", n its number in the Surah, N
    the Surah's Ruku count and c its Ayah count ("1 Ayah" for one Ayah).
  The builder takes the printed ۞ (with the space QPC Hafs writes after it)
  out of the Uthmani Word text and the Ruku sign (U+08D6) out of the
  Indo-Pak Ayah-end text, and changes no other character. Every expected value
  is read from the committed QUL files; only Surah 63's labels, the issue's
  own demo, are written out.

  Background:
    Given the dataset is built from the committed sources

  @AC-1 @AC-8
  Scenario: Every Hizb quarter is marked at the Ayah it starts, labelled by its place
    Then the Surahs hold 240 Hizb quarter marks in all
    And each of QUL's 240 Hizb quarters is marked once, above its first Ayah, labelled by its place in its Hizb
    And each Surah's Hizb quarter marks are in Ayah order

  @AC-1 @AC-8
  Scenario: The 41 Hizb quarters that start a Surah are marked above its first Ayah
    Then QUL's Rub' al-Hizb file has 41 Hizb quarters that start at a Surah's first Ayah
    And each of them is marked above Ayah 1 of its Surah, labelled by its place in its Hizb
    And Surah 1's only Hizb quarter mark is "Hizb 1", above Ayah 1:1

  @AC-1 @AC-8
  Scenario: Every Ruku is marked at the Ayah it starts, with its number in the Surah and its Ayah count
    Then the Surahs hold 558 Ruku marks in all
    And each of QUL's 558 Rukus is marked once, above its first Ayah, labelled with its number in its Surah, its Surah's Ruku count and its Ayah count
    And each Surah's Ruku marks are numbered 1 upwards in Ayah order

  @AC-1 @AC-8
  Scenario: A one-Ayah Ruku says "1 Ayah"
    Then QUL's Ruku file has exactly one Ruku of one Ayah, starting at "73:20"
    And Surah 73's Ruku mark above Ayah 73:20 is labelled "Ruku 2 of 2 · 1 Ayah"

  @AC-2 @AC-8
  Scenario: Surah 63 has a Hizb quarter at 63:4 and Rukus at 63:1 and 63:9
    When I read Surah 63's Section marks
    Then its Hizb quarter marks are exactly
      | ayah | label        |
      | 4    | ¼ Hizb 56    |
    And its Ruku marks are exactly
      | ayah | label                 |
      | 1    | Ruku 1 of 2 · 8 Ayahs |
      | 9    | Ruku 2 of 2 · 3 Ayahs |

  @AC-3 @AC-8
  Scenario: No printed ۞ remains in the Uthmani text, and no other character changes
    Then QPC Hafs writes ۞ 199 times, each at the front of a Word and followed by a space
    And no Word's Uthmani text holds ۞
    And each of those 199 Words' Uthmani text is its QPC Hafs text without the ۞ and the space after it
    And every other Word's Uthmani text is its QPC Hafs text unchanged
    And Word 63:4:1's Uthmani text is its QPC Hafs text without its leading ۞

  @AC-3 @AC-8
  Scenario: No printed Ruku sign remains in the Indo-Pak text, and no other character changes
    Then Digital Khatt Indopak writes the Ruku sign U+08D6 558 times, all in Ayah-end text and none in a Word
    And no Ayah's Indo-Pak end holds the Ruku sign
    And each of those 558 Ayahs' Indo-Pak end is Digital Khatt's Ayah-end text without the Ruku sign
    And every other Ayah's Indo-Pak end is Digital Khatt's Ayah-end text unchanged
    And every Word's Indo-Pak text is its Digital Khatt Indopak text unchanged

  # Writing each Surah's Section marks into its Surah file is the import's now
  # (#172): features/import/quran-import.feature imports them, and /data/v1
  # serves each Surah file from Neon's rows.

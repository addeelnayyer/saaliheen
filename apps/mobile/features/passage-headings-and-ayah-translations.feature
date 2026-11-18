Feature: Passage headings, Ayah translations and Language
  As on the website, a Surah shows a Passage heading above the first Ayah of
  each of its Passages, with its Passage title in the reader's Language and its
  Ayah range ("83–88", or one number for a one-Ayah Passage); with the Ayah
  translation switched on, each Ayah shows its Ayah translation in the
  Language. Switching Language changes every meaning and title and no Arabic.
  Expected titles and translations are read from the committed dataset that
  /data/v1 publishes.

  Background:
    Given the app is launched on a new device

  @AC-3 @AC-7
  Scenario Outline: Surah <Surah> in <Language> shows one Passage heading per Passage, above its first Ayah
    When I open Surah <Surah> in the Uthmani Script and <Language>
    Then each of Surah <Surah>'s Passages in its /data/v1 Surah file has one Passage heading, directly above its first Ayah, showing its <Language> Passage title and its Ayah range
    And the Surah shows no other Passage heading

    Examples:
      | Surah | Language |
      | 1     | Urdu     |
      | 1     | English  |
      | 2     | Urdu     |
      | 18    | English  |
      | 114   | Urdu     |

  @AC-3 @AC-7
  Scenario Outline: The Passage heading above Ayah 18:83 in <Language> shows its Passage title and "83–88"
    When I open Surah 18 in the Uthmani Script and <Language>
    Then the Passage heading above Ayah 18:83 shows the <Language> Passage title of 18:83 from its /data/v1 Surah file and the Ayah range "83–88"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3 @AC-7
  Scenario: A one-Ayah Passage's heading shows a single Ayah number
    When I open Surah 2 in the Uthmani Script and English
    Then the Passage heading above Ayah 2:25 shows the Ayah range "25"

  @AC-3 @AC-8
  Scenario Outline: With the Ayah translation on, each Ayah of Surah <Surah> shows its <Language> Ayah translation; off, none
    When I open Surah <Surah> in the Indo-Pak Script and <Language> with the Ayah translation on
    Then each Ayah shows its <Language> Ayah translation from its /data/v1 Surah file
    When I open Surah <Surah> in the Indo-Pak Script and <Language> with the Ayah translation off
    Then no Ayah shows an Ayah translation

    Examples:
      | Surah | Language |
      | 1     | Urdu     |
      | 1     | English  |
      | 18    | Urdu     |
      | 18    | English  |

  @AC-3 @AC-9
  Scenario Outline: Switching Language from <From> to <To> changes every meaning and title and no Arabic
    Given I open Surah 18 in the <Script> Script and <From> with the Ayah translation on
    When I switch Language to <To>
    Then every Word meaning, Ayah translation and Passage title on Surah 18 is the <To> one from its /data/v1 Surah file
    And every Word card shows the same <Script> text as before

    Examples:
      | Script   | From    | To      |
      | Uthmani  | Urdu    | English |
      | Indo-Pak | English | Urdu    |

  # As on the website, Passage headings stay off until a Scholar has checked the
  # Passage titles: the release switch is on only when EXPO_PUBLIC_PASSAGE_HEADINGS,
  # or else app.json's extra.passageHeadings, is "on". The scenarios above run
  # with it on.
  @AC-7
  Scenario: Launched as app.json ships it, with Passage headings held back, Surah 18 shows its Ayahs and Word cards and no Passage heading
    Given the app is launched on a new device with the Passage headings switch as app.json sets it
    When I open Surah 18 in the Uthmani Script and English
    Then the Surah shows no Passage heading at all
    And it shows every Ayah of Surah 18 with its Word cards from its /data/v1 Surah file

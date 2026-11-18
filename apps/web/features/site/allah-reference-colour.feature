@issue-147
Feature: Allah references in Allah reference colour in Study
  A reader of Quran Analysis in Study sees every Allah reference with its
  Arabic letters in Allah reference colour, a gold: #A87A0A in the light
  theme, #E3B84F in the dark theme, whether the reader chose it or the system
  did. Only the Arabic turns gold: the Word meaning and the Root tag keep
  their own colours, the Phrase colours still show behind the gold, and the
  Recited Word keeps its gold while it is marked. A Word that shares the
  Lemma of an Allah reference but is not on the list, such as رَبِّكَ in
  12:42, where it means the king, is not gold (ADR 0012).

  Allah references are read from Neon. The site tests' own Postgres is seeded
  before the build, through the seed the owner runs
  (`pnpm db:seed-allah-references`), with the few Word locations in
  features/site/allah-references.json: "the seeded list". Which Words are
  Allah references is read from that file, their Arabic in each Script from
  the QUL sources, and their Lemmas from QUL's word lemma database, never
  typed. A Word's Arabic is gold when every letter of it is drawn in the gold
  of the theme in effect.

  Background:
    Given a browser with no saved reader settings

  @AC-5 @AC-12
  Scenario Outline: On Surah <surah> in <Language> and the <Script> Script, every seeded Allah reference is gold and no other Word is
    Given I open Surah <surah> in <Language>
    When I choose the <Script> Script
    Then the Arabic of every Allah reference of Surah <surah> in the seeded list is gold
    And the Arabic of no other Word card of Surah <surah> is gold

    Examples:
      | surah | Language | Script   |
      | 1     | English  | Uthmani  |
      | 1     | Urdu     | Indo-Pak |
      | 112   | Urdu     | Uthmani  |
      | 112   | English  | Indo-Pak |
      | 12    | English  | Uthmani  |
      | 12    | Urdu     | Indo-Pak |

  @AC-5 @AC-12
  Scenario Outline: Al-Fatihah opened from the Surah index, part by part, in the <Script> Script, shows the same gold
    Given I open "/en"
    And I choose the <Script> Script
    When I follow the index card of Surah 1
    Then every Ayah of Surah 1 is shown
    And the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    And the Arabic of no other Word card of Surah 1 is gold

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-6 @AC-12
  Scenario Outline: In the <theme> theme chosen on a <viewport>, the gold is <gold>
    Given the browser is a <viewport>
    And I open Surah 1 in English
    When I choose the <Theme> theme
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is drawn in <gold>
    And I save a screenshot "AC-6-allah-reference-colour-surah-1-<theme>-<viewport>"

    Examples:
      | Theme | theme | viewport | gold    |
      | Light | light | desktop  | #A87A0A |
      | Dark  | dark  | desktop  | #E3B84F |
      | Light | light | phone    | #A87A0A |
      | Dark  | dark  | phone    | #E3B84F |

  @AC-6 @AC-12
  Scenario Outline: With the system's <scheme> colour scheme and no theme chosen, the gold is <gold>
    Given my system prefers a <scheme> colour scheme
    When I open Surah 1 in Urdu
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is drawn in <gold>

    Examples:
      | scheme | gold    |
      | dark   | #E3B84F |
      | light  | #A87A0A |

  @AC-6 @AC-12
  Scenario: With the system dark but the light theme chosen, the gold is #A87A0A
    Given my system prefers a dark colour scheme
    And I open Surah 1 in English
    When I choose the Light theme
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is drawn in #A87A0A

  @AC-7 @AC-12
  Scenario Outline: رَبِّكَ in 12:42 shares the Lemma of a seeded Allah reference but is not on the list, so it is not gold, in the <Script> Script
    Given the Word at 12:42:9 is not in the seeded list, but shares its Lemma with the Word at 1:2:3, which is
    When I open Surah 12 in <Language>
    And I choose the <Script> Script
    Then the Arabic of the Word card at 12:42:9 is not gold
    And the Arabic of the Word card at 12:40:12 is gold

    Examples:
      | Language | Script   |
      | English  | Uthmani  |
      | Urdu     | Indo-Pak |

  @AC-8 @AC-12
  Scenario Outline: In <Language> and the <theme> theme, the Word meaning and the Root tag of every Allah reference keep their own colours
    Given I open Surah 112 in <Language>
    When I choose the <Theme> theme
    Then on every Allah reference of Surah 112 in the seeded list, neither the Word meaning nor the Root tag is gold
    And on every Allah reference of Surah 112 in the seeded list, the Word meaning and the Root tag are drawn as on the Word card at 112:1:1, which is not one

    Examples:
      | Language | Theme | theme |
      | Urdu     | Light | light |
      | English  | Dark  | dark  |

  @AC-9 @AC-12
  Scenario Outline: In the <theme> theme, the gold sits over Al-Fatihah's Phrase colours without hiding them
    Given I open Surah 1 in English
    When I choose the <Theme> theme
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    And I save a screenshot "AC-9-allah-reference-colour-over-phrase-colours-<theme>-desktop"

    Examples:
      | Theme | theme |
      | Light | light |
      | Dark  | dark  |

  @AC-10 @AC-12
  Scenario: The gold stays on the Recited Word while the Recitation plays
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation reaches where the Reciter first says the Word at 1:2:2
    Then while the Word card at 1:2:2 is marked as the Recited Word, its Arabic is gold
    When the Recitation reaches where the Reciter first says the Word at 1:4:1
    Then while the Word card at 1:4:1 is marked as the Recited Word, its Arabic is gold

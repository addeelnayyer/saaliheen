@issue-234
Feature: Each Passage's Tafsir after its last Ayah
  A reader of a Surah page finds each Passage's Tafsir right after its last
  Ayah, open, in Study and in Flowing: the Tafsir entries whose last Ayah is in
  the Passage, in order, each under its Ayah range ("1:6–7" once for a grouped
  entry), in the reader's Language (Urdu right to left in Dubai),
  then the line crediting al-Mukhtasar's edition. Only a Tafsir entry's bold
  and italic are drawn as such; any other markup is shown as text. A Passage
  with no Tafsir in the Language shows none, and the Share page never does.

  Everything is behind a release switch, the build-time environment setting
  NEXT_PUBLIC_TAFSIR. Scenarios tagged tafsir-on run against a build made with
  it set to "on"; those tagged tafsir-off, with the rest of the site tests,
  against a build made without it (playwright.config.ts; `pnpm test:e2e` runs
  both). The Tafsir is the tests' own, put into the run's database before the
  run (features/site/tafsir-in-the-test-database.ts): Al-Fatihah in both
  Languages, Al-Baqarah's first 30 Ayahs in English only, Al-Kahf in both but
  for 18:83–88, Al-Kawthar none. The Passages are those the run's database holds.

  Background:
    Given a browser with no saved reader settings

  # ------------------------------------------------------------ switch on

  @tafsir-on @AC-1
  Scenario Outline: In <layout>, Surah <surah> in <Language> shows each Passage's Tafsir after its last Ayah, with its credit line
    Given I open "/<lang>/<surah>"
    When I switch the Ayah layout to <layout>
    Then Surah <surah>'s Tafsir in <Language> follows the last Ayah of each Passage that has any, each entry under its Ayah range, then its credit line
    And the first Passage's Tafsir is open on screen once scrolled to

    Examples:
      | surah | Language | lang | layout  |
      | 1     | English  | en   | Study   |
      | 1     | Urdu     | ur   | Flowing |
      | 18    | Urdu     | ur   | Study   |
      | 18    | English  | en   | Flowing |

  @tafsir-on @AC-1
  Scenario Outline: The <Language> Tafsir runs <dir> in <typeface>
    Given I note every font the browser downloads
    And I open "/<lang>/1"
    Then the Tafsir entry of 1:3 is marked lang "<lang>", runs "<dir>" and is set in the loaded font "<typeface>"
    And the browser downloaded the committed font file "Dubai-Regular.woff2"
    And I save a screenshot of the Tafsir after Ayah 1:4 "AC-1-tafsir-1-4-<lang>-light-desktop"

    Examples:
      | Language | lang | dir | typeface      |
      | Urdu     | ur   | rtl | Dubai         |
      | English  | en   | ltr | IBM Plex Sans |

  @tafsir-on @AC-2
  Scenario: A grouped Tafsir entry is shown once, under its Ayah range
    Given I open "/en/1"
    Then the Tafsir entry of 1:6–7 is shown once, under the Ayah range "1:6–7", after Ayah 1:7

  @tafsir-on @AC-3
  Scenario Outline: In <Language>, a Tafsir entry's bold and italic are kept and its other markup is shown as text
    Given I open "/<lang>/1"
    Then the Tafsir entry of 1:2 shows its bold and its italic as such, and its other markup as text

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @tafsir-on @AC-4
  Scenario Outline: Surah <surah> in <Language>, with no Tafsir, shows no Tafsir
    Given I open "/<lang>/<surah>"
    Then every Ayah of Surah <surah> is shown
    And the page shows no Tafsir

    Examples:
      | surah | Language | lang |
      | 108   | English  | en   |
      | 2     | Urdu     | ur   |

  @tafsir-on @AC-6
  Scenario: A Share page shows no Tafsir
    When I open the Share page of 18:1–5 in English and Uthmani
    Then the page shows no Tafsir

  @tafsir-on @AC-1
  Scenario: Switching Language switches the Tafsir
    Given I open "/en/1"
    When I switch Language to Urdu
    Then Surah 1's Tafsir in Urdu follows the last Ayah of each Passage that has any, each entry under its Ayah range, then its credit line

  @tafsir-on @AC-7
  Scenario: The credits name al-Mukhtasar, its Tafsir Center and both its editions
    Given I open the credits page in English
    Then the page names each of these sources:
      | al-Mukhtasar fi Tafsir al-Quran al-Karim |
      | Tafsir Center for Quranic Studies        |
      | English edition from QUL by Tarteel      |
      | Urdu edition from mokhtasr.com           |

  @tafsir-on @AC-1
  Scenario: Surah 2 opened in parts shows each Passage's Tafsir after its last Ayah once its parts arrive
    Given I open "/en"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    And Surah 2's Tafsir in English follows the last Ayah of each Passage that has any, each entry under its Ayah range, then its credit line

  # The page follows the Recited Word past the Tafsir between Al-Baqarah's Passages.
  @tafsir-on @AC-8
  Scenario: The page follows the Recited Word down Al-Baqarah, past its Tafsir
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open Surah 2 in English
    When I press the Surah bar's play button
    And the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word is a Word of Ayah 2:9
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    And the Passage ending at Ayah 2:7 is followed by its Tafsir
    And the Passage ending at Ayah 2:16 is followed by its Tafsir

  @tafsir-on @AC-8
  Scenario Outline: Switching layout on a <viewport>, with Tafsir between the Passages, keeps the Ayah at the top of the screen at the top
    Given the browser is a <viewport>
    And I open "/<lang>/18"
    When I scroll until Ayah <ayah> is at the top of the screen
    And I switch the Ayah layout to Flowing
    Then Ayah <ayah> is at the top of the screen
    And the first Word of Ayah <ayah> is in view, below the Surah bar
    When I switch the Ayah layout to Study
    Then Ayah <ayah> is at the top of the screen
    And the first Word of Ayah <ayah> is in view, below the Surah bar

    Examples:
      | viewport | lang | ayah  |
      | desktop  | ur   | 18:45 |
      | phone    | en   | 18:60 |

  # ------------------------------------------------------------ switch off

  @tafsir-off @AC-1
  Scenario: With the switch off, Surah 1 shows no Tafsir though the database holds it
    Given I open "/en/1"
    Then every Ayah of Surah 1 is shown
    And the page shows no Tafsir

  @tafsir-off @AC-7
  Scenario: With the switch off, the credits don't name al-Mukhtasar
    Given I open the credits page in English
    Then the page doesn't name "al-Mukhtasar"

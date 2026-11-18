@issue-278
Feature: A Grammar page reads like a Surah page
  A Grammar page sets out its Surah's Ayahs as a Surah page does: under their
  Passage headings (once Passage headings are released, as on a Surah page),
  each Ayah's Words followed by its Ayah translation when the reader has
  Ayah translation on. Arabic size, Meaning size, the Script and light or dark
  apply; Hide Word meanings does not, so Word meanings always show, and the
  Phrase colours, Allah reference colour and Known words colour never show,
  even when on. There is no Tafsir and no Theme or Iltifat chip. A Grammar
  page always arrives with its first part, then fills in the rest from its
  Grammar parts behind a skeleton (ADR 0066). Passages, Arabic, Word meanings
  and Ayah translations are read from the run's Neon and QUL's sources, never
  typed.

  Background:
    Given a browser with no saved reader settings

  @passage-headings-on @AC-1
  Scenario Outline: The Grammar page of Surah <Surah> in <Language> shows a Passage heading above each Passage's first Ayah
    When I open the Grammar page of Surah <Surah> in <Language>
    Then the Grammar page has finished loading
    And the Passage headings shown are the Passages file's for Surah <Surah> in <Language>, each above its first Ayah

    Examples:
      | Surah | Language |
      | 18    | English  |
      | 18    | Urdu     |
      | 112   | English  |

  @AC-1
  Scenario: Before Passage headings are released, a Grammar page shows none
    When I open the Grammar page of Surah 18 in English
    Then the Grammar page has finished loading
    And no Passage heading is shown and no Passage title of Surah 18 is shown

  @AC-2
  Scenario Outline: The Ayah translation shows under each Ayah of a Grammar page in <Language> only while it is on
    When I open the Grammar page of Surah 1 in <Language>
    Then no Ayah translation is shown on the Grammar page
    When I open Surah 1 in <Language>
    And I turn the Ayah translation switch on
    And I open the Grammar page of Surah 1 in <Language>
    Then each Ayah of the Grammar page is followed by its <Language> Ayah translation

    Examples:
      | Language |
      | English  |
      | Urdu     |

  @AC-3
  Scenario Outline: A Grammar page in <Language> follows the reader's <Script>, Arabic size, Meaning size and <Theme> theme
    Given on an earlier visit to "/<lang>/1" I chose, in order:
      | <Script>            |
      | <Theme>             |
      | Arabic size larger  |
      | Arabic size larger  |
      | Meaning size larger |
    When I open "/<lang>/grammar/1" in a fresh browser with an empty cache that keeps those choices
    Then every Word on the Grammar page shows its <Script> text from QUL and not the other Script's
    And the Grammar page's Arabic is 130% and its Word meanings 115% of a fresh browser's
    And the page is drawn on the <Theme> paper

    Examples:
      | lang | Language | Script   | Theme |
      | en   | English  | Indo-Pak | Dark  |
      | ur   | Urdu     | Uthmani  | Light |

  @AC-4
  Scenario: With Hide Word meanings, Phrase colours, Allah reference colour and Known words colour all on, a Grammar page shows every Word meaning and no tint
    Given this browser knows every Root of Surah 1
    And I open Surah 1 in English
    And I note the two tints of Al-Fatihah's Word cards
    And I turn Known words colour on
    And I note the green of the Word card at 1:1:2
    And I turn Hide Word meanings on
    Then the Phrase colours switch is on
    And the Allah reference colour switch is on
    And no Word card of Surah 1 shows its Word meaning
    When I open the Grammar page of Surah 1 in English
    Then every Word card of Surah 1 shows its English Word meaning
    And nothing on the Grammar page is drawn in either noted tint
    And nothing on the page is drawn in the noted green
    And every Word's Arabic letters are drawn in the ink

  @AC-5 @tafsir-on
  Scenario: Even with the Tafsir released, a Grammar page shows no Tafsir, Theme chip or Iltifat chip
    When I open the Grammar page of Surah 1 in English
    Then the Grammar page has finished loading
    And the page shows no Tafsir
    And the page has no Theme chip
    And the page has no link to an Iltifat page and no Iltifat chip

  @AC-5
  Scenario: Al-Baqarah's Grammar page shows none of its Surah page's Theme chips
    When I open the Grammar page of Surah 2 in English
    Then the Grammar page has finished loading
    And the page shows no Tafsir
    And the page has no Theme chip
    And the page has no link to an Iltifat page and no Iltifat chip

  @AC-6
  Scenario: Al-Baqarah's Grammar page shows its first Ayahs at once and fills in the rest behind a skeleton
    Given the server holds back every part of a Grammar page
    When I open the Grammar page of Surah 2 in English
    Then Ayah 2:1 is shown while the Surah is still loading
    And the Surah's loading skeleton is shown
    And the Grammar page does not yet show Ayah 2:286
    When the held-back parts arrive
    Then the Grammar page has finished loading
    And the Grammar page shows every Ayah of Surah 2 in order, every Word of each from QUL
    And no loading skeleton is shown
    And every Grammar part the page fetched is a static JSON file under "/parts/en/grammar/2/"

  @AC-6
  Scenario: Al-Baqarah's Grammar page, as a crawler gets it, holds its first Ayahs and not its last
    When I fetch the Grammar page of Surah 2 in English without scripts
    Then its HTML holds Ayah 2:1 with Word 2:1:1's Uthmani text from QUL, and not Ayah 2:286

  @AC-7
  Scenario Outline: The Grammar page of Surah <Surah> in <Language> on a 390×844 phone has no horizontal scroll and has the tab bar
    Given I view the page on a 390×844 phone
    When I open the Grammar page of Surah <Surah> in <Language>
    Then the Grammar page has finished loading
    And the page does not scroll horizontally
    And the tab bar is on screen
    When I scroll to the bottom of the page
    Then the page does not scroll horizontally
    And the tab bar is on screen

    Examples:
      | Surah | Language |
      | 1     | English  |
      | 2     | Urdu     |

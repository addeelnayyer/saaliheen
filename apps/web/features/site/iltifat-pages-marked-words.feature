@issue-143
Feature: Marked Words on the Iltifat pages
  An Iltifat counts as marked once both its sides hold a Word: one or more
  "from" Words and one or more "to" Words. Its entry on its Iltifat page then
  tints its "from" Words in one colour and its "to" Words in another, with a
  short key naming each side ("From He", "To We") beside a swatch of its tint,
  and a screen reader hears each Marked Word as its Arabic and its side ("from
  He", "to We"). An Iltifat with only one side marked is shown plain: no tint,
  no key, nothing said of a side. The tints read well in both Scripts and both
  colour themes. Study and Flowing show no Marked Words.

  The Iltifat's Marked Words are arranged through the API as an Admin saves
  them (PUT /api/v1/iltifat/{id}, features/api/iltifat-marked-words.feature),
  each scenario saying which Iltifat have Marked Words and leaving every other
  Iltifat with none. These scenarios run after the rest of the suite, one at a
  time (playwright.config.ts). The expected Arabic is read from the sources.

  The page's shape these steps expect: each Marked Word of an entry is an
  element whose `data-location` is its Word location (`s:a:w`), in each Script
  the page holds, the one shown being the reader's Script; the key is in the
  entry, outside its Arabic.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-6: a marked Iltifat, tinted with a key

  @AC-6
  Scenario: The He → We Iltifat at 17:1, marked on both sides, tints its "from" and "to" Words in two colours, with a key, and says each Word's side
    Given only these Iltifat have Marked Words:
      | Iltifat               | from   | to      |
      | He → We cited at 17:1 | 17:1:2 | 17:1:13 |
    When I open "/en/iltifat/he-to-we"
    Then the entry of the He → We Iltifat cited at 17:1 tints its "from" Words 17:1:2 in one colour and its "to" Words 17:1:13 in another, and no other Word
    And that entry's key shows "From He" beside a swatch of the "from" tint and "To We" beside a swatch of the "to" tint
    And a screen reader hears the Word at 17:1:2 as its Arabic and "from He", and the Word at 17:1:13 as its Arabic and "to We"
    And no other entry on the page tints a Word or shows a key

  @AC-6
  Scenario Outline: The We → He Iltifat at 17:1 with only its "<side>" Word <word> marked is shown plain
    Given only these Iltifat have Marked Words:
      | Iltifat               | from   | to   |
      | He → We cited at 17:1 | 17:1:2 | 17:1:13 |
      | We → He cited at 17:1 | <from> | <to> |
    When I open "/en/iltifat/we-to-he"
    Then the entry of the We → He Iltifat cited at 17:1 is shown plain: no Word tinted, no key, and nothing said of a "from" or "to" side

    Examples:
      | side | word    | from    | to      |
      | from | 17:1:13 | 17:1:13 |         |
      | to   | 17:1:18 |         | 17:1:18 |

  # ---------------------------------------------------------------- AC-3: one Word in two Iltifat

  @AC-3 @AC-6
  Scenario: The Word at 17:1:13 is tinted as the "to" Word on the He → We page and as the "from" Word on the We → He page
    Given the Word at 17:1:13 is the Word the issue names, بَارَكْنَا
    And only these Iltifat have Marked Words:
      | Iltifat               | from    | to      |
      | He → We cited at 17:1 | 17:1:2  | 17:1:13 |
      | We → He cited at 17:1 | 17:1:13 | 17:1:18 |
    When I open "/en/iltifat/he-to-we"
    Then the entry of the He → We Iltifat cited at 17:1 tints its "from" Words 17:1:2 in one colour and its "to" Words 17:1:13 in another, and no other Word
    And a screen reader hears the Word at 17:1:13 as its Arabic and "to We"
    When I open "/en/iltifat/we-to-he"
    Then the entry of the We → He Iltifat cited at 17:1 tints its "from" Words 17:1:13 in one colour and its "to" Words 17:1:18 in another, and no other Word
    And a screen reader hears the Word at 17:1:13 as its Arabic and "from We"
    And the two pages drew their "from" Words in one tint and their "to" Words in the other

  # ---------------------------------------------------------------- AC-7: both Scripts, both themes

  @AC-7
  Scenario Outline: The marked He → We Iltifat at 17:1 in <Script>, <Language>, on the <Theme> paper, on a <viewport>
    Given only these Iltifat have Marked Words:
      | Iltifat               | from   | to      |
      | He → We cited at 17:1 | 17:1:2 | 17:1:13 |
    And on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script> |
      | <Theme>  |
    When I open "/<lang>/iltifat/he-to-we" in a fresh browser with an empty cache that keeps those choices
    And I view the Iltifat page on a <viewport>
    Then the entry of the He → We Iltifat cited at 17:1 tints its "from" Words 17:1:2 in one colour and its "to" Words 17:1:13 in another, and no other Word
    And each Marked Word shows its <Script> text
    And the Arabic of each Marked Word contrasts with its tint by at least 4.5 to 1
    And that entry's key shows a swatch of each tint
    And the page does not scroll sideways
    And the Iltifat page is drawn on the <theme> paper
    And I save a screenshot "AC-7-iltifat-marked-words-<script>-<lang>-<theme>-<viewport>"

    Examples:
      | Script   | script  | lang | Language | Theme | theme | viewport |
      | Uthmani  | uthmani | en   | English  | Light | light | desktop  |
      | Uthmani  | uthmani | en   | English  | Dark  | dark  | phone    |
      | Uthmani  | uthmani | ur   | Urdu     | Light | light | phone    |
      | Uthmani  | uthmani | ur   | Urdu     | Dark  | dark  | desktop  |
      | Indo-Pak | indopak | en   | English  | Light | light | phone    |
      | Indo-Pak | indopak | en   | English  | Dark  | dark  | desktop  |
      | Indo-Pak | indopak | ur   | Urdu     | Light | light | desktop  |
      | Indo-Pak | indopak | ur   | Urdu     | Dark  | dark  | phone    |

  @AC-7
  Scenario: Study and Flowing show no Marked Words, though the Iltifat of 17:1 are marked
    Given only these Iltifat have Marked Words:
      | Iltifat               | from    | to      |
      | He → We cited at 17:1 | 17:1:2  | 17:1:13 |
      | We → He cited at 17:1 | 17:1:13 | 17:1:18 |
    And Surah 17's Passages are not covered by the Phrases file
    When I open Surah 17 in English
    Then no Word card of Surah 17 is tinted
    And no Word of 17:1 says it is a "from" or "to" Word
    When I switch the Ayah layout to Flowing
    Then no Word of Surah 17 is tinted
    And no Word of 17:1 says it is a "from" or "to" Word

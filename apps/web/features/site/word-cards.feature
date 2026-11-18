@AC-2-15
Feature: Word cards
  A Word card shows one Word's Uthmani text and its Word meaning in the page's
  Language, and not its Word location. Expected text is read from the QUL sources.

  @AC-2-8
  Scenario Outline: Surah 1 in <Language> has one Word card per Word, each with its Uthmani text and Word meaning
    Given I open Surah 1 in <Language>
    Then the Word cards are exactly Surah 1's Word locations from the QPC Hafs text, in reading order
    And every Word card shows its Uthmani text and its Word meaning in the page's Language
    And no Word card shows a Word meaning in the other Language that differs from its own

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-2-8
  Scenario Outline: Surah 2 in <Language> shows Word 2:255:3 with its Uthmani text and Word meaning
    Given I open Surah 2 in <Language>
    Then there is exactly one Word card at 2:255:3
    When I scroll to the Word card at 2:255:3
    Then the Word card at 2:255:3 shows its Uthmani text and its Word meaning in the page's Language

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @issue-35
  Scenario Outline: No Word card of Surah 1 in <Language> shows its Word location
    Given I open Surah 1 in <Language>
    Then no Word card shows its Word location, on screen or to a screen reader

    Examples:
      | Language |
      | Urdu     |
      | English  |

  Scenario: A Word's Arabic stays on one line even on a Word card squeezed narrower than the Word
    Given the browser is a phone
    And I open "/ur/3"
    When every Word card is squeezed narrower than its Word
    Then every Word card's Arabic is on one line

  @issue-24
  Scenario: A Word's Arabic stays on one line on a squeezed Word card of a Surah opened in parts
    Given the browser is a phone
    And I open "/ur"
    When I follow the index card of Surah 3
    Then every Ayah of Surah 3 is shown
    When every Word card is squeezed narrower than its Word
    Then every Word card's Arabic is on one line

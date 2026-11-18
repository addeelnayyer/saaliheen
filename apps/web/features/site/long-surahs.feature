@AC-2-15
Feature: Long Surahs stay light and phones never scroll sideways
  Al-Baqarah has about 6,100 Word cards: all are rendered, while off-screen
  Ayahs are skipped with `content-visibility`. On a 390×844 phone no Surah page
  scrolls horizontally.

  @AC-2-13
  Scenario: Surah 2 in English renders every Word card, with off-screen Ayahs skipped by content-visibility
    Given I open Surah 2 in English
    Then the Word cards are exactly Surah 2's Word locations from the QPC Hafs text, in reading order
    And the Word card at 2:255:3 sits in a part of the page, not holding the Word card at 2:1:1, whose content-visibility is auto

  @AC-2-13
  Scenario Outline: Surah <Surah> in <Language> on a 390×844 phone has no horizontal scroll
    Given the browser is a phone
    And I open Surah <Surah> in <Language>
    Then the page does not scroll horizontally
    And the Word cards of the Surah's first 12 Words are visible and fit within the screen's width
    When I scroll to the bottom of the page
    Then the page does not scroll horizontally

    Examples:
      | Language | Surah |
      | Urdu     | 1     |
      | Urdu     | 2     |
      | English  | 1     |
      | English  | 2     |

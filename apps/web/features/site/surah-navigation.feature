@AC-2-15
Feature: Moving between Surahs
  A Surah page links to the previous Surah and the next Surah at its foot, and
  Read leads to the Surah index of its Language (#192); Surah 1 has no
  previous Surah and Surah 114 no next.

  @AC-2-10
  Scenario Outline: Surah 2 in <Language> links to Surah 1, Surah 3 and, by Read, the Surah index
    Given I open Surah 2 in <Language>
    Then the destinations lead to the Surah index, Explore and Me in <Language>
    When I follow the next Surah link
    Then I am on Surah 3 in <Language>
    And the Word card at 3:1:1 is visible
    When I follow the previous Surah link
    Then I am on Surah 2 in <Language>
    When I follow the previous Surah link
    Then I am on Surah 1 in <Language>
    And the Word card at 1:1:1 is visible

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-2-10
  Scenario Outline: Surah 1 in <Language> has no previous Surah link and Surah 114 no next Surah link
    Given I open Surah 1 in <Language>
    Then a next Surah link is visible
    And there is no previous Surah link
    When I open Surah 114 in <Language>
    Then a previous Surah link is visible
    And there is no next Surah link
    When I follow the previous Surah link
    Then I am on Surah 113 in <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

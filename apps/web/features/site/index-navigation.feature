@AC-3-8
Feature: Index cards open their Surah pages
  Each index card links to its Surah page in the same Language, and the Surah
  page's Read destination comes back to the Surah index (#192).

  @AC-3-6
  Scenario Outline: On the <Language> index, a card opens its Surah page and Read comes back
    Given I open the Surah index in <Language>
    When I follow the index card of Surah 36
    Then I am on Surah 36 in <Language>
    And the Word card at 36:1:1 is visible
    And the page's main heading is Surah 36's Arabic name from the Surah metadata
    When I follow the destination "Read"
    Then I am on the Surah index in <Language>
    And the index cards are all 114 Surahs in order

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-6
  Scenario Outline: On the <Language> index, a card found by search opens its Surah page
    Given I open the Surah index in <Language>
    When I search for "114"
    Then the index shows only Surah 114
    When I follow the index card of Surah 114
    Then I am on Surah 114 in <Language>
    And the Word card at 114:1:1 is visible

    Examples:
      | Language |
      | Urdu     |
      | English  |

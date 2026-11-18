@AC-3-8
Feature: Filtering the Surah index to Makki or Madani Surahs
  The Surah index's filter shows all Surahs, only the Makki ones or only the
  Madani ones, as QUL's Surah metadata says; it narrows a search's results too.
  Its buttons read "All", "Meccan" and "Medinan" in both Languages.

  @AC-3-5
  Scenario Outline: On the <Language> index, "Meccan", "Medinan" and "All" show the matching Surahs
    Given I open the Surah index in <Language>
    Then the "All" filter is pressed
    When I choose the "Meccan" filter
    Then the "Meccan" filter is pressed
    And the index shows exactly the Makki Surahs of the Surah metadata, in order
    And the page is captured as the evidence screen "AC-3-5-index-<lang>-makki-light-desktop"
    When I choose the "Medinan" filter
    Then the "Medinan" filter is pressed
    And the "Meccan" filter is not pressed
    And the index shows exactly the Madani Surahs of the Surah metadata, in order
    When I choose the "All" filter
    Then the index cards are all 114 Surahs in order

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # Al-Baqarah is a Madani Surah.
  @AC-3-5
  Scenario Outline: On the <Language> index, the filter and a search for Surah 2's <Script> name narrow the list together
    Given I open the Surah index in <Language>
    When I search for Surah 2's <Script> name
    And I choose the "Medinan" filter
    Then the index shows only Surah 2
    When I choose the "Meccan" filter
    Then the index shows no Surah cards

    Examples:
      | Language | Script |
      | Urdu     | Arabic |
      | English  | Latin  |

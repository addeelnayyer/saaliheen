Feature: The admin area's Surah picker
  A signed-in Admin lands on the Surah picker at /admin: all 114 Surahs in
  order, each showing its number and Latin name from QUL's Surah metadata and
  linking to its Passage editor at /admin/<Surah> (a placeholder until the
  Passage editor's own ticket). A search box narrows the list by number or by
  name.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  @AC-5
  Scenario: The Surah picker lists all 114 Surahs in order
    When I open "/admin"
    Then I see the Surah picker
    And the Surah picker shows all 114 Surahs in order, each with its number and Latin name from the Surah metadata
    And the page offers "Sign out"
    And I save a screenshot "AC-5-surah-picker-light-desktop"

  @AC-5
  Scenario Outline: Searching the Surah picker for the number <Number> shows only Surah <Number>
    When I open "/admin"
    And I search the Surah picker for "<Number>"
    Then the Surah picker shows only Surah <Number>
    When I clear the Surah picker's search
    Then the Surah picker shows all 114 Surahs in order, each with its number and Latin name from the Surah metadata

    Examples:
      | Number |
      | 1      |
      | 18     |
      | 114    |

  @AC-5
  Scenario: Searching the Surah picker for part of a Latin name shows exactly the Surahs whose Latin name holds it
    When I open "/admin"
    And I search the Surah picker for the last part of Surah 18's Latin name, in lower case
    Then the Surah picker shows exactly the Surahs whose Latin name contains the search, among them Surah 18

  @AC-5
  Scenario: Searching the Surah picker for an Arabic name shows exactly the Surahs whose Arabic name holds it
    When I open "/admin"
    And I search the Surah picker for Surah 2's Arabic name
    Then the Surah picker shows exactly the Surahs whose Arabic name contains the search, among them Surah 2

  @AC-5
  Scenario: Each Surah in the picker opens its Passage editor
    When I open "/admin"
    And I choose Surah 18 in the Surah picker
    Then I am on the admin page "/admin/18"
    And the page names Surah 18's Latin name and says it is the Passage editor

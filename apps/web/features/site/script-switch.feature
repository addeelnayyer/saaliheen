@AC-4-9
Feature: Script switch
  The Script switch changes the Arabic between Uthmani (QPC Hafs) and
  Indo-Pak (Digital Khatt Indopak) and nothing else: every Word card keeps its
  Word meaning. The choice is kept in the browser, never in the URL, and holds
  across reloads, Surahs and Languages. Each Word's text in each Script is read
  from the committed sources.

  Background:
    Given a browser with no saved reader settings

  @AC-4-2
  Scenario Outline: On /<lang>/1 switching to Indo-Pak and back changes only the Arabic, and each choice survives a reload
    Given I open "/<lang>/1"
    Then the Uthmani Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Uthmani text
    When I choose the Indo-Pak Script
    Then the Indo-Pak Script is selected and Uthmani is not
    And I am on "/<lang>/1" with nothing added to the URL
    And every Al-Fatihah Word card shows its Word meaning and only its Indo-Pak text
    And I save a screenshot "AC-2-surah-1-<lang>-indopak-light-desktop"
    When I reload the page
    Then the Indo-Pak Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Indo-Pak text
    When I choose the Uthmani Script
    Then the Uthmani Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Uthmani text
    When I reload the page
    Then the Uthmani Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Uthmani text

    Examples:
      | lang |
      | ur   |
      | en   |

  @AC-4-2
  Scenario: The Indo-Pak choice follows the reader to another Surah, its Bismillah and the other Language
    Given I open "/ur/1"
    When I choose the Indo-Pak Script
    And I open "/ur/2"
    Then the Word card at 2:1:1 shows its Indo-Pak text
    And the Bismillah is shown in its Indo-Pak text and not in its Uthmani text
    When I switch Language to English
    Then I am on "/en/2" with nothing added to the URL
    And the Indo-Pak Script is selected
    And the Word card at 2:1:1 shows its Indo-Pak text

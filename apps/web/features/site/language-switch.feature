@AC-4-9
Feature: Language switch
  The Language switch chooses the language of the Word meanings and Ayah
  translations, and nothing else: the interface stays English, left to right.
  Switching keeps the learner where they are: on a Surah page it opens the
  same Surah in the other Language. Elsewhere the switch is on Me (#192), and
  Read then leads to the other Language's index.
  On a look-up (a shared Ayah's `#s:a` or a Word location's `#s:a:w`) it keeps
  the fragment, so the other Language opens at the same Ayah or Word.

  Background:
    Given a browser with no saved reader settings

  @AC-4-1
  Scenario: Switching Language on /ur/1 goes to /en/1, where the Word meanings turn English and the interface stays English
    Given I open "/ur/1"
    Then the interface is English and runs left to right
    And the Word card at 1:1:1 shows its Urdu Word meaning, marked "ur" and running "rtl"
    When I switch Language to English
    Then I am on "/en/1" with nothing added to the URL
    And the interface is English and runs left to right
    And the Word card at 1:1:1 shows its English Word meaning, marked "en" and running "ltr"
    And I save a screenshot "AC-1-surah-1-en-after-switch-light-desktop"

  @AC-4-1
  Scenario: Switching Language on /en/1 goes back to /ur/1, where the Word meanings turn Urdu and the interface stays English
    Given I open "/en/1"
    When I switch Language to Urdu
    Then I am on "/ur/1" with nothing added to the URL
    And the interface is English and runs left to right
    And the Word card at 1:1:1 shows its Urdu Word meaning, marked "ur" and running "rtl"

  @AC-4-1
  Scenario: Switching Language with the Ayah translation on changes the Ayah translation to the other Language
    Given I open "/ur/1"
    When I turn the Ayah translation switch on
    Then the Urdu Ayah translation of 1:1 is shown
    When I switch Language to English
    Then I am on "/en/1" with nothing added to the URL
    And the Ayah translation switch is on
    And the English Ayah translation of 1:1 is shown
    And the Urdu Ayah translation of 1:1 is not shown
    And the interface is English and runs left to right

  @AC-4-1
  Scenario Outline: Switching Language on <from> stays on the same Surah
    Given I open "<from>"
    When I switch Language to <language>
    Then I am on "<to>" with nothing added to the URL
    And the interface is English and runs left to right
    And the Word card at <first word> shows its <language> Word meaning

    Examples:
      | from    | language | to      | first word |
      | /ur/2   | English  | /en/2   | 2:1:1      |
      | /en/2   | Urdu     | /ur/2   | 2:1:1      |
      | /ur/114 | English  | /en/114 | 114:1:1    |
      | /en/114 | Urdu     | /ur/114 | 114:1:1    |

  Scenario Outline: Switching Language on a shared Ayah link <from> stays on that Ayah
    Given I open "<from>"
    Then Ayah <ayah> is at the top of the screen
    When I switch Language to <language>
    Then I am on "<to>"
    And Ayah <ayah> is at the top of the screen

    Examples:
      | from         | language | to           | ayah  |
      | /en/2#2:255  | Urdu     | /ur/2#2:255  | 2:255 |
      | /ur/18#18:45 | English  | /en/18#18:45 | 18:45 |

  Scenario: Switching Language on a Word location link stays on that Word, not the Reading place
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/18#18:10:3"
    When I switch Language to English
    Then I am on "/en/18#18:10:3"
    And the Word card at 18:10:3 is in the viewport
    When I open "/en"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/en/18"

  @AC-4-1
  Scenario Outline: Switching Language on Me from <from>, Read goes to the <to> index
    Given I open Me in <from>
    When I choose <language> on Me's Language switch
    Then I am on Me in <language>
    When I follow the destination "Read"
    Then I am on "<to>" with nothing added to the URL
    And the interface is English and runs left to right

    Examples:
      | from    | language | to  |
      | Urdu    | English  | /en |
      | English | Urdu     | /ur |

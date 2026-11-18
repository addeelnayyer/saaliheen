@reading-place
Feature: Reading place
  Each Surah the browser has read has one Reading place: the Ayah at the top of
  the screen when the Surah opens and whenever scrolling stops. It is shared
  across Languages. The Surah index offers to continue from it, and opening its
  Surah scrolls there. A page opened at a Word location (`#s:a:w`) is a
  look-up: it scrolls to that Word and leaves the Reading place where it was.
  The browser keeps ten of them, newest first (reading-places.feature, #69).

  Background:
    Given a browser with no saved reader settings

  Scenario: A browser that has read nothing is not offered to continue
    Given I open "/ur"
    Then the Surah index offers no Continue reading

  Scenario: Scrolling moves the Reading place, and Continue reading brings the reader back to it
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"
    And I save a screenshot "reading-place-continue-reading-light-desktop"
    When I follow Continue reading
    Then I am on "/ur/18" with nothing added to the URL
    And Ayah 18:45 is at the top of the screen

  Scenario: Opening the Reading place's Surah scrolls to it
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur"
    And I open "/ur/18"
    Then Ayah 18:45 is at the top of the screen

  Scenario: The Reading place is shared across Languages
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/en/18"
    When I open "/en/18"
    Then Ayah 18:45 is at the top of the screen

  Scenario: Opening a short Surah is reading it, without scrolling
    Given I open "/en/112"
    And I open "/en"
    Then the Surah index offers Continue reading only at "112. Al-Ikhlas · Ayah 1", linking to "/en/112"

  Scenario: A Word location link is a look-up that leaves the Reading place where it was
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/2#2:30:1"
    Then the Word card at 2:30:1 is in the viewport
    When I scroll until Ayah 2:40 is at the top of the screen
    And I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

  Scenario: A Word location link in the Reading place's Surah wins over the Reading place
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/18#18:10:3"
    Then the Word card at 18:10:3 is in the viewport
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

  Scenario: Reloading a Surah page keeps the reader at the Reading place
    Given I open "/ur/2"
    When I scroll until Ayah 2:200 is at the top of the screen
    And I reload the page
    Then Ayah 2:200 is at the top of the screen

  Scenario: Leaving by the bar's Saaliheen link straight after scrolling keeps where the scrolling stopped
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I follow the Saaliheen link in the bar
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

  Scenario: Switching Language on a Surah page stays at the Reading place
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I switch Language to English
    Then I am on "/en/18" with nothing added to the URL
    And Ayah 18:45 is at the top of the screen

@AC-2-15
Feature: Linking to a Word location
  A `#s:a:w` fragment scrolls the Surah page to the Word card at that Word
  location and highlights it with the accent border; its neighbour is not.

  @AC-2-14
  Scenario Outline: Opening <address> scrolls to the Word card at <target> and highlights it
    Given I open "<address>"
    Then the Word card at <target> is in the viewport
    And the Word card at <target> has the accent colour as its border
    And the Word card at <neighbour> does not have the accent colour as its border

    Examples:
      | address       | target  | neighbour |
      | /ur/2#2:255:3 | 2:255:3 | 2:255:2   |
      | /en/1#1:5:2   | 1:5:2   | 1:5:1     |

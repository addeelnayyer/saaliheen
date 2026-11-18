@AC-4-9
Feature: Theme toggle
  The theme toggle chooses Light or Dark over the system setting. The choice
  is kept in the browser, never in the URL, and follows the reader to the
  other Language. The page is drawn on the design's paper for the theme:
  #FFFFFF light, #111412 dark.

  Background:
    Given a browser with no saved reader settings

  @AC-4-7
  Scenario Outline: On /<lang>/1 Dark overrides a light system setting, survives a reload and follows to /<other>/1
    Given my system prefers a light colour scheme
    And I open "/<lang>/1"
    Then the page is drawn on the light paper
    When I choose the Dark theme
    Then the Dark theme is selected
    And the page's root element carries data-theme "dark"
    And the page is drawn on the dark paper
    And I am on "/<lang>/1" with nothing added to the URL
    And I save a screenshot "AC-7-surah-1-<lang>-dark-desktop"
    When I reload the page
    Then the Dark theme is selected
    And the page is drawn on the dark paper
    When I open "/<other>/1"
    Then the Dark theme is selected
    And the page is drawn on the dark paper
    When I view the page on a 390×844 phone
    Then I save a screenshot "AC-7-surah-1-<other>-dark-phone"

    Examples:
      | lang | other |
      | ur   | en    |
      | en   | ur    |

  @AC-4-7
  Scenario Outline: On /<lang>/1 Light overrides a dark system setting and survives a reload
    Given my system prefers a dark colour scheme
    And I open "/<lang>/1"
    Then the page is drawn on the dark paper
    When I choose the Light theme
    Then the Light theme is selected
    And the page's root element carries data-theme "light"
    And the page is drawn on the light paper
    When I reload the page
    Then the Light theme is selected
    And the page is drawn on the light paper

    Examples:
      | lang |
      | ur   |
      | en   |

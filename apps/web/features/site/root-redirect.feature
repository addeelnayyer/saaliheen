@AC-3-8
Feature: The site's root address opens the Urdu Surah index
  `/` is not a page of its own: it redirects to `/ur`, the Surah index in Urdu.

  @AC-3-1
  Scenario: / answers with a redirect to /ur
    Then "/" answers with a redirect to "/ur"

  @AC-3-1
  Scenario: Opening / lands on the Surah index in Urdu
    Given I open "/"
    Then I am on the Surah index in Urdu
    And the interface is English and runs left to right
    And the index cards are all 114 Surahs in order

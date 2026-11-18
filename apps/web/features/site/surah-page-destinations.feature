@issue-192
Feature: The Surah page with Read, Explore and Me
  A Surah page has one Prev/Next, at the foot of the Surah, naming the
  neighbouring Surahs; the Surah bar no longer carries an Index link or arrow
  links of its own. On a phone the tab bar gets out of the way while reading
  down and comes back on scrolling up, at the same moment the Surah bar shows
  its full form (CONTEXT.md: Surah bar), and it stays away while the
  Recitation bar is on screen. With reduced motion it leaves and returns
  without sliding. Names come from the Surah metadata; the Surah audio is
  stubbed as in "The Recitation bar".

  # ---------------------------------------------------------------- AC-6: one Prev/Next

  @AC-6
  Scenario Outline: Surah 2 in <Language> has one Prev/Next, after its last Ayah, naming Surahs 1 and 3
    Given I open Surah 2 in <Language>
    Then the page has exactly one link to Surah 1 in <Language> and one to Surah 3, both after the last Ayah of Surah 2
    And the link to Surah 1 names it by its Latin name from the Surah metadata, and the link to Surah 3 likewise
    And the page has no Index link
    When I follow the next Surah link at the foot of the Surah
    Then I am on Surah 3 in <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-6: the tab bar while reading

  @AC-6 @AC-12
  Scenario: On a phone the tab bar hides while reading down and returns on scrolling up, with the Surah bar's full form
    Given the browser is a phone
    And I open Surah 2 in English
    Then the tab bar is on screen
    And the Surah bar is in its full form
    When I scroll down by 3000 pixels
    Then the Surah bar is in its mini form
    And the tab bar is not on screen
    When I scroll down by 200 pixels
    Then the tab bar is not on screen
    When I scroll up by 200 pixels
    Then the Surah bar is in its full form
    And the tab bar is on screen

  @AC-6 @AC-12
  Scenario: The tab bar never shows with the Recitation bar, and returns once it has gone
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And the browser is a phone
    And I open Surah 2 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    Then the Recitation bar is on screen, offering to pause
    And the tab bar is not on screen
    When I scroll down by 3000 pixels
    And I scroll up by 200 pixels
    Then the Surah bar is in its full form
    And the tab bar is not on screen
    When I press the Recitation bar's stop button
    Then the Recitation bar is not on screen
    And the tab bar is on screen

  @AC-6 @AC-11
  Scenario: With reduced motion the tab bar leaves and returns without sliding
    Given my system prefers reduced motion
    And the browser is a phone
    And I open Surah 2 in English
    When I scroll down by 3000 pixels
    Then the tab bar is already off screen, with no slide
    When I scroll up by 200 pixels
    Then the tab bar is already wholly on screen, with no slide

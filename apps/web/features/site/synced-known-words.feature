@issue-252
Feature: Known words follow an Account between browsers
  A signed-in reader's Known words (CONTEXT.md) follow them to every browser
  and phone signed in to the same Account, as Reading places do. The Account
  keeps them through the versioned API's Known words resource
  (/api/v1/known-words). For each Root or particle the newer mark or unmark
  wins, by when it was made on the device that made it, and a tie goes to the
  unmark (ADR 0057). On first sign-in, the browser's Known words merge with the
  Account's by that rule. Signing out leaves the browser's Known words.

  "Two browsers" are two separate browser contexts, as a phone and a computer
  are, each signed in to the Account through the Account test-only sign-in,
  each starting with no saved reader settings. "Turning to" a browser waits for
  the other's saves to the API to finish, as a person picking up their other
  device does. A mark the Account holds "this many minutes ago" was made that
  long before the step; the browser's own marks are made as the steps run.

  @AC-5 @AC-6
  Scenario: First sign-in merges the browser's Known words with the Account's, the newer kept for each Root
    Given a browser with no saved reader settings
    And I open the Known words page in English
    And I switch Memorized? for "ر ح م" on the Known words page
    And I switch Memorized? for "ع ل م" on the Known words page
    And the Account "known-first-sign-in@saaliheen.test" has these Known Roots, marked this many minutes ago:
      | root  | known | minutes ago |
      | ر ح م | false | 60          |
      | ك ت ب | true  | 30          |
      | ع ل م | false | 0           |
    When I sign in to the Account as "known-first-sign-in@saaliheen.test" on the English test sign-in page
    And I open the Known words page in English
    Then Memorized? for "ر ح م" on the Known words page is on
    And Memorized? for "ك ت ب" on the Known words page is on
    And Memorized? for "ع ل م" on the Known words page is off
    And the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    And the Account "known-first-sign-in@saaliheen.test" has these Known Roots, as the API answers:
      | root  | known |
      | ر ح م | true  |
      | ك ت ب | true  |
      | ع ل م | false |
    When I reload the page
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    And I save a screenshot "AC-5-merged-known-words-light-desktop"

  @AC-5
  Scenario: A mark in one signed-in browser shows in the other, and so does its unmark
    Given two browsers with no saved reader settings, both signed in to an Account as "known-sync@saaliheen.test"
    When I turn to the first browser
    And I open the Known words page in English
    And I switch Memorized? for "ر ح م" on the Known words page
    And I turn to the second browser
    And I open the Known words page in English
    Then Memorized? for "ر ح م" on the Known words page is on
    When I switch Memorized? for "ر ح م" on the Known words page
    And I turn to the first browser
    And I open the Known words page in English
    Then Memorized? for "ر ح م" on the Known words page is off
    And the Known words page's head reads "0 of 1,642 Roots · 0 of 352 particles"

  @AC-5
  Scenario: Signing out leaves the browser's Known words, and no longer brings them to the Account
    Given a browser with no saved reader settings
    And I sign in to the Account as "known-sign-out@saaliheen.test" on the English test sign-in page
    And I open the Known words page in English
    And I switch Memorized? for "ر ح م" on the Known words page
    When I sign out on the Sign-in page in English
    And I open the Known words page in English
    Then Memorized? for "ر ح م" on the Known words page is on
    When I switch Memorized? for "ك ت ب" on the Known words page
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    And the Account "known-sign-out@saaliheen.test" has these Known Roots, as the API answers:
      | root  | known |
      | ر ح م | true  |

  @AC-5
  Scenario: A browser that is not signed in keeps its Known words to itself
    Given the Account "known-signed-out@saaliheen.test" has these Known Roots, marked this many minutes ago:
      | root  | known | minutes ago |
      | ك ت ب | true  | 30          |
    And a browser with no saved reader settings
    And I open the Known words page in English
    When I switch Memorized? for "ر ح م" on the Known words page
    And I reload the page
    Then Memorized? for "ر ح م" on the Known words page is on
    And Memorized? for "ك ت ب" on the Known words page is off
    And the Account "known-signed-out@saaliheen.test" has these Known Roots, as the API answers:
      | root  | known |
      | ك ت ب | true  |

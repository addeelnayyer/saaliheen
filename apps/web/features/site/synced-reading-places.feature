@issue-71
Feature: Reading places follow an Account between browsers
  A signed-in reader's Reading places follow them to every browser and phone
  signed in to the same Account. The Account keeps them through the versioned
  API's Reading places resource (/api/v1/reading-places). For each Surah the
  Reading place read most recently wins, by when it was read on the device that
  read it, not when it reached the Account, so a browser that read offline
  syncs in the right order. On first sign-in, the browser's Reading places
  merge with the Account's, keeping the newer Reading place for each Surah;
  of those, the ten newest stay.

  "Two browsers" are two separate browser contexts, as a phone and a computer
  are, each signed in to the Account through the Account test-only sign-in,
  each starting with no saved reader settings. They sign in on the English
  test sign-in page, so the Account's Language is English (#70) and they read
  in English. "Turning to" a browser waits for the other's saves to the API
  to finish, as a person picking up their other device does. A browser "offline" has lost its network, as a phone on a
  train does; the page it has open keeps working.

  @AC-1 @AC-5
  Scenario: Reading in one signed-in browser shows in the other's Reading places, and can be continued there
    Given two browsers with no saved reader settings, both signed in to an Account as "places-sync@saaliheen.test"
    When I turn to the first browser
    And I open "/en/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    And I turn to the second browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 40 | /en/18 |
    When I follow Continue reading at "18. Al-Kahf · Ayah 40"
    Then I am on "/en/18" with nothing added to the URL
    And Ayah 18:40 is at the top of the screen
    When I open "/en/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I turn to the first browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 18. Al-Kahf · Ayah 40    | /en/18 |
    When I reload the page
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 18. Al-Kahf · Ayah 40    | /en/18 |

  @AC-1 @AC-5
  Scenario: Reading further in a Surah in one signed-in browser moves its Reading place in the other
    Given two browsers with no saved reader settings, both signed in to an Account as "places-move@saaliheen.test"
    When I turn to the first browser
    And I open "/en/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open "/en/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I turn to the second browser
    And I open "/en"
    And I follow Continue reading at "18. Al-Kahf · Ayah 40"
    Then Ayah 18:40 is at the top of the screen
    When I scroll until Ayah 18:60 is at the top of the screen
    And I turn to the first browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 60    | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |

  @AC-2 @AC-5
  Scenario: A Reading place read offline, earlier, and synced later does not replace the newer one another browser read
    Given two browsers with no saved reader settings, both signed in to an Account as "places-offline@saaliheen.test"
    When I turn to the second browser
    And I open "/en/18"
    And I take this browser offline
    And I scroll until Ayah 18:40 is at the top of the screen
    And I turn to the first browser
    And I open "/en/18"
    And I scroll until Ayah 18:60 is at the top of the screen
    And I turn to the second browser
    And I bring this browser back online
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 60 | /en/18 |
    When I follow Continue reading at "18. Al-Kahf · Ayah 60"
    Then Ayah 18:60 is at the top of the screen
    When I turn to the first browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 60 | /en/18 |
    And the Account "places-offline@saaliheen.test" has these Reading places, newest first, as the API answers:
      | place |
      | 18:60 |

  @AC-2 @AC-5
  Scenario: A Reading place read offline in another Surah joins the Account's when the browser is back online
    Given two browsers with no saved reader settings, both signed in to an Account as "places-offline-join@saaliheen.test"
    When I turn to the second browser
    And I open "/en/19"
    And I open "/en/2"
    And I take this browser offline
    And I scroll until Ayah 2:255 is at the top of the screen
    And I turn to the first browser
    And I open "/en/18"
    And I scroll until Ayah 18:60 is at the top of the screen
    And I turn to the second browser
    And I bring this browser back online
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 60    | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 19. Maryam · Ayah 1      | /en/19 |
    When I turn to the first browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 60    | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 19. Maryam · Ayah 1      | /en/19 |

  @AC-3 @AC-5
  Scenario: First sign-in merges the browser's Reading places with the Account's, the newer kept for each Surah, then the ten newest
    Given a browser with no saved reader settings
    And I open "/ur/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open "/ur/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/ur/19"
    And the Account "places-first-sign-in@saaliheen.test" has these Reading places, read this many minutes ago:
      | place | minutes ago |
      | 18:60 | 0           |
      | 2:200 | 5           |
      | 105:1 | 10          |
      | 106:1 | 20          |
      | 107:1 | 30          |
      | 108:1 | 40          |
      | 109:1 | 50          |
      | 110:1 | 60          |
      | 111:1 | 70          |
      | 112:1 | 80          |
    When I sign in to the Account as "places-first-sign-in@saaliheen.test" on the Urdu test sign-in page
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link    |
      | 18. Al-Kahf · Ayah 60    | /ur/18  |
      | 19. Maryam · Ayah 1      | /ur/19  |
      | 2. Al-Baqarah · Ayah 255 | /ur/2   |
      | 105. Al-Fil · Ayah 1     | /ur/105 |
      | 106. Quraysh · Ayah 1    | /ur/106 |
      | 107. Al-Ma'un · Ayah 1   | /ur/107 |
      | 108. Al-Kawthar · Ayah 1 | /ur/108 |
      | 109. Al-Kafirun · Ayah 1 | /ur/109 |
      | 110. An-Nasr · Ayah 1    | /ur/110 |
      | 111. Al-Masad · Ayah 1   | /ur/111 |
    And the Account "places-first-sign-in@saaliheen.test" has these Reading places, newest first, as the API answers:
      | place |
      | 18:60 |
      | 19:1  |
      | 2:255 |
      | 105:1 |
      | 106:1 |
      | 107:1 |
      | 108:1 |
      | 109:1 |
      | 110:1 |
      | 111:1 |
    When I reload the page
    Then the Surah index lists these Reading places, newest first:
      | place                    | link    |
      | 18. Al-Kahf · Ayah 60    | /ur/18  |
      | 19. Maryam · Ayah 1      | /ur/19  |
      | 2. Al-Baqarah · Ayah 255 | /ur/2   |
      | 105. Al-Fil · Ayah 1     | /ur/105 |
      | 106. Quraysh · Ayah 1    | /ur/106 |
      | 107. Al-Ma'un · Ayah 1   | /ur/107 |
      | 108. Al-Kawthar · Ayah 1 | /ur/108 |
      | 109. Al-Kafirun · Ayah 1 | /ur/109 |
      | 110. An-Nasr · Ayah 1    | /ur/110 |
      | 111. Al-Masad · Ayah 1   | /ur/111 |
    When I open "/ur/18"
    Then Ayah 18:60 is at the top of the screen
    And I save a screenshot "AC-3-merged-reading-places-light-desktop"

  @AC-3 @AC-5
  Scenario: After first sign-in, the merged Reading places follow the Account to another browser
    Given a browser with no saved reader settings
    And I open "/en/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    And the Account "places-merge-follow@saaliheen.test" has these Reading places, read this many minutes ago:
      | place | minutes ago |
      | 2:255 | 30          |
      | 18:10 | 60          |
    When I sign in to the Account as "places-merge-follow@saaliheen.test" on the English test sign-in page
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 40    | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
    When a second browser with no saved reader settings signs in to the Account as "places-merge-follow@saaliheen.test"
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 40    | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
    Given my system prefers a dark colour scheme
    When I view the page on a 390×844 phone
    And I reload the page
    Then I save a screenshot "AC-3-merged-reading-places-dark-phone"

  @AC-5
  Scenario: A browser that is not signed in keeps its Reading places to itself
    Given the Account "places-signed-out@saaliheen.test" has these Reading places, read this many minutes ago:
      | place | minutes ago |
      | 2:255 | 30          |
    And a browser with no saved reader settings
    And I open "/ur/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 40 | /ur/18 |
    And the Account "places-signed-out@saaliheen.test" has these Reading places, newest first, as the API answers:
      | place |
      | 2:255 |

@issue-111
Feature: Listening moves the Reading place
  Listening counts as reading. As the Recitation plays, the Surah's Reading
  place moves to the Ayah being recited, as it moves while reading, so a reader
  who listens on finds their place there, and the Surah comes to the top of the
  Reading places. Signed in, the moved Reading place follows the Account to
  other devices like any other. Following a link to a Word location is still a
  look-up that leaves the Reading place where it was.

  The Surah's audio is the Recitation's stub (recitation.feature): silence as
  long as the Surah's Recitation, or its first minutes, played on the
  browser's clock; "the Recitation reaches" a time when the audio is moved
  there, as a reader dragging a player's slider would. Times and Words are
  read from the committed Recitation source, never typed. "The Recited Word is
  in Ayah" waits until the Word card marked as the Recited Word is one of that
  Ayah's. The page follows the Recited Word (#109), so reading again in an
  Ayah the Recitation has left means scrolling back to it. Two signed-in browsers are the synced Reading places' (#71); the
  Recitation plays in the first of them.

  @AC-1 @AC-5
  Scenario: Al-Kahf playing on from its first Ayah into its second moves its Reading place to 18:2
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open "/en/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/en/18"
    When I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:1
    And the Recited Word is in Ayah 18:2
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 2     | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
    When I follow Continue reading at "18. Al-Kahf · Ayah 2"
    Then I am on "/en/18" with nothing added to the URL
    And Ayah 18:2 is at the top of the screen

  @AC-1 @AC-5
  Scenario: In Urdu, listening from Ayah 18:10 on to Ayah 18:17 moves the Reading place to 18:17, where Al-Kahf opens again
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open "/ur/18"
    When I scroll until Ayah 18:10 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:10
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 17", linking to "/ur/18"
    When I open "/ur/18"
    Then Ayah 18:17 is at the top of the screen

  @AC-1 @AC-5
  Scenario: After listening moved the Reading place on to 18:17, reading again in Ayah 18:10, where the Recitation started, moves it back there
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open "/en/18"
    When I scroll until Ayah 18:10 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:10
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I press the Recitation bar's pause button
    And I scroll until Ayah 18:10 is at the top of the screen
    When I open "/en"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 10", linking to "/en/18"

  @AC-2 @AC-5
  Scenario: Listening in Al-Kahf after reading Al-Baqarah in another tab brings Al-Kahf back to the top of the Reading places
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open "/en/18"
    When I open "/en/2" in a new tab
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 18. Al-Kahf · Ayah 1     | /en/18 |
    When I turn back to the first tab
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:1
    And the Recited Word is in Ayah 18:2
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 2     | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |

  @AC-3 @AC-5
  Scenario: Signed in, the Reading place listening moved in one browser is the one the other browser continues from
    Given two browsers with no saved reader settings, both signed in to an Account as "places-listen@saaliheen.test"
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    When I turn to the first browser
    And I open "/en/18"
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:1
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I press the Recitation bar's pause button
    And I turn to the second browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 17 | /en/18 |
    And the Account "places-listen@saaliheen.test" has these Reading places, newest first, as the API answers:
      | place |
      | 18:17 |
    When I follow Continue reading at "18. Al-Kahf · Ayah 17"
    Then I am on "/en/18" with nothing added to the URL
    And Ayah 18:17 is at the top of the screen

  @AC-4 @AC-5
  Scenario: After listening moved the Reading place to 18:17, following links to Word locations leaves it there
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open "/en/18"
    When I scroll until Ayah 18:10 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:10
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I open "/en/18#18:40:1"
    Then the Word card at 18:40:1 is in the viewport
    When I open "/en/2#2:30:1"
    Then the Word card at 2:30:1 is in the viewport
    When I open "/en"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 17", linking to "/en/18"

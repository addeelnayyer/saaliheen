@issue-109
Feature: Starting the Recitation from any Ayah and any Word
  A reader starts the Recitation (ADR 0010) from any Ayah, not only the one at
  the top of the screen: beside each Ayah's number, in its heading, a button
  listens from that Ayah. While the Recitation plays, tapping a Word card
  carries it on from that Word, where the Reciter first says it; tapping the
  card's Root tag still opens the Root dialog instead. The Root dialog and the
  Settings drawer leave the Recitation playing; leaving the Surah page stops it.

  The audio is stubbed as silence and the times are read from the committed
  Recitation source, as in recitation.feature, whose steps these reuse.

  Background:
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes

  @AC-1
  Scenario: Every Ayah of Al-Kawthar offers to listen from it, at its number
    Given I open Surah 108 in English
    Then every Ayah of Surah 108 offers to listen from it in its heading, beside its number

  @AC-1
  Scenario Outline: In <Language>, listening from Ayah 2:9 starts the Recitation there, though Ayah 2:6 is at the top of the screen
    Given I open Surah 2 in <Language>
    When I scroll until Ayah 2:6 is at the top of the screen
    And I press listen from Ayah 2:9
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays from the start of Ayah 2:9
    And the first Recited Word is the first Word the Reciter says in Ayah 2:9

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-1
  Scenario: While the Recitation plays, listening from a later Ayah moves it there
    Given I open Surah 108 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I press listen from Ayah 108:3
    Then the Recitation plays from the start of Ayah 108:3
    And the Recited Word moves to the first Word the Reciter says in Ayah 108:3

  @AC-2
  Scenario Outline: While the Recitation plays in <Ayah>, tapping the Word card at <Location> carries it on from that Word
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And the Recitation reaches the start of <Ayah>'s timing 1
    And I tap the Word card at <Location>, away from its Root tag
    Then the Recitation plays on from where the Reciter first says the Word at <Location>
    And the Recited Word is the Word at <Location>
    And no Root dialog is open

    Examples:
      | Ayah | Location |
      | 1:1  | 1:5:2    |
      | 1:7  | 1:2:1    |

  @AC-2
  Scenario: Tapping a Word card before the Recitation's Word timings have arrived carries it on from that Word once they do
    Given the Recitation's Word timings are held back on their way to the page
    And I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I tap the Word card at 1:5:2, away from its Root tag
    And the Recitation's Word timings arrive
    Then the Recitation plays on from where the Reciter first says the Word at 1:5:2
    And the Recited Word is the Word at 1:5:2
    And no Root dialog is open

  @AC-2 @AC-5
  Scenario: While the Recitation plays, tapping a Root tag opens the Root dialog and the Recitation plays on where it was
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I open the Root tag on the Word card at 1:6:1
    Then the Root dialog for the Root QUL gives 1:6:1 is open
    And the Recitation is playing
    And the Recitation has not moved on to Ayah 1:6
    When I close the Root dialog with Escape
    Then the Recitation is playing

  @AC-5
  Scenario: Opening the Settings drawer leaves the Recitation playing
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I open the Settings drawer
    Then the Settings drawer is open
    And the Recitation is playing

  @AC-5
  Scenario Outline: Leaving the Surah page by <Way> stops the Recitation
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I follow <Way>
    Then <Arrival>
    And the Recitation has stopped
    And the Recitation bar is not on screen

    Examples:
      | Way                                          | Arrival                            |
      | the next Surah link at the foot of the Surah | I am on Surah 2 in English         |
      | the destination "Read"                       | I am on the Surah index in English |

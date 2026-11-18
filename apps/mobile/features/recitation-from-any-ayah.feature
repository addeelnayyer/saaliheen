@issue-114
Feature: Starting the Recitation from any Ayah and any Word in the app
  The mobile counterpart of the website's (#109): beside each Ayah's number a
  reader can listen from that Ayah, not only from the one at the top of the
  screen, whether the Recitation is off or already playing. While the
  Recitation plays, tapping a Word card carries it on from that Word, where the
  Reciter first says it; tapping the card's Root tag still opens the Root
  dialog instead (checked by hand on the simulators, as the screens are).

  The device's audio is the fake of "Listening to a Surah" (recitation.feature):
  it plays nothing, records the file the app loads and where the app moves it;
  "the Recitation reaches" a time when the scenario moves it there. Times and
  Word numbers are read from the committed Recitation files
  (apps/web/data/generated/recitations/ as committed at 5298a72), never typed.

  @AC-1
  Scenario: With no Recitation on, each Ayah of Al-Kawthar starts the Recitation from it
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    Then listening from each Ayah of Surah 108 in turn, with no Recitation on, plays the Surah's audio from the start of that Ayah, with the Recitation bar offering to pause

  @AC-1
  Scenario Outline: In the <Script> Script and <Language>, listening from Ayah 2:9 starts the Recitation there, though Ayah 2:6 is at the top of the screen
    Given the app is launched on a new device
    And I open Surah 2 in the <Script> Script and <Language>
    And the screen is laid out with Ayah 2:6 at the top of the screen
    When I listen from Ayah 2:9
    Then the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:9
    And the Recitation bar is on screen, offering to pause
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 2:9
    Then the Recited Word is that Word, and its Word card shows its <Script> text and its <Language> Word meaning

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Indo-Pak | English  |

  @AC-1
  Scenario: While the Recitation plays, listening from another Ayah moves it there, later or earlier
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I press the play control with Ayah 108:1 at the top of the screen
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1
    And I listen from Ayah 108:3
    Then the audio is playing on from the start of Ayah 108:3, the Surah's audio loaded only once
    And no Word card is marked until the Reciter says Ayah 108:3's first Word
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3
    Then the Recited Word is that Word, and Ayah 108:3 is marked faintly
    When I listen from Ayah 108:2
    Then the audio is playing on from the start of Ayah 108:2, the Surah's audio loaded only once
    And no Word card is marked until the Reciter says Ayah 108:2's first Word
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2
    Then the Recited Word is that Word, and Ayah 108:2 is marked faintly

  @AC-2
  Scenario Outline: While the Recitation plays in Ayah <Ayah>, tapping the Word card at <Location> carries it on from that Word
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of 1:<Ayah>'s timing 1
    And I tap the Word card at <Location>
    Then the audio is playing on from where the Reciter first says the Word at <Location>
    And the Recited Word is the Word at <Location>, and its Ayah is marked faintly

    Examples:
      | Ayah | Location |
      | 1    | 1:5:2    |
      | 7    | 1:2:1    |

  @AC-2
  Scenario: Tapping a Word the Reciter says twice carries the Recitation on from where he first says it
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    When I press the play control with Ayah 2:9 at the top of the screen
    And the Recitation reaches the start of 2:9's timing 11
    And I tap the Word card of 2:9's timing 10, which the Reciter says twice in the Ayah
    Then the audio is playing on from the first of that Word's two timings, not the second
    And the Recited Word is that Word, and Ayah 2:9 is marked faintly

  @AC-2
  Scenario: Tapping 21:87:9, a Word with no timing, leaves the Recitation where it was
    Given the app is launched on a new device
    And I open Surah 21 in the Indo-Pak Script and Urdu
    When I press the play control with Ayah 21:87 at the top of the screen
    And the Recitation reaches the start of 21:87:8's timing
    And I tap the Word card at 21:87:9
    Then the audio is still playing at the start of 21:87:8's timing
    And the Recited Word is still 21:87:8

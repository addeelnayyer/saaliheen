@issue-114
Feature: The Recitation bar in the app
  The mobile counterpart of the website's (#110): while a Recitation is on,
  the Recitation bar gives a listener the previous and next Ayah, a way to
  stop, the Recitation speed, kept on the device, and word of it when the
  audio is loading or cannot play right now, with a way to try again.
  Reading carries on either way (CONTEXT.md: Recitation bar, Recitation speed;
  ADR 0010).

  The device's audio is the fake of "Listening to a Surah" (recitation.feature).
  Here it can also wait for more of its file, as on a slow network, or fail to
  load, as when the phone is offline; the app's origin can answer the
  Recitation file with a server error. Times and Word numbers are read from the
  committed Recitation files, never typed.

  @AC-4
  Scenario: Next and previous Ayah move Al-Fatihah's Recitation to the start of that Ayah
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And I press the Recitation bar's next Ayah button
    Then the audio is playing on from the start of Ayah 1:2
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2
    Then the Recited Word is that Word, and Ayah 1:2 is marked faintly
    When the Recitation reaches the start of 1:4's timing 2
    And I press the Recitation bar's previous Ayah button
    Then the audio is playing on from the start of Ayah 1:3
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 1:3
    Then the Recited Word is that Word, and Ayah 1:3 is marked faintly
    When I press the Recitation bar's next Ayah button again
    Then the audio is playing on from the start of Ayah 1:4

  @AC-4
  Scenario: Al-Kawthar's first Ayah has no previous Ayah, and its last no next Ayah
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I press the play control with Ayah 108:1 at the top of the screen
    Then the Recitation bar's previous Ayah button is disabled, and its next Ayah button is not
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3
    Then the Recitation bar's next Ayah button is disabled, and its previous Ayah button is not

  @AC-4
  Scenario: Stop ends the Recitation and takes away the Recitation bar and the marks
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2
    Then a Word card and its Ayah are marked
    When I press the Recitation bar's stop button
    Then the Recitation bar is not on screen, and the play control is
    And no Word card and no Ayah is marked
    And the audio is not playing

  @AC-4
  Scenario: The Recitation speed offers a few fixed steps around normal, starting at normal on a new device
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    Then the Recitation bar's Recitation speed offers, in order:
      | Recitation speed |
      | 0.75×            |
      | 1×               |
      | 1.25×            |
    And the Recitation speed is 1×, and the audio plays at 1×
    When I choose the Recitation speed 1.25×
    Then the Recitation speed is 1.25×, and the audio plays at 1.25×
    When I choose the Recitation speed 0.75×
    Then the Recitation speed is 0.75×, and the audio plays at 0.75×

  @AC-4
  Scenario Outline: The Recitation speed <Speed> is kept on this device, and only on it
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And I choose the Recitation speed <Speed>
    And the app is closed and launched again on the same device, and I open Surah 1 in it
    And I press the play control again with Ayah 1:1 at the top of the screen
    Then the Recitation speed is <Speed>, and the audio plays at <Speed>
    When I open Surah 2 in the Indo-Pak Script and Urdu
    And I press the play control with Ayah 2:1 at the top of the screen
    Then on Surah 2 too the Recitation speed is <Speed>, and the audio plays at <Speed>
    When the app is launched on another, new device, and I open Surah 1 in it
    And I press the play control on that device with Ayah 1:1 at the top of the screen
    Then on that device the Recitation speed is 1×, and the audio plays at 1×

    Examples:
      | Speed |
      | 0.75× |
      | 1.25× |

  @AC-5
  Scenario: While the audio waits for more of its file, the Recitation bar says it is loading and the mark holds on the last Word
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of 1:6's timing 2
    And the audio waits for the rest of the Surah's audio to arrive
    Then the Recitation bar says it is loading, still offering to pause
    And the Recited Word is still 1:6's timing 2's Word, and Ayah 1:6 is marked faintly
    When the rest of the Surah's audio arrives
    Then the Recitation bar no longer says it is loading
    When the Recitation reaches the start of 1:6's timing 3
    Then the Recited Word moves on to 1:6's timing 3's Word

  @AC-5
  Scenario Outline: When <Fails>, the Recitation bar says it is unavailable right now and offers to try again, and reading carries on
    Given the app is launched on a new device
    And <Fails>
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    Then the Recitation bar says the Recitation is unavailable right now, and offers to try again
    And the audio is not playing
    And no Word card and no Ayah is marked
    When I open the Root tag on the Word card at 1:2:1
    Then the Root dialog for the Root QUL gives 1:2:1 is open
    And Surah 1's screen still shows every one of its Word cards
    When the Recitation can be reached again
    And I press the Recitation bar's try again button
    Then the Recitation bar is on screen, offering to pause, and says nothing more
    And the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 1:1
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 1:1
    Then the Recited Word is that Word, and Ayah 1:1 is marked faintly

    Examples:
      | Fails                                                             |
      | the Surah's audio cannot be reached, as when the phone is offline |
      | the app's origin answers the Recitation file with a server error  |

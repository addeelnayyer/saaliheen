@issue-113
Feature: Listening with the app in the background
  A reader listening to a Recitation in the app (#112) locks the screen or
  switches to another app, and the Recitation keeps playing, as a phone
  listener expects. The lock screen and the notification show the Surah and
  the Ayah being recited, with play and pause. Coming back to the app shows
  the Recited Word where the Recitation is, and opening another Surah stops
  the Recitation (ADR 0010).

  The device's audio is #112's fake, which also plays the phone around it:
  whether the app lets its audio play on in the background, what the lock
  screen and the notification show and offer, the reader pressing play or
  pause there, the app leaving the screen and coming back, and a phone that
  delivers an app away from the screen none of its audio's updates. Like a
  phone, the fake stops the audio when the app leaves the screen unless the
  app lets it play in the background, and stops audio that has played three
  minutes in the background with nothing on the lock screen (Android's
  limit). Times and Word numbers are read from the committed Recitation
  files, the Surah's name from the Surah index; none is typed.

  @AC-1
  Scenario: The app's build lets its audio play in the background
    Given the app's config as app.json ships it
    Then app.json's plugins include expo-audio with background playback on, so iOS may play the app's audio in the background and Android in a media playback service

  @AC-1
  Scenario Outline: After <Leaving>, Al-Baqarah's Recitation plays on past three minutes
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    When I press the play control with Ayah 2:1 at the top of the screen
    And <Leaving>
    Then the audio is still playing
    When the Recitation reaches the start of the first Word the Reciter says in the first Ayah of Surah 2 starting more than three minutes after Ayah 2:1
    Then the audio is still playing, at the start of that Word
    And the Recited Word is that Word

    Examples:
      | Leaving                 |
      | I lock the screen       |
      | I switch to another app |

  @AC-2
  Scenario: The lock screen and the notification show Al-Kawthar's Ayah being recited, and their play and pause control the Recitation
    Given the app is launched on a new device
    And I open Surah 108 in the Indo-Pak Script and Urdu
    When I press the play control with Ayah 108:1 at the top of the screen
    And I lock the screen
    Then the lock screen and the notification show Surah 108's name as the Surah index gives it, Ayah 108:1 and the Reciter's name as its Recitation file gives it
    And they offer play and pause
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2
    Then the lock screen and the notification show Ayah 108:2 in place of Ayah 108:1
    When I press pause on the lock screen
    Then the audio is paused
    When I return to the app
    Then the Recitation bar is on screen, offering to play
    When I lock the screen again
    And I press play on the lock screen
    Then the audio is playing on from where it was paused
    When I return to the app again
    Then the Recitation bar is on screen, offering to pause

  @AC-3
  Scenario Outline: Back in the app after <Leaving>, the Recited Word is where the Recitation is
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I press the play control with Ayah 108:1 at the top of the screen
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1
    And <Leaving>
    And the phone delivers the app none of the audio's updates while it is away
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3
    When I return to the app
    Then the Recited Word is that Word, and its Word card shows its Uthmani text and its English Word meaning
    And Ayah 108:3 is marked faintly

    Examples:
      | Leaving                 |
      | I lock the screen       |
      | I switch to another app |

  @AC-4
  Scenario: Opening another Surah from a link stops the Recitation, though the Surah's screen stays open beneath it
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I press the play control with Ayah 108:1 at the top of the screen
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 108:2
    And I open Surah 1 from a link to one of its Words, with Surah 108's screen still open beneath it
    Then Surah 108's audio is not playing
    And Surah 108's Recitation bar is not on screen, and no Word card and no Ayah is marked
    And the lock screen and the notification show nothing of the app
    When I press the play control on Surah 1's screen with Ayah 1:1 at the top of the screen
    Then Surah 1's audio plays from the start of Ayah 1:1, and Surah 108's audio stays stopped

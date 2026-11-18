@issue-112
Feature: Listening to a Surah
  A reader listens to Yasser ad-Dussary's Recitation of a Surah in the app
  while reading it (ADR 0010), with no Account: the mobile counterpart of the
  website's (#115). The play control reads the Surah's Recitation file from
  /data/v1/recitations/<n>.json and plays the Surah's audio, from the address
  that file gives, from the Ayah at the top of the screen. A minimal
  Recitation bar, with play and pause, stays on screen while it is on. As the
  Reciter says each Word, its Word card is marked, the Recited Word, and its
  Ayah is marked faintly; when the Reciter goes back to repeat Words the mark
  goes back with him, and over a Word with no timing the previous Word stays
  marked. Only Word cards are ever marked, never the Bismillah, and the
  Recitation stops at the end of the Surah.

  The device's audio is a fake that plays nothing: it records the file the app
  loads and where the app moves it, and "the Recitation reaches" a time when
  the scenario moves the audio there, as playing it would. Times and Word
  numbers are read from the committed Recitation files
  (apps/web/data/generated/recitations/ as committed at 5298a72), never typed.

  @AC-1 @AC-2 @AC-3 @AC-5 @AC-6 @AC-9
  Scenario Outline: In the <Script> Script and <Language>, Al-Kawthar plays from its first Ayah to its end, with no Account
    Given the app is launched on a new device
    And every request the app makes is recorded
    And I open Surah 108 in the <Script> Script and <Language>
    When I press the play control with Ayah 108:1 at the top of the screen
    Then the app read Surah 108's Recitation from /data/v1/recitations/108.json
    And the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 108:1
    And the Recitation bar is on screen, offering to pause
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:1
    Then the Recited Word is that Word, and its Word card shows its <Script> text and its <Language> Word meaning
    And Ayah 108:1 is marked faintly
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 108:3, the last of the Surah
    Then the Recited Word moves on to that Word, whose Word card shows its <Script> text and its <Language> Word meaning
    When the Recitation plays to the end of the Surah's audio
    Then the Recitation stops at the end of the Surah
    And the Recitation bar is not on screen
    And no Word card and no Ayah is marked
    And every Word marked was a Word card on the screen, never the Bismillah
    And the app asked /api/v1 for nothing but Surah 108's Allah references and Tafsir, so no Account was needed
    And every request the app made went to its origin, under /data/v1/ or for /api/v1/allah-references/108 or /api/v1/tafsir/108; the Surah's audio was its only other address

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

  @AC-4
  Scenario: The Recited Word moves on through Al-Fatihah's first Ayah, and only its Word card and its Ayah are marked
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    Then as the Recitation reaches the start of each of 1:1's timings in turn, that timing's Word is the Recited Word and Ayah 1:1 is marked faintly
    When the Recitation reaches the pause after 1:1's last timing, before Ayah 1:2's first
    Then the Recited Word is still 1:1's last timed Word, and Ayah 1:1 is still marked faintly
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2
    Then the Recited Word is that Word, and Ayah 1:2 is marked faintly instead of Ayah 1:1

  @AC-3
  Scenario: The Recitation bar pauses the Recitation and plays it on
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of the first Word the Reciter says in Ayah 1:2
    And I press the Recitation bar's pause button
    Then the audio is paused, and the Recitation bar is on screen, offering to play
    And the Recited Word is still the first Word the Reciter says in Ayah 1:2
    When I press the Recitation bar's play button
    Then the audio is playing on from where it was paused, and the Recitation bar offers to pause

  @AC-2
  Scenario Outline: The play control plays from the Ayah a reader sees at the top of the screen, below the Surah bar
    Given the app is launched on a new device
    And I open Surah 2 in the Indo-Pak Script and Urdu
    And the screen is laid out so that <Case>: Ayah 2:<First>, <Height> px tall, ending <Ends> px below the Surah bar, and the Ayahs after it under it
    When I press the play control
    Then the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:<Top>

    Examples:
      | Case                                         | First | Height | Ends | Top |
      | Ayah 2:19 is wholly behind the Surah bar     | 19    | 90     | 0    | 20  |
      | only a sliver of Ayah 2:8 shows above 2:9    | 8     | 460    | 40   | 9   |
      | most of Ayah 2:19 shows below the Surah bar  | 19    | 300    | 200  | 19  |
      | Ayah 2:282, taller than the screen, fills it | 282   | 2800   | 2000 | 282 |

  @AC-2 @AC-7
  Scenario: Started from Ayah 2:9 at the top of the screen, the mark goes back as the Reciter repeats Words
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    When I press the play control with Ayah 2:9 at the top of the screen
    Then the audio playing is the Surah's audio at the address its Recitation file gives, from the start of Ayah 2:9
    And no Word card is marked from the start of Ayah 2:9 until the Reciter says its first Word, though 2:8's last Word was said before it
    When the Recitation reaches the start of the first Word the Reciter says in Ayah 2:9
    Then the Recited Word is that Word, and Ayah 2:9 is marked faintly
    When the Recitation reaches the start of 2:9's timing 9
    Then the Recited Word moves through 2:9's timings 9 to 11 in turn, going back to an earlier Word of the Ayah at timing 10

  @AC-8
  Scenario: Over 21:87:9, which has no timing, the previous Word stays marked
    Given the app is launched on a new device
    And I open Surah 21 in the Indo-Pak Script and Urdu
    When I press the play control with Ayah 21:87 at the top of the screen
    And the Recitation reaches the end of 21:87:8's timing plus 1 ms
    Then the Recited Word is 21:87:8
    When the Recitation reaches 1 ms before the timing that follows 21:87:8's
    Then the Recited Word is still 21:87:8, and 21:87:9 has never been the Recited Word
    When the Recitation reaches the start of the timing that follows 21:87:8's
    Then the Recited Word is 21:87:10

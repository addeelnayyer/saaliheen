@issue-115
Feature: Listening to a Surah
  A reader listens to Yasser ad-Dussary's Recitation of a Surah while reading
  it (ADR 0010), with no Account. The Surah bar's play button starts it at the
  Ayah at the top of the screen, and a small Recitation bar, with play and
  pause, stays on screen while it is on. As the Reciter says each Word, its
  Word card is marked over its Phrase colour, the Recited Word, and its Ayah
  is marked faintly. When the Reciter goes back to repeat Words, the mark goes
  back with him. The Bismillah line is never marked, and the Recitation stops
  at the end of the Surah.

  The Surah's audio is streamed from Tarteel's CDN; here a stub answers in its
  place with silence as long as the Surah's Recitation (or its first minutes,
  past all any scenario here reaches), so the Recitation runs on the browser's
  clock as the real one does. Times and Words are read from
  the committed Recitation source (data/qul/yasser-ad-dussary-surah-by-surah.json),
  never typed. "The Recitation reaches" a time when the audio is moved there,
  as a reader dragging a player's slider would.

  Background:
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes

  @AC-115-3 @AC-115-4 @AC-115-8 @AC-115-9
  Scenario Outline: In <Language> with the <Script> Script, Al-Kawthar plays from its first Ayah to its end, with no Account
    Given I open Surah 108 in <Language>
    And I choose the <Script> Script
    When I press the Surah bar's play button
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays from the start of Ayah 108:1
    And the first Recited Word is the first Word the Reciter says in Ayah 108:1
    And the Bismillah line is not marked
    When the Recitation reaches 1 second before the end of Ayah 108:3, the last of the Surah
    Then the Recitation stops at the end of the Surah
    And the Recitation bar is not on screen
    And no Word card and no Ayah is marked

    Examples:
      | Language | Script   |
      | Urdu     | Uthmani  |
      | English  | Indo-Pak |

  @AC-115-5
  Scenario: The Recited Word moves on through Al-Fatihah's first Ayah, marked over its Phrase colour
    Given I open Surah 1 in English
    And I note the background and border of every Word card
    When I press the Surah bar's play button
    Then the Recited Word moves through every timing of Ayah 1:1 in turn
    And only the Recited Word's card and its Ayah are marked
    And the Recited Word's card keeps the background it had before, and its border is the mark's

  @AC-115-4
  Scenario: The Recitation bar pauses the Recitation and plays it on
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Recited Word's card is still marked
    When I press the Recitation bar's play button
    Then the Recitation is playing

  @AC-115-3 @AC-115-6
  Scenario: Started from Ayah 2:9 at the top of the screen, the mark goes back as the Reciter repeats Words
    Given I open Surah 2 in English
    When I scroll until Ayah 2:9 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 2:9
    And the first Recited Word is the first Word the Reciter says in Ayah 2:9
    When the Recitation reaches the start of 2:9's timing 9
    Then the Recited Word moves through 2:9's timings 9 to 11 in turn

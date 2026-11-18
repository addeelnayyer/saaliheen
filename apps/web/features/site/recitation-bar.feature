@issue-110
Feature: The Recitation bar
  While a Recitation is on, the Recitation bar gives a listener everything they
  need: the previous and next Ayah, a way to stop, the Recitation speed, and
  word of it when the audio is loading or cannot play right now (CONTEXT.md:
  Recitation bar, Recitation speed; ADR 0010). Reading carries on either way.

  The Surah's audio is stubbed as in "Listening to a Surah": silence as long as
  the Surah's Recitation, served in ranges as a CDN serves audio. Here it can
  also arrive only part of the way and hold the rest back, as a slow network
  does, or not arrive at all, as when the browser is offline or the CDN is
  down. Times and Words are read from the committed Recitation source
  (data/qul/yasser-ad-dussary-surah-by-surah.json), never typed.

  Background:
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes

  @AC-1 @AC-6
  Scenario: Next and previous Ayah move Al-Fatihah's Recitation to the start of that Ayah
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And I press the Recitation bar's next Ayah button
    Then the Recitation plays from the start of Ayah 1:2
    And the Recited Word is the first Word the Reciter says in Ayah 1:2
    When the Recitation reaches the start of 1:4's timing 2
    And I press the Recitation bar's previous Ayah button
    Then the Recitation plays from the start of Ayah 1:3
    And the Recited Word is the first Word the Reciter says in Ayah 1:3
    When I press the Recitation bar's next Ayah button
    Then the Recitation plays from the start of Ayah 1:4
    And the Recited Word is the first Word the Reciter says in Ayah 1:4

  @AC-1 @AC-6
  Scenario: Al-Kawthar's first Ayah has no previous Ayah, and its last no next Ayah
    Given I open Surah 108 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    Then the Recitation bar's previous Ayah button is disabled, and its next Ayah button is not
    When the Recitation reaches the start of 108:3's timing 1
    Then the Recitation bar's next Ayah button is disabled, and its previous Ayah button is not

  @AC-2 @AC-6
  Scenario: Stop ends the Recitation and removes the Recitation bar and the marks
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    Then a Word card and its Ayah are marked
    When I press the Recitation bar's stop button
    Then the Recitation bar is not on screen
    And no Word card and no Ayah is marked
    And the Recitation has stopped, its audio no longer moving on
    And the Surah bar's play button is on screen

  @AC-3 @AC-6
  Scenario: The Recitation speed offers a few fixed steps around normal, starting at normal on a new device
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    Then the Recitation bar's Recitation speed offers, in order:
      | 0.75× |
      | 1×    |
      | 1.25× |
    And the Recitation speed is 1×, and the Recitation plays at 1×
    When I choose the Recitation speed 1.25×
    Then the Recitation speed is 1.25×, and the Recitation plays at 1.25×
    When I choose the Recitation speed 0.75×
    Then the Recitation speed is 0.75×, and the Recitation plays at 0.75×

  @AC-3 @AC-6
  Scenario Outline: The Recitation speed <speed> is kept on this device and remembered on later visits
    Given I open Surah 1 in English
    When I press the Surah bar's play button
    And I choose the Recitation speed <speed>
    And I reload the page
    And I press the Surah bar's play button
    Then the Recitation speed is <speed>, and the Recitation plays at <speed>
    When I open Surah 2 in Urdu
    And I press the Surah bar's play button
    Then the Recitation speed is <speed>, and the Recitation plays at <speed>

    Examples:
      | speed |
      | 0.75× |
      | 1.25× |

  @AC-4 @AC-6
  Scenario: While the audio buffers, the Recitation bar says it is loading and the mark holds on the last Word
    Given the Surah audio arrives only as far as the middle of 1:6's timing 2, the rest held back
    And I open Surah 1 in English
    When I press the Surah bar's play button
    And the Recitation is playing
    And the Recitation reaches 5 seconds before the middle of 1:6's timing 2
    Then the Recitation bar says it is loading
    And for 2 seconds, while the audio waits, the mark holds on the Word the Reciter last said and its Ayah, and nothing else is marked
    When the rest of the Surah audio arrives
    Then the Recitation is playing
    And the Recitation bar no longer says it is loading
    And the Recited Word moves on from the Word the mark held on

  @AC-5 @AC-6
  Scenario Outline: When the Surah audio <fails>, the Recitation bar says it is unavailable right now and offers a retry, and reading carries on, on a <browser>
    Given the browser is a <browser>
    And the Surah audio <fails>
    And I open Surah 1 in English
    When I press the Surah bar's play button
    Then the Recitation bar says the Recitation is unavailable right now, and offers to try again
    And the Recitation bar shows what it says in full, nothing cut off, and the page does not scroll sideways
    And no Word card and no Ayah is marked
    When I open the Root tag on the Word card at 1:2:1
    Then the Root dialog for the Root QUL gives 1:2:1 is open
    When I close the Root dialog with Escape
    And the Surah audio can be reached again
    And I press the Recitation bar's try again button
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays from the start of Ayah 1:1
    And the first Recited Word is the first Word the Reciter says in Ayah 1:1
    And the Recitation bar shows what it says in full, nothing cut off, and the page does not scroll sideways

    Examples:
      | fails                                                    | browser |
      | cannot be reached, as when the browser is offline        | desktop |
      | is answered with a server error, as when the CDN is down | desktop |
      | cannot be reached, as when the browser is offline        | phone   |
      | is answered with a server error, as when the CDN is down | phone   |

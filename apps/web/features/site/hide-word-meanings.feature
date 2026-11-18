@issue-256
Feature: Hide Word meanings
  A reader tests themselves on any Ayah in Study (CONTEXT.md: Hide Word
  meanings). With the Reading setting on, no Word card in Study shows its Word
  meaning, known Word or not, and the meaning's space is kept, so no card
  moves. While no Recitation plays, tapping a Word card, or Enter or Space on
  it, shows that one meaning until it is tapped again or the reader leaves the
  page; while a Recitation plays, a tap carries it on from that Word as it
  always has, and shows nothing. Root tags, Ayah translations and the Tafsir
  are untouched, and so are Share pages and the Passage editor. In Flowing,
  which shows no Word meanings, the switch is greyed out with a note that it
  applies to Study.

  The setting sits after Allah reference colour and Known words colour (#250)
  in the Settings drawer and on Me. It is off by default, kept on this device, never synced to an Account,
  applied before the page is first drawn, and the page still works when the
  browser's storage is unavailable.

  Word meanings are read from the committed sources, never typed.

  Background:
    Given a browser with no saved reader settings

  @AC-1 @AC-2 @AC-5
  Scenario: Hide Word meanings sits after Known words colour, starts off, and hides every Word meaning in Study while on, keeping its space
    Given I open Surah 1 in English
    Then every Word card of Surah 1 shows its English Word meaning
    And the Hide Word meanings switch looks off from the first frame the Settings drawer is drawn in
    When I open the Settings drawer
    Then the Hide Word meanings switch is off
    And the Hide Word meanings switch comes straight after the Known words colour switch
    When I close the Settings drawer with Escape
    And I note where every Word card of Surah 1 is and how big it is
    And I turn Hide Word meanings on
    Then no Word card of Surah 1 shows its Word meaning
    And every Word card of Surah 1 is where it was and as big as it was
    When I turn Hide Word meanings off
    Then every Word card of Surah 1 shows its English Word meaning

  @AC-3
  Scenario: With Word meanings hidden, tapping a Word card shows its meaning alone, and tapping it again hides it
    Given I open Surah 1 in English
    And I turn Hide Word meanings on
    When I tap the Word card at 1:2:2, away from its Root tag
    Then only the Word card at 1:2:2 of Surah 1 shows its English Word meaning
    When I tap the Word card at 1:5:1, away from its Root tag
    Then only the Word cards at 1:2:2, 1:5:1 of Surah 1 show their English Word meanings
    When I tap the Word card at 1:2:2, away from its Root tag
    Then only the Word card at 1:5:1 of Surah 1 shows its English Word meaning
    When I turn Hide Word meanings off
    Then every Word card of Surah 1 shows its English Word meaning
    When I turn Hide Word meanings on
    Then no Word card of Surah 1 shows its Word meaning

  @AC-3
  Scenario Outline: With Word meanings hidden, <key> on a Word card in Urdu shows its meaning, and <key> again hides it
    Given I open Surah 112 in Urdu
    And I turn Hide Word meanings on
    When I press <key> on the Word card at 112:1:2
    Then only the Word card at 112:1:2 of Surah 112 shows its Urdu Word meaning
    When I press <key> on the Word card at 112:1:2
    Then no Word card of Surah 112 shows its Word meaning

    Examples:
      | key   |
      | Enter |
      | Space |

  @AC-3
  Scenario: A meaning shown by a tap is hidden again once the reader leaves the page and comes back
    Given I open Surah 1 in English
    And I turn Hide Word meanings on
    When I tap the Word card at 1:2:2, away from its Root tag
    Then only the Word card at 1:2:2 of Surah 1 shows its English Word meaning
    When I follow the destination "Explore"
    And I go back in the browser
    Then no Word card of Surah 1 shows its Word meaning

  @AC-4
  Scenario: While a Recitation plays, a tap carries it on from that Word and shows nothing; paused, a tap shows the meaning
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And I open Surah 1 in English
    And I turn Hide Word meanings on
    When I press the Surah bar's play button
    And the Recitation is playing
    And I tap the Word card at 1:5:2, away from its Root tag
    Then the Recitation plays on from where the Reciter first says the Word at 1:5:2
    And the Recited Word is the Word at 1:5:2
    And no Word card of Surah 1 shows its Word meaning
    When I press the Recitation bar's pause button
    And I tap the Word card at 1:6:1, away from its Root tag
    Then only the Word card at 1:6:1 of Surah 1 shows its English Word meaning
    And the Recitation is paused, and the Recitation bar offers to play

  @AC-6
  Scenario: Root tags and Ayah translations stay while Word meanings are hidden
    Given I open Surah 1 in English
    And I turn the Ayah translation switch on
    And I note every Root tag shown on Surah 1
    When I turn Hide Word meanings on
    Then no Word card of Surah 1 shows its Word meaning
    And every noted Root tag is still shown
    And each Al-Fatihah Ayah shows its Saheeh International Ayah translation after its last Word card and before the next Ayah, and never the other Language's

  @AC-7
  Scenario: In Flowing the Hide Word meanings switch is greyed out, with a note that it applies to Study
    Given I open Surah 1 in English
    Then the Hide Word meanings switch can be used, with no note
    When I switch the Ayah layout to Flowing
    Then the Hide Word meanings switch is greyed out, with a note that it applies to Study
    When I switch the Ayah layout to Study
    Then the Hide Word meanings switch can be used, with no note

  @AC-1 @AC-2
  Scenario: Hide Word meanings survives a reload without a flash and a change of Language, and is kept on this device only
    Given I open Surah 1 in English
    And I turn Hide Word meanings on
    When I reload the page, watching the first frame each Word card is drawn in
    Then no Word card of Surah 1 showed its Word meaning in the first frame it was drawn in
    And the Hide Word meanings switch is on
    And the Hide Word meanings switch looks on from the first frame the Settings drawer is drawn in
    When I switch Language to Urdu
    Then no Word card of Surah 1 shows its Word meaning
    And the Hide Word meanings switch is on

  @AC-1
  Scenario: Hide Word meanings switched on in one signed-in browser stays off in another browser of the same Account
    Given two browsers with no saved reader settings, both signed in to an Account as "hide-word-meanings@saaliheen.test"
    When I turn to the first browser
    And I open "/en/1"
    And I turn Hide Word meanings on
    And I turn to the second browser
    And I open "/en/1"
    Then the Hide Word meanings switch is off
    And every Word card of Surah 1 shows its English Word meaning

  @AC-1 @AC-2 @AC-3
  Scenario: With the browser's storage unavailable, Hide Word meanings starts off and still hides and shows meanings
    Given a browser whose storage is unavailable
    When I open "/en/1"
    Then every Word card of Surah 1 shows its English Word meaning
    And the Hide Word meanings switch is off
    When I turn Hide Word meanings on
    Then no Word card of Surah 1 shows its Word meaning
    When I tap the Word card at 1:2:2, away from its Root tag
    Then only the Word card at 1:2:2 of Surah 1 shows its English Word meaning

  @AC-8
  Scenario: Share pages are untouched by Hide Word meanings
    Given I open Surah 1 in English
    And I turn Hide Word meanings on
    When I open the Share page of 18:83–88 in English and Uthmani, Ayah by Ayah
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English

  @AC-8
  Scenario: The Passage editor's Word cards keep their Word meanings while Hide Word meanings is on
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And I open Surah 1 in English
    And I turn Hide Word meanings on
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then every Word card in the Passage editor shows its Word meaning

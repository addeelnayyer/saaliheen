@issue-247
Feature: Hide Word meanings in the app
  As on the website (#245), a reader can switch on Hide Word meanings (CONTEXT.md)
  in the Settings sheet or on Me, where it follows Allah reference colour and,
  since #253, Known words colour.
  While it is on, every Word card of a Surah's screen leaves its Word meaning
  off, keeping its space, so the reader can try to recall each Word. While no
  Recitation plays, tapping a Word card shows its meaning and a second tap
  hides it again; leaving the Surah hides every meaning again. While a
  Recitation plays, a tap carries it on from that Word, as it does today, and
  reveals nothing. Root tags, Ayah translations and the Tafsir are untouched.
  The switch is off on a new device, kept on the device under
  "qwt-hide-word-meanings" ("on" or "off"), and never sent anywhere.

  A Surah's screen in the app is Study only: the app has no Flowing Ayah
  layout for Quran Analysis, so there is nothing for the setting to be greyed
  out in. How a hidden meaning keeps its space and how the switch looks are
  checked by hand on the simulators, as the screens are.

  Background:
    Given the app is launched on a new device

  @AC-1
  Scenario: A new device has Hide Word meanings off, and every Word card shows its meaning
    Then the Hide Word meanings switch is off
    When I open Surah 108 in the Uthmani Script and English
    Then every Word card of Surah 108 shows its Word meaning

  @AC-1
  Scenario: Switched on, the switch stays on after the app is closed and opened again, and off once switched off
    When I switch Hide Word meanings on
    And I close the app and open it again on the same device
    Then the Hide Word meanings switch is on
    And the device keeps "on" under "qwt-hide-word-meanings"
    When I switch Hide Word meanings off
    And the app is launched again on the same device
    Then the Hide Word meanings switch is off

  @AC-1
  Scenario Outline: A saved switch of "<value>" reads as off
    Given I switch Hide Word meanings on
    And every value the app saved on this device was since changed to "<value>"
    When I close the app and open it again on the same device
    Then the Hide Word meanings switch is off

    Examples:
      | value |
      |       |
      | ON    |
      | true  |

  @AC-1
  Scenario: Switching Hide Word meanings sends nothing anywhere
    Given every request the app makes is recorded
    When I switch Hide Word meanings on
    And I switch Hide Word meanings off
    Then the app made no request

  @AC-1
  Scenario: Me offers Hide Word meanings right after Known words colour, among the settings
    When I open the Me tab
    Then Me offers "Allah reference colour" right after "Ayah translation"
    And Me offers "Hide Word meanings" right after "Known words colour", before "Arabic size"

  @AC-2
  Scenario Outline: With Hide Word meanings on, no Word card of Surah <Surah> in <Script> shows its meaning
    Given I switch Hide Word meanings on
    When I open Surah <Surah> in the <Script> Script and <Language>
    Then no Word card of Surah <Surah> shows its Word meaning

    Examples:
      | Surah | Script   | Language |
      | 1     | Uthmani  | English  |
      | 108   | Indo-Pak | Urdu     |

  @AC-3
  Scenario: With no Recitation on, a tap shows one Word card's meaning and a second tap hides it
    Given I switch Hide Word meanings on
    And I open Surah 1 in the Uthmani Script and English
    When I tap the Word card at 1:2:2
    Then the Word card at 1:2:2 shows its Word meaning, and no other Word card does
    When I tap the Word card at 1:5:1
    Then the Word cards at 1:2:2 and 1:5:1 show their Word meanings, and no other Word card does
    When I tap the Word card at 1:2:2 again
    Then the Word card at 1:5:1 shows its Word meaning, and no other Word card does

  @AC-3
  Scenario: Leaving the Surah hides every meaning again
    Given I switch Hide Word meanings on
    And I open Surah 1 in the Uthmani Script and English
    And I tap the Word card at 1:2:2
    When I leave the Surah and open Surah 1 in the Uthmani Script and English again
    Then no Word card of Surah 1 shows its Word meaning

  @AC-3
  Scenario: With the Recitation paused, a tap shows the Word card's meaning and leaves the Recitation where it was
    Given I switch Hide Word meanings on
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of 1:1's timing 1
    And I pause the Recitation
    And I tap the Word card at 1:5:2
    Then the Word card at 1:5:2 shows its Word meaning, and no other Word card does
    And the audio is still paused at the start of 1:1's timing 1

  @AC-4
  Scenario: While the Recitation plays, a tap carries it on from that Word and reveals nothing
    Given I switch Hide Word meanings on
    And I open Surah 1 in the Uthmani Script and English
    When I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of 1:1's timing 1
    And I tap the Word card at 1:5:2
    Then the audio is playing on from where the Reciter first says the Word at 1:5:2
    And the Recited Word is the Word at 1:5:2
    And no Word card of Surah 1 shows its Word meaning

  @AC-4
  Scenario: With Hide Word meanings off, a tap with no Recitation on changes nothing
    When I open Surah 1 in the Uthmani Script and English
    And I tap the Word card at 1:2:2
    And I tap the Word card at 1:2:2 again
    Then every Word card of Surah 1 shows its Word meaning

  @AC-5
  Scenario: Root tags, Ayah translations and the Tafsir are the same with Hide Word meanings on as off
    When I open Surah 108 in the Uthmani Script and English with the Ayah translation on
    And I switch Hide Word meanings on
    And I open Surah 108 in the Uthmani Script and English with the Ayah translation on again
    Then the two screens show the same Word cards, Root tags, Ayah translations and Tafsir

  @AC-6
  Scenario: In a downloaded Surah with no connection, the meanings are hidden and a tap shows one
    Given I open Surah 108 in the Uthmani Script and English
    And I switch Hide Word meanings on
    And the device goes offline
    When I close the app and open it again on the same device
    And I open Surah 108 in the Uthmani Script and English
    Then no Word card of Surah 108 shows its Word meaning
    When I tap the Word card at 108:1:2
    Then the Word card at 108:1:2 shows its Word meaning, and no other Word card does

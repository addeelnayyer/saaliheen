@issue-253
Feature: Known Roots and Known words colour in the app, kept on the phone
  As on the website (#248, #250), a reader marks a Root as a Known Root with
  Memorized? in the app's Root dialog, or on Me's Known words page, whose Roots
  tab lists every Root in Arabic letter order with its first Lemmas' meanings,
  a search by letters or meaning, and a head counting the Known Roots and,
  since #255, the Known particles. The
  Known words colour switch, in the Settings sheet and on Me right after Allah
  reference colour, tints the Word cards of Known Roots' Words in a light
  green, or a dark green in the dark theme. The marks are kept on the phone
  under "qwt-known-words" by the shared Known words rules
  (@saaliheen/known-words), and the switch under "qwt-known-words-colour"
  ("on" or "off"); neither is sent anywhere, and there is no Account sync yet.
  The Root list is /data/v1/roots.json, kept on the phone once downloaded.

  A Surah's screen in the app is Study only and has no Phrase colours, so
  there is no Flowing layout to tint and no Phrase colour to hide or bring
  back. How the switch, the dialog's Memorized? and the Known words page look
  are checked by hand on the simulators, as the screens are.

  Background:
    Given the app is launched on a new device

  @AC-1
  Scenario: Memorized? in the Root dialog marks the Root, and unmarks it
    When I open the Root dialog of the Root tag at 1:2:2
    Then its Memorized? is off
    When I choose Memorized? in the Root dialog
    Then its Memorized? is on
    And the Root of 1:2:2 is a Known Root
    When I choose Memorized? in the Root dialog again
    Then its Memorized? is off again
    And the Root of 1:2:2 is not a Known Root

  @AC-1
  Scenario: Marking a Root sends nothing anywhere
    Given I open the Root dialog of the Root tag at 1:2:2
    And every request the app makes is recorded
    When I choose Memorized? in the Root dialog
    And I choose Memorized? in the Root dialog again
    Then the app made no request

  @AC-2
  Scenario: Me links to Known words right after Reading places
    When I open the Me tab
    Then Me offers "Known words" right after "Reading places"

  @AC-2
  Scenario: The Roots tab lists every Root in letter order, with its count
    When I open Known words in English
    Then its Roots tab lists every Root of the Root list, in Arabic letter order
    And each row shows the Root's first three meanings, joined by " · "
    And its count is "0 of 1,642 Roots · 0 of 352 particles"

  @AC-2
  Scenario: Memorized? on a row marks the Root and counts it
    Given I open Known words in English
    When I choose Memorized? on the row of "ر ح م"
    Then its count is "1 of 1,642 Roots · 0 of 352 particles"
    And the row of "ر ح م" is memorized
    And the Root of 1:1:3 is a Known Root

  @AC-2
  Scenario Outline: Searching "<search>" finds "<root>"
    When I open Known words in <Language>
    And I search the Roots tab for "<search>"
    Then the Roots tab lists "<root>"
    And every Root it lists has the letters or a meaning searched for

    Examples:
      | search | root  | Language |
      | رحم    | ر ح م | English  |
      | ر ح م  | ر ح م | English  |
      | رَحِمَ    | ر ح م | Urdu     |
      | MERCY  | ر ح م | English  |

  @AC-2
  Scenario: A search no Root matches says so
    When I open Known words in English
    And I search the Roots tab for "zzzz"
    Then the Roots tab lists no Root and says "No Root matches this search."

  @AC-3
  Scenario: A new device has Known words colour off, and tints no Word card
    Given I mark the Root of 1:1:3 as a Known Root
    Then the Known words colour switch is off
    When I open Surah 1 in the Uthmani Script and English
    Then no Word card of Surah 1 is tinted

  @AC-3
  Scenario: Switched on, the switch stays on after the app is closed and opened again, and off once switched off
    When I switch Known words colour on
    And I close the app and open it again on the same device
    Then the Known words colour switch is on
    And the device keeps "on" under "qwt-known-words-colour"
    When I switch Known words colour off
    And the app is launched again on the same device
    Then the Known words colour switch is off

  @AC-3
  Scenario Outline: A saved switch of "<value>" reads as off
    Given I switch Known words colour on
    And the device's "qwt-known-words-colour" was since changed to "<value>"
    When I close the app and open it again on the same device
    Then the Known words colour switch is off

    Examples:
      | value |
      |       |
      | ON    |
      | true  |

  @AC-3
  Scenario: Switching Known words colour sends nothing anywhere
    Given every request the app makes is recorded
    When I switch Known words colour on
    And I switch Known words colour off
    Then the app made no request

  @AC-3
  Scenario: Me offers Known words colour right after Allah reference colour, among the settings
    When I open the Me tab
    Then Me offers "Known words colour" right after "Allah reference colour", before "Hide Word meanings"

  @AC-3
  Scenario: With Known words colour on, exactly the Known Roots' Word cards are tinted
    Given I mark the Root of 1:1:3 as a Known Root
    And I switch Known words colour on
    When I open Surah 1 in the Uthmani Script and English
    Then the Word cards tinted are those whose Root is the Root of 1:1:3
    And no Word card without a Root is tinted

  @AC-3
  Scenario: An Allah reference keeps its colour, and the Recited Word its mark, on the green
    Given I mark the Roots of 1:1:2 and 1:2:3 as Known Roots
    And I switch Known words colour on
    When I open Surah 1 in the Uthmani Script and English
    And the Recited Word is the Word at 1:1:2
    Then the Word card at 1:2:3 is tinted with its Arabic in Allah reference colour
    And the Word card at 1:1:2 is tinted and marked as the Recited Word

  @AC-3
  Scenario Outline: On the <theme> green, the Arabic and Word meaning read at 4.5:1, the Allah reference colour and the Recited Word's mark at 3:1
    Then on the <theme> theme's known green the Arabic and the Word meaning have a contrast of at least 4.5:1
    And on the <theme> theme's known green the Allah reference colour and the Recited Word's mark have a contrast of at least 3:1
    And the <theme> theme's known green is not the Word card's own background

    Examples:
      | theme |
      | light |
      | dark  |

  @AC-4
  Scenario: Marks survive closing the app and opening it again
    Given I mark the Root of 1:1:3 as a Known Root
    When I close the app and open it again on the same device
    Then the Root of 1:1:3 is a Known Root
    And the device keeps the marks under "qwt-known-words"

  @AC-4
  Scenario: Two Roots marked at once are both kept
    When I mark the Roots of 1:1:2 and 1:1:3 as Known Roots at once
    Then the Root of 1:1:2 is a Known Root
    And the Root of 1:1:3 is a Known Root

  @AC-4
  Scenario: With no connection, Known words opens from the kept Root list and a Root is marked
    Given I open Known words in English
    And the device goes offline
    When I close the app and open it again on the same device
    And I open Known words in English
    And I choose Memorized? on the row of "ر ح م"
    Then its count is "1 of 1,642 Roots · 0 of 352 particles"

  @AC-4
  Scenario: Marking a Root tints the open Surah's Word cards at once
    Given I switch Known words colour on
    And I open Surah 1 in the Uthmani Script and English
    And no Word card of Surah 1 is tinted
    When I mark the Root of 1:1:3 as a Known Root
    Then the Word cards tinted are those whose Root is the Root of 1:1:3

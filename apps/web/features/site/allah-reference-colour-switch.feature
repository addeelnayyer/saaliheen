@issue-148
Feature: The Allah reference colour switch
  A reader can switch Allah reference colour off and on from the Settings
  drawer, next to the Phrase colours switch. It is on by default. Turning it
  off takes the gold off every Allah reference on the page at once; turning
  it back on restores it. Like Phrase colours, the choice is kept on this
  device, shared across Languages, applied before the page is first drawn so
  a page never flashes gold, never synced to an Account, and the page still
  works when the browser's storage is unavailable.

  The Allah references are the seeded list (features/site/allah-references.json,
  #147), their Arabic in each Script read from the QUL sources, never typed. A
  Word's Arabic is gold when every letter of it is drawn in the gold of the
  theme in effect; it is not gold when no letter of it is drawn in either
  theme's gold.

  Background:
    Given a browser with no saved reader settings

  @AC-1 @AC-6
  Scenario: The Allah reference colour switch sits next to the Phrase colours switch in the Settings drawer and starts on
    Given I open Surah 1 in English
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    When I open the Settings drawer
    Then the Allah reference colour switch is on
    And the Allah reference colour switch sits next to the Phrase colours switch, with no other control between them

  @AC-1 @AC-6
  Scenario: Each on/off switch in the Settings drawer looks on or off by its own setting, whichever way Ayah translation is set, from the first frame after a reload
    Given I open Surah 1 in English
    Then the Allah reference colour switch looks on from the first frame the Settings drawer is drawn in
    And the Phrase colours switch looks on from the first frame the Settings drawer is drawn in
    And the Ayah translation switch looks off from the first frame the Settings drawer is drawn in
    When I turn Allah reference colour off
    Then the Allah reference colour switch looks off from the first frame the Settings drawer is drawn in
    And the Phrase colours switch looks on from the first frame the Settings drawer is drawn in
    When I turn the Ayah translation switch on
    Then the Ayah translation switch looks on from the first frame the Settings drawer is drawn in
    And the Allah reference colour switch looks off from the first frame the Settings drawer is drawn in
    When I turn Phrase colours off
    And I reload the page
    Then the Allah reference colour switch looks off from the first frame the Settings drawer is drawn in
    And the Phrase colours switch looks off from the first frame the Settings drawer is drawn in
    And the Ayah translation switch looks on from the first frame the Settings drawer is drawn in
    When I turn Allah reference colour on
    Then the Allah reference colour switch looks on from the first frame the Settings drawer is drawn in
    When I turn the Ayah translation switch off
    And I reload the page
    Then the Allah reference colour switch looks on from the first frame the Settings drawer is drawn in
    And the Phrase colours switch looks off from the first frame the Settings drawer is drawn in
    And the Ayah translation switch looks off from the first frame the Settings drawer is drawn in

  @AC-2 @AC-6
  Scenario Outline: On Surah <surah> in <Language>, the <Script> Script and the <theme> theme, turning Allah reference colour off takes the gold off every Allah reference at once, and turning it on restores it
    Given I open Surah <surah> in <Language>
    And I choose the <Script> Script
    And I choose the <Theme> theme
    Then the Arabic of every Allah reference of Surah <surah> in the seeded list is gold
    When I turn Allah reference colour off
    Then the Arabic of no Word card of Surah <surah> is gold
    And the Allah reference colour switch is off
    When I turn Allah reference colour on
    Then the Arabic of every Allah reference of Surah <surah> in the seeded list is gold
    And the Arabic of no other Word card of Surah <surah> is gold

    Examples:
      | surah | Language | Script   | Theme | theme |
      | 1     | English  | Uthmani  | Light | light |
      | 112   | Urdu     | Indo-Pak | Dark  | dark  |
      | 12    | English  | Indo-Pak | Dark  | dark  |
      | 12    | Urdu     | Uthmani  | Light | light |

  @AC-2 @AC-6
  Scenario: Allah reference colour and Phrase colours switch independently of each other
    Given I open Surah 1 in English
    When I turn Allah reference colour off
    Then the Arabic of no Word card of Surah 1 is gold
    And Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    When I turn Allah reference colour on
    And I turn Phrase colours off
    Then no Word card of Surah 1 is tinted
    And the Arabic of every Allah reference of Surah 1 in the seeded list is gold

  @AC-3 @AC-4 @AC-6
  Scenario: Allah reference colour switched off survives a reload without a flash, a visit to another Surah and a change of Language
    Given I open Surah 1 in Urdu
    When I turn Allah reference colour off
    Then the Arabic of no Word card of Surah 1 is gold
    When I reload the page, watching the first frame each Allah reference is drawn in
    Then the Allah reference colour switch is off
    And the Arabic of no Word card of Surah 1 is gold
    And no Allah reference of Surah 1 in the seeded list was gold in the first frame it was drawn in
    And I am on "/ur/1" with nothing added to the URL
    When I open "/ur"
    And I follow the index card of Surah 112
    Then every Ayah of Surah 112 is shown
    And the Arabic of no Word card of Surah 112 is gold
    When I switch Language to English
    Then the Arabic of no Word card of Surah 112 is gold
    And the Allah reference colour switch is off
    When I open "/en/12"
    Then the Arabic of no Word card of Surah 12 is gold
    When I turn Allah reference colour on
    Then the Arabic of every Allah reference of Surah 12 in the seeded list is gold
    When I open "/ur/1"
    Then the Allah reference colour switch is on
    When I reload the page, watching the first frame each Allah reference is drawn in
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    And every Allah reference of Surah 1 in the seeded list was already gold in the first frame it was drawn in

  @AC-4 @AC-6
  Scenario Outline: With Allah reference colour off, Surah <surah> opened afresh in <Language> and the <Script> Script never draws an Allah reference in gold, even in its first frame
    Given I open Surah 1 in English
    And I choose the <Script> Script
    And I turn Allah reference colour off
    When I open "/<lang>/<surah>", watching the first frame each Allah reference is drawn in
    Then no Allah reference of Surah <surah> in the seeded list was gold in the first frame it was drawn in
    And the Arabic of no Word card of Surah <surah> is gold

    Examples:
      | surah | Language | lang | Script   |
      | 1     | English  | en   | Indo-Pak |
      | 112   | Urdu     | ur   | Uthmani  |

  @AC-5 @AC-6
  Scenario: Allah reference colour switched off in one signed-in browser stays on in another browser of the same Account, and is never sent to the Account
    Given two browsers with no saved reader settings, both signed in to an Account as "allah-reference-colour@saaliheen.test"
    And I note every request either browser sends to the site's API
    When I turn to the first browser
    And I open "/en/1"
    And I turn Allah reference colour off
    And I choose the Indo-Pak Script
    And I turn to the second browser
    And I open "/en/1"
    Then the Indo-Pak Script is selected
    And the Allah reference colour switch is on
    And the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    And the Account's synced settings name no Allah reference colour
    And no request either browser sent to the site's API named Allah reference colour
    When I turn to the first browser
    And I reload the page
    Then the Allah reference colour switch is off
    And the Arabic of no Word card of Surah 1 is gold

  @AC-1 @AC-2 @AC-6
  Scenario: With the browser's storage unavailable, Allah reference colour starts on and still switches off
    Given a browser whose storage is unavailable
    When I open "/en/1"
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is gold
    And the Allah reference colour switch is on
    When I turn Allah reference colour off
    Then the Arabic of no Word card of Surah 1 is gold

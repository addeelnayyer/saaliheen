@issue-250
Feature: Known words colour
  A reader sees which Words they should already understand (CONTEXT.md: Known
  words colour). With the Reading setting on, every Word card in Study, and
  every Word in Flowing, whose Root is one of their Known Roots is drawn on a
  green tint where the Phrase colours sit; every other Word is drawn on the
  paper, as it is with Phrase colours off, and nothing is dimmed. While it is
  on the Phrase colours are not drawn and their switch is greyed out with a
  note, and switching it off brings back the reader's own Phrase colours
  choice. The Allah reference colour draws over the green, and so does the
  Recited Word's ring during a Recitation.

  The setting sits after Allah reference colour in the Settings drawer and on
  Me. It is off by default, kept on this device, never synced to an Account,
  applied before the page is first drawn from the stored Known words, and the
  page still works when the browser's storage is unavailable. A mark in the
  Root dialog tints the open page at once, and no Word is drawn again for it.
  Share pages, Theme pages, the Supplications page, the Iltifat pages and the
  Passage editor never show the green.

  Each Word's Root is read from QUL's word root database, never typed. A
  Word's tint is the colour drawn behind it, read as the Phrase colours'
  scenarios read it (phrase-colours.feature); green is a tint whose green
  channel is the strongest of the three.

  Background:
    Given a browser with no saved reader settings

  @AC-1
  Scenario: Known words colour sits after Allah reference colour, in the Settings drawer and on Me, and starts off
    Given I open Surah 1 in English
    When I open the Settings drawer
    Then the Known words colour switch is off
    And the Known words colour switch comes straight after the Allah reference colour switch
    When I open Me in English
    Then the Known words colour switch is off
    And the Known words colour switch comes straight after the Allah reference colour switch

  @AC-2 @AC-3 @AC-7
  Scenario: Marking a Root in the Root dialog tints its Words green at once, without drawing any Word again, and unmarking it takes the green away
    Given I open Surah 1 in English
    When I turn Known words colour on
    Then no Word card of Surah 1 is tinted
    When I watch Surah 1's Word cards for being drawn again
    And I open the Root tag on the Word card at 1:1:3
    And I switch the Root dialog's Memorized?
    And I close the Root dialog with Escape
    Then the Word cards of Surah 1 whose Root is "ر ح م" are green, and no other Word card is tinted
    And no Word card was drawn again
    When I open the Root tag on the Word card at 1:3:1
    And I switch the Root dialog's Memorized?
    And I close the Root dialog with Escape
    Then no Word card of Surah 1 is tinted

  @AC-2
  Scenario Outline: In Flowing, in <Language>, the Words of the Known Roots are green and no other Word is tinted
    Given this browser knows the Roots "ر ح م", "ح م د"
    And I open Surah 1 in <Language>
    And I turn Known words colour on
    When I switch the Ayah layout to Flowing
    Then the Word cards of Surah 1 whose Root is "ر ح م", "ح م د" are green, and no other Word card is tinted

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3
  Scenario: While Known words colour is on, Phrase colours are not drawn and their switch is greyed out with a note; off, they come back
    Given this browser knows the Roots "ر ح م"
    And I open Surah 1 in English
    And I note the two tints of Al-Fatihah's Word cards
    Then the Phrase colours switch can be used, with no note
    When I turn Known words colour on
    Then the Word cards of Surah 1 whose Root is "ر ح م" are green, and no other Word card is tinted
    And the Phrase colours switch is greyed out, with a note that Known words colour is on
    And the Phrase colours switch is on
    When I turn Known words colour off
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And the Phrase colours switch can be used, with no note

  @AC-3
  Scenario: A reader who switched Phrase colours off keeps them off once Known words colour is off again
    Given this browser knows the Roots "ر ح م"
    And I open Surah 1 in English
    And I turn Phrase colours off
    When I turn Known words colour on
    Then the Word cards of Surah 1 whose Root is "ر ح م" are green, and no other Word card is tinted
    When I turn Known words colour off
    Then no Word card of Surah 1 is tinted
    And the Phrase colours switch is off

  @AC-4
  Scenario: An Allah reference keeps Allah reference colour on the green
    Given this browser knows the Roots "ا ل ه"
    And I open Surah 1 in English
    And I turn Known words colour on
    Then the Word cards of Surah 1 whose Root is "ا ل ه" are green, and no other Word card is tinted
    And the Arabic of the Word card at 1:1:2 is gold

  @AC-4
  Scenario: The Recited Word's ring draws over the green, playing and paused
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes
    And this browser knows every Root of Surah 1
    And I open Surah 1 in English
    And I turn Known words colour on
    When I press the Surah bar's play button
    And the Recitation is playing
    And I tap the Word card at 1:5:2, away from its Root tag
    Then the Recited Word is the Word at 1:5:2
    And the Recited Word's card is ringed in the accent, over the green when its Word has a Root
    When I press the Recitation bar's pause button
    Then the Recited Word's card is ringed in the accent, over the green when its Word has a Root

  @AC-5
  Scenario Outline: In the <theme> theme the green keeps the Arabic and the Word meaning readable at 4.5 to 1, and Allah reference colour at 3 to 1
    Given this browser knows every Root of Surah 1
    And I open Surah 1 in English
    And I choose the <Theme> theme
    And I turn Known words colour on
    Then every Word card of Surah 1 with a Root is green, all in one green
    And on every green Word card of Surah 1 the Arabic and the Word meaning contrast with the green by at least 4.5 to 1, an Allah reference's Arabic by 3 to 1
    And I save a screenshot "AC-5-known-words-colour-surah-1-<theme>-desktop"

    Examples:
      | Theme | theme |
      | Light | light |
      | Dark  | dark  |

  @AC-1 @AC-6
  Scenario: Known words colour survives a reload without a flash and a change of Language
    Given this browser knows the Roots "س م و"
    And I open Surah 1 in English
    And I turn Known words colour on
    When I reload the page, watching the first frame it is drawn in
    Then the Word card at 1:1:1 was green in the first frame the page was drawn in
    And the Known words colour switch is on
    When I switch Language to Urdu
    Then the Word cards of Surah 1 whose Root is "س م و" are green, and no other Word card is tinted
    And the Known words colour switch is on

  @AC-1
  Scenario: Known words colour switched on in one signed-in browser stays off in another browser of the same Account
    Given two browsers with no saved reader settings, both signed in to an Account as "known-words-colour@saaliheen.test"
    When I turn to the first browser
    And I open "/en/1"
    And I turn Known words colour on
    And I turn to the second browser
    And I open "/en/1"
    Then the Known words colour switch is off

  @AC-6 @AC-7
  Scenario: With the browser's storage unavailable, Known words colour starts off, and a mark still tints the page
    Given this browser's storage is unavailable
    When I open "/en/1"
    Then the Known words colour switch is off
    When I turn Known words colour on
    And I open the Root tag on the Word card at 1:1:3
    And I switch the Root dialog's Memorized?
    And I close the Root dialog with Escape
    Then the Word cards of Surah 1 whose Root is "ر ح م" are green, and no other Word card is tinted

  @AC-8
  Scenario Outline: <page> shows no green, with every Root known and Known words colour on
    Given this browser knows every Root
    And I open Surah 1 in English
    And I turn Known words colour on
    And I note the green of the Word card at 1:1:3
    When I open "<address>"
    Then nothing on the page is drawn in the noted green

    Examples:
      | page                   | address                |
      | A Theme page           | /en/themes/extravagance |
      | The Supplications page | /en/supplications      |
      | An Iltifat page        | /en/iltifat/he-to-we   |

  @AC-8
  Scenario Outline: The Share page of 1:1–7, <layout>, shows no green, with every Root known and Known words colour on
    Given this browser knows every Root
    And I open Surah 1 in English
    And I turn Known words colour on
    And I note the green of the Word card at 1:1:3
    When I open the Share page of 1:1–7 in English and Uthmani, <layout>
    Then nothing on the page is drawn in the noted green

    Examples:
      | layout       |
      | Ayah by Ayah |
      | Flowing      |

  @AC-8
  Scenario: The Passage editor shows no green, with every Root known and Known words colour on
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And this browser knows every Root
    And I open Surah 1 in English
    And I turn Known words colour on
    And I note the green of the Word card at 1:1:3
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then nothing on the page is drawn in the noted green

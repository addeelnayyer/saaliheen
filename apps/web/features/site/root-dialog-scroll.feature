@AC-20
Feature: Scrolling in the Root dialog
  The Root dialog's head (its "Root" label, its close button, the Root's
  transliteration and its letters) stays pinned at the top of the dialog while
  the Lemmas and Spellings scroll beneath it, with a thin line under it only
  once they have scrolled. While the dialog is open the page beneath holds
  still: no wheel, trackpad, touch (even one that starts on the backdrop) or
  key scrolls it, and it does not shift sideways. On close the page is where
  it was, the Surah bar has the form it had and the Reading place is
  unchanged.
  Opened on a tapped Word (#324), the dialog shows the Root's letters at once
  and, once the Root's file has loaded, scrolls the Word's marked Spelling
  into view beneath its head, with its Lemma row too when both fit. It does
  this once: after the reader scrolls or opens another Lemma it does not move
  on its own.

  Background:
    Given a browser with no saved reader settings

  @AC-20-1 @AC-20-2
  Scenario Outline: On a <viewport> the Root dialog's head stays pinned while its Lemmas and Spellings scroll
    Given the browser is a <viewport>
    And I open "/en/2"
    When I open the Root tag on the Word card at 2:3:2
    And I expand Lemma row 1 of the Root dialog
    And I scroll the Root dialog's Lemmas back to the top
    Then the Root dialog's head has no line under it
    When I scroll the Root dialog's Lemmas down by 600 pixels
    Then the Root dialog's head is pinned at its top, showing its label, its close button, "ʾ-m-n" and "ا م ن"
    And the Root dialog's head has a line under it
    And I save a screenshot of the Root dialog "AC-20-root-dialog-scrolled-light-<viewport>"
    When I scroll the Root dialog's Lemmas back to the top
    Then the Root dialog's head has no line under it

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-20-3 @AC-20-4 @AC-20-6
  Scenario Outline: On a <viewport> the page under the Root dialog holds still and the mini Surah bar stays mini
    Given the browser is a <viewport>
    And I open Surah 2 in English
    And I scroll down by 30000 pixels
    And the Surah bar is in its mini form
    When I note where the page is
    And I open the first Root tag on screen
    Then nothing on the page has moved, even sideways
    When I turn the mouse wheel down by 800 pixels over the backdrop
    And I turn the mouse wheel down by 4000 pixels over the Root dialog
    And I swipe up by 600 pixels on the backdrop
    And I swipe up by 4000 pixels on the Root dialog
    And I press PageDown, End and ArrowDown in the Root dialog
    Then nothing on the page has moved, even sideways
    When I close the Root dialog with Escape
    Then no Root dialog is open
    And nothing on the page has moved, even sideways
    And the Surah bar is in its mini form

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-20-5
  Scenario: On a desktop whose scrollbar takes up room, opening and closing the Root dialog shifts nothing sideways
    Given I open "/en/2" on a desktop whose scrollbar takes up room, as on Windows
    And I turn the mouse wheel down by 3000 pixels over the page
    When I note where the page is
    And I open the first Root tag on screen
    Then nothing on the page has moved, even sideways
    When I close the Root dialog with a click outside
    Then nothing on the page has moved, even sideways

  @AC-20-3 @AC-20-4 @AC-20-6
  Scenario: Deep in a Surah with the full Surah bar, the bar stays full under the Root dialog and after it closes
    Given I open Surah 2 in English
    And I scroll down by 30000 pixels
    And I scroll up by 60 pixels
    And the Surah bar is in its full form
    When I note where the page is
    And I open the first Root tag on screen
    And I turn the mouse wheel down by 4000 pixels over the Root dialog
    And I swipe up by 600 pixels on the backdrop
    And I close the Root dialog with its close button
    Then nothing on the page has moved, even sideways
    And the Surah bar is in its full form

  @AC-20-7
  Scenario: A Word location in the Root dialog still closes it and goes to that Word card
    Given I open "/en/2"
    When I open the Root tag on the Word card at 2:3:2
    And I choose the Word location 2:25:3 in the Root dialog
    Then I am on "/en/2#2:25:3"
    And no Root dialog is open
    And the Word card at 2:25:3 is in the viewport
    And the Word card at 2:25:3 is highlighted with the accent border

  @AC-324
  Scenario: Opened on a قَالَ deep in ق و ل's قَالَ Lemma, the Root dialog brings its Spelling into view once its file has loaded
    Given I open "/en/6"
    And the Root file of "ق و ل" is held back until I let it through
    When I open the Root tag on the Word card at 6:50:3
    Then the Root dialog shows "ق و ل" while its Lemmas load
    When I let the Root file through
    Then Lemma row 1, "قَالَ", is the one marked, tinted and expanded
    And the Spelling holding 6:50:3 is wholly in view beneath the Root dialog's head
    And the Root dialog's head has a line under it
    When I note where the Root dialog is scrolled
    And I scroll the Root dialog's Lemmas up by 300 pixels
    Then the Root dialog has scrolled up by 300 pixels since I noted it, and stays there

  @AC-324
  Scenario Outline: On a <viewport>, opened on مَأْمُون, the 22nd of ا م ن's Lemmas, the Root dialog brings its Lemma row and Spelling into view, then holds still
    Given the browser is a <viewport>
    And I open "/en/70"
    When I open the Root tag on the Word card at 70:28:5
    Then Lemma row 22, "مَأْمُون", is the one marked, tinted and expanded
    And Lemma row 22 and the Spelling holding 70:28:5 are both wholly in view beneath the Root dialog's head
    And the Root dialog's head is pinned at its top, showing its label, its close button, "ʾ-m-n" and "ا م ن"
    And I save a screenshot of the Root dialog "AC-324-root-dialog-marked-in-view-light-<viewport>"
    When I note where the Root dialog is scrolled
    And I expand Lemma row 21 of the Root dialog
    Then the Root dialog has not moved since I noted it, and stays where it is
    When I scroll the Root dialog's Lemmas back to the top
    And I note where the Root dialog is scrolled
    And I expand Lemma row 2 of the Root dialog
    Then the Root dialog has not moved since I noted it, and stays where it is

    Examples:
      | viewport |
      | desktop  |
      | phone    |

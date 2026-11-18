@issue-193
Feature: The Surah bar's picker of Surahs and Juz
  On a Surah page, the Surah's name on the Surah bar is a button that opens a
  quick picker: a dialog with the same Surahs and Juz tabs as the Surah
  index, the Juz following the reader's Script. Choosing a Surah opens its
  page; choosing a Juz opens the Surah page where it starts, at its first
  Ayah. On the mini Surah bar the first tap on the Surah's name shows the
  full bar, as a tap anywhere on it does; the picker opens from the full bar.
  Where each Juz starts comes from the sources and the issue (steps/juz.ts).

  Background:
    Given a browser with no saved reader settings

  @AC-7 @AC-9
  Scenario Outline: In <Language>, the Surah's name on the Surah bar opens a picker with the Surahs and Juz tabs
    Given I open Surah 2 in <Language>
    Then the Surah bar is in its full form
    And the Surah's name on the Surah bar is a button that opens a dialog
    When I press the Surah's name on the Surah bar
    Then the quick picker is open with the "Surahs" tab selected
    And the quick picker's Surahs tab lists all 114 Surahs
    When I choose the quick picker's "Juz" tab
    Then the quick picker's "Juz" tab is selected
    And the quick picker's Juz tab lists all 30 Juz, each with where it runs in Uthmani
    And I save a screenshot of the quick picker "AC-7-surah-picker-juz-<lang>-light-desktop"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-7
  Scenario: Choosing a Surah in the picker opens its page
    Given I open Surah 2 in English
    When I press the Surah's name on the Surah bar
    And I choose Surah 36 in the quick picker
    Then I am on Surah 36's page in English
    And the Word card at 36:1:1 is visible

  @AC-7 @AC-10
  Scenario Outline: Choosing Juz 23 in the picker, in <Script>, lands at <first>
    Given I open "/<lang>/2"
    And I choose the <Script> Script
    When I press the Surah's name on the Surah bar
    And I choose the quick picker's "Juz" tab
    And I choose Juz 23 in the quick picker
    Then I am on Surah 36's page in <Language>
    And Ayah <first> is at the top of the screen

    Examples:
      | Language | lang | Script   | first |
      | English  | en   | Uthmani  | 36:28 |
      | Urdu     | ur   | Indo-Pak | 36:22 |

  @AC-7 @AC-9
  Scenario: The picker is opened, switched and closed with the keyboard alone
    Given I open Surah 2 in English
    When I move keyboard focus to the Surah's name on the Surah bar
    And I press Enter
    Then the quick picker is open with the "Surahs" tab selected
    And the keyboard focus is inside the quick picker
    When I move keyboard focus to the quick picker's "Surahs" tab
    And I press the arrow key toward the next tab
    Then the quick picker's "Juz" tab is selected and has the focus
    When I press Escape
    Then the quick picker is closed
    And the Surah's name on the Surah bar has the focus

  @AC-7
  Scenario: On the mini Surah bar, the first tap on the Surah's name shows the full bar; the next opens the picker
    Given I open "/en/2#2:255:1"
    Then the Surah bar is in its mini form
    When I tap the Surah's name on the mini Surah bar
    Then the Surah bar is in its full form
    And the quick picker is closed
    When I press the Surah's name on the Surah bar
    Then the quick picker is open with the "Surahs" tab selected

  @AC-9
  Scenario Outline: The quick picker in <scheme> on a <viewport>
    Given the system colour scheme is <scheme>
    And the browser is a <viewport>
    And I open Surah 2 in Urdu
    When I press the Surah's name on the Surah bar
    Then the quick picker is open with the "Surahs" tab selected
    And the page does not scroll horizontally
    And I save a screenshot of the quick picker "AC-9-surah-picker-<scheme>-<viewport>"

    Examples:
      | scheme | viewport |
      | light  | phone    |
      | dark   | phone    |
      | dark   | desktop  |

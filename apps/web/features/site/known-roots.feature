@issue-248
Feature: Known Roots
  A reader marks the Roots they have memorised (CONTEXT.md: Known words, Known
  Root) with Memorized? in the Root dialog's head, or on the Known words page
  on Me. Its Roots tab lists every Root in Arabic letter order, searchable by
  its Arabic letters or by its meanings in the reader's Language, with a
  Memorized? choice on every row and the count of Known Roots in its head. The
  marks are kept on this device (ADR 0057): they survive a reload, show alike
  in the Root dialog and on the page, and marking still works while browser
  storage is unavailable. Expected Roots are read from QUL's word root database.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- the Root dialog

  @AC-2 @AC-4
  Scenario: Memorized? in the Root dialog marks and unmarks its Root, and either survives a reload
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And the Root dialog's Memorized? is off
    When I switch the Root dialog's Memorized?
    Then the Root dialog's Memorized? is on
    When I reload the page
    And I open the Root tag on the Word card at 1:1:3
    Then the Root dialog's Memorized? is on
    When I switch the Root dialog's Memorized?
    And I reload the page
    And I open the Root tag on the Word card at 1:1:3
    Then the Root dialog's Memorized? is off

  @AC-2
  Scenario: Memorized? sits in the Root dialog's head and keeps focus inside the dialog
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog's Memorized? is in its head, beside its letters
    When I press Tab 30 times
    Then focus stayed inside the Root dialog after every press

  # ---------------------------------------------------------------- the Known words page

  @AC-3
  Scenario Outline: Me in <Language> links to the Known words page, which lists every Root in Arabic letter order
    Given I open Me in <Language>
    When I follow Me's "Known words"
    Then the address is "/<lang>/me/known-words"
    And the page's heading reads "Known words"
    And the Known words page's "Roots" tab is selected
    And the Known words page's head reads "0 of 1,642 Roots · 0 of 352 particles"
    And the Known words page lists every Root in Arabic letter order, each with a Memorized? choice that is off

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-3
  Scenario Outline: The Known words page in <Language> finds Roots by their letters, "<search>"
    Given I open the Known words page in <Language>
    When I search the Known words page for "<search>"
    Then the Known words page lists only the Roots whose letters hold "<letters>" in a row

    Examples:
      | Language | search   | letters |
      | English  | رحم      | ر ح م   |
      | English  | رَحِمَ   | ر ح م   |
      | Urdu     | ك ت      | ك ت     |
      | English  | أمن      | ا م ن   |

  @AC-3
  Scenario Outline: The Known words page in <Language> finds Roots by their meanings in <Language>, "<search>"
    Given I open the Known words page in <Language>
    When I search the Known words page for "<search>"
    Then the Known words page lists "<found>"
    And the Known words page does not list "<other>"

    Examples:
      | Language | search | found | other |
      | English  | mercy  | ر ح م | ك ت ب |
      | English  | Book   | ك ت ب | ر ح م |
      | Urdu     | کتاب   | ك ت ب | ر ح م |

  @AC-3
  Scenario: A search that finds nothing says so, and clearing it lists every Root again
    Given I open the Known words page in English
    When I search the Known words page for "zzzz"
    Then the Known words page lists no Roots and says none match
    When I search the Known words page for ""
    Then the Known words page lists 1642 Roots

  @AC-3 @AC-4
  Scenario: Marking Roots on the Known words page counts them, and the marks survive a reload
    Given I open the Known words page in English
    When I switch Memorized? for "ر ح م" on the Known words page
    And I switch Memorized? for "ك ت ب" on the Known words page
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    And Memorized? for "ر ح م" on the Known words page is on
    When I reload the page
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    And Memorized? for "ك ت ب" on the Known words page is on
    When I switch Memorized? for "ك ت ب" on the Known words page
    Then the Known words page's head reads "1 of 1,642 Roots · 0 of 352 particles"
    And Memorized? for "ك ت ب" on the Known words page is off

  @AC-4
  Scenario: Marks made in two tabs are both kept, and each tab shows the other's
    Given I open the Known words page in English
    And a second tab on the Known words page in English
    When I switch Memorized? for "ر ح م" on the Known words page
    And I switch Memorized? for "ك ت ب" in the second tab
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"
    When I switch Memorized? for "ا م ن" on the Known words page
    And I reload the page
    Then the Known words page's head reads "3 of 1,642 Roots · 0 of 352 particles"

  # ---------------------------------------------------------------- the two agree

  @AC-5
  Scenario: A Root marked on the Known words page shows as memorised in the Root dialog
    Given I open the Known words page in English
    When I switch Memorized? for "ر ح م" on the Known words page
    And I open "/en/1"
    And I open the Root tag on the Word card at 1:1:3
    Then the Root dialog's Memorized? is on

  @AC-5
  Scenario: A Root marked in the Root dialog shows on the Known words page, reached inside the site
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I switch the Root dialog's Memorized?
    And I close the Root dialog with Escape
    And I follow the destination "Me"
    And I follow Me's "Known words"
    Then the Known words page's head reads "1 of 1,642 Roots · 0 of 352 particles"
    And Memorized? for "ر ح م" on the Known words page is on

  @AC-4 @AC-5
  Scenario: With browser storage unavailable, marks still hold while the reader stays on the site
    Given this browser's storage is unavailable
    And I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I switch the Root dialog's Memorized?
    Then the Root dialog's Memorized? is on
    When I close the Root dialog with Escape
    And I follow the destination "Me"
    And I follow Me's "Known words"
    Then the Known words page's head reads "1 of 1,642 Roots · 0 of 352 particles"
    And Memorized? for "ر ح م" on the Known words page is on
    When I switch Memorized? for "ك ت ب" on the Known words page
    Then the Known words page's head reads "2 of 1,642 Roots · 0 of 352 particles"

Feature: Going to a Word location from the Root dialog
  Each Word location a Spelling lists in the Root dialog links to that Word
  card, `#s:a:w`, in this Surah or another one. Choosing it closes the dialog,
  brings the card into view and highlights it with the accent border; its
  neighbour is not highlighted.

  Background:
    Given a browser with no saved reader settings

  @AC-5-10 @AC-5-13
  Scenario Outline: From the ر ح م dialog on /<lang>/1, choosing <target> goes to <address> and highlights that Word card
    Given I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    And I choose the Word location <target> in the Root dialog
    Then I am on "<address>"
    And no Root dialog is open
    And the Word card at <target> is in the viewport
    And the Word card at <target> is highlighted with the accent border
    And the Word card at <neighbour> is not highlighted with the accent border
    And I save a screenshot of the Word card at <target> "AC-10-root-dialog-to-<shot>-light-desktop"

    Examples:
      | lang | target  | address         | neighbour | shot    |
      | ur   | 1:3:2   | /ur/1#1:3:2     | 1:3:1     | 1-3-2   |
      | ur   | 2:163:8 | /ur/2#2:163:8   | 2:163:7   | 2-163-8 |
      | en   | 90:17:9 | /en/90#90:17:9  | 90:17:8   | 90-17-9 |

  @AC-5-10 @AC-5-13
  Scenario: The Word card reached in another Surah opens the same Root dialog from its own Root tag
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I choose the Word location 2:163:8 in the Root dialog
    Then I am on "/en/2#2:163:8"
    When I open the Root tag on the Word card at 2:163:8
    Then the Root dialog for "ر ح م" is open

@issue-289
Feature: The Root dialog and the Known words page lead to the Root page
  Readers reach a Root page (#287) from where they already meet Roots. The
  Root dialog's head links to its Root's Root page in the page's Language, and
  choosing it closes the dialog; the dialog still lists its Lemmas, Spellings
  and Word location links as before, and a Root tag still opens it. Each Root
  on the Known words page's Roots tab links to its Root page, its Memorized?
  choice still working in place. A Root page is a look-up, so coming back from
  one leaves the Reading place where it was.

  The link is found in the dialog's <header> by its name, "Root page"; on the
  Known words page each Root's link is named by its letters.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- the Root dialog

  Scenario Outline: In <Language>, the Root dialog's head links to its Root page; choosing it opens the page and closes the dialog
    Given I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And the Root dialog's head links to "/<lang>/roots/رحم"
    When I follow the Root dialog's link to its Root page
    Then I am on the Root page of "ر ح م" in <Language>
    And no Root dialog is open

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  Scenario: The Root dialog still lists every Lemma, Spelling and Word location link, which still leads to its Word card
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I expand every Lemma row of the Root dialog
    Then every Lemma row shows its Spellings, most frequent first, each in its Uthmani text only, with its meaning in English and a link to each of its Word locations in Quran order
    And the Root dialog shows 84 Spellings and links to all 339 of ر ح م's Word locations
    When I choose the Word location 2:163:8 in the Root dialog
    Then I am on "/en/2#2:163:8"
    And no Root dialog is open
    And the Word card at 2:163:8 is highlighted with the accent border

  Scenario: Coming back from a Root page reached from the Root dialog leaves the Reading place as it was
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open the Root tag on the Word card at 18:45:1
    And I follow the Root dialog's link to its Root page
    Then I am on the Root page of "ض ر ب" in English
    When I go back in the browser
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  # ---------------------------------------------------------------- the Known words page

  Scenario Outline: In <Language>, every Root on the Known words page links to its Root page
    Given I open the Known words page in <Language>
    Then every Root on the Known words page links to its Root page in <Language>
    When I follow "ر ح م" on the Known words page
    Then I am on the Root page of "ر ح م" in <Language>

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  Scenario: Memorized? on a Known words page row still marks its Root in place
    Given I open the Known words page in English
    When I switch Memorized? for "ر ح م" on the Known words page
    Then Memorized? for "ر ح م" on the Known words page is on
    And the address is "/en/me/known-words"

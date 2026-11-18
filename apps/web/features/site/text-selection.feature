Feature: Static text is unselectable
  No static text on Saaliheen can be selected, so tapping, holding or clicking
  quickly never leaves a highlight: triple-clicking or pressing Select All
  selects nothing on a Surah page, in the Root dialog, on the Surah index or on
  the credits page. On iOS, holding shows no callout and tapping no grey flash.
  Text a person types stays selectable: the Surah search box can be selected
  and edited as usual, and the search still filters the index.

  Scenario Outline: On a Surah page in <Language>, triple-clicking a Word card or an Ayah translation, or Select All, selects nothing
    Given I open Surah 1 in <Language>
    And I turn the Ayah translation switch on
    When I triple-click the Arabic text on the Word card at 1:1:3
    Then no text on the page is selected
    When I triple-click the Word meaning on the Word card at 1:1:3
    Then no text on the page is selected
    When I triple-click the <Language> Ayah translation of 1:2
    Then no text on the page is selected
    When I press Select All
    Then no text on the page is selected

    Examples:
      | Language |
      | Urdu     |
      | English  |

  Scenario Outline: In the Root dialog in <Language>, triple-clicking selects nothing and the dialog keeps working
    Given a browser with no saved reader settings
    And I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    And I triple-click the Root's letters in the Root dialog
    Then no text on the page is selected
    And the Root dialog for "ر ح م" is open
    When I press Select All
    Then no text on the page is selected
    When I expand Lemma row 1 of the Root dialog
    Then Lemma row 1 is expanded

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  Scenario Outline: On the <Language> <Page>, triple-clicking or Select All selects nothing
    Given I open "<path>"
    When I triple-click the page's main heading
    Then no text on the page is selected
    When I triple-click the first paragraph on the page
    Then no text on the page is selected
    When I press Select All
    Then no text on the page is selected

    Examples:
      | Language | Page         | path        |
      | Urdu     | Surah index  | /ur         |
      | English  | Surah index  | /en         |
      | Urdu     | credits page | /ur/credits |
      | English  | credits page | /en/credits |

  Scenario Outline: On the <Language> Surah index, text typed into the search box can be selected and the search still filters
    Given I open the Surah index in <Language>
    When I search for "baqarah"
    And I select everything in the search box
    Then the selected text in the search box is "baqarah"
    And the index shows exactly the Surahs whose Latin name contains the search, among them Surah 2

    Examples:
      | Language |
      | Urdu     |
      | English  |

  Scenario Outline: On a Surah page in <Language>, Word cards show no iOS callout and no tap highlight
    Given I open Surah 1 in <Language>
    Then every Word card has the touch callout turned off and a transparent tap highlight

    Examples:
      | Language |
      | Urdu     |
      | English  |

@AC-4-9
Feature: Ayah translation switch
  The Ayah translation switch is off by default. When on, each Ayah's full
  Ayah translation shows under the Ayah: Jalandhari's in Urdu, Saheeh
  International's in English without its inline footnotes. The choice is kept
  in the browser, never in the URL. Expected text is read from the committed
  sources.

  Background:
    Given a browser with no saved reader settings

  @AC-4-4 @AC-4-5
  Scenario Outline: On /<lang>/1 the switch is off by default, shows and hides <translator>'s Ayah translation, and survives a reload
    Given I open "/<lang>/1"
    Then the Ayah translation switch is off
    And no Al-Fatihah Ayah translation is shown
    When I turn the Ayah translation switch on
    Then the Ayah translation switch is on
    And I am on "/<lang>/1" with nothing added to the URL
    And each Al-Fatihah Ayah shows its <translator> Ayah translation after its last Word card and before the next Ayah, and never the other Language's
    And I save a screenshot "AC-4-surah-1-<lang>-translation-on-light-desktop"
    When I reload the page
    Then the Ayah translation switch is on
    And each Al-Fatihah Ayah shows its <translator> Ayah translation after its last Word card and before the next Ayah, and never the other Language's
    When I turn the Ayah translation switch off
    Then the Ayah translation switch is off
    And no Al-Fatihah Ayah translation is shown
    When I reload the page
    Then the Ayah translation switch is off
    And no Al-Fatihah Ayah translation is shown

    Examples:
      | lang | translator           |
      | ur   | Jalandhari           |
      | en   | Saheeh International |

  Scenario Outline: On /<lang>/1 the Ayah translation spans its Ayah's row of Word cards, edge to edge
    Given I open "/<lang>/1"
    When I turn the Ayah translation switch on
    Then the Ayah translation of 1:2 starts and ends where its Ayah's row of Word cards does

    Examples:
      | lang |
      | ur   |
      | en   |

  @AC-4-5
  Scenario: /en/2 shows Saheeh International's Ayah translation of 2:1 without its footnote
    Given I open "/en/2"
    When I turn the Ayah translation switch on
    Then the Ayah translation of 2:1 shows Saheeh International's text without its footnotes
    And the shown Ayah translation of 2:1 contains no "[["

  @AC-4-5
  Scenario: No English Surah page carries a Saheeh International footnote
    When I fetch every English Surah page from /en/1 to /en/114
    Then there are 114 of them
    And none of their page text contains "[["
    And the page text of /en/1 carries the English Ayah translation of 1:1

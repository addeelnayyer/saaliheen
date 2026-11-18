@AC-17
Feature: Settings drawer
  Since #192 the settings drawer is the Reading settings sheet: the Surah
  bar's Reading settings button opens it on every Surah page, and Me holds the
  same controls on its page (steps reach them there from any other page, as a
  reader does). It is a
  modal dialog, a side panel on a desktop and a bottom sheet on a phone. A
  preview of Ayah 1:2 is pinned at its top; under it come Arabic size, Meaning
  size, Reset sizes, the Script, the Ayah translation switch and the theme.
  Arabic size scales the Quranic text of Words, Meaning size the Word meanings
  and Ayah translations, each over five steps from 85% to 150%. Sizes are kept
  in the browser, never in the URL.

  Background:
    Given a browser with no saved reader settings

  @AC-17-1 @AC-17-2 @AC-17-3 @AC-17-6 @issue-56
  Scenario Outline: On Surah <surah> the settings are behind the Surah bar's Reading settings button
    Given I open "<address>"
    Then the page shows no Script, theme or Ayah translation control
    When I open the Settings drawer
    Then the Settings drawer is open

    Examples:
      | surah | address |
      | 1     | /en/1   |
      | 112   | /ur/112 |

  @AC-17-7 @AC-17-8
  Scenario Outline: On <address> the Settings drawer is a named modal dialog, keeps focus inside, and closes with <how>, giving focus back to the settings button
    Given I open "<address>"
    When I open the Settings drawer
    Then the Settings drawer is a modal dialog named "Reading settings" with a close button named "Close"
    And focus is inside the Settings drawer
    When I press Tab 20 times
    Then focus stayed inside the Settings drawer after every press
    When I close the Settings drawer with <how>
    Then the Settings drawer is closed
    And the settings button has focus

    Examples:
      | address | how              |
      | /en/1   | its close button |
      | /ur/1   | Escape           |
      | /en/112 | a click outside  |

  @AC-17-4 @AC-17-5 @AC-17-30
  Scenario Outline: On a <viewport> the Settings drawer is a <shape>, in the <theme> theme
    Given the browser is a <viewport>
    And I open "/en/1"
    And I choose the <Theme> theme
    When I open the Settings drawer
    Then the Settings drawer is a <shape>
    And the Settings drawer shows, in order, the preview, Arabic size, Meaning size, Reset sizes, the Script, the Ayah translation switch and the theme
    And I save a screenshot "AC-17-settings-drawer-<theme>-<viewport>"

    Examples:
      | viewport | shape        | Theme | theme |
      | desktop  | side panel   | Light | light |
      | desktop  | side panel   | Dark  | dark  |
      | phone    | bottom sheet | Light | light |
      | phone    | bottom sheet | Dark  | dark  |

  @AC-17-9 @AC-17-11 @AC-17-15 @AC-17-16 @AC-17-18 @AC-17-26
  Scenario: Arabic size scales the Arabic of Word cards, the Bismillah and the Root dialog, and leaves the meanings alone
    Given I open "/en/112"
    And I turn the Ayah translation switch on
    And I open the Root tag on the Word card at 112:1:1
    And I note the text sizes of:
      | the Arabic on the Word card at 112:1:1       |
      | the Bismillah                                |
      | the Lemma in Lemma row 1 of the Root dialog  |
      | the Word meaning on the Word card at 112:1:1 |
      | the Ayah translation of 112:1                |
      | the meaning in Lemma row 1 of the Root dialog |
    And I close the Root dialog with Escape
    Then Arabic size shows 100% and Meaning size shows 100%
    When I set Arabic size to 130%
    And I open the Root tag on the Word card at 112:1:1
    Then these texts are 130% of their noted size:
      | the Arabic on the Word card at 112:1:1      |
      | the Bismillah                               |
      | the Lemma in Lemma row 1 of the Root dialog |
    And these texts keep their noted size:
      | the Word meaning on the Word card at 112:1:1  |
      | the Ayah translation of 112:1                 |
      | the meaning in Lemma row 1 of the Root dialog |

  @AC-17-10 @AC-17-15 @AC-17-17
  Scenario: Arabic size steps between 85% and 150%, with − and + disabled at the ends
    Given I open "/en/1"
    And I note the text sizes of:
      | the Arabic on the Word card at 1:1:1 |
    When I open the Settings drawer
    And I set Arabic size to 150%
    Then Arabic size's Larger button is disabled and its Smaller button is not
    When I set Arabic size to 85%
    Then Arabic size's Smaller button is disabled and its Larger button is not
    And these texts are 85% of their noted size:
      | the Arabic on the Word card at 1:1:1 |

  @AC-17-12
  Scenario: Arabic size leaves the Surah index's Arabic names alone
    Given I open "/en"
    And I note the text sizes of:
      | the Arabic name on the index card of Surah 1 |
    When I set Arabic size to 150%
    Then these texts keep their noted size:
      | the Arabic name on the index card of Surah 1 |

  # At every Meaning size step, Urdu's line height keeps in proportion to its size (#341).
  @AC-17-13 @AC-17-14
  Scenario Outline: Meaning size <size>% scales Word meanings, Ayah translations and the Root dialog's meanings, and leaves the Arabic alone
    Given I open "/ur/112"
    And I turn the Ayah translation switch on
    And I open the Root tag on the Word card at 112:1:1
    And I note the text sizes of:
      | the Word meaning on the Word card at 112:1:1  |
      | the Ayah translation of 112:1                 |
      | the meaning in Lemma row 1 of the Root dialog |
      | the Arabic on the Word card at 112:1:1        |
      | the Bismillah                                 |
      | the Lemma in Lemma row 1 of the Root dialog   |
    And I close the Root dialog with Escape
    When I set Meaning size to <size>%
    And I open the Root tag on the Word card at 112:1:1
    Then these texts are <size>% of their noted size:
      | the Word meaning on the Word card at 112:1:1  |
      | the Ayah translation of 112:1                 |
      | the meaning in Lemma row 1 of the Root dialog |
    And these texts keep their noted size:
      | the Arabic on the Word card at 112:1:1      |
      | the Bismillah                               |
      | the Lemma in Lemma row 1 of the Root dialog |
    And every Urdu text on the page has a line height 1.7 to 1.8 times its size

    Examples:
      | size |
      | 85   |
      | 115  |
      | 130  |
      | 150  |

  @AC-17-19
  Scenario Outline: At 150% Arabic size on a phone, Word cards grow and wrap on <address>
    Given the browser is a phone
    And I open "<address>"
    When I set Arabic size to 150%
    And I set Meaning size to 150%
    Then no Word card's Arabic overflows its card
    And the page does not scroll horizontally
    And I save a screenshot "AC-17-sizes-150-<name>-light-phone"

    Examples:
      | address | name     |
      | /ur/1   | surah-1  |
      | /en/18  | surah-18 |

  @AC-17-20 @AC-17-21
  Scenario: Reset sizes sets both sizes back to 100% and keeps the Script, theme and Ayah translation
    Given I open "/en/1"
    And I note the text sizes of:
      | the Arabic on the Word card at 1:1:1       |
      | the Word meaning on the Word card at 1:1:1 |
    And I choose the Indo-Pak Script
    And I choose the Dark theme
    And I turn the Ayah translation switch on
    When I set Arabic size to 150%
    And I set Meaning size to 85%
    And I reset the sizes
    Then Arabic size shows 100% and Meaning size shows 100%
    And the Indo-Pak Script is selected
    And the Dark theme is selected
    And the Ayah translation switch is on
    When I choose the Uthmani Script
    Then these texts keep their noted size:
      | the Arabic on the Word card at 1:1:1       |
      | the Word meaning on the Word card at 1:1:1 |

  @AC-17-22 @AC-17-23 @AC-17-24 @AC-17-25
  Scenario Outline: On <address> the preview shows Ayah 1:2 in the reader's Script and Language, with its Ayah translation while the switch is off
    Given I open "<address>"
    When I open the Settings drawer
    Then the Ayah translation switch is off
    And the preview shows Ayah 1:2's Word cards in their Uthmani text with their <Language> Word meanings
    And no preview Word card shows its Word location, on screen or to a screen reader
    And the preview shows the <Language> Ayah translation of 1:2
    When I choose the Indo-Pak Script
    Then the preview shows Ayah 1:2's Word cards in their Indo-Pak text with their <Language> Word meanings

    Examples:
      | address | Language |
      | /ur/112 | Urdu     |
      | /en/112 | English  |

  @AC-17-22 @AC-17-26
  Scenario: The preview resizes with both steppers
    Given I open "/en/1"
    When I open the Settings drawer
    And I note the text sizes of:
      | the Arabic on the preview's Word card at 1:2:1       |
      | the Word meaning on the preview's Word card at 1:2:1 |
      | the preview's Ayah translation                       |
    And I set Arabic size to 150%
    Then these texts are 150% of their noted size:
      | the Arabic on the preview's Word card at 1:2:1 |
    And these texts keep their noted size:
      | the Word meaning on the preview's Word card at 1:2:1 |
      | the preview's Ayah translation                       |
    When I set Meaning size to 130%
    Then these texts are 130% of their noted size:
      | the Word meaning on the preview's Word card at 1:2:1 |
      | the preview's Ayah translation                       |

  @AC-17-28
  Scenario Outline: The Ayah translation switch is on <page>, and its choice applies on the next Surah opened
    Given I open "<address>"
    When I turn the Ayah translation switch on
    And I open "/en/1"
    Then each Al-Fatihah Ayah shows its Saheeh International Ayah translation after its last Word card and before the next Ayah, and never the other Language's

    Examples:
      | page                   | address |
      | Me                     | /en/me  |
      | Surah 112's drawer     | /en/112 |

  @AC-17-31 @AC-17-32 @AC-17-33
  Scenario: Sizes survive a reload, another Surah and a Language switch, and never enter the URL
    Given I open "/ur/1"
    When I set Arabic size to 130%
    And I set Meaning size to 115%
    Then I am on "/ur/1" with nothing added to the URL
    When I reload the page
    Then Arabic size shows 130% and Meaning size shows 115%
    When I open "/ur/2"
    Then Arabic size shows 130% and Meaning size shows 115%
    When I switch Language to English
    Then I am on "/en/2" with nothing added to the URL
    And Arabic size shows 130% and Meaning size shows 115%
    And the page's root element carries data-arabic-size "130" and data-meaning-size "115"

  @AC-17-35 @AC-17-36
  Scenario Outline: A stored size of "<value>" reads as 100%
    Given on an earlier visit to "/en/1" I chose, in order:
      | Arabic size larger  |
      | Meaning size larger |
    And the saved Arabic size and Meaning size were since changed to "<value>"
    When I open "/en/1" in a fresh browser with an empty cache that keeps those choices
    Then the page's root element carries data-arabic-size "100" and data-meaning-size "100"
    And Arabic size shows 100% and Meaning size shows 100%

    Examples:
      | value |
      | 999   |
      | abc   |

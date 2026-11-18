@issue-341
Feature: Urdu is spaced for Dubai's Naskh letters
  The website sets Urdu in Dubai (#339), a Naskh face, so Urdu reads at a
  line height of about 1.75 times its size, Dubai's own line box (1.69 em)
  with a little room, rather than the 1.9 to 2.3 the earlier typeface needed.
  That holds for every Urdu text on the site, marked lang="ur": Word meanings,
  Ayah translations, the Tafsir, the Root dialog, Passage titles, Theme chips,
  the site bar's اردو switch and the admin editor alike. A text is checked
  where it is drawn, by its computed line height over its computed size.

  Scenario Outline: On a <screen>, every Urdu text on a Surah page and in its Root dialog is spaced for Naskh
    Given I open "/ur/1" on a <screen> screen
    And I turn the Ayah translation switch on
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size
    When I open the Root tag on the Word card at 1:2:2
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size

    Examples:
      | screen  |
      | desktop |
      | phone   |

  @tafsir-on @passage-headings-on
  Scenario Outline: On a <screen>, the Tafsir and the Passage titles in Urdu are spaced for Naskh
    Given I open "/ur/1" on a <screen> screen
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size

    Examples:
      | screen  |
      | desktop |
      | phone   |

  Scenario Outline: Every Urdu text on <address> is spaced for Naskh
    Given I open "<address>" on a desktop screen
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size

    Examples:
      | address                   |
      | /en/1                     |
      | /ur/themes                |
      | /ur/explore               |
      | /ur/share/1/1-7/uthmani   |
      | /ur/supplications         |

  Scenario: Every Urdu text on a Grammar page, its Ayah translations among them, is spaced for Naskh
    Given I open "/ur/grammar/1" on a desktop screen
    And I turn the Ayah translation switch on
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size

  Scenario: Every Urdu text in the Passage editor, its Word meanings in Phrases mode among them, is spaced for Naskh
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I switch the Ayah translation to Urdu
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size
    When I turn Phrases mode on
    Then every Urdu text on the page has a line height 1.7 to 1.8 times its size

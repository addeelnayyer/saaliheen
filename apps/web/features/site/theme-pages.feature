@issue-129 @AC-16
Feature: Theme chips and Theme pages
  Every Ayah in Study shows its Themes as chips after its Ayah translation, in
  the order it was tagged, named in the reader's Language. Each chip is a link
  to its Theme page, /{lang}/themes/{slug}: the Theme's name, its Theme
  category and how many Ayahs it has, then its Ayahs in Quran order, grouped
  by Passage. Opening a Theme page, and following its links back into a Surah,
  are look-ups: the Reading places stay as they were.

  A Theme here is something an Ayah speaks of (#128), not the light or dark
  colour theme of theme.feature. Theme names in English are typed from the
  issue; Urdu names, Theme categories, Ayahs and Passages are read from the
  Themes file (data/themes.json) and the Passages file, never typed. Reader
  Flowing does not exist yet (#125); the Share page's and the Passage editor's
  Flowing stand for "no chips in Flowing" until it does.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-6: chips in Study

  @AC-6
  Scenario Outline: Ayah <ayah>'s Theme chips follow its Ayah translation, in tagged order, in <Language>
    Given I open "/<lang>/<surah>"
    When I turn the Ayah translation switch on
    Then Ayah <ayah> shows the Theme chips "<themes>" in <Language>, in that order
    And Ayah <ayah>'s Theme chips come after its last Word card and its Ayah translation

    Examples:
      | ayah | surah | lang | Language | themes                                                                                                                   |
      | 1:1  | 1     | en   | English  | Mercy of Allah, Remembrance of Allah                                                                                     |
      | 2:8  | 2     | en   | English  | Hypocrisy, Lying                                                                                                         |
      | 2:8  | 2     | ur   | Urdu     | Hypocrisy, Lying                                                                                                         |
      | 4:36 | 4     | en   | English  | Oneness of Allah, Parents, Kinship, Orphans, Travellers, Kindness, Arrogance, Worship, Poverty, Slavery and Emancipation |

  @AC-6
  Scenario: With the Ayah translation off, the chips come right after the Ayah's Word cards
    Given I open "/en/2"
    Then Ayah 2:8 shows the Theme chips "Hypocrisy, Lying" in English, in that order
    And Ayah 2:8's Theme chips come after its last Word card and before Ayah 2:9

  @AC-6
  Scenario Outline: Every Ayah of Surah <surah> has its Theme chips
    Given I open "/<lang>/<surah>"
    Then every Ayah of Surah <surah> shows its Theme chips from the Themes file, in <Language>

    Examples:
      | surah | lang | Language |
      | 1     | ur   | Urdu     |
      | 112   | en   | English  |

  @AC-6 @AC-13
  Scenario Outline: A long row of chips wraps on a phone, in <Language> on the <Theme> paper
    Given on an earlier visit to "/<lang>/4" I chose, in order:
      | <Theme> |
    When I open "/<lang>/4#4:36" in a fresh browser with an empty cache that keeps those choices
    And I view the page on a 390×844 phone
    Then Ayah 4:36's Theme chips all lie within the screen's width, on more than one line
    And the page does not scroll sideways
    And I save a screenshot of Ayah 4:36's Theme chips "AC-6-theme-chips-4-36-<lang>-<theme>-phone"

    Examples:
      | lang | Language | Theme | theme |
      | en   | English  | Light | light |
      | ur   | Urdu     | Dark  | dark  |

  @AC-6
  Scenario Outline: The Share page shows no Theme chips, <Layout>
    Given I open the Share page of 2:8–9 in English and Uthmani
    When I choose the <Layout> Share layout
    Then the page has no link to a Theme page and no Theme name "Hypocrisy"

    Examples:
      | Layout       |
      | Ayah by Ayah |
      | Flowing      |

  @AC-6
  Scenario Outline: The Passage editor shows no Theme chips, <Layout>
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 2
    And I choose the <Layout> Ayah layout
    Then the page has no link to a Theme page and no Theme name "Hypocrisy"

    Examples:
      | Layout       |
      | Ayah by Ayah |
      | Flowing      |

  # ---------------------------------------------------------------- AC-7: chips are links

  @AC-7
  Scenario Outline: Each chip is a link, announced with its Theme's name, to its Theme page in <Language>
    Given I open "/<lang>/2"
    Then each of Ayah 2:8's Theme chips is a link named for its Theme, to "/<lang>/themes/<slug>" and the like
    When I follow Ayah 2:8's Theme chip "Hypocrisy"
    Then I am on the Theme page "/<lang>/themes/<slug>"

    Examples:
      | lang | Language | slug      |
      | en   | English  | hypocrisy |
      | ur   | Urdu     | hypocrisy |

  @AC-7
  Scenario: A chip is reached and followed with the keyboard
    Given I open "/en/112"
    When I press Tab from "Listen from Ayah 112:1" until Ayah 112:1's Theme chip "Oneness of Allah" has the focus
    And I press Enter
    Then I am on the Theme page "/en/themes/oneness-of-allah"

  # ---------------------------------------------------------------- AC-8: static pages

  # Each Theme page is made on its first request (ADR 0040), so a run's first
  # pass over all 516 takes longer than a test's usual minute.
  @AC-8 @slow
  Scenario: Every Theme page in both Languages is a static page, and an unknown Theme is not found
    Then every Theme page of the Themes file, in Urdu and in English, is served as a static page from Next's cache, setting no cookie
    And these addresses are not found:
      | /en/themes/no-such-theme |
      | /ur/themes/no-such-theme |

  # ---------------------------------------------------------------- AC-9: the page

  @AC-9
  Scenario Outline: The Theme page of Extravagance in <Language> says what it is, then its Passage groups in Quran order
    Given I open "/<lang>/themes/extravagance"
    Then the Theme page's heading is the name of "Extravagance" in <Language>
    And the Theme page shows the Theme category of "Extravagance" in <Language>, and its count of Ayahs, before its first Passage group
    And the Theme page shows the Passage groups of "Extravagance" from the Themes file, in order, each Ayah under its own group
    And each Passage group's heading names its Surah and the Passage's full Ayah range, in <Language>

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-9 @passage-headings-on
  Scenario Outline: With Passage headings on, each Passage group's heading has its Passage title in <Language>
    Given I open "/<lang>/themes/extravagance"
    Then each Passage group's heading has its Passage's title in <Language>

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-9 @passage-headings-off
  Scenario: With Passage headings off, no Passage group's heading has a Passage title
    Given I open "/en/themes/extravagance"
    Then no Passage group's heading has its Passage's title in English

  @AC-9
  Scenario: A Theme page is whole: Disbelief lists all of its Ayahs
    Given I open "/en/themes/disbelief"
    Then the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"

  # ---------------------------------------------------------------- AC-10: look-ups

  @AC-10 @AC-12
  Scenario: A Passage heading and an Ayah link are look-ups that leave the Reading place where it was
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en/themes/extravagance"
    And I follow the heading of the Passage group 17:26–30
    Then I am on "/en/17" at Ayah 17:26
    And Ayah 17:26 is at the top of the screen
    When I open "/en/themes/extravagance"
    And I follow the link of Ayah 17:29
    Then I am on "/en/17" at Ayah 17:29
    And Ayah 17:29 is at the top of the screen
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  # ---------------------------------------------------------------- AC-11: each Ayah on the page

  @AC-11
  Scenario Outline: The Ayahs of Dhul-Kifl are in <Script>, with the Ayah translation <switch>, in <Language>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script>            |
      | <translation>       |
      | Arabic size larger  |
      | Arabic size larger  |
      | Meaning size larger |
    When I open "/<lang>/themes/dhul-kifl" in a fresh browser with an empty cache that keeps those choices
    Then each Ayah of "Dhul-Kifl" shows its Arabic in <Script>, with its end-of-Ayah marker and number, and not in the other Script
    And each Ayah of "Dhul-Kifl" shows its Ayah translation in <Language>: <switch>
    And no Arabic on the Theme page can be selected
    And the Theme page's Arabic is 130% and its Ayah translations 115% of a fresh browser's
    And the Theme page has no Word card, no Theme chip, no Phrase colour and no Recitation control

    Examples:
      | lang | Language | Script   | translation      | switch |
      | en   | English  | Uthmani  | Ayah translation | on     |
      | ur   | Urdu     | Indo-Pak | Ayah translation | on     |
      | ur   | Urdu     | Uthmani  | Uthmani          | off    |

  @AC-11
  Scenario: Selecting all on a Theme page selects no Arabic
    Given I open "/en/themes/dhul-kifl"
    When I press Select All
    Then no Arabic on the Theme page is in the selection

  # ---------------------------------------------------------------- AC-12: Reading places

  @AC-12
  Scenario: Visiting a Theme page leaves the Reading places as they were
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/themes/dhul-kifl"
    And I scroll to the bottom of the Theme page
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

  # ---------------------------------------------------------------- AC-4: descriptions never shown

  @AC-4
  Scenario Outline: A Theme's description is never shown, on its Theme page or beside its chip, in <Language>
    Given I open "/<lang>/themes/hypocrisy"
    Then the page does not hold the description of "Hypocrisy"
    When I open "/<lang>/2"
    Then the page does not hold the description of "Hypocrisy"

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  # ---------------------------------------------------------------- AC-13: both Scripts, both Languages, both colour themes, phone width

  @AC-13
  Scenario Outline: The Theme page in <Script>, <Language>, on the <Theme> paper, on a <viewport>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script>         |
      | <Theme>          |
      | Ayah translation |
    When I open "/<lang>/themes/dhul-kifl" in a fresh browser with an empty cache that keeps those choices
    And I view the Theme page on a <viewport>
    Then each Ayah of "Dhul-Kifl" shows its Arabic in <Script>, with its end-of-Ayah marker and number, and not in the other Script
    And the page does not scroll sideways
    And the Theme page is drawn on the <theme> paper
    And I save a screenshot "AC-13-theme-page-<script>-<lang>-<theme>-<viewport>"

    Examples:
      | Script   | script   | lang | Language | Theme | theme | viewport |
      | Uthmani  | uthmani  | en   | English  | Light | light | desktop  |
      | Uthmani  | uthmani  | en   | English  | Dark  | dark  | phone    |
      | Uthmani  | uthmani  | ur   | Urdu     | Light | light | phone    |
      | Uthmani  | uthmani  | ur   | Urdu     | Dark  | dark  | desktop  |
      | Indo-Pak | indopak  | en   | English  | Light | light | phone    |
      | Indo-Pak | indopak  | en   | English  | Dark  | dark  | desktop  |
      | Indo-Pak | indopak  | ur   | Urdu     | Light | light | desktop  |
      | Indo-Pak | indopak  | ur   | Urdu     | Dark  | dark  | phone    |

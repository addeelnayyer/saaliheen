@issue-199
Feature: The Supplications page
  The Supplications page, /{lang}/supplications, reached from Explore's
  Supplications card after Themes and Iltifat, and under Explore in the site
  bar, lists every Supplication in
  Quran order (#195, ADR 0027). Each shows its Speaker in the reader's Language, each Ayah's
  Arabic in the reader's Script, set out Ayah by Ayah through the shared Ayah
  list the Iltifat pages use, its Ayah translation when that is on, and a link
  to its Ayah in its Surah. In this issue the page shows the Supplications
  only, unfiltered: the Other words to Allah are left off it.

  It renders on request from Neon, cached by tag, and is never prerendered at
  build, so Explore's card for it does not prefetch it, as its card for the
  Iltifat overview does not. Visiting it leaves the Reading places where
  they were.

  The page reads the run's own Postgres, which db:migrate loaded from the
  curated file before the build. The expected Supplications and Speakers are
  read from the curated file (data/supplications/supplications.json); Arabic
  and Ayah translations from the sources; the page's name is the issue's.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-15: from Explore, not prefetched

  @AC-15 @AC-18
  Scenario Outline: Explore in <Language> has a Supplications card to the Supplications page in <Language>, with its count, not prefetched
    Given I open Explore in <Language>
    Then Explore's "Supplications" card links to the Supplications page in <Language>
    And the "Supplications" card says what it is for in one line written in <Language>
    And the "Supplications" card counts 73 Supplications, as the API serves them and the Supplications page shows them
    And once Explore has settled, it has prefetched its "Themes" card but not its "Supplications" card
    When I follow Explore's "Supplications" card
    Then I am on the Supplications page in <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-15: under Explore

  @AC-15
  Scenario Outline: On the Supplications page in <Language>, Explore is the current destination, and the page leads back to it
    Given I open "/<lang>/supplications"
    Then Explore is marked as the current destination, and no other
    And the page's own content has a link back to Explore in <Language>
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  # ---------------------------------------------------------------- AC-12: every Supplication, in Quran order, with its Speaker, Arabic and link

  @AC-12 @AC-18
  Scenario Outline: The Supplications page in <Language> lists every Supplication in Quran order, each with its Speaker, its Arabic and a link to its Ayah
    Given I open "/<lang>/supplications"
    Then the Supplications page's heading is "Supplications"
    And the page lists every Supplication of the curated file in Quran order, each in an entry of its own headed by its Surah and run
    And the page lists none of the curated file's Other words to Allah
    And each entry on the Supplications page names its Speaker in <Language>
    And each entry on the Supplications page shows the Arabic of every Ayah of its run, in order, in Uthmani
    And each entry on the Supplications page links to its first Ayah in its Surah, in <Language>

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  @AC-12 @AC-16 @AC-18
  Scenario: A Supplication's link opens its Surah at its Ayah, leaving the Reading place where it was
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en/supplications"
    And I follow the link of the Supplication at 2:127–129
    Then I am on "/en/2" at Ayah 2:127
    And Ayah 2:127 is at the top of the screen
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  # ---------------------------------------------------------------- AC-12, AC-13: the reader's Language and Script, the Ayah translation when on

  @AC-12 @AC-13 @AC-18
  Scenario Outline: The Supplications page in <Language>, in <Script>, with the Ayah translation <switch>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script>      |
      | <translation> |
    When I open "/<lang>/supplications" in a fresh browser with an empty cache that keeps those choices
    Then each Ayah on the Supplications page shows its Arabic in <Script>, and not in the other Script
    And each Ayah on the Supplications page shows its Ayah translation in <Language>: <switch>
    And each entry on the Supplications page names its Speaker in <Language>

    Examples:
      | lang | Language | Script   | translation      | switch |
      | en   | English  | Uthmani  | Ayah translation | on     |
      | ur   | Urdu     | Indo-Pak | Ayah translation | on     |
      | ur   | Urdu     | Uthmani  | Uthmani          | off    |
      | en   | English  | Indo-Pak | Indo-Pak         | off    |

  # ---------------------------------------------------------------- AC-14: on request, never prerendered

  @AC-14 @AC-18
  Scenario: The Supplications page is rendered on request, and the build prerendered it in neither Language
    Then the Supplications page in Urdu and in English is rendered on request, not served from the build's prerendered pages
    And the build's prerendered pages hold no Supplications page

  # ---------------------------------------------------------------- AC-16: Reading places

  @AC-16 @AC-18
  Scenario: Visiting the Supplications page leaves the Reading places as they were
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/supplications"
    And the Supplications page's heading is "Supplications"
    And I scroll to the bottom of the Supplications page
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

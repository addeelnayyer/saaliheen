@issue-138
Feature: The Iltifat pages
  The Iltifat overview, /{lang}/iltifat, reached from Explore, explains
  Iltifat in a few plain-English sentences and shows the four Iltifat
  directions, each with a one-line description and its count, leaving out
  Disputed Iltifat. Each direction has its own page,
  /{lang}/iltifat/{he-to-we|we-to-he|he-to-you|you-to-he}, listing its Iltifat
  in Quran order: each entry headed by its Surah's name and run, linking into
  the Surah at the cited Ayah as a look-up, with a direction badge, a Disputed
  tag when it applies, its Ayahs in Ayah by Ayah and its reason, in English in
  both Languages. Iltifat with the same direction and the same run share one
  entry. Visiting the pages, and following their links, leave the Reading
  places as they were.

  The pages read the Iltifat from the run's own Postgres, which db:migrate
  loaded from the catalogue before the build. No save exists yet, and no two
  Iltifat of the catalogue share both direction and run, so before the build
  the site tests' harness (features/site/start-test-database.ts) gives the two
  We → He Iltifat cited at 35:31 and 35:32 the one run 35:31–32, as an Admin's
  edit will. The expected Iltifat are read from the database; Arabic and Ayah
  translations from the sources; counts and direction names are the issue's.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-4: reached from Explore
  # The Surah index's link to the Iltifat overview went in #193: Explore leads there now (#192).

  @AC-4
  Scenario Outline: Explore in <Language> links to the Iltifat overview in <Language>
    Given I open Explore in <Language>
    When I follow Explore's "Iltifat" card
    Then I am on the Iltifat overview in <Language>

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- AC-5: the overview

  @AC-5 @AC-15
  Scenario Outline: The Iltifat overview in <Language> explains Iltifat, then shows the four directions with their counts, leaving out Disputed Iltifat
    Given I open "/<lang>/iltifat"
    Then the Iltifat overview's heading is "Iltifat"
    And the Iltifat overview explains Iltifat in plain English before its directions
    And the Iltifat overview shows these Iltifat directions, in this order, each with a one-line description and its count, linking to its page:
      | direction | count | page                   |
      | He → We   | 144   | /<lang>/iltifat/he-to-we  |
      | We → He   | 95    | /<lang>/iltifat/we-to-he  |
      | He → You  | 51    | /<lang>/iltifat/he-to-you |
      | You → He  | 20    | /<lang>/iltifat/you-to-he |
    And the Iltifat overview shows "310 Iltifat · 16 disputed"
    And the Iltifat overview has a sentence about 36:22
    And at its foot the Iltifat overview has a source note naming Abdel Haleem (1992), saying his lists are not final and that the reasons are Saaliheen's short summaries guided by his account

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- AC-6: Quran order, a fragment for each

  @AC-6 @AC-15
  Scenario Outline: The <direction> page lists its Iltifat in Quran order, each with a fragment from its id
    Given I open "/en/iltifat/<page>"
    Then the page's heading names the Iltifat direction "<direction>"
    And the page lists every <direction> Iltifat in the database, in Quran order, each in an entry of its own run
    And every <direction> Iltifat has one element on the page whose id is "iltifat-" and its id

    Examples:
      | direction | page      |
      | He → We   | he-to-we  |
      | We → He   | we-to-he  |
      | He → You  | he-to-you |
      | You → He  | you-to-he |

  @AC-6
  Scenario Outline: A link to the fragment of the <direction> Iltifat at <run> lands on its entry, in <Language>
    When I open the <direction> page in <Language> at the fragment of the Iltifat at <run>
    Then the entry of the <direction> Iltifat at <run> is at the top of the screen

    Examples:
      | direction | run      | Language |
      | He → We   | 17:1     | English  |
      | We → He   | 17:1     | Urdu     |
      | He → You  | 55:3–13  | English  |
      | You → He  | 2:285–286 | Urdu    |

  # ---------------------------------------------------------------- AC-7, AC-13: each entry

  @AC-7 @AC-13
  Scenario Outline: Each entry on the <direction> page in <Language> shows its heading, badge, Disputed tag, Ayahs and reason
    Given I open "/<lang>/iltifat/<page>"
    Then each entry's heading names its Surah and its run, and links into its Surah at the cited Ayah of one of its Iltifat
    And each entry shows the direction badge "<direction>", announced as "turns from <from> to <to>"
    And each entry shows a Disputed tag for each of its Disputed Iltifat, announced as "disputed", and none for the others
    And each entry shows the Arabic of every Ayah of its run, in order, in Uthmani
    And each Iltifat's own place in its entry shows its reason from the database

    Examples:
      | direction | page      | from | to  | lang | Language |
      | He → We   | he-to-we  | He   | We  | en   | English  |
      | We → He   | we-to-he  | We   | He  | ur   | Urdu     |
      | He → You  | he-to-you | He   | You | en   | English  |
      | You → He  | you-to-he | You  | He  | ur   | Urdu     |

  @AC-7
  Scenario: The entry of Al-Fatihah 1:2–5 is headed with its Surah's name and run
    Given I open "/en/iltifat/he-to-you"
    Then the entry of the He → You Iltifat at 1:2–5 is headed "Al-Fatihah 1:2–5"

  # ---------------------------------------------------------------- AC-8: the Ayahs honour the reader's settings

  @AC-8
  Scenario Outline: The Ayahs of the You → He page are in <Script>, with the Ayah translation <switch>, in <Language>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script>            |
      | <translation>       |
      | Arabic size larger  |
      | Arabic size larger  |
      | Meaning size larger |
    When I open "/<lang>/iltifat/you-to-he" in a fresh browser with an empty cache that keeps those choices
    Then each Ayah on the Iltifat page shows its Arabic in <Script>, with its end-of-Ayah marker and number, and not in the other Script
    And each Ayah on the Iltifat page shows its Ayah translation in <Language>: <switch>
    And no Arabic on the Iltifat page can be selected
    And the Iltifat page's Arabic is 130% and its Ayah translations 115% of a fresh browser's
    And the Iltifat page has no Word card, no chip, no Phrase colour and no Recitation control

    Examples:
      | lang | Language | Script   | translation      | switch |
      | en   | English  | Uthmani  | Ayah translation | on     |
      | ur   | Urdu     | Indo-Pak | Ayah translation | on     |
      | ur   | Urdu     | Uthmani  | Uthmani          | off    |

  # ---------------------------------------------------------------- AC-9: the reason in English

  @AC-9
  Scenario Outline: On the He → You page in <Language>, every reason is the database's English reason, marked as English
    Given I open "/<lang>/iltifat/he-to-you"
    Then each Iltifat's own place in its entry shows its reason from the database
    And every reason on the page is marked as English

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  # ---------------------------------------------------------------- AC-10: the shared run, and merely overlapping runs

  @AC-10 @AC-3 @AC-15
  Scenario Outline: The two We → He Iltifat sharing the run 35:31–32 show its Ayahs once, with both reasons under them, in <Language>
    Given the two We → He Iltifat cited at 35:31 and 35:32 both have the run 35:31–32 in the database
    When I open "/<lang>/iltifat/we-to-he"
    Then the We → He Iltifat cited at 35:31 and 35:32 are in one entry, headed with Surah 35's name and "35:31–32"
    And that entry shows the Arabic of Ayahs 35:31 and 35:32 once each, in order
    And that entry shows both Iltifat's reasons from the database, after its Ayahs

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-10
  Scenario: The He → We Iltifat at 5:13–14 and 5:14–15 merely overlap, so they stay two entries
    Given I open "/en/iltifat/he-to-we"
    Then the He → We Iltifat at 5:13–14 and the one at 5:14–15 are in two entries, one after the other
    And the entry of 5:13–14 shows the Arabic of Ayahs 5:13 and 5:14, and the entry of 5:14–15 the Arabic of Ayahs 5:14 and 5:15

  # ---------------------------------------------------------------- AC-11: the look-up link and Reading places

  @AC-11 @AC-15
  Scenario: An entry's heading opens the Surah at the cited Ayah as a look-up, leaving the Reading place where it was
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en/iltifat/he-to-you"
    And I follow the heading of the He → You Iltifat at 2:23–25
    Then I am on "/en/2" at Ayah 2:25
    And Ayah 2:25 is at the top of the screen
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  @AC-11 @AC-15
  Scenario: Visiting the Iltifat pages leaves the Reading places as they were
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/iltifat"
    And the Iltifat overview's heading is "Iltifat"
    And I open "/ur/iltifat/he-to-we"
    And the page's heading names the Iltifat direction "He → We"
    And I scroll to the bottom of the Iltifat page
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

  # ---------------------------------------------------------------- AC-12: whole without JavaScript

  @AC-12
  Scenario Outline: Without JavaScript, the <direction> page in <Language> holds every Iltifat, its reason and its Ayahs
    When I open "/<lang>/iltifat/<page>" without JavaScript
    Then every <direction> Iltifat in the database has its element "iltifat-" and its id, with its reason, in an entry holding the Arabic of every Ayah of its run

    Examples:
      | direction | page      | lang | Language |
      | He → We   | he-to-we  | en   | English  |
      | We → He   | we-to-he  | en   | English  |
      | He → You  | he-to-you | ur   | Urdu     |
      | You → He  | you-to-he | en   | English  |

  @AC-12
  Scenario: Without JavaScript, the Iltifat overview shows its four directions and their counts
    When I open "/en/iltifat" without JavaScript
    Then the Iltifat overview shows these Iltifat directions, in this order, each with a one-line description and its count, linking to its page:
      | direction | count | page                 |
      | He → We   | 144   | /en/iltifat/he-to-we  |
      | We → He   | 95    | /en/iltifat/we-to-he  |
      | He → You  | 51    | /en/iltifat/he-to-you |
      | You → He  | 20    | /en/iltifat/you-to-he |

  # ---------------------------------------------------------------- AC-13: keyboard

  @AC-13
  Scenario: The Iltifat pages are reached from Explore, and an entry's heading followed, with the keyboard alone
    Given I open Explore in English
    When I press Tab until the link to "/en/iltifat" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on the Iltifat overview in English
    When I press Tab until the link to "/en/iltifat/you-to-he" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on the Iltifat page "/en/iltifat/you-to-he"
    When I press Tab until the link to "/en/2#2:54" has the focus
    Then the focused link shows a focus ring

  # ---------------------------------------------------------------- AC-14: both Scripts, both Languages, both colour themes, phone width

  @AC-14
  Scenario Outline: The You → He page in <Script>, <Language>, on the <Theme> paper, on a <viewport>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script>         |
      | <Theme>          |
      | Ayah translation |
    When I open "/<lang>/iltifat/you-to-he" in a fresh browser with an empty cache that keeps those choices
    And I view the Iltifat page on a <viewport>
    Then each Ayah on the Iltifat page shows its Arabic in <Script>, with its end-of-Ayah marker and number, and not in the other Script
    And every entry on the Iltifat page lies within the screen's width
    And the page does not scroll sideways
    And the Iltifat page is drawn on the <theme> paper
    And I save a screenshot "AC-14-iltifat-you-to-he-<script>-<lang>-<theme>-<viewport>"

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

  @AC-14
  Scenario Outline: The Iltifat overview in <Language>, on the <Theme> paper, on a <viewport>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Theme> |
    When I open "/<lang>/iltifat" in a fresh browser with an empty cache that keeps those choices
    And I view the Iltifat page on a <viewport>
    Then the Iltifat overview's heading is "Iltifat"
    And every entry on the Iltifat page lies within the screen's width
    And the page does not scroll sideways
    And the Iltifat page is drawn on the <theme> paper
    And I save a screenshot "AC-14-iltifat-overview-<lang>-<theme>-<viewport>"

    Examples:
      | lang | Language | Theme | theme | viewport |
      | en   | English  | Light | light | desktop  |
      | en   | English  | Dark  | dark  | phone    |
      | ur   | Urdu     | Light | light | phone    |
      | ur   | Urdu     | Dark  | dark  | desktop  |

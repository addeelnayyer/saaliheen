@issue-170
Feature: Themes read from Neon show what they showed before
  Themes moved into Neon (ADR 0011, ADR 0020, ADR 0037). Theme chips in
  Study, the Themes list, every Theme page, Theme part and Theme opening, the
  Theme pages' Link previews, and Explore's count of Theme categories now read
  them through the site's server-side data layer, rendered when first asked
  for and then served from Next's cache, and show exactly what they showed
  before the move.

  "Before the move" is the website's output as last committed at 5127e94
  (features/site/committed-output.ts): the Themes file (data/themes.json) and
  the generated dataset (data/generated/themes.json, each Ayah's Themes in
  data/generated/surahs/), read from git so that it outlives their deletion.
  Names, counts and Passage groups are read from it, never typed. The site is
  the production build, served against the run's own Postgres, which `pnpm
  db:migrate` migrated and loaded the Themes into (features/site/start-test-database.ts).

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-3: every Theme page, in both Languages

  @AC-3 @AC-10
  Scenario Outline: Every Theme page in <Language>, loaded directly, shows its committed name, Theme category, count and Passage groups
    Then every committed Theme's page in <Language>, loaded directly, is headed with its name in <Language>
    And shows its committed Theme category in <Language> and its committed count of Ayahs before its first Passage group
    And lists exactly its committed Passage groups, in order, each with a link to its Passage and its committed Ayahs under it

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  @AC-3 @AC-10
  Scenario Outline: Every Theme page in <Language>, opened inside the app, starts with its first Theme part and fills in from the rest
    Then every committed Theme's page in <Language>, opened inside the app, shows the Passage groups of its first Theme part
    And its Theme parts in <Language>, from the second on, hold the rest of its committed Passage groups, split into parts as before
    And no committed Theme has a Theme part in <Language> past its last

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  @AC-3 @AC-10
  Scenario: A Theme that names no committed Theme has no page, no opening and no part
    Then these addresses are not found:
      | /en/themes/no-such-theme                |
      | /ur/themes/no-such-theme                |
      | /en/opening/themes/no-such-theme        |
      | /ur/opening/themes/no-such-theme        |
      | /parts/en/themes/no-such-theme/2.json   |
      | /parts/ur/themes/no-such-theme/2.json   |

  # ---------------------------------------------------------------- AC-3: Theme chips in Study, on every Surah page, opening and part

  @AC-3 @AC-10
  Scenario Outline: Every Ayah of every Surah in <Language> shows its committed Themes as Theme chips
    Then every Ayah of each of the 114 Surahs, loaded directly in <Language>, shows the Theme chips its committed Surah file names, in tagged order, each named in <Language> and linking to its Theme page in <Language>
    And every Ayah each Surah's opening page in <Language> carries shows those same Theme chips
    And every Surah part in <Language> gives each of its Ayahs the Themes its committed Surah file names, in tagged order

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  # ---------------------------------------------------------------- AC-3: the Themes list and Explore

  @AC-3 @AC-10
  Scenario Outline: The Themes list in <Language> shows the committed Theme categories, Themes and counts
    Given I open "/<lang>/themes"
    Then the Themes list shows the 13 Theme categories of the Themes file, in its order, each named in <Language>
    And under each Theme category the Themes list lists exactly that category's Themes from the Themes file, each named in <Language>
    And each Theme on the Themes list shows its count of Ayahs from the Themes file
    And every Theme of the Themes file has one link on the Themes list, to "/<lang>/themes/" and its slug, named with its name in <Language>

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  @AC-3 @AC-10
  Scenario Outline: Explore's Themes card in <Language> counts the committed Theme categories
    Given I open Explore in <Language>
    Then the "Themes" card counts the Theme categories in the Themes file

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-3: every Theme page's Link preview

  @AC-3 @AC-10
  Scenario Outline: Every Theme page's Link preview in <Language> names its committed Theme and count, with its picture
    Then every committed Theme's page in <Language>, fetched by WhatsApp, has a Link preview title naming the Theme in <Language> and a description giving its committed count of Ayahs
    And each of those Link previews has a picture whose alt text gives the Theme's committed English name and count, and holds no Arabic-script letter
    And each of those Link preview pictures answers with a PNG picture 1200×630

    Examples:
      | lang | Language |
      | ur   | Urdu     |
      | en   | English  |

  # ---------------------------------------------------------------- AC-4: rendered once, then served from the cache

  @AC-4 @AC-10
  Scenario: Pages that read Themes are rendered once, then served from Next's cache, setting no cookie
    Then each of these addresses, asked for twice, answers 200 the second time from Next's cache with the same page, setting no cookie:
      | /en/themes/extravagance          |
      | /ur/themes/disbelief             |
      | /en/opening/themes/disbelief     |
      | /ur/themes                       |
      | /en/explore                      |
      | /ur/2                            |
      | /en/opening/2                    |

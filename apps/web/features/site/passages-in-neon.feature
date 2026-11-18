@issue-171
Feature: Surah pages read their Passages and Phrases from Neon and show what they showed before
  Passages, Passage titles and Phrases move into Neon (ADR 0011, ADR 0021).
  Surah pages read them through the site's server-side data layer and show
  exactly what they showed before the move: a Passage heading for each
  Passage (behind the Passage headings release switch), and Phrase colours on
  the Word cards of each covered Passage.

  This is the parity check of the Surah pages. "Before the move" is the
  output as last committed at 3a52736 (features/site/committed-output.ts):
  "the Passages file" and "the Phrases file" in these steps are
  those files read from git at that commit, so
  they outlive the files' deletion; "the run's database" is what the run's
  Postgres holds, those Passages with Surah 18 arranged unlike them
  (features/site/passages-in-the-test-database.ts). Passage titles and Phrases are read from
  them, never typed. The site is the production build, served against the
  run's own Postgres, which `pnpm db:migrate` migrated and loaded the Passages
  and Phrases into (features/site/start-test-database.ts).

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-7: every Surah page's Passages

  @passage-headings-on @AC-7
  Scenario Outline: Every Surah page in <Language>, as a crawler gets it, shows the committed Passages as its Passage headings
    Then every Surah page in <Language>, fetched without scripts, shows a <Language> Passage heading for each of the Surah's Passages in the run's database, above its first Ayah, and no other

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-7: the Phrases on the Surah pages

  @AC-7
  Scenario Outline: Al-Fatihah in <Language> tints its Word cards as the committed Phrases say
    Given I open Surah 1 in <Language>
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-7
  Scenario Outline: Surah <Surah> in <Language>, which the committed Phrases do not cover, tints no Word card
    Given Surah <Surah>'s Passages are not covered by the Phrases file
    And I open Surah <Surah> in <Language>
    Then no Word card of Surah <Surah> is tinted

    Examples:
      | Surah | Language |
      | 112   | Urdu     |
      | 114   | English  |

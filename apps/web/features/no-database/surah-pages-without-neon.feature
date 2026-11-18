@issue-147
Feature: Surah pages and Surah parts without Neon
  Allah references are read from Neon (ADR 0012), and so, since #170, are
  each Ayah's Themes (ADR 0037): a Surah page and its parts are rendered on
  their first request, not at build, and then served from the cache (ADR
  0020). When Neon cannot be reached while the site is built and served, the
  site still builds; a Surah page never cached answers the error page with a
  Retry rather than a page without its Themes, and draws no Word in Allah
  reference colour. A cached page is still served, and the error page is kept
  for a second only, so a request once Neon is back renders the page.

  Since #172 the Surah list itself is read from Neon (ADR 0049), so the pages
  that list the Surahs, the Surah index, the Juz index and Me, answer the
  error page with Retry too, rather than a Surah list read from files.

  A Root page (#287) reads its Root and Ayahs from Neon on its first request
  too, so it answers the error page with Retry the same way (ADR 0040), and
  so does the Roots list (#290), which reads every Root from Neon.

  These scenarios drive, in a browser, a production build made and served
  with its database unreachable (features/no-database/serve-without-database.ts).
  Allah reference colour is #A87A0A in the light theme and #E3B84F in the
  dark theme.

  @AC-11
  Scenario Outline: Surah <surah> in <Language>, built and served with Neon unreachable, shows the error page with Retry and no gold
    Given the site was built and is served with its database unreachable
    When I open Surah <surah> in <Language>
    Then the page answers 200
    And the page says it could not be loaded and offers Retry
    And no letter on the page is drawn in Allah reference colour

    Examples:
      | surah | Language |
      | 1     | English  |
      | 12    | Urdu     |
      | 112   | English  |

  @AC-11 @issue-172
  Scenario Outline: <page>, built and served with Neon unreachable, shows the error page with Retry
    Given the site was built and is served with its database unreachable
    When I open <page> at "<address>"
    Then the page answers 200
    And the page says it could not be loaded and offers Retry

    Examples:
      | page                       | address |
      | the Surah index in English | /en     |
      | the Juz index in Urdu      | /ur/juz |
      | Me in English              | /en/me  |
      | the Root page of ر ح م in Urdu | /ur/roots/رحم |
      | the Roots list in English  | /en/roots |
      | the Roots list in Urdu     | /ur/roots |

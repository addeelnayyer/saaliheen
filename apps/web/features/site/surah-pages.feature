@AC-2-15
Feature: Surah pages in the production build
  Every Surah has a page in each Language, made on its first request and then
  served from the cache (ADR 0040), with its Word cards already in the served HTML.

  # Each is made on its first request, so a run's first pass over all 114
  # takes longer than a test's usual minute.
  @AC-2-7 @slow
  Scenario Outline: All 114 Surah pages in <Language> are served with their Word cards in the HTML
    Then each of the 114 Surahs has a page in <Language> whose served HTML already holds the Word card of the Surah's first Word

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-2-7
  Scenario: Surah numbers outside 1 to 114 are not pages
    Then these addresses are not found:
      | /ur/0   |
      | /ur/115 |
      | /en/0   |
      | /en/115 |

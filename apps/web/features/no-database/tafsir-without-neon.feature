@issue-233
Feature: A Surah's Tafsir from /api/v1 without Neon
  A caller must be able to tell a Surah with no Tafsir from a Tafsir that
  could not be read: when the database cannot be reached,
  GET /api/v1/tafsir/{surah}?lang= answers the API's usual error response,
  503 with a JSON error and Min-App-Version, as the Allah references endpoint
  does (ADR 0028), never an empty list.

  This scenario calls the endpoint over HTTP on a production build made and
  served with its database unreachable
  (features/no-database/serve-without-database.ts).

  @AC-7
  Scenario Outline: With Neon unreachable, GET /api/v1/tafsir/<surah>?lang=<lang> answers the API's usual error, never an empty list
    Given the site was built and is served with its database unreachable
    When I GET "/api/v1/tafsir/<surah>?lang=<lang>" with neither cookie nor token
    Then the API answers 503 with a JSON error
    And the answer names no Tafsir entries
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | surah | lang |
      | 2     | en   |
      | 108   | ur   |

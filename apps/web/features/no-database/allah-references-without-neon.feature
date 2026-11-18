@issue-150
Feature: A Surah's Allah references from /api/v1 without Neon
  Pages are drawn without Allah references when Neon cannot be reached (#147),
  but an API client keeps what it is told: a mobile app that heard "none, at
  version 0" would drop its gold until the version next moved. So when the
  database cannot be reached, GET /api/v1/allah-references/{surah} answers the
  API's usual error response, 503 with a JSON error and Min-App-Version, and
  the app keeps the Allah references it already has.

  This scenario calls the endpoint over HTTP on a production build made and
  served with its database unreachable
  (features/no-database/serve-without-database.ts).

  @AC-7
  Scenario Outline: With Neon unreachable, GET /api/v1/allah-references/<surah> answers the API's usual error, never an empty list
    Given the site was built and is served with its database unreachable
    When I GET "/api/v1/allah-references/<surah>" with neither cookie nor token
    Then the API answers 503 with a JSON error
    And the answer names no Word locations and no version
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | surah |
      | 1     |
      | 108   |

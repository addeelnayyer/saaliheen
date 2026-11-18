@issue-170
Feature: A cached Theme page is still served when Neon cannot answer
  A Theme page reads Neon on its first request and is then served from Next's
  cache (ADR 0040). When Neon cannot be reached, a page in the cache is still
  served as it was (ADR 0020): no reader of a page already rendered meets the
  error page. A page never cached shows the error page with Retry instead,
  kept out of search engines and kept in the cache for a second only (ADR
  0040), so that it is the Theme page again soon after Neon answers.

  These scenarios serve the production build on the run's own Postgres
  (./serve-api.ts), render a Theme page into the cache, then make the database
  refuse every connection, as an unreachable Neon would, and take
  connections again afterwards. The Theme's names are the Themes file's as
  last committed (data/themes.json at 5127e94), which the Theme load put into
  the database.

  @AC-6
  Scenario Outline: The Theme page of <theme> in <Language>, once rendered, is still served when Neon cannot answer
    Given the Theme page of "<theme>" in <Language> has been rendered into Next's cache
    When the database refuses every connection
    Then the Theme page of "<theme>" in <Language> answers 200 from Next's cache
    And it is headed with the Theme's name in <Language>, and is not the error page

    Examples:
      | theme     | Language |
      | faith     | Urdu     |
      | faith     | English  |
      | disbelief | Urdu     |
      | disbelief | English  |

  # The uncached half. The warm-up (./warm-up.feature) renders every Theme
  # page, so this feature's spec runs before every other in the run
  # (vitest.api.config.ts), and these Themes are ones no other scenario asks
  # for.

  @AC-6
  Scenario Outline: The Theme page of <theme> in <Language>, never rendered, is the error page with Retry when Neon cannot answer
    Given the Theme page of "<theme>" in <Language> has not been rendered
    When the database refuses every connection
    Then the Theme page of "<theme>" in <Language> answers 200
    And it is the error page: an alert that says the page could not be loaded, with a Retry button
    And it is kept out of search engines

    Examples:
      | theme          | Language |
      | seeking-refuge | Urdu     |
      | gratitude      | English  |

  @AC-6
  Scenario Outline: The Theme page of <theme> in <Language>, drawn as the error page, is the Theme page again soon after Neon answers
    Given the Theme page of "<theme>" in <Language> has not been rendered
    And the database refuses every connection
    And the Theme page of "<theme>" in <Language> is the error page
    When the database takes connections again
    And more than a second passes
    Then within two requests the Theme page of "<theme>" in <Language> is headed with the Theme's name in <Language>, and is not the error page
    And later requests for it are served from Next's cache as the Theme page

    Examples:
      | theme        | Language |
      | sincerity    | Urdu     |
      | truthfulness | English  |

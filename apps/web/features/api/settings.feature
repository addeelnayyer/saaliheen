@issue-70
Feature: An Account's synced settings through the versioned API
  The versioned API (/api/v1, ADR 0008) is the site's own route group of
  plain JSON, read by the website and the mobile app alike. Its settings
  resource, /api/v1/settings, holds the two settings that follow a person to
  every device: their Script and their Language. Arabic size and Meaning size
  stay on each device and are never synced. The API answers to the website's
  session cookie and to the mobile app's bearer token, and refuses a request
  that carries neither. Every answer names the minimum app version still
  supported, as the published dataset's manifest does, so an app too old to
  be supported can ask its reader to update.

  These scenarios are the API's HTTP contract: they talk to the production
  build over HTTP, served against the run's own, empty Postgres
  (features/api/serve-api.ts), and sign in through the Account test-only
  sign-in, POST /api/v1/auth/test-sign-in, whose answer carries a session
  cookie, and the bearer token a mobile app keeps in its set-auth-token header.

  @AC-4 @AC-5
  Scenario Outline: A new Account reads its settings with its <credential>, and has chosen no Script or Language yet
    Given I am signed in to an Account as "<email>"
    When I GET "/api/v1/settings" with my <credential>
    Then the API answers 200 with JSON
    And the settings name no Script and no Language

    Examples:
      | credential     | email                        |
      | session cookie | new-cookie@saaliheen.test    |
      | bearer token   | new-bearer@saaliheen.test    |

  @AC-4 @AC-5
  Scenario Outline: An Account saves its Script and Language with its <credential> and reads them back with its <other credential>
    Given I am signed in to an Account as "<email>"
    When I PATCH "/api/v1/settings" with my <credential> and the JSON:
      """
      { "script": "<script>", "language": "<language>" }
      """
    Then the API answers 200 with JSON
    And the settings are the Script "<script>" and the Language "<language>"
    And reading the settings back with my <other credential> gives the Script "<script>" and the Language "<language>"

    Examples:
      | credential     | other credential | email                      | script  | language |
      | session cookie | bearer token     | save-cookie@saaliheen.test | indopak | ur       |
      | bearer token   | session cookie   | save-bearer@saaliheen.test | uthmani | en       |
      | session cookie | session cookie   | save-both@saaliheen.test   | indopak | en       |
      | bearer token   | bearer token     | save-token@saaliheen.test  | uthmani | ur       |

  @AC-5
  Scenario: Saving only the Language keeps the Script, and saving only the Script keeps the Language
    Given I am signed in to an Account as "partial@saaliheen.test"
    And I have saved the Script "indopak" and the Language "ur"
    When I PATCH "/api/v1/settings" with my session cookie and the JSON:
      """
      { "language": "en" }
      """
    Then the API answers 200 with the Script "indopak" and the Language "en"
    When I PATCH "/api/v1/settings" with my bearer token and the JSON:
      """
      { "script": "uthmani" }
      """
    Then the API answers 200 with JSON
    And the settings are the Script "uthmani" and the Language "en"
    And reading the settings back with my session cookie gives the Script "uthmani" and the Language "en"

  @AC-5
  Scenario Outline: Saving the settings with the body <body> is refused and changes nothing
    Given I am signed in to an Account as "<email>"
    And I have saved the Script "indopak" and the Language "ur"
    When I PATCH "/api/v1/settings" with my bearer token and the body '<body>'
    Then the API answers 400 with a JSON error
    And reading the settings back with my bearer token gives the Script "indopak" and the Language "ur"

    Examples:
      # A Script that is not one, a Language that is not one, a Script that is
      # a number, a body that is not JSON, and a JSON list.
      | email                      | body                                  |
      | refused-1@saaliheen.test   | { "script": "naskh" }                 |
      | refused-2@saaliheen.test   | { "language": "ar" }                  |
      | refused-3@saaliheen.test   | { "script": 2, "language": "en" }     |
      | refused-4@saaliheen.test   | script=uthmani                        |
      | refused-5@saaliheen.test   | ["uthmani", "en"]                     |

  @AC-3 @AC-5
  Scenario: Arabic size and Meaning size sent with the settings are never kept
    Given I am signed in to an Account as "sizes@saaliheen.test"
    When I PATCH "/api/v1/settings" with my session cookie and the JSON:
      """
      { "script": "indopak", "language": "ur", "arabicSize": 130, "meaningSize": 115 }
      """
    Then the API answers 200 with JSON
    And the settings hold exactly a Script and a Language
    And the settings are the Script "indopak" and the Language "ur"
    And read back with my bearer token, the settings hold exactly a Script and a Language
    And the Account database holds no Arabic size or Meaning size for the Account

  @AC-5
  Scenario: One Account's settings are never another's
    Given I am signed in to an Account as "first@saaliheen.test"
    And I have saved the Script "indopak" and the Language "ur"
    When I am signed in to an Account as "second@saaliheen.test"
    And I GET "/api/v1/settings" with my session cookie
    Then the API answers 200 with JSON
    And the settings name no Script and no Language

  @AC-4 @AC-5
  Scenario Outline: The API refuses a <method> of the settings with <credential>
    When I <method> "/api/v1/settings" with <credential>
    Then the API answers 401 with a JSON error

    Examples:
      | method | credential                      |
      | GET    | neither cookie nor token        |
      | PATCH  | neither cookie nor token        |
      | GET    | a bearer token that is made up  |
      | GET    | a session cookie that is forged |
      | PATCH  | a bearer token that is made up  |

  @AC-4 @AC-5
  Scenario Outline: After signing out, the signed-out session's <credential> is refused
    Given I am signed in to an Account as "<email>"
    When I sign out through the API with my <credential>
    And I GET "/api/v1/settings" with my <credential>
    Then the API answers 401 with a JSON error

    Examples:
      | credential     | email                         |
      | session cookie | signed-out-1@saaliheen.test   |
      | bearer token   | signed-out-2@saaliheen.test   |

  @AC-5
  Scenario Outline: The answer to <request> names the minimum app version the manifest names
    Given I am signed in to an Account as "<email>"
    When I <request>
    Then the answer names the minimum app version in its Min-App-Version header
    And that minimum app version is the one "/data/v1/manifest.json" names, "1.0.0"

    Examples:
      | email                    | request |
      | version-1@saaliheen.test | GET "/api/v1/settings" with my bearer token                   |
      | version-2@saaliheen.test | PATCH "/api/v1/settings" with my bearer token and a Script    |
      | version-3@saaliheen.test | PATCH "/api/v1/settings" with my session cookie and a Script that is not one |
      | version-4@saaliheen.test | GET "/api/v1/settings" with neither cookie nor token          |

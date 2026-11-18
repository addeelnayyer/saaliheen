@issue-75
Feature: The mobile app's Accounts through the versioned API
  The mobile app signs in to an Account itself (#75): the device's Sign in with
  Google or Sign in with Apple sheet gives the app the provider's id token, and
  the app sends it to Better Auth's native sign-in, POST
  /api/v1/auth/sign-in/social { provider, idToken }, which answers the bearer
  token the app keeps in its set-auth-token header. The app's requests come
  from its own scheme, saaliheen://, named in an Origin header or, as Expo's
  Better Auth client sends it, an expo-origin header; the API trusts that
  scheme as it trusts the website. Better Auth checks an origin only against a
  session cookie, and not at all while NODE_ENV is test, as it is here, so
  which origins are trusted is a line of the auth options, checked as such
  (DELIVERY/evidence.md). With its bearer token the app
  reads its session, signs out and deletes the Account, whose deletion, as on
  the website (#68), removes the Account and all its data at once, and asks for
  a sign-in made in the last day.

  A real Google or Apple id token needs a person at a real sheet, so here the
  native sign-in is sent an id token no provider issued: the API checks it and
  refuses it as one, 401, with no bearer token and no new Account. Signing in
  with a real token on a simulator is checked by hand (DELIVERY/by-hand.md).
  The bearer token here comes from the Account test-only sign-in, as in
  settings.feature.

  @AC-1 @AC-5
  Scenario Outline: The native sign-in with <method> from the app's <header> checks the id token, and refuses one no provider issued
    When the app sends the native sign-in with <method> an id token no provider issued, from "saaliheen://" in its <header> header
    Then the API answers 401 with the code "INVALID_TOKEN"
    And the answer carries no bearer token
    And the API holds no new Account

    Examples:
      | method | header      |
      | google | origin      |
      | google | expo-origin |
      | apple  | origin      |
      | apple  | expo-origin |

  @AC-1 @AC-5
  Scenario Outline: The app reads its session with its bearer token from <from>
    Given I am signed in to an Account as "<email>"
    When I GET "/api/v1/auth/get-session" with my bearer token from <from>
    Then the API answers 200 with the session of "<email>"

    Examples:
      | from                          | email                          |
      | no origin                     | app-session@saaliheen.test     |
      | "saaliheen://" in origin      | app-session-o@saaliheen.test   |
      | "saaliheen://" in expo-origin | app-session-e@saaliheen.test   |

  @AC-4 @AC-5
  Scenario Outline: Signing out with the bearer token from <from> ends the session, and the token is refused from then on
    Given I am signed in to an Account as "<email>"
    When I POST "/api/v1/auth/sign-out" with my bearer token from <from>
    Then the API answers 200
    And my bearer token is refused by "/api/v1/settings" from then on
    And the API still holds the Account of "<email>"

    Examples:
      | from                          | email                          |
      | no origin                     | app-signout@saaliheen.test     |
      | "saaliheen://" in origin      | app-signout-o@saaliheen.test   |
      | "saaliheen://" in expo-origin | app-signout-e@saaliheen.test   |

  @AC-4 @AC-5 @issue-252
  Scenario Outline: Deleting the Account with the bearer token from <from>, signed in in the last day, removes it and all its data at once
    Given I am signed in to an Account as "<email>"
    And with my bearer token I have saved the Language "en", read Surah 18 until Ayah 18:40 and marked the Root "ر ح م" as known
    And I am signed in to the same Account on a second device
    When I POST "/api/v1/auth/delete-user" with my bearer token from <from>
    Then the API answers 200
    And no row in the Account database is tied to the Account any more
    And my bearer token is refused by "/api/v1/settings" from then on
    And the second device's sign-in is refused too

    Examples:
      | from                          | email                          |
      | no origin                     | app-delete@saaliheen.test      |
      | "saaliheen://" in origin      | app-delete-o@saaliheen.test    |
      | "saaliheen://" in expo-origin | app-delete-e@saaliheen.test    |

  @AC-4 @AC-5
  Scenario Outline: Deleting the Account with a bearer token from a sign-in more than a day old, from <from>, is refused and deletes nothing
    Given I am signed in to an Account as "<email>"
    And with my bearer token I have saved the Language "en", read Surah 18 until Ayah 18:40 and marked the Root "ر ح م" as known
    And my sign-in was made 25 hours ago
    When I POST "/api/v1/auth/delete-user" with my bearer token from <from>
    Then the API answers 400 with the code "SESSION_EXPIRED"
    And the Account database still holds the Account, its settings, its Reading places and its Known words
    And my bearer token still reads the Language "en" from "/api/v1/settings"

    Examples:
      | from                          | email                          |
      | no origin                     | app-old-delete@saaliheen.test  |
      | "saaliheen://" in origin      | app-old-delete-o@saaliheen.test |

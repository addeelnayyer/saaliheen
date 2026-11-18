@issue-75
Feature: Signing in to an Account in the app
  A reader signs in to their Account inside the app, on Me, with Google or
  Apple, through the device's own Sign in with Google or Sign in with Apple
  sheet, and stays signed in each time they open the app again, until they sign
  out. The app is one more client of the versioned API (ADR 0008): it sends
  the sheet's id token to the website's /api/v1/auth, and keeps the bearer
  token the answer gives in the device's keychain, never in its plain storage.
  Reading never needs an Account, and the app no longer sends a reader to the
  website's Sign-in page to sign in. Each device has its own sign-in.

  These scenarios drive the app's Account (src/account.ts) and Me
  (src/destinations.ts) in Node against the Account resources of /api/v1 as the
  website's API contract pins them (features/accounts-api.ts). The sheets
  themselves, and how Me looks, are checked by hand on a simulator.

  Background:
    Given the app is launched on a new device

  @AC-1
  Scenario: Signed out, Me offers signing in with Google and with Apple inside the app
    Then Me offers signing in with Google and with Apple, in that order
    And Me's Sign in does not open the website's Sign-in page

  @AC-1
  Scenario Outline: Signing in with <Method> signs the app in to the Account, and Me shows it
    When I sign in with <Method> as "<email>"
    Then Me shows me signed in as "<email>", offering "Sign out" and "Delete Account"
    And the API holds one Account for "<email>"

    Examples:
      | Method | email                         |
      | Google | app-google@saaliheen.test     |
      | Apple  | app-apple@saaliheen.test      |

  @AC-1
  Scenario Outline: Signed in with <Method>, the app stays signed in after it is closed and opened again
    When I sign in with <Method> as "<email>"
    And I close the app and open it again on the same device
    Then Me shows me signed in as "<email>", offering "Sign out" and "Delete Account"
    And no sign-in sheet opened since the app was opened again
    And the app has read my Account's settings with the sign-in it kept
    And the app keeps its sign-in in the device's keychain, and nothing of it in the device's storage

    Examples:
      | Method | email                         |
      | Google | staying-google@saaliheen.test |
      | Apple  | staying-apple@saaliheen.test  |

  @AC-1
  Scenario: Signing in with Google and then with Apple by the same email is one Account
    When I sign in with Google as "both@saaliheen.test"
    And I sign out on Me
    And I sign in with Apple as "both@saaliheen.test"
    Then Me shows me signed in as "both@saaliheen.test", offering "Sign out" and "Delete Account"
    And the API holds one Account for "both@saaliheen.test"

  @AC-1
  Scenario Outline: Cancelling the Sign in with <Method> sheet leaves the app signed out and sends nothing
    Given every request the app makes is recorded
    When I open the Sign in with <Method> sheet and cancel it
    Then Me offers signing in with Google and with Apple, in that order
    And the app sent nothing to the API
    And the app holds no sign-in

    Examples:
      | Method |
      | Google |
      | Apple  |

  @AC-1
  Scenario: A sign-in the API refuses leaves the app signed out
    When the Sign in with Google sheet gives an id token the API refuses
    Then the sign-in ends as "refused"
    And Me offers signing in with Google and with Apple, in that order
    And the app holds no sign-in

  @AC-1
  Scenario: With no connection, signing in leaves the app signed out and says it needs one
    Given the phone has no connection
    When I sign in with Apple as "plane@saaliheen.test"
    Then the sign-in ends as "no connection"
    And Me offers signing in with Google and with Apple, in that order
    And the API holds no Account for "plane@saaliheen.test"

  @AC-1
  Scenario: Each device has its own sign-in
    When I sign in with Google as "first-device@saaliheen.test"
    And the app is launched on a second, new device
    Then Me offers signing in with Google and with Apple, in that order
    When I close the app and open it again on the first device
    Then Me shows me signed in as "first-device@saaliheen.test", offering "Sign out" and "Delete Account"

  @AC-1
  Scenario: Opened offline, the app stays signed in and keeps the Account for when the connection comes back
    When I sign in with Google as "offline-launch@saaliheen.test"
    And the phone has no connection
    And I close the app and open it again on the same device
    Then Me shows me signed in as "offline-launch@saaliheen.test", offering "Sign out" and "Delete Account"
    And the app holds a sign-in

@issue-75
Feature: Signing out and deleting the Account inside the app
  As the App Store requires, a signed-in reader signs out and deletes their
  Account from inside the app, on Me. Signing out ends this device's sign-in:
  the Account no longer knows it, the app forgets it, and the device keeps its
  own Reading places and settings, as any signed-out device does, sending
  nothing from then on. Deleting the Account, once Me has asked the reader to
  confirm, removes it and all its data at once, with no grace period, on every
  device (#68), and signs the app out. The website asks for a sign-in made in
  the last day before it deletes an Account; when the app's is older, the app
  asks the reader to sign in again with the same method, then deletes. Deleting
  the Account elsewhere signs the app out the next time it is opened.

  How Me asks to confirm, in the website's words, is checked by hand on a
  simulator.

  Background:
    Given the app is launched on a new device

  @AC-4
  Scenario: Signing out on Me signs the app out, and the Account no longer knows its sign-in
    Given at "2026-10-06T08:00:00Z", I sign in with Google as "leaving-for-now@saaliheen.test"
    And at "2026-10-06T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    When I sign out on Me
    Then Me offers signing in with Google and with Apple, in that order
    And the app holds no sign-in
    And the API refuses the sign-in the app held
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 40   |
    And the API holds one Account for "leaving-for-now@saaliheen.test"

  @AC-4
  Scenario: After signing out, reading and choosing send nothing, and the app stays signed out when opened again
    Given I sign in with Apple as "signed-out-quiet@saaliheen.test"
    And I sign out on Me
    And every request the app makes is recorded
    When at "2026-10-06T10:00:00Z", I read Surah 2 in the app until Ayah 2:255 is at the top of the screen
    And I choose the Language "en" on Me
    And I close the app and open it again on the same device
    Then the app sent nothing to the API
    And Me offers signing in with Google and with Apple, in that order

  @AC-4
  Scenario: Signing out with no connection still signs the app out
    Given I sign in with Google as "signed-out-offline@saaliheen.test"
    And the phone has no connection
    When I sign out on Me
    Then Me offers signing in with Google and with Apple, in that order
    And the app holds no sign-in

  @AC-4
  Scenario Outline: Deleting the Account on Me, signed in with <Method>, removes it and all its data at once and signs the app out
    Given at "2026-10-06T08:00:00Z", I sign in with <Method> as "<email>"
    And I choose the Language "en" on Me
    And at "2026-10-06T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And the website is signed in as "<email>" too
    When I delete my Account on Me, confirming
    Then deleting the Account ends as "deleted"
    And Me offers signing in with Google and with Apple, in that order
    And the app holds no sign-in
    And the API holds no Account for "<email>", and no sign-in to it on any device
    And the website is signed out of it too
    And signing in on the website again as "<email>" makes a new Account with no Script, Language or Reading places

    Examples:
      | Method | email                          |
      | Google | deleting-google@saaliheen.test |
      | Apple  | deleting-apple@saaliheen.test  |

  @AC-4
  Scenario: Deleting with a sign-in more than a day old asks to sign in again with the same method, then deletes
    Given at "2026-10-06T08:00:00Z", I sign in with Apple as "old-sign-in@saaliheen.test"
    And it is "2026-10-07T09:00:00Z"
    When I delete my Account on Me, confirming, and sign in again as "old-sign-in@saaliheen.test" when asked
    Then the Sign in with Apple sheet opened again
    And deleting the Account ends as "deleted"
    And the API holds no Account for "old-sign-in@saaliheen.test", and no sign-in to it on any device
    And Me offers signing in with Google and with Apple, in that order

  @AC-4
  Scenario: Cancelling the sign-in asked for before deleting keeps the Account and the app signed in
    Given at "2026-10-06T08:00:00Z", I sign in with Google as "kept-old@saaliheen.test"
    And it is "2026-10-07T09:00:00Z"
    When I delete my Account on Me, confirming, and cancel the sign-in it asks for
    Then deleting the Account ends as "cancelled"
    And the API holds one Account for "kept-old@saaliheen.test"
    And Me shows me signed in as "kept-old@saaliheen.test", offering "Sign out" and "Delete Account"

  @AC-4
  Scenario: Deleting with no connection keeps the Account and says it needs one
    Given I sign in with Google as "delete-offline@saaliheen.test"
    And the phone has no connection
    When I delete my Account on Me, confirming
    Then deleting the Account ends as "no connection"
    And the API holds one Account for "delete-offline@saaliheen.test"
    And Me shows me signed in as "delete-offline@saaliheen.test", offering "Sign out" and "Delete Account"

  @AC-4
  Scenario: Deleting the Account on the website signs the app out the next time it is opened, keeping the device's Reading places
    Given I sign in with Google as "deleted-on-web@saaliheen.test"
    And at "2026-10-06T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    When on the website, signed in as "deleted-on-web@saaliheen.test", I delete the Account
    And I close the app and open it again on the same device
    Then Me offers signing in with Google and with Apple, in that order
    And the app holds no sign-in
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 40   |

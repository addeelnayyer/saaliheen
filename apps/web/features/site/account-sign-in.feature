Feature: Signing in to an Account
  A reader signs in to an Account on the Sign-in page, /<lang>/sign-in, with
  Google or Apple, sees there that they are signed in, and signs out. Reading
  never needs an Account. Accounts live in Postgres (Neon in production) and
  sign-in runs on Better Auth inside the site (ADR 0008), at /api/v1/auth: its
  session answer, /api/v1/auth/get-session, is how a client such as the mobile
  app learns which Account it is signed in to, and is how these scenarios tell
  one Account from another.

  The site tests serve the production build with the test configuration
  (features/site/account-settings.ts): the run's own Postgres, placeholder
  Google and Apple apps, and the test-only sign-in at /<lang>/test-sign-in,
  which signs a person in to an Account by email as if they had come through
  Google or Apple, as the Admin test sign-in does for Admins (#42).

  @AC-1
  Scenario Outline: The <Language> Sign-in page sends a reader to <Method> to sign in
    Given I am not signed in
    When I open the Sign-in page in <Language>
    And I choose to sign in with <Method>
    Then the browser is sent to <Method>'s sign-in page for this site's Account app, to come back to this site's <Method> callback

    Examples:
      | Language | Method |
      | English  | Google |
      | English  | Apple  |
      | Urdu     | Google |
      | Urdu     | Apple  |

  @AC-1 @AC-4 @AC-5
  Scenario Outline: A reader signed in through <Method> sees that they are signed in, and signs out
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via <Method>
    And I open the Sign-in page in English
    Then the Sign-in page shows me signed in as "reader@saaliheen.test", offering "Sign out"
    And the site knows me as "reader@saaliheen.test"
    When I reload the page
    Then the Sign-in page shows me signed in as "reader@saaliheen.test", offering "Sign out"
    When I choose "Sign out"
    Then the Sign-in page offers signing in with Google and with Apple
    And the site does not know me
    When I reload the page
    Then the Sign-in page offers signing in with Google and with Apple
    And the site does not know me

    Examples:
      | Method |
      | Google |
      | Apple  |

  @AC-2
  Scenario Outline: Signing in via <First> and then via <Second> as the same person gives the same Account
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via <First>
    And I note the Account the site knows me by
    And I sign out on the Sign-in page in English
    And I sign in to an Account through the test sign-in as "reader@saaliheen.test" via <Second>
    Then the site knows me by the Account I noted

    Examples:
      | First  | Second |
      | Google | Google |
      | Apple  | Apple  |
      | Google | Apple  |

  @AC-2
  Scenario: Two different people get two different Accounts
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via Google
    And I note the Account the site knows me by
    And I sign out on the Sign-in page in English
    And I sign in to an Account through the test sign-in as "another-reader@saaliheen.test" via Google
    Then the site knows me as "another-reader@saaliheen.test", by an Account other than the one I noted

  @AC-4
  Scenario: The Account test sign-in is on under the test configuration
    Given I am not signed in
    When I open "/en/test-sign-in"
    Then the page offers the Account test sign-in

  @AC-4
  Scenario Outline: The Account test sign-in is off on <Server>
    Given a second copy of the production build is served with the Account settings and "<Settings>"
    When I open that server's "/en/sign-in"
    Then the Sign-in page offers signing in with Google and with Apple
    And the page offers no test sign-in
    And that server's "/en/test-sign-in" is not found
    And that server's "/ur/test-sign-in" is not found

    Examples:
      | Server                                  | Settings                                               |
      | a server without the test configuration | no ACCOUNT_TEST_SIGN_IN                                |
      | a Vercel production deployment          | ACCOUNT_TEST_SIGN_IN=on VERCEL=1 VERCEL_ENV=production |
      | a Vercel preview deployment             | ACCOUNT_TEST_SIGN_IN=on VERCEL=1 VERCEL_ENV=preview    |

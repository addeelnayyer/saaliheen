Feature: Admin sign-in
  A few named Admins sign in to the admin area with GitHub or Google. A person
  is an Admin only if their verified email address is on the Admin allow-list
  (ADMIN_ALLOW_LIST), one list for both sign-in methods. Anyone else who signs
  in sees a "not an Admin" page; a visitor who isn't signed in is sent to sign
  in. The admin area's pages are /admin (the Surah picker) and /admin/<Surah>
  (that Surah's Passage editor). Since #67 an Admin signs in to their Account,
  on the Sign-in page's Admin entry, which offers GitHub; a GitHub sign-in by
  anyone not on the allow-list is refused.

  The site tests serve the production build with the test configuration
  (features/site/admin-settings.ts): admin@saaliheen.test on the Admin
  allow-list, and the Account test-only sign-in at /en/test-sign-in, which
  signs a person in by email as if they had come through GitHub or Google.

  @AC-1
  Scenario Outline: The sign-in page sends a visitor to <Method> to sign in
    Given I am not signed in
    When I open "/admin"
    And I choose "Sign in with <Method>"
    Then the browser is sent to <Method>'s sign-in page for this site's <Method> app, to come back to this site

    Examples:
      | Method |
      | GitHub |
      | Google |

  @AC-1 @AC-11 @AC-8
  Scenario Outline: An Admin signed in through <Method> gets into the admin area
    Given I am not signed in
    When I sign in through the test sign-in as "admin@saaliheen.test" via <Method>
    Then I see the Surah picker
    And the admin area names me as "admin@saaliheen.test"

    Examples:
      | Method |
      | GitHub |
      | Google |

  @AC-11
  Scenario: The same email through GitHub and then through Google is the same Admin
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I choose "Sign out"
    And I sign in through the test sign-in as "admin@saaliheen.test" via Google
    Then I see the Surah picker
    And the admin area names me as "admin@saaliheen.test"

  @AC-2 @AC-8
  Scenario Outline: A person not on the Admin allow-list who signs in through <Method> is turned away
    Given I am not signed in
    When I sign in through the test sign-in as "reader@saaliheen.test" via <Method>
    Then I see the "not an Admin" page, not an error
    And I do not see the Surah picker

    Examples:
      | Method |
      | Google |

  @AC-2 @AC-8
  Scenario Outline: A signed-in person not on the Admin allow-list can't reach <Path>
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open "<Path>"
    Then I see the "not an Admin" page, not an error
    And I do not see the Surah picker
    And I do not see a Passage editor

    Examples:
      | Path       |
      | /admin     |
      | /admin/1   |
      | /admin/18  |
      | /admin/114 |

  @AC-3 @AC-8
  Scenario Outline: A visitor who isn't signed in and opens <Path> is sent to sign in
    Given I am not signed in
    When I open "<Path>"
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see the Surah picker
    And I do not see a Passage editor

    Examples:
      | Path       |
      | /admin     |
      | /admin/1   |
      | /admin/18  |
      | /admin/114 |

  @AC-10 @AC-8
  Scenario: A signed-in Admin signs out
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I choose "Sign out"
    Then I am on the admin sign-in page, offering GitHub and Google
    When I open "/admin"
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see the Surah picker

  @AC-7
  Scenario Outline: The test-only sign-in is off on <Server>
    Given a second copy of the production build is served with the admin settings and "<Settings>"
    When I open that server's "/admin"
    Then I am on the admin sign-in page, offering GitHub and Google
    And the page offers no test sign-in
    And that server's "/en/test-sign-in" is not found

    Examples:
      | Server                                    | Settings                                                     |
      | a server without the test configuration   | no ACCOUNT_TEST_SIGN_IN                                      |
      | a Vercel production deployment            | ACCOUNT_TEST_SIGN_IN=on VERCEL=1 VERCEL_ENV=production       |
      | a Vercel preview deployment               | ACCOUNT_TEST_SIGN_IN=on VERCEL=1 VERCEL_ENV=preview          |

  @AC-7
  Scenario: The test-only sign-in is on under the test configuration
    Given I am not signed in
    When I open "/en/test-sign-in"
    Then the page offers the test sign-in

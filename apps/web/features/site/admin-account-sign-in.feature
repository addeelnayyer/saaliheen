Feature: Admins sign in to their Account
  An Admin signs in on the same Sign-in page as everyone else (#67): Admin is a
  role an Account holds, decided on every request from the Admin allow-list
  (ADMIN_ALLOW_LIST) by the Account's verified email, never kept from the
  moment they signed in. GitHub is offered to Admins only: opening the admin
  area while signed out sends the browser to the Sign-in page's Admin entry,
  which offers signing in with GitHub beside Google and Apple, and comes back
  to the admin page asked for; the plain Sign-in page offers only Google and
  Apple. A GitHub sign-in whose verified email is not on the allow-list is
  refused and makes no Account. The hand-written Admin session is gone: an
  Admin's session is their Account's, and the old Admin sign-in's addresses are
  not found.

  The site tests serve the production build with the test configuration
  (features/site/admin-settings.ts, features/site/account-settings.ts):
  admin@saaliheen.test on the Admin allow-list, placeholder GitHub, Google and
  Apple apps, and the Account test sign-in at /<lang>/test-sign-in, which signs
  a person in by email as if they had come back from GitHub, Google or Apple,
  through the same refusal a real GitHub sign-in meets. Which Account a browser
  is signed in to, and when that Account was made, is read from the site's
  session answer, /api/v1/auth/get-session. A second copy of the build, served
  with the same Accounts database and secret but its own allow-list, stands for
  the allow-list changed: the browser's session is the same on both.

  @AC-1
  Scenario Outline: From <Path>, the Admin entry sends an Admin to <Method> and back to <Path>
    Given I am not signed in
    When I open "<Path>"
    Then I am on the admin sign-in page, offering GitHub and Google
    When I choose to sign in with <Method>
    Then the browser is sent to <Method>'s sign-in page for this site's Account app, to come back to this site's <Method> callback
    And once signed in, the browser is to come back to "<Path>"

    Examples:
      | Path      | Method |
      | /admin    | GitHub |
      | /admin    | Google |
      | /admin/18 | GitHub |

  Scenario Outline: From a nested admin page, <Path>, the Admin entry sends an Admin to <Method> and back to <Path>
    Given I am not signed in
    When I open "<Path>"
    Then I am on the admin sign-in page, offering GitHub and Google
    When I choose to sign in with <Method>
    Then the browser is sent to <Method>'s sign-in page for this site's Account app, to come back to this site's <Method> callback
    And once signed in, the browser is to come back to "<Path>"

    Examples:
      | Path             | Method |
      | /admin/iltifat/1 | GitHub |
      | /admin/iltifat/1 | Google |

  Scenario Outline: An Admin entry asking to come back to <Asked> comes back to /admin instead
    Given I am not signed in
    When I open "/en/sign-in?admin=<Asked>"
    Then I am on the admin sign-in page, offering GitHub and Google
    When I choose to sign in with GitHub
    Then the browser is sent to GitHub's sign-in page for this site's Account app, to come back to this site's GitHub callback
    And once signed in, the browser is to come back to "/admin"

    Examples:
      | Asked                         |
      | %2F%2Fevil.example%2Fadmin    |
      | https%3A%2F%2Fevil.example    |
      | %2Fadmin%2F..%2Fen%2F1        |
      | %2Fadmin%2Filtifat%2F%2E%2E   |
      | %2Fadmin%2F%255C%255Cevil     |
      | %2Fen%2F1                     |

  @AC-1
  Scenario Outline: An Admin signed in to their Account through <Method> reaches the admin area
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "admin@saaliheen.test" via <Method>
    And I open "/admin"
    Then I see the Surah picker
    And the admin area names me as "admin@saaliheen.test"
    And the site knows me as "admin@saaliheen.test"

    Examples:
      | Method |
      | GitHub |
      | Google |

  @AC-2
  Scenario Outline: The plain Sign-in page in <Language> offers Google and Apple, never GitHub
    Given I am not signed in
    When I open the Sign-in page in <Language>
    Then the Sign-in page offers signing in with Google and with Apple
    And the Sign-in page does not offer signing in with GitHub

    Examples:
      | Language |
      | English  |
      | Urdu     |

  @AC-2
  Scenario: A GitHub sign-in by someone new who is not on the Admin allow-list is refused and makes no Account
    Given I am not signed in
    When I try the test sign-in via GitHub as someone new who is not on the Admin allow-list
    Then the sign-in is refused
    And the site does not know me
    When I sign in to an Account through the test sign-in as that person via Google
    Then the site knows me as that person, by an Account made after the refused GitHub sign-in

  @AC-2
  Scenario: A reader with an Account who is not on the Admin allow-list is refused through GitHub
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via Google
    And I sign out on the Sign-in page in English
    And I try the test sign-in as "reader@saaliheen.test" via GitHub
    Then the sign-in is refused
    And the site does not know me
    When I open "/admin"
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see the Surah picker

  @AC-2
  Scenario Outline: A reader signed in to their Account who is not on the Admin allow-list can't reach <Path>
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via Google
    And I open "<Path>"
    Then I see the "not an Admin" page, not an error
    And I do not see the Surah picker
    And I do not see a Passage editor

    Examples:
      | Path      |
      | /admin    |
      | /admin/18 |

  @AC-3
  Scenario: An Admin taken off the allow-list is turned away at once, still signed in
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When a second copy of the production build is served with the admin settings and "ADMIN_ALLOW_LIST=someone-else@saaliheen.test"
    And I open that server's "/admin"
    Then I see the "not an Admin" page, not an error
    And I do not see the Surah picker
    And the site knows me as "admin@saaliheen.test"

  @AC-3
  Scenario: A reader added to the allow-list is let in at once, without signing in again
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When a second copy of the production build is served with the admin settings and "ADMIN_ALLOW_LIST=admin@saaliheen.test,reader@saaliheen.test"
    And I open that server's "/admin"
    Then I see the Surah picker
    And the admin area names me as "reader@saaliheen.test"

  @AC-4 @AC-1
  Scenario: An Admin's session is their Account's, and signing out of the admin area signs out of it
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    Then the site knows me as "admin@saaliheen.test"
    When I choose "Sign out"
    Then the site does not know me
    When I open "/admin"
    Then I am on the admin sign-in page, offering GitHub and Google

  @AC-4
  Scenario Outline: The hand-written Admin sign-in's <Address> is gone
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    Then "<Address>" is not found on this site

    Examples:
      | Address                   |
      | /admin/sign-in            |
      | /admin/test-sign-in       |
      | /api/auth/callback/github |
      | /api/auth/callback/google |

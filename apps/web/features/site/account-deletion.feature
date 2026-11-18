Feature: Deleting an Account
  A person signed in to an Account deletes it on the Sign-in page,
  /<lang>/sign-in (#68). After they confirm, the Account and everything tied
  to it go at once, with no grace period: the Account itself, its sign-ins
  with Google and Apple, and its sessions, on this browser and on every other
  device. The person is signed out, and signing in again with the same email
  makes a new, empty Account.

  "All its data" is read from the Account database, the run's own Postgres
  (features/site/test-database.ts): no row of any table that ties a row to an
  Account (the Account table itself, and every table with a "userId") is
  left for the deleted Account, so data later issues tie to an Account is
  held to the same rule. Which Account a browser is signed in to is read from
  the site's session answer, /api/v1/auth/get-session, as in
  account-sign-in.feature. Each scenario signs in with an email of its own, so
  scenarios running at once never delete one another's Account.

  @AC-1 @AC-4
  Scenario Outline: A reader signed in through <Method> deletes their Account, which goes at once with all its data and signs them out
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "<Email>" via <Method>
    And I note the Account the site knows me by
    And I note this browser's sign-in, as if on another device
    And I open the Sign-in page in English
    Then the Sign-in page shows me signed in as "<Email>", offering "Delete Account"
    When I choose "Delete Account"
    Then a dialog asks me to confirm, saying the Account and all its data are deleted at once and this cannot be undone
    And the page is captured as the evidence screen "AC-1-delete-account-confirm-light-desktop"
    When I answer the dialog with "Delete Account"
    Then the Sign-in page offers signing in with Google and with Apple
    And the site does not know me
    And my browser holds no cookie for this site
    And the Account database holds nothing of the Account I noted
    And the sign-in I noted on the other device is signed out too
    When I reload the page
    Then the Sign-in page offers signing in with Google and with Apple
    And the site does not know me

    Examples:
      | Method | Email                           |
      | Google | leaving-google@saaliheen.test   |
      | Apple  | leaving-apple@saaliheen.test    |

  @AC-1 @AC-4
  Scenario: Cancelling the confirmation keeps the Account
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "staying@saaliheen.test" via Google
    And I note the Account the site knows me by
    And I open the Sign-in page in English
    And I choose "Delete Account"
    Then a dialog asks me to confirm, saying the Account and all its data are deleted at once and this cannot be undone
    When I answer the dialog with "Cancel"
    Then no dialog is open
    And the Sign-in page shows me signed in as "staying@saaliheen.test", offering "Delete Account"
    And the site knows me by the Account I noted
    And the Account database still holds the Account I noted

  @AC-2 @AC-4
  Scenario Outline: Signing in via <Again> after deleting an Account signed in via <First> makes a new, empty Account
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "<Email>" via <First>
    And I note the Account the site knows me by
    And I delete my Account on the Sign-in page in English
    And I sign in to an Account through the test sign-in as "<Email>" via <Again>
    Then the site knows me as "<Email>", by an Account other than the one I noted
    And the Account the site knows me by is new and empty, holding only its sign-in via <Again>

    Examples:
      | First  | Again  | Email                               |
      | Google | Google | returning-google@saaliheen.test     |
      | Apple  | Apple  | returning-apple@saaliheen.test      |
      | Google | Apple  | returning-google-apple@saaliheen.test |

  @AC-1 @AC-2 @AC-4
  Scenario: Deleting an Account signed in to with both Google and Apple removes both sign-ins
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "both-methods@saaliheen.test" via Google
    And I sign out on the Sign-in page in English
    And I sign in to an Account through the test sign-in as "both-methods@saaliheen.test" via Apple
    And I note the Account the site knows me by
    And I delete my Account on the Sign-in page in English
    Then the site does not know me
    And the Account database holds nothing of the Account I noted
    When I sign in to an Account through the test sign-in as "both-methods@saaliheen.test" via Google
    Then the site knows me as "both-methods@saaliheen.test", by an Account other than the one I noted
    And the Account the site knows me by is new and empty, holding only its sign-in via Google

  # #301: the confirmation is a shadcn/ui AlertDialog, and the Sign-in page
  # beneath it holds still as the page beneath every dialog does (ADR 0067).
  # The Sign-in page is shorter than a screen, so these scenarios lengthen it
  # above its panel to have somewhere to scroll from.

  @AC-301-1
  Scenario: The confirmation is a modal dialog named by its question that keeps focus inside, closes with Escape and gives focus back
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "escaping@saaliheen.test" via Google
    And I note the Account the site knows me by
    And I open the Sign-in page in English
    And I choose "Delete Account"
    Then the confirmation is a modal dialog named "Delete your Account?"
    And focus is inside the confirmation
    When I press Tab 6 times
    Then focus stayed inside the confirmation after every press
    When I press Shift+Tab 6 times
    Then focus stayed inside the confirmation after every press
    When I press Escape
    Then no dialog is open
    And focus is back on "Delete Account"
    And the site knows me by the Account I noted

  @AC-301-1
  Scenario: A click outside the confirmation closes it, as it does every dialog
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "clicking-outside@saaliheen.test" via Google
    And I note the Account the site knows me by
    And I open the Sign-in page in English
    And I choose "Delete Account"
    And I click the confirmation's backdrop
    Then no dialog is open
    And focus is back on "Delete Account"
    And the site knows me by the Account I noted

  @AC-301-2
  Scenario Outline: On a <viewport> the Sign-in page under the confirmation holds still
    Given the browser is a <viewport>
    And I am not signed in
    When I sign in to an Account through the test sign-in as "<Email>" via Google
    And I open the Sign-in page in English, longer than the screen and scrolled down to "Delete Account"
    And I note where the Sign-in page is
    And I choose "Delete Account"
    Then nothing on the Sign-in page has moved, even sideways, and it fired no scroll event
    When I turn the mouse wheel down by 800 pixels over the confirmation's backdrop
    And I turn the mouse wheel down by 800 pixels over the confirmation
    And I swipe up by 600 pixels on the confirmation's backdrop
    And I swipe up by 600 pixels on the confirmation
    And I press PageDown, End and ArrowDown in the confirmation
    Then nothing on the Sign-in page has moved, even sideways, and it fired no scroll event
    When I answer the dialog with "Cancel"
    Then no dialog is open
    And nothing on the Sign-in page has moved, even sideways, and it fired no scroll event

    Examples:
      | viewport | Email                            |
      | desktop  | holding-desktop@saaliheen.test   |
      | phone    | holding-phone@saaliheen.test     |

  @AC-301-2
  Scenario: On a desktop whose scrollbar takes up room, opening and closing the confirmation shifts nothing sideways
    Given I am not signed in
    When I sign in to an Account through the test sign-in as "holding-scrollbar@saaliheen.test" via Google
    And I open the Sign-in page in English on a desktop whose scrollbar takes up room, longer than the screen and scrolled down to "Delete Account"
    And I note where the Sign-in page is
    And I choose "Delete Account"
    Then nothing on the Sign-in page has moved, even sideways, and it fired no scroll event
    When I turn the mouse wheel down by 800 pixels over the confirmation's backdrop
    And I press Escape
    Then no dialog is open
    And nothing on the Sign-in page has moved, even sideways, and it fired no scroll event

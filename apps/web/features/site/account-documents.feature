Feature: Accounts in the privacy policy and terms of service
  The privacy policy (/privacy) and the terms of service (/terms) each gain a
  section, "Accounts", saying what an Account stores and why, and that
  deleting one is at once, with no grace period (#68). An Account holds its
  email address and the name and picture Google or Apple give at sign-in,
  its sign-ins with Google and Apple, and a session cookie that keeps the
  person signed in, in Postgres at Neon (ADR 0008).

  The promises to readers without an Account stay word for word: the
  "Reading the Quran" section, which says the site sets no cookies for
  readers, and the host's promise not to identify or follow readers. That
  stays true because only signing in sets a cookie: a reader who isn't signed
  in gets none (account-sign-in.feature).

  @AC-3
  Scenario: The privacy policy says what an Account stores and why, and that deleting it is at once
    Given I open the site document "/privacy"
    Then the page is found
    And the page's section "Accounts" names each of these:
      | email address                  |
      | name                           |
      | picture                        |
      | Google                         |
      | Apple                          |
      | cookie                         |
      | signed in                      |
      | Neon                           |
      | Reading never needs an Account |
      | Delete Account                 |
      | at once                        |
      | no grace period                |
    And the page is dated later than "3 October 2026"
    And the page is captured as the evidence screen "AC-3-privacy-light-desktop"

  @AC-3
  Scenario: The terms of service say what an Account is for and that deleting it cannot be undone
    Given I open the site document "/terms"
    Then the page is found
    And the page's section "Accounts" names each of these:
      | Google                         |
      | Apple                          |
      | Reading never needs an Account |
      | Delete Account                 |
      | at once                        |
      | cannot be undone               |
    And the page is dated later than "3 October 2026"
    And the page is captured as the evidence screen "AC-3-terms-light-desktop"

  @AC-3
  Scenario: The privacy policy's promises to readers without an Account are unchanged
    Given I open the site document "/privacy"
    Then the page's section "Reading the Quran" reads, word for word:
      """
      You can use Saaliheen without an account. We do not use analytics, advertising or tracking of any kind, and we set no cookies for readers.
      Your choices, such as the Arabic script, the theme and the text sizes, and the Ayah where you last stopped reading in each Surah, are kept in your own browser's storage. They never reach us, and you can remove them at any time by clearing this site's data in your browser.
      """
    And the page's section "Our host" names each of these:
      | We do not use these records to identify or follow readers. |

  @AC-3
  Scenario: The terms of service still let anyone read the site freely, and neither document sets a cookie
    Given I open the site document "/terms"
    Then the page's section "Using the site" names each of these:
      | You may read, study and share links to the site freely. |
    And each of these pages is found and sets no cookie:
      | /privacy |
      | /terms   |

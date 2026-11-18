Feature: Reading never needs an Account
  A reader who isn't signed in reads every page as before, and the site sets
  no cookie for them: not on any page, not while they read, not on the
  Sign-in page until they choose to sign in. The reading pages stay static,
  served from Next's cache, so Accounts (#66) never make them
  render per request.

  @AC-3 @AC-5
  Scenario Outline: Every page in <Language> works for a reader who isn't signed in, setting no cookie
    Given I am not signed in
    Then each of these pages in <Language> is found and sets no cookie:
      | the Surah index      |
      | every Surah page     |
      | the credits page     |
      | a Share page         |
      | the Sign-in page     |

    Examples:
      | Language |
      | English  |
      | Urdu     |

  @AC-3 @AC-5
  Scenario: The site documents work for a reader who isn't signed in, setting no cookie
    Given I am not signed in
    Then each of these pages is found and sets no cookie:
      | /privacy |
      | /terms   |

  @AC-3
  Scenario: Reading pages are still served as static pages to a reader who isn't signed in
    Given I am not signed in
    Then these reading pages are served as static pages from Next's cache, setting no cookie:
      | /ur         |
      | /en         |
      | /ur/1       |
      | /en/2       |
      | /ur/18      |
      | /en/114     |
      | /ur/credits |
      | /en/credits |

  @AC-3 @AC-5
  Scenario: A reader who isn't signed in reads, and their browser holds no cookie
    Given I am not signed in
    When I open the Surah index in English
    And I open Surah 1 in English
    And I open the first Root tag on screen
    And I open Surah 18 in Urdu
    And I scroll down by 2000 pixels
    And I open the Sign-in page in Urdu
    Then my browser holds no cookie for this site

@issue-192
Feature: Read, Explore and Me on every reading page
  Readers find everything through three destinations, Read, Explore and Me
  (CONTEXT.md: Explore, Me, Surah index). Below 900px wide they are a tab bar
  along the bottom of the screen; from 900px up, a slim top bar holds the
  brand, the three destinations, and Sign in while signed out. Read is the
  Surah index (/<lang>), Explore is /<lang>/explore and Me is /<lang>/me. The
  destination the page belongs to is marked: Read for the Surah index and the
  Surah pages, Explore for Explore, the Themes list, Theme pages and the
  Iltifat pages, Me for Me, the Sign-in page and Credits. The bar replaces the
  old site bar: "Share Ayahs", Credits, the Language links and the Index links
  leave it. The design follows the issue's navigation prototype, phone and
  wide layouts.

  Background:
    Given I am not signed in

  # ---------------------------------------------------------------- AC-1: phone and wide

  @AC-1 @AC-12
  Scenario Outline: On a phone, <address> has a bottom tab bar of Read, Explore and Me, marking <current>
    Given the browser is a phone
    When I open "<address>"
    Then the destinations are a tab bar along the bottom of the screen: Read, Explore and Me, in order
    And the destinations lead to the Surah index, Explore and Me in <Language>
    And <current> is marked as the current destination, and no other
    And no top bar of destinations is shown

    Examples:
      | address                  | Language | current |
      | /ur                      | Urdu     | Read    |
      | /en                      | English  | Read    |
      | /en/1                    | English  | Read    |
      | /ur/114                  | Urdu     | Read    |
      | /en/explore              | English  | Explore |
      | /ur/themes               | Urdu     | Explore |
      | /en/roots                | English  | Explore |
      | /en/themes/extravagance  | English  | Explore |
      | /en/iltifat              | English  | Explore |
      | /ur/iltifat/he-to-you    | Urdu     | Explore |
      | /ur/me                   | Urdu     | Me      |
      | /en/sign-in              | English  | Me      |
      | /en/credits              | English  | Me      |

  @AC-1
  Scenario Outline: On a phone, <address>, opened at a place on the page, still shows the tab bar
    Given the browser is a phone
    When I open "<address>"
    Then the tab bar is on screen
    And the destinations are a tab bar along the bottom of the screen: Read, Explore and Me, in order
    And Explore is marked as the current destination, and no other

    Examples:
      | address                                   |
      | /ur/iltifat/he-to-you#iltifat-1           |
      | /en/themes#category-allah-and-belief      |

  @AC-1
  Scenario: On a phone, a Surah opened at an Ayah starts with the tab bar away
    Given the browser is a phone
    When I open "/en/2#2:255"
    Then the tab bar is not on screen

  @AC-1 @AC-12
  Scenario Outline: On a desktop, <address> has a top bar of the brand, Read, Explore and Me, marking <current>
    Given the browser is a desktop
    When I open "<address>"
    Then the destinations are a top bar along the top of the screen, after the brand: Read, Explore and Me, in order
    And the destinations lead to the Surah index, Explore and Me in <Language>
    And the top bar's brand leads to the Surah index in <Language>
    And <current> is marked as the current destination, and no other
    And no tab bar is shown

    Examples:
      | address                  | Language | current |
      | /ur                      | Urdu     | Read    |
      | /en/1                    | English  | Read    |
      | /ur/114                  | Urdu     | Read    |
      | /en/explore              | English  | Explore |
      | /en/themes               | English  | Explore |
      | /ur/themes/extravagance  | Urdu     | Explore |
      | /ur/iltifat              | Urdu     | Explore |
      | /en/iltifat/we-to-he     | English  | Explore |
      | /en/me                   | English  | Me      |
      | /ur/sign-in              | Urdu     | Me      |
      | /ur/credits              | Urdu     | Me      |

  @AC-1
  Scenario Outline: At <width> pixels wide the destinations are a <bar>
    Given the browser window is <width> pixels wide
    When I open "/en"
    Then the destinations are shown as a <bar> only

    Examples:
      | width | bar     |
      | 899   | tab bar |
      | 900   | top bar |

  @AC-1
  Scenario Outline: The bar on <address> holds only the brand, Read, Explore, Me and Sign in
    Given the browser is a desktop
    When I open "<address>"
    Then the top bar holds only the brand, Read, Explore, Me and Sign in
    And the page has no Index link
    And the page's banner offers no "Share Ayahs", no "Credits" and no Language switch

    Examples:
      | address     |
      | /ur         |
      | /en/1       |
      | /en/credits |

  @AC-1
  Scenario: Following each destination on a phone moves the mark with it
    Given the browser is a phone
    And I open "/en/1"
    When I follow the destination "Explore"
    Then I am on Explore in English
    And Explore is marked as the current destination, and no other
    When I follow the destination "Me"
    Then I am on Me in English
    And Me is marked as the current destination, and no other
    When I follow the destination "Read"
    Then I am on the Surah index in English
    And Read is marked as the current destination, and no other

  # ---------------------------------------------------------------- AC-2: Sign in while signed out

  @AC-2 @AC-12
  Scenario Outline: On a desktop, <address> offers Sign in on its top bar, leading to the Sign-in page in <Language>
    Given the browser is a desktop
    When I open "<address>"
    And I follow the top bar's "Sign in"
    Then I am on the Sign-in page in <Language>
    And the Sign-in page offers signing in with Google and with Apple

    Examples:
      | address                 | Language |
      | /ur                     | Urdu     |
      | /en/1                   | English  |
      | /en/explore             | English  |
      | /ur/themes/extravagance | Urdu     |
      | /en/iltifat/he-to-you   | English  |
      | /ur/credits             | Urdu     |

  @AC-2 @AC-12
  Scenario Outline: On a phone, <address> reaches Sign in through Me
    Given the browser is a phone
    When I open "<address>"
    And I follow the destination "Me"
    Then I am on Me in <Language>
    When I follow Me's "Sign in"
    Then I am on the Sign-in page in <Language>
    And the Sign-in page offers signing in with Google and with Apple

    Examples:
      | address                 | Language |
      | /en                     | English  |
      | /ur/36                  | Urdu     |
      | /ur/explore             | Urdu     |
      | /en/themes              | English  |
      | /ur/iltifat             | Urdu     |
      | /en/credits             | English  |

  @AC-2
  Scenario: Signed in, the top bar no longer offers Sign in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via Google
    And the browser is a desktop
    And I open "/en/1"
    Then the destinations are a top bar along the top of the screen, after the brand: Read, Explore and Me, in order
    And the top bar does not offer "Sign in"

  # ---------------------------------------------------------------- AC-11: keyboard, screen reader, colour themes

  @AC-1 @AC-11
  Scenario Outline: On a <viewport>, the destinations are a named navigation landmark, reached and followed with the keyboard alone
    Given the browser is a <viewport>
    And I open "/en"
    Then the destinations are a navigation landmark with a name of its own
    When I press Tab until the link to "/en/explore" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on Explore in English
    And Explore is marked as the current destination, and no other

    Examples:
      | viewport |
      | phone    |
      | desktop  |

  @AC-11
  Scenario Outline: On a <viewport>, <address> draws its destinations in the <theme> colour theme, their words readable
    Given my system prefers a <theme> colour scheme
    And the browser is a <viewport>
    When I open "<address>"
    Then the destinations are drawn in the <theme> colour theme, every word on them readable against its background
    And the page's own background is drawn in the <theme> colour theme
    And I save a screenshot "AC-11-<name>-<theme>-<viewport>"

    Examples:
      | address     | name    | theme | viewport |
      | /en/explore | explore | light | phone    |
      | /en/explore | explore | dark  | phone    |
      | /en/explore | explore | light | desktop  |
      | /en/explore | explore | dark  | desktop  |
      | /ur/me      | me      | light | phone    |
      | /ur/me      | me      | dark  | phone    |
      | /ur/me      | me      | light | desktop  |
      | /ur/me      | me      | dark  | desktop  |

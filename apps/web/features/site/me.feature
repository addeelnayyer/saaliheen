@issue-192
Feature: Me
  Me, /<lang>/me, holds what belongs to the reader rather than the Quran
  (CONTEXT.md: Me), in order: Sign in (or the Account when signed in), their
  Reading places, a link to their Known words (#248), their Language (moved off the bar), every reader setting
  the Settings drawer held (Arabic size, Meaning size, Reset sizes, Phrase
  colours, Allah reference colour, the Arabic script, the Ayah translation and
  the theme), then Credits, Privacy and Terms. Admins also see a link to the
  admin area. Section marks (#194) are one of those settings. A Surah page's Surah bar keeps a Reading settings button that opens
  the same settings in a sheet.

  Background:
    Given a browser with no saved reader settings
    And I am not signed in

  # ---------------------------------------------------------------- AC-4: what Me holds

  @AC-4
  Scenario Outline: Me in <Language>, signed out, holds Sign in, Reading places, Known words, Language, every setting, Credits, Privacy and Terms, in that order
    When I open Me in <Language>
    Then the page's heading reads "Me"
    And Me holds, in order, Sign in, Reading places, Known words, Language, every reader setting, Credits, Privacy and Terms
    And Me offers no link to the admin area

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4
  Scenario: Signed in, Me shows the Account in place of Sign in
    When I sign in to an Account through the test sign-in as "reader@saaliheen.test" via Google
    And I open Me in English
    Then Me shows me signed in as "reader@saaliheen.test"
    And Me does not offer "Sign in"
    And Me offers no link to the admin area

  @AC-4
  Scenario: An Admin's Me links to the admin area
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open Me in Urdu
    Then Me shows me signed in as "admin@saaliheen.test"
    And Me offers a link to the admin area
    When I follow Me's link to the admin area
    Then I am on the admin page "/admin"

  @AC-4
  Scenario: Me lists the reader's Reading places
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open Me in English
    Then Me lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  @AC-4
  Scenario Outline: Me's Language switch moves Me from <Language> to <Other>
    Given I open Me in <Language>
    When I choose <Other> on Me's Language switch
    Then I am on Me in <Other>

    Examples:
      | Language | Other   |
      | Urdu     | English |
      | English  | Urdu    |

  @AC-4
  Scenario: A setting chosen on Me holds on a Surah page, after a reload
    Given I open Me in English
    When I choose "Dark" on Me's "Theme" setting
    And I open "/en/1"
    And I reload the page
    Then the page's root element carries data-theme "dark"

  @AC-4 @AC-11
  Scenario Outline: On a <viewport>, the Surah bar's Reading settings button opens every reader setting in a sheet that Escape closes
    Given the browser is a <viewport>
    And I open "/en/1"
    When I press the Surah bar's "Reading settings" button
    Then a modal dialog named "Reading settings" is open, holding every reader setting
    When I press Escape
    Then no dialog is open
    And the Surah bar's "Reading settings" button has focus

    Examples:
      | viewport |
      | phone    |
      | desktop  |

  # ---------------------------------------------------------------- AC-5: admin and back

  @AC-5
  Scenario Outline: The admin page <address> links back to the reading site
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open "<address>"
    And I follow the admin page's link back to the reading site
    Then I am on a Surah index

    Examples:
      | address        |
      | /admin         |
      | /admin/18      |
      | /admin/iltifat |

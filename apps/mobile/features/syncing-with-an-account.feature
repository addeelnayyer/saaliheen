@issue-75
Feature: Script, Language and Reading places follow the Account between the app and the website
  Signed in, the app keeps the reader's Script, Language and Reading places in
  their Account through /api/v1 with its bearer token, as the website does with
  its session cookie (#70, #71), so both show the same. On signing in, the
  Account's Script and Language apply to the app; one the Account has not
  chosen yet takes the app's. The app's Reading places and the Account's merge,
  keeping for each Surah the one read most recently, then the ten newest. From
  then on each choice and each read in the app goes to the Account, and the
  app takes the Account's Script, Language and Reading places each time it is
  opened. Arabic size and Meaning size stay on each device and are never sent.
  Signed out, the app sends nothing anywhere.

  The website here is a second client of the same API, signed in to the same
  Account, reading and writing it as the website's pages do (its own
  scenarios, features/site/synced-settings.feature and
  synced-reading-places.feature, show the pages applying it). Times are UTC.

  Background:
    Given the app is launched on a new device

  @AC-2
  Scenario: Signing in applies the Script and Language the Account chose on the website
    Given on the website, signed in as "chose-on-web@saaliheen.test", I choose the Script "indopak" and the Language "en"
    And the app shows the Script "uthmani" and the Language "ur"
    When I sign in with Google as "chose-on-web@saaliheen.test"
    Then the app shows the Script "indopak" and the Language "en"
    And Me shows the Language "en" chosen

  @AC-2
  Scenario: An Account that has chosen no Script or Language takes the app's on signing in
    Given I choose the Script "indopak" in the app
    And I choose the Language "en" on Me
    When I sign in with Apple as "chose-nothing@saaliheen.test"
    Then the website, signed in as "chose-nothing@saaliheen.test", reads the Script "indopak" and the Language "en"
    And the app shows the Script "indopak" and the Language "en"

  @AC-2
  Scenario Outline: Choosing the <setting> "<value>" in the app, signed in, saves it to the Account the website reads
    Given I sign in with Google as "<email>"
    When I choose the <setting> "<value>" <where>
    Then the website, signed in as "<email>", reads the <setting> "<value>"

    Examples:
      | setting  | value   | where     | email                         |
      | Script   | indopak | in the app | choose-script@saaliheen.test  |
      | Language | en      | on Me     | choose-language@saaliheen.test |

  @AC-2
  Scenario: A Script and Language chosen on the website show in the app the next time it is opened
    Given I sign in with Google as "changed-on-web@saaliheen.test"
    When on the website, signed in as "changed-on-web@saaliheen.test", I choose the Script "indopak" and the Language "en"
    And I close the app and open it again on the same device
    Then the app shows the Script "indopak" and the Language "en"

  @AC-2
  Scenario: Signing in merges the app's Reading places with the Account's, keeping the newer for each Surah
    Given on the website, signed in as "merge@saaliheen.test", I read these Reading places:
      | Surah | Ayah | read at              |
      | 18    | 60   | 2026-10-01T10:00:00Z |
      | 2     | 100  | 2026-10-01T08:00:00Z |
    And at "2026-10-01T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And at "2026-10-01T11:00:00Z", I read Surah 2 in the app until Ayah 2:255 is at the top of the screen
    And at "2026-10-01T07:00:00Z", I read Surah 36 in the app until Ayah 36:12 is at the top of the screen
    When at "2026-10-01T12:00:00Z", I sign in with Google as "merge@saaliheen.test"
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 255  |
      | 18    | 60   |
      | 36    | 12   |
    And the website reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 2     | 255  | 2026-10-01T11:00:00Z |
      | 18    | 60   | 2026-10-01T10:00:00Z |
      | 36    | 12   | 2026-10-01T07:00:00Z |

  @AC-2
  Scenario: Reading in the app, signed in, moves the Reading place the website reads
    Given I sign in with Google as "read-in-app@saaliheen.test"
    When at "2026-10-02T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    Then the website, signed in as "read-in-app@saaliheen.test", reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 18    | 40   | 2026-10-02T09:00:00Z |

  @AC-2
  Scenario: Reading on the website shows in the app the next time it is opened, and the Surah opens there
    Given at "2026-10-03T08:00:00Z", I sign in with Google as "read-on-web@saaliheen.test"
    When on the website, signed in as "read-on-web@saaliheen.test", I read these Reading places:
      | Surah | Ayah | read at              |
      | 2     | 255  | 2026-10-03T09:00:00Z |
    And I close the app and open it again on the same device
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 255  |
    And opening Surah 2 from the Surah index opens it with Ayah 2:255 at the top

  @AC-2
  Scenario: Arabic size and Meaning size stay on the device and are never sent
    Given I sign in with Google as "sizes-in-app@saaliheen.test"
    When I set Arabic size to 130% and Meaning size to 115% in the app
    And I close the app and open it again on the same device
    Then nothing the app sent named an Arabic size or a Meaning size
    And the website, signed in as "sizes-in-app@saaliheen.test", reads settings holding exactly a Script and a Language

  @AC-2
  Scenario: Signed out, choosing a Script or Language and reading send nothing anywhere
    Given every request the app makes is recorded
    When I choose the Script "indopak" in the app
    And I choose the Language "en" on Me
    And at "2026-10-04T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And I close the app and open it again on the same device
    Then the app sent nothing to the API

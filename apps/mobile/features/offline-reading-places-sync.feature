@issue-75
Feature: Reading places read offline sync in the order they were read
  A signed-in reader can read with no connection, on a plane say. Each
  Reading place keeps the time it was read on the device, and stays on the
  device until the phone comes back online; then the app brings them to the
  Account at once, without being opened again, and the Account keeps, for each
  Surah, the one read most recently (last read wins), whenever it was synced,
  then the ten newest. So offline reading is neither lost nor put in the wrong
  order, against what was read on the website meanwhile. A Script or Language
  chosen offline is sent too. Times are UTC.

  Background:
    Given the app is launched on a new device
    And at "2026-10-05T07:00:00Z", I sign in with Google as "flyer@saaliheen.test"

  @AC-3
  Scenario: Reading places read offline go to the Account by when they were read, around one read on the website meanwhile
    Given the phone has no connection
    When at "2026-10-05T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And on the website, signed in as "flyer@saaliheen.test", I read these Reading places:
      | Surah | Ayah | read at              |
      | 2     | 255  | 2026-10-05T10:00:00Z |
    And at "2026-10-05T11:00:00Z", I read Surah 36 in the app until Ayah 36:12 is at the top of the screen
    Then the website reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 2     | 255  | 2026-10-05T10:00:00Z |
    When at "2026-10-05T13:00:00Z", the phone comes back online
    Then the website now reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 36    | 12   | 2026-10-05T11:00:00Z |
      | 2     | 255  | 2026-10-05T10:00:00Z |
      | 18    | 40   | 2026-10-05T09:00:00Z |
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 36    | 12   |
      | 2     | 255  |
      | 18    | 40   |

  @AC-3
  Scenario: A Reading place read offline before a later read of the same Surah on the website does not replace it
    Given the phone has no connection
    When at "2026-10-05T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And on the website, signed in as "flyer@saaliheen.test", I read these Reading places:
      | Surah | Ayah | read at              |
      | 18    | 60   | 2026-10-05T10:00:00Z |
    And at "2026-10-05T12:00:00Z", the phone comes back online
    Then the website reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 18    | 60   | 2026-10-05T10:00:00Z |
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 60   |

  @AC-3
  Scenario: A Reading place read offline after an earlier read of the same Surah on the website replaces it
    Given on the website, signed in as "flyer@saaliheen.test", I read these Reading places:
      | Surah | Ayah | read at              |
      | 18    | 10   | 2026-10-05T08:00:00Z |
    And the phone has no connection
    When at "2026-10-05T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And at "2026-10-05T12:00:00Z", the phone comes back online
    Then the website reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 18    | 40   | 2026-10-05T09:00:00Z |

  @AC-3
  Scenario: Closed offline and opened again online, the app brings what was read offline as it opens
    Given the phone has no connection
    When at "2026-10-05T09:00:00Z", I read Surah 18 in the app until Ayah 18:40 is at the top of the screen
    And at "2026-10-05T09:30:00Z", I read Surah 2 in the app until Ayah 2:255 is at the top of the screen
    And I close the app
    And the phone comes back online while the app is closed
    And I open the app again on the same device
    Then the website, signed in as "flyer@saaliheen.test", reads these Reading places, newest first:
      | Surah | Ayah | read at              |
      | 2     | 255  | 2026-10-05T09:30:00Z |
      | 18    | 40   | 2026-10-05T09:00:00Z |

  @AC-3
  Scenario: Eleven Surahs read offline keep the ten read most recently, the same in the app and on the website
    Given the phone has no connection
    When I read Surahs 105 to 114 and then Surah 1 in the app, an hour apart from "2026-10-05T08:00:00Z", each until its Ayah 3 is at the top of the screen
    And at "2026-10-05T20:00:00Z", the phone comes back online
    Then the website reads ten Reading places, Surah 1 then Surahs 114 down to 106, each at Ayah 3 when it was read
    And the Surah index offers ten Reading places, Surah 1 then Surahs 114 down to 106, each at Ayah 3

  @AC-3
  Scenario: The Language chosen offline goes to the Account when the phone comes back online
    Given the phone has no connection
    When I choose the Language "en" on Me
    And the phone comes back online
    Then the website, signed in as "flyer@saaliheen.test", reads the Language "en"

@issue-254
Feature: Known words follow the Account in the app, offline included
  Signed in, the app brings the phone's Known words to the Account through
  /api/v1/known-words and keeps the Account's, as the website does (#252,
  ADR 0057): a Root marked in the app shows as known on the website, and one
  marked on the website shows as known in the app once it syncs (on signing
  in, as it opens and when the connection comes back). On first sign-in the
  phone's Known words and the Account's merge. A mark or unmark made with no
  connection keeps when it was made and stays on the phone until the
  connection comes back, then goes to the Account at once; for each Root the
  newer mark or unmark wins, whenever it was synced, and a tie goes to the
  unmark. Signing out, or deleting the Account, leaves the phone's Known words
  on the phone. Times are UTC.

  Background:
    Given the app is launched on a new device

  @AC-1 @AC-3
  Scenario: A Root marked in the app, signed in, shows as known on the website
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "marker@saaliheen.test"
    When at "2026-10-05T08:00:00Z", I mark the Root "ر ح م" as known in the app
    Then the website, signed in as "marker@saaliheen.test", reads these Known words:
      | Root  | known | marked at            |
      | ر ح م | yes   | 2026-10-05T08:00:00Z |

  @AC-1 @AC-3
  Scenario: A Root marked on the website shows as known in the app the next time it is opened
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "reader@saaliheen.test"
    And on the website, signed in as "reader@saaliheen.test", at "2026-10-05T08:00:00Z", I mark the Root "ع ل م" as known
    When I close the app and open it again on the same device
    Then the app shows these Known Roots:
      | Root  |
      | ع ل م |

  @AC-1
  Scenario: Signing in merges the phone's Known words with the Account's, keeping the newer for each Root
    Given on the website, signed in as "merger@saaliheen.test", at "2026-10-05T08:00:00Z", I mark the Root "ع ل م" as known
    And on the website, signed in as "merger@saaliheen.test", at "2026-10-05T08:00:00Z", I mark the Root "ك ت ب" as known
    And at "2026-10-05T09:00:00Z", I mark the Root "ر ح م" as known in the app
    And at "2026-10-05T09:30:00Z", I unmark the Root "ك ت ب" in the app
    When at "2026-10-05T10:00:00Z", I sign in with Google as "merger@saaliheen.test"
    Then the app shows these Known Roots:
      | Root  |
      | ر ح م |
      | ع ل م |
    And the website reads these Known words:
      | Root  | known | marked at            |
      | ع ل م | yes   | 2026-10-05T08:00:00Z |
      | ر ح م | yes   | 2026-10-05T09:00:00Z |
      | ك ت ب | no    | 2026-10-05T09:30:00Z |

  @AC-2
  Scenario: Marks and unmarks made offline go to the Account when the phone comes back online, each winning or losing by when it was made
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "flyer@saaliheen.test"
    And at "2026-10-05T07:30:00Z", I mark the Root "ك ت ب" as known in the app
    And the phone has no connection
    When at "2026-10-05T09:00:00Z", I mark the Root "ر ح م" as known in the app
    And at "2026-10-05T09:00:00Z", I unmark the Root "ك ت ب" in the app
    And at "2026-10-05T09:00:00Z", I mark the Root "ع ل م" as known in the app
    And on the website, signed in as "flyer@saaliheen.test", at "2026-10-05T10:00:00Z", I unmark the Root "ع ل م"
    And on the website, signed in as "flyer@saaliheen.test", at "2026-10-05T08:00:00Z", I unmark the Root "ر ح م"
    Then the website reads these Known words:
      | Root  | known | marked at            |
      | ك ت ب | yes   | 2026-10-05T07:30:00Z |
      | ر ح م | no    | 2026-10-05T08:00:00Z |
      | ع ل م | no    | 2026-10-05T10:00:00Z |
    When at "2026-10-05T12:00:00Z", the phone comes back online
    Then the website now reads these Known words:
      | Root  | known | marked at            |
      | ر ح م | yes   | 2026-10-05T09:00:00Z |
      | ك ت ب | no    | 2026-10-05T09:00:00Z |
      | ع ل م | no    | 2026-10-05T10:00:00Z |
    And the app shows these Known Roots:
      | Root  |
      | ر ح م |

  @AC-2
  Scenario Outline: A mark and an unmark made at the same moment, one offline in the app and one on the website, leave the Root unmarked
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "<email>"
    And the phone has no connection
    When at "2026-10-05T09:00:00Z", I <in the app> the Root "ر ح م" in the app
    And on the website, signed in as "<email>", at "2026-10-05T09:00:00Z", I <on the website> the Root "ر ح م"
    And at "2026-10-05T12:00:00Z", the phone comes back online
    Then the website reads these Known words:
      | Root  | known | marked at            |
      | ر ح م | no    | 2026-10-05T09:00:00Z |
    And the app shows no Known Roots

    Examples:
      | in the app      | on the website  | email                     |
      | mark as known   | unmark          | tie-app-marks@saaliheen.test |
      | unmark          | mark as known   | tie-web-marks@saaliheen.test |

  @AC-2
  Scenario: A Root marked in the app just as a sync keeps the Account's Known words on the phone is kept, and reaches the Account
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "racer@saaliheen.test"
    And on the website, signed in as "racer@saaliheen.test", at "2026-10-05T08:00:00Z", I mark the Root "ع ل م" as known
    And the phone has no connection
    When the phone comes back online, and at "2026-10-05T09:00:00Z" I mark the Root "ر ح م" as known in the app just as the sync keeps the Account's Known words on the phone
    Then the app shows these Known Roots:
      | Root  |
      | ر ح م |
      | ع ل م |
    And the website reads these Known words:
      | Root  | known | marked at            |
      | ع ل م | yes   | 2026-10-05T08:00:00Z |
      | ر ح م | yes   | 2026-10-05T09:00:00Z |

  @AC-2
  Scenario: Closed offline and opened again online, the app brings the marks made offline as it opens
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "closer@saaliheen.test"
    And the phone has no connection
    When at "2026-10-05T09:00:00Z", I mark the Root "ر ح م" as known in the app
    And I close the app
    And the phone comes back online while the app is closed
    And I open the app again on the same device
    Then the website, signed in as "closer@saaliheen.test", reads these Known words:
      | Root  | known | marked at            |
      | ر ح م | yes   | 2026-10-05T09:00:00Z |

  @AC-4
  Scenario: Signing out leaves the phone's Known words, and marking after it sends nothing
    Given at "2026-10-05T07:00:00Z", I sign in with Google as "leaver@saaliheen.test"
    And at "2026-10-05T08:00:00Z", I mark the Root "ر ح م" as known in the app
    When I sign out on Me
    And every request the app makes is recorded
    And at "2026-10-05T09:00:00Z", I mark the Root "ع ل م" as known in the app
    Then the app sent nothing to the API
    And the app shows these Known Roots:
      | Root  |
      | ر ح م |
      | ع ل م |
    And the website, signed in as "leaver@saaliheen.test", reads these Known words:
      | Root  | known | marked at            |
      | ر ح م | yes   | 2026-10-05T08:00:00Z |

  @AC-4
  Scenario: Deleting the Account leaves the phone's Known words on the phone, and takes the Account's with it
    Given at "2026-10-05T07:00:00Z", I sign in with Apple as "deleter@saaliheen.test"
    And at "2026-10-05T08:00:00Z", I mark the Root "ر ح م" as known in the app
    When I delete my Account on Me, confirming
    Then deleting the Account ends as "deleted"
    And the app shows these Known Roots:
      | Root  |
      | ر ح م |
    And signing in on the website again as "deleter@saaliheen.test" makes a new Account with no Known words

@issue-71
Feature: An Account's Reading places through the versioned API
  An Account keeps its reader's Reading places, so they follow the reader to
  every device signed in to it. The versioned API's Reading places resource,
  /api/v1/reading-places, holds them: GET answers the Account's Reading places,
  newest first, as { "readingPlaces": [{ "surah", "ayah", "readAt" }] }, with
  readAt in milliseconds since the epoch, when the Ayah was read on the device
  that read it. PATCH with { "readingPlaces": [...] } brings a device's Reading
  places to the Account and answers the Account's Reading places after them.

  Bringing Reading places to the Account merges them by one rule, the same for
  a single read, for a device that read offline and syncs later, and for a
  device's whole list on first sign-in: for each Surah the Reading place read
  most recently wins, whichever side sent it and whenever it arrived; then only
  the ten newest stay, newest first.

  These scenarios are the API's HTTP contract, as features/api/settings.feature
  is: they talk to the production build over HTTP, served against the run's own,
  empty Postgres (features/api/serve-api.ts), and sign in through the Account
  test-only sign-in. A place is written surah:ayah; a "read at" time is UTC.

  @AC-4
  Scenario Outline: A new Account reads its Reading places with its <credential>, and has none yet
    Given I am signed in to an Account as "<email>"
    When I GET "/api/v1/reading-places" with my <credential>
    Then the API answers 200 with JSON
    And the answer holds no Reading places

    Examples:
      | credential     | email                          |
      | session cookie | places-new-1@saaliheen.test    |
      | bearer token   | places-new-2@saaliheen.test    |

  @AC-4
  Scenario Outline: An Account brings Reading places with its <credential> and reads them back with its <other credential>, newest first
    Given I am signed in to an Account as "<email>"
    When I PATCH "/api/v1/reading-places" with my <credential> and these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 36:12  | 2026-10-01T08:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:00:00Z |
      | 36:12  | 2026-10-01T08:00:00Z |
    And reading the Reading places back with my <other credential> gives these, newest first:
      | place  | read at              |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:00:00Z |
      | 36:12  | 2026-10-01T08:00:00Z |

    Examples:
      | credential     | other credential | email                          |
      | session cookie | bearer token     | places-save-1@saaliheen.test   |
      | bearer token   | session cookie   | places-save-2@saaliheen.test   |

  @AC-1 @AC-4
  Scenario: A newer read in a Surah moves its Reading place and brings it to the top
    Given I am signed in to an Account as "places-newer@saaliheen.test"
    And the Account has these Reading places:
      | place  | read at              |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:00:00Z |
    When I PATCH "/api/v1/reading-places" with my bearer token and these Reading places:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    And reading the Reading places back with my session cookie gives these, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |

  @AC-2 @AC-4
  Scenario: A Reading place read earlier but synced later does not replace a newer one
    Given I am signed in to an Account as "places-late@saaliheen.test"
    And the Account has these Reading places:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    When I PATCH "/api/v1/reading-places" with my bearer token and these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    And reading the Reading places back with my session cookie gives these, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |

  @AC-2 @AC-4
  Scenario: Reading places sent out of order are kept in the order they were read
    Given I am signed in to an Account as "places-order@saaliheen.test"
    When I PATCH "/api/v1/reading-places" with my session cookie and these Reading places:
      | place  | read at              |
      | 19:1   | 2026-10-01T08:00:00Z |
      | 18:40  | 2026-10-01T09:30:00Z |
      | 18:20  | 2026-10-01T09:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:30:00Z |
      | 19:1   | 2026-10-01T08:00:00Z |

  @AC-3 @AC-4
  Scenario: A device's Reading places merge with the Account's, the newer kept for each Surah, then the ten newest
    Given I am signed in to an Account as "places-merge@saaliheen.test"
    And the Account has these Reading places:
      | place  | read at              |
      | 18:60  | 2026-10-01T12:00:00Z |
      | 2:200  | 2026-10-01T09:00:00Z |
      | 105:1  | 2026-10-01T08:00:00Z |
      | 106:1  | 2026-10-01T07:00:00Z |
      | 107:1  | 2026-10-01T06:00:00Z |
      | 108:1  | 2026-10-01T05:00:00Z |
      | 109:1  | 2026-10-01T04:00:00Z |
      | 110:1  | 2026-10-01T03:00:00Z |
      | 111:1  | 2026-10-01T02:00:00Z |
      | 112:1  | 2026-10-01T01:00:00Z |
    When I PATCH "/api/v1/reading-places" with my bearer token and these Reading places:
      | place  | read at              |
      | 19:1   | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:30:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T12:00:00Z |
      | 19:1   | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 105:1  | 2026-10-01T08:00:00Z |
      | 106:1  | 2026-10-01T07:00:00Z |
      | 107:1  | 2026-10-01T06:00:00Z |
      | 108:1  | 2026-10-01T05:00:00Z |
      | 109:1  | 2026-10-01T04:00:00Z |
      | 110:1  | 2026-10-01T03:00:00Z |
      | 111:1  | 2026-10-01T02:00:00Z |
    And reading the Reading places back with my session cookie gives these, newest first:
      | place  | read at              |
      | 18:60  | 2026-10-01T12:00:00Z |
      | 19:1   | 2026-10-01T11:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 105:1  | 2026-10-01T08:00:00Z |
      | 106:1  | 2026-10-01T07:00:00Z |
      | 107:1  | 2026-10-01T06:00:00Z |
      | 108:1  | 2026-10-01T05:00:00Z |
      | 109:1  | 2026-10-01T04:00:00Z |
      | 110:1  | 2026-10-01T03:00:00Z |
      | 111:1  | 2026-10-01T02:00:00Z |

  @AC-3 @AC-4
  Scenario: More than ten Reading places brought at once keep only the ten newest
    Given I am signed in to an Account as "places-eleven@saaliheen.test"
    When I PATCH "/api/v1/reading-places" with my session cookie and these Reading places:
      | place  | read at              |
      | 104:1  | 2026-10-01T01:00:00Z |
      | 105:1  | 2026-10-01T02:00:00Z |
      | 106:1  | 2026-10-01T03:00:00Z |
      | 107:1  | 2026-10-01T04:00:00Z |
      | 108:1  | 2026-10-01T05:00:00Z |
      | 109:1  | 2026-10-01T06:00:00Z |
      | 110:1  | 2026-10-01T07:00:00Z |
      | 111:1  | 2026-10-01T08:00:00Z |
      | 112:1  | 2026-10-01T09:00:00Z |
      | 113:1  | 2026-10-01T10:00:00Z |
      | 114:1  | 2026-10-01T11:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 114:1  | 2026-10-01T11:00:00Z |
      | 113:1  | 2026-10-01T10:00:00Z |
      | 112:1  | 2026-10-01T09:00:00Z |
      | 111:1  | 2026-10-01T08:00:00Z |
      | 110:1  | 2026-10-01T07:00:00Z |
      | 109:1  | 2026-10-01T06:00:00Z |
      | 108:1  | 2026-10-01T05:00:00Z |
      | 107:1  | 2026-10-01T04:00:00Z |
      | 106:1  | 2026-10-01T03:00:00Z |
      | 105:1  | 2026-10-01T02:00:00Z |

  @AC-3 @AC-4
  Scenario: Bringing the same Reading places twice changes nothing
    Given I am signed in to an Account as "places-twice@saaliheen.test"
    And the Account has these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    When I PATCH "/api/v1/reading-places" with my bearer token and these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
      | 2:255  | 2026-10-01T10:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Reading places, newest first:
      | place  | read at              |
      | 2:255  | 2026-10-01T10:00:00Z |
      | 18:40  | 2026-10-01T09:00:00Z |

  @AC-4
  Scenario Outline: Bringing Reading places with the body <body> is refused and changes nothing
    Given I am signed in to an Account as "<email>"
    And the Account has these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
    When I PATCH "/api/v1/reading-places" with my bearer token and the body '<body>'
    Then the API answers 400 with a JSON error
    And reading the Reading places back with my bearer token gives these, newest first:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |

    Examples:
      # A body that is not JSON, a JSON list, Reading places that are not a list,
      # Surah 0, Surah 115, Ayah 0, an Ayah past its Surah's last, a fractional
      # Ayah, a read time that is not a number, and a Reading place with no read time.
      | email                            | body                                                                                                      |
      | places-refused-1@saaliheen.test  | readingPlaces=18:60                                                                                       |
      | places-refused-2@saaliheen.test  | [{ "surah": 18, "ayah": 60, "readAt": 1790000000000 }]                                                    |
      | places-refused-3@saaliheen.test  | { "readingPlaces": { "surah": 18, "ayah": 60, "readAt": 1790000000000 } }                                 |
      | places-refused-4@saaliheen.test  | { "readingPlaces": [{ "surah": 0, "ayah": 1, "readAt": 1790000000000 }] }                                 |
      | places-refused-5@saaliheen.test  | { "readingPlaces": [{ "surah": 115, "ayah": 1, "readAt": 1790000000000 }] }                               |
      | places-refused-6@saaliheen.test  | { "readingPlaces": [{ "surah": 18, "ayah": 0, "readAt": 1790000000000 }] }                                |
      | places-refused-7@saaliheen.test  | { "readingPlaces": [{ "surah": 2, "ayah": 287, "readAt": 1790000000000 }] }                               |
      | places-refused-8@saaliheen.test  | { "readingPlaces": [{ "surah": 18, "ayah": 6.5, "readAt": 1790000000000 }] }                              |
      | places-refused-9@saaliheen.test  | { "readingPlaces": [{ "surah": 18, "ayah": 60, "readAt": "yesterday" }] }                                 |
      | places-refused-10@saaliheen.test | { "readingPlaces": [{ "surah": 18, "ayah": 60 }] }                                                        |

  @AC-4
  Scenario: One Account's Reading places are never another's
    Given I am signed in to an Account as "places-first@saaliheen.test"
    And the Account has these Reading places:
      | place  | read at              |
      | 18:40  | 2026-10-01T09:00:00Z |
    When I am signed in to an Account as "places-second@saaliheen.test"
    And I GET "/api/v1/reading-places" with my session cookie
    Then the API answers 200 with JSON
    And the answer holds no Reading places

  @AC-4
  Scenario Outline: The API refuses a <method> of the Reading places with <credential>
    When I <method> "/api/v1/reading-places" with <credential>
    Then the API answers 401 with a JSON error
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | method | credential                      |
      | GET    | neither cookie nor token        |
      | PATCH  | neither cookie nor token        |
      | GET    | a bearer token that is made up  |
      | GET    | a session cookie that is forged |
      | PATCH  | a bearer token that is made up  |

  @AC-4
  Scenario Outline: The answer to a <method> of the Reading places names the minimum app version
    Given I am signed in to an Account as "<email>"
    When I <method> "/api/v1/reading-places" with my bearer token
    Then the API answers 200 with JSON
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | method | email                              |
      | GET    | places-version-1@saaliheen.test    |
      | PATCH  | places-version-2@saaliheen.test    |

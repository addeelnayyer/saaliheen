@issue-252
Feature: An Account's Known words through the versioned API
  An Account keeps its reader's Known words (CONTEXT.md), so they follow the
  reader to every device signed in to it, as Reading places do. The versioned
  API's Known words resource, /api/v1/known-words, holds them: GET answers
  { "knownWords": [{ "kind", "text", "known", "markedAt" }] }, unmarks
  included, oldest marked first; PATCH with { "knownWords": [...] } brings a
  device's Known words to the Account and answers the Account's after them.

  Each entry names a Root by its letters with spaces ("root"), or a particle by
  its Lemma ("lemma") or its Spelling ("spelling") (ADR 0057). `known` false is
  an unmark, kept, never a deletion; markedAt is when it was marked or
  unmarked on the device that did it, in milliseconds since the epoch.
  Bringing Known words merges them by the known-words package's one rule, the
  same for a single mark, a device that marked offline and syncs later, and a
  device's whole list on first sign-in: for each Root or particle the newer
  markedAt wins, whichever side sent it and whenever it arrived, and a tie goes
  to the unmark.

  The Account database keeps one row per Account and Root or particle, holding
  whether it is known and when it was marked, never one JSON value per
  Account. Known words belong to a reader, not to Saaliheen's content, so they
  are not in the content audit.

  These scenarios are the API's HTTP contract, as reading-places.feature is:
  they talk to the production build over HTTP, served against the run's own,
  empty Postgres (features/api/serve-api.ts), and sign in through the Account
  test-only sign-in. A "marked at" time is UTC. Deleting the Account deletes
  its Known words: features/api/accounts-in-the-app.feature.

  @AC-1 @AC-2
  Scenario Outline: A new Account reads its Known words with its <credential>, and has none yet
    Given I am signed in to an Account as "<email>"
    When I GET "/api/v1/known-words" with my <credential>
    Then the API answers 200 with JSON
    And the answer holds no Known words

    Examples:
      | credential     | email                        |
      | session cookie | known-new-1@saaliheen.test   |
      | bearer token   | known-new-2@saaliheen.test   |

  @AC-2 @AC-3
  Scenario Outline: An Account brings marks and unmarks with its <credential> and reads them back with its <other credential>
    Given I am signed in to an Account as "<email>"
    When I PATCH "/api/v1/known-words" with my <credential> and these Known words:
      | kind     | text  | known | marked at            |
      | lemma    | مِن   | true  | 2026-10-01T09:00:00Z |
      | root     | ر ح م | true  | 2026-10-01T08:00:00Z |
      | spelling | هُوَ  | false | 2026-10-01T10:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind     | text  | known | marked at            |
      | root     | ر ح م | true  | 2026-10-01T08:00:00Z |
      | lemma    | مِن   | true  | 2026-10-01T09:00:00Z |
      | spelling | هُوَ  | false | 2026-10-01T10:00:00Z |
    And reading the Known words back with my <other credential> gives these, oldest marked first:
      | kind     | text  | known | marked at            |
      | root     | ر ح م | true  | 2026-10-01T08:00:00Z |
      | lemma    | مِن   | true  | 2026-10-01T09:00:00Z |
      | spelling | هُوَ  | false | 2026-10-01T10:00:00Z |

    Examples:
      | credential     | other credential | email                       |
      | session cookie | bearer token     | known-save-1@saaliheen.test |
      | bearer token   | session cookie   | known-save-2@saaliheen.test |

  @AC-3
  Scenario: An unmark beats an older mark sent after it
    Given I am signed in to an Account as "known-unmark-wins@saaliheen.test"
    And the Account has these Known words:
      | kind | text  | known | marked at            |
      | root | ر ح م | false | 2026-10-01T10:00:00Z |
    When I PATCH "/api/v1/known-words" with my bearer token and these Known words:
      | kind | text  | known | marked at            |
      | root | ر ح م | true  | 2026-10-01T09:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind | text  | known | marked at            |
      | root | ر ح م | false | 2026-10-01T10:00:00Z |
    And reading the Known words back with my session cookie gives these, oldest marked first:
      | kind | text  | known | marked at            |
      | root | ر ح م | false | 2026-10-01T10:00:00Z |

  @AC-3
  Scenario: A newer mark beats an older unmark
    Given I am signed in to an Account as "known-mark-wins@saaliheen.test"
    And the Account has these Known words:
      | kind  | text | known | marked at            |
      | lemma | مِن  | false | 2026-10-01T09:00:00Z |
    When I PATCH "/api/v1/known-words" with my session cookie and these Known words:
      | kind  | text | known | marked at            |
      | lemma | مِن  | true  | 2026-10-01T11:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind  | text | known | marked at            |
      | lemma | مِن  | true  | 2026-10-01T11:00:00Z |
    And reading the Known words back with my bearer token gives these, oldest marked first:
      | kind  | text | known | marked at            |
      | lemma | مِن  | true  | 2026-10-01T11:00:00Z |

  @AC-3
  Scenario: A mark and an unmark made at the same moment leave it unmarked
    Given I am signed in to an Account as "known-tie@saaliheen.test"
    And the Account has these Known words:
      | kind     | text | known | marked at            |
      | spelling | هُوَ | true  | 2026-10-01T09:00:00Z |
    When I PATCH "/api/v1/known-words" with my bearer token and these Known words:
      | kind     | text | known | marked at            |
      | spelling | هُوَ | false | 2026-10-01T09:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind     | text | known | marked at            |
      | spelling | هُوَ | false | 2026-10-01T09:00:00Z |

  @AC-3
  Scenario: A device's Known words merge with the Account's, the newer kept for each Root and particle
    Given I am signed in to an Account as "known-merge@saaliheen.test"
    And the Account has these Known words:
      | kind     | text  | known | marked at            |
      | root     | ر ح م | true  | 2026-10-01T08:00:00Z |
      | root     | ك ت ب | true  | 2026-10-01T09:00:00Z |
      | lemma    | فِي   | false | 2026-10-01T12:00:00Z |
    When I PATCH "/api/v1/known-words" with my bearer token and these Known words:
      | kind     | text  | known | marked at            |
      | root     | ر ح م | false | 2026-10-01T10:00:00Z |
      | root     | ك ت ب | false | 2026-10-01T07:00:00Z |
      | lemma    | فِي   | true  | 2026-10-01T11:00:00Z |
      | spelling | هُوَ  | true  | 2026-10-01T06:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind     | text  | known | marked at            |
      | spelling | هُوَ  | true  | 2026-10-01T06:00:00Z |
      | root     | ك ت ب | true  | 2026-10-01T09:00:00Z |
      | root     | ر ح م | false | 2026-10-01T10:00:00Z |
      | lemma    | فِي   | false | 2026-10-01T12:00:00Z |
    And reading the Known words back with my session cookie gives these, oldest marked first:
      | kind     | text  | known | marked at            |
      | spelling | هُوَ  | true  | 2026-10-01T06:00:00Z |
      | root     | ك ت ب | true  | 2026-10-01T09:00:00Z |
      | root     | ر ح م | false | 2026-10-01T10:00:00Z |
      | lemma    | فِي   | false | 2026-10-01T12:00:00Z |

  @AC-3
  Scenario: A Root and a particle written alike are different Known words
    Given I am signed in to an Account as "known-kinds@saaliheen.test"
    When I PATCH "/api/v1/known-words" with my session cookie and these Known words:
      | kind     | text | known | marked at            |
      | lemma    | مَا  | true  | 2026-10-01T08:00:00Z |
      | spelling | مَا  | false | 2026-10-01T09:00:00Z |
    Then the API answers 200 with JSON
    And the answer holds these Known words, oldest marked first:
      | kind     | text | known | marked at            |
      | lemma    | مَا  | true  | 2026-10-01T08:00:00Z |
      | spelling | مَا  | false | 2026-10-01T09:00:00Z |

  @AC-4
  Scenario: The Account database keeps one row per Root or particle, holding whether it is known and when it was marked
    Given I am signed in to an Account as "known-rows@saaliheen.test"
    And the Account has these Known words:
      | kind  | text  | known | marked at            |
      | root  | ر ح م | true  | 2026-10-01T08:00:00Z |
      | lemma | مِن   | true  | 2026-10-01T09:00:00Z |
    When I PATCH "/api/v1/known-words" with my bearer token and these Known words:
      | kind  | text  | known | marked at            |
      | root  | ر ح م | false | 2026-10-01T10:00:00Z |
    Then the Account database holds these rows of the Account's Known words:
      | kind  | text  | known | marked at            |
      | root  | ر ح م | false | 2026-10-01T10:00:00Z |
      | lemma | مِن   | true  | 2026-10-01T09:00:00Z |
    And no change to Known words is in the content audit

  @AC-3
  Scenario Outline: Bringing Known words with the body <body> is refused and changes nothing
    Given I am signed in to an Account as "<email>"
    And the Account has these Known words:
      | kind | text  | known | marked at            |
      | root | ر ح م | true  | 2026-10-01T08:00:00Z |
    When I PATCH "/api/v1/known-words" with my bearer token and the body '<body>'
    Then the API answers 400 with a JSON error
    And reading the Known words back with my bearer token gives these, oldest marked first:
      | kind | text  | known | marked at            |
      | root | ر ح م | true  | 2026-10-01T08:00:00Z |

    Examples:
      # A body that is not JSON, a JSON list, Known words that are not a list, a
      # kind that is none of the three, an empty text, a known that is not true
      # or false, a fractional, negative or missing markedAt, and a good entry
      # beside a bad one.
      | email                           | body                                                                                                                                                  |
      | known-refused-1@saaliheen.test  | knownWords=ر ح م                                                                                                                                      |
      | known-refused-2@saaliheen.test  | [{ "kind": "root", "text": "ر ح م", "known": false, "markedAt": 1790000000000 }]                                                                      |
      | known-refused-3@saaliheen.test  | { "knownWords": { "kind": "root", "text": "ر ح م", "known": false, "markedAt": 1790000000000 } }                                                      |
      | known-refused-4@saaliheen.test  | { "knownWords": [{ "kind": "word", "text": "ر ح م", "known": false, "markedAt": 1790000000000 }] }                                                    |
      | known-refused-5@saaliheen.test  | { "knownWords": [{ "kind": "root", "text": "", "known": false, "markedAt": 1790000000000 }] }                                                         |
      | known-refused-6@saaliheen.test  | { "knownWords": [{ "kind": "root", "text": "ر ح م", "known": "no", "markedAt": 1790000000000 }] }                                                     |
      | known-refused-7@saaliheen.test  | { "knownWords": [{ "kind": "root", "text": "ر ح م", "known": false, "markedAt": 1790000000000.5 }] }                                                  |
      | known-refused-8@saaliheen.test  | { "knownWords": [{ "kind": "root", "text": "ر ح م", "known": false, "markedAt": -1 }] }                                                               |
      | known-refused-9@saaliheen.test  | { "knownWords": [{ "kind": "root", "text": "ر ح م", "known": false }] }                                                                               |
      | known-refused-10@saaliheen.test | { "knownWords": [{ "kind": "root", "text": "ر ح م", "known": false, "markedAt": 1790000000000 }, { "kind": "root", "text": "ك ت ب", "known": true }] } |

  @AC-1
  Scenario: One Account's Known words are never another's
    Given I am signed in to an Account as "known-first@saaliheen.test"
    And the Account has these Known words:
      | kind | text  | known | marked at            |
      | root | ر ح م | true  | 2026-10-01T08:00:00Z |
    When I am signed in to an Account as "known-second@saaliheen.test"
    And I GET "/api/v1/known-words" with my session cookie
    Then the API answers 200 with JSON
    And the answer holds no Known words

  @AC-1
  Scenario Outline: The API refuses a <method> of the Known words with <credential>
    When I <method> "/api/v1/known-words" with <credential>
    Then the API answers 401 with a JSON error
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | method | credential                      |
      | GET    | neither cookie nor token        |
      | PATCH  | neither cookie nor token        |
      | GET    | a bearer token that is made up  |
      | GET    | a session cookie that is forged |
      | PATCH  | a bearer token that is made up  |

  @AC-1
  Scenario Outline: The answer to a <method> of the Known words names the minimum app version
    Given I am signed in to an Account as "<email>"
    When I <method> "/api/v1/known-words" with my bearer token
    Then the API answers 200 with JSON
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | method | email                             |
      | GET    | known-version-1@saaliheen.test    |
      | PATCH  | known-version-2@saaliheen.test    |

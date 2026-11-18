@issue-142
Feature: An Admin saves an Iltifat through PUT /api/v1/iltifat/{id}, as an Iltifat revision
  The Iltifat editor saves one Iltifat at a time (#142, ADR 0023) through an
  Admin-only PUT /api/v1/iltifat/{id}. The request is JSON holding the
  Iltifat's whole editable state and the version it was made against:
    { "base": <its version>, "reason": "...", "ayahFrom": n, "ayahTo": n, "disputed": true|false }
  Its Surah, Iltifat direction and cited Ayah are not editable and not sent.

  A save that passes answers 200 with { "iltifat": <the saved Iltifat> }, in the
  shape GET /api/v1/iltifat lists it, its version one more than its base. In the
  same transaction it writes one Iltifat revision, a row of the table
  `iltifat_revision`: iltifat_id, author (the Admin's email), created_at, base,
  version, and before and after, the Iltifat as JSON as the API answers it.
  After it, the Iltifat pages, /api/v1/iltifat and the Iltifat chips show the save
  at once.

  A save that is refused answers { "error": "<a sentence the editor shows as
  it is>" } and changes no Iltifat and writes no revision: 401 from no
  Account, 403 from an Account that is not an Admin, 409 for a save made
  against an older version (with the latest Iltifat as "iltifat"), 422 for a
  blank reason or a run that leaves its Surah or no longer holds its cited
  Ayah, 404 for an id no Iltifat has.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test,
  on the test configuration's Admin allow-list; reader@saaliheen.test signs in
  but is not on it. Iltifat are found in the run's Postgres by Iltifat direction
  and run, as the catalogue loaded them; each scenario puts the Iltifat it
  saved back, through the endpoint, so the other API features read the
  catalogue. Surah lengths are QUL's (Al-Fatihah has 7 Ayahs).

  # ---------------------------------------------------------------- AC-1: only an Admin saves

  @AC-1 @AC-12
  Scenario Outline: A save with <credential> is refused <status>, and changes nothing
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "<email>"
    When I save the He → You Iltifat at 1:2–5 with the reason "A reason someone wrote." and its own version, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the He → You Iltifat at 1:2–5 is as I noted it, with no new Iltifat revision

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

  # ---------------------------------------------------------------- AC-3, AC-7, AC-8: a save that passes

  @AC-3 @AC-7
  Scenario: An Admin changes the reason, the run within its Surah and the Disputed tag, and the save passes
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with the reason "A reason the Admin wrote.", the run 1:3–6, Disputed, and its own version, with session cookie
    Then the answer's status is 200
    And the answer's Iltifat is the He → You Iltifat cited at 1:5, with the reason "A reason the Admin wrote.", the run 1:3–6 and Disputed
    And the answer's Iltifat has its noted version plus one
    And the He → You Iltifat cited at 1:5 in the database has the reason "A reason the Admin wrote.", the run 1:3–6, Disputed, and its noted version plus one
    And its Surah, Iltifat direction, cited Ayah and Abdel Haleem section are as I noted them

  @AC-7 @AC-12
  Scenario: A save writes exactly one Iltifat revision, naming the Admin, with the Iltifat before and after
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with the reason "A reason the Admin wrote.", the run 1:3–6, Disputed, and its own version, with session cookie
    Then the answer's status is 200
    And exactly one new Iltifat revision names the He → You Iltifat cited at 1:5
    And that Iltifat revision's author is "admin@saaliheen.test", made within the last minute
    And that Iltifat revision's base is the noted version and its version the noted version plus one
    And that Iltifat revision holds the Iltifat before the save as I noted it
    And that Iltifat revision holds the Iltifat after the save, with the reason "A reason the Admin wrote.", the run 1:3–6 and Disputed

  @AC-3 @AC-7
  Scenario: A save through the bearer token passes too, and each save moves the version on by one
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with the reason "A first reason." and its own version, with bearer token
    Then the answer's status is 200
    When I save the He → You Iltifat cited at 1:5 with the reason "A second reason." and its own version, with bearer token
    Then the second answer's status is 200 too
    And the He → You Iltifat cited at 1:5 in the database has the reason "A second reason." and its noted version plus two
    And exactly 2 new Iltifat revisions name the He → You Iltifat cited at 1:5, their versions the noted version plus one and plus two

  @AC-8
  Scenario: After a save, /api/v1/iltifat, the direction page and the Surah's chip show it at once
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/iltifat", and I note its He → You count
    And a reader has read "/en/iltifat/he-to-you"
    And a reader has read "/en/1"
    When I save the He → You Iltifat at 1:2–5 with the reason "A reason the Admin wrote.", the run 1:2–5, Disputed, and its own version, with session cookie
    Then the answer's status is 200
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer lists the He → You Iltifat cited at 1:5 with the reason "A reason the Admin wrote." and Disputed
    And the answer's He → You count has one Iltifat fewer counted and one more Disputed than I noted
    When I GET "/en/iltifat/he-to-you" with neither cookie nor token
    Then the page served holds the reason "A reason the Admin wrote." in the entry of the Iltifat cited at 1:5
    When I GET "/en/1" with neither cookie nor token
    Then the page served gives Ayah 1:5 an Iltifat chip that says Disputed

  # ---------------------------------------------------------------- AC-4: an older version

  @AC-4 @AC-12
  Scenario Outline: A save made against an older version is refused, with the latest Iltifat, through the <credential>
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat at 1:2–5 has been saved since I noted it, with the reason "Someone else's reason."
    When I save the He → You Iltifat cited at 1:5 with the reason "My reason." and its noted version, with <credential>
    Then the answer's status is 409
    And the answer's error is "This Iltifat has been saved since you opened it. Reload it to see the latest."
    And the answer's Iltifat has the reason "Someone else's reason." and its noted version plus one
    And the He → You Iltifat cited at 1:5 in the database has the reason "Someone else's reason." and its noted version plus one
    And exactly one new Iltifat revision names the He → You Iltifat cited at 1:5

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  # ---------------------------------------------------------------- AC-5: an empty reason

  @AC-5 @AC-12
  Scenario Outline: A save whose reason is <blank> is refused
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with a blank reason, <blank>, and its own version, with session cookie
    Then the answer's status is 422
    And the answer's error is "The reason can't be empty."
    And the He → You Iltifat at 1:2–5 is as I noted it, with no new Iltifat revision

    Examples:
      | blank            |
      | empty            |
      | five spaces only |

  # ---------------------------------------------------------------- AC-6: the run leaves the Surah or loses the cited Ayah

  @AC-6 @AC-12
  Scenario Outline: A save of the run from Ayah <from> to Ayah <to> for the Iltifat cited at 1:5 is refused
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with the run from Ayah <from> to Ayah <to> and its own version, with session cookie
    Then the answer's status is 422
    And the answer's error is "<error>"
    And the He → You Iltifat at 1:2–5 is as I noted it, with no new Iltifat revision

    Examples:
      | from | to | error                                                |
      | 2    | 8  | The run must lie within Surah 1, Ayahs 1 to 7.       |
      | 0    | 5  | The run must lie within Surah 1, Ayahs 1 to 7.       |
      | 6    | 7  | The run must hold the cited Ayah, 1:5.               |
      | 2    | 4  | The run must hold the cited Ayah, 1:5.               |
      | 5    | 2  | The run must start at or before the Ayah it ends at. |

  @AC-6
  Scenario: A run of the whole Surah, still holding the cited Ayah, is a run within the Surah
    Given I note the He → You Iltifat at 1:2–5 and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat at 1:2–5 with the run from Ayah 1 to Ayah 7 and its own version, with session cookie
    Then the answer's status is 200
    And the He → You Iltifat cited at 1:5 in the database has the run 1:1–7

  # ---------------------------------------------------------------- AC-10: no adding, no deleting

  @AC-10
  Scenario Outline: An Admin's <method> of <path> is answered <status>, and adds or deletes no Iltifat
    Given I am signed in as "admin@saaliheen.test"
    When I send <method> "<path>" with session cookie
    Then the answer's status is <status>
    And the database still holds 326 Iltifat

    Examples:
      | method | path                | status |
      | POST   | /api/v1/iltifat     | 405    |
      | DELETE | /api/v1/iltifat/1   | 405    |
      | PUT    | /api/v1/iltifat/999 | 404    |

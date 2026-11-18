@issue-201
Feature: An Admin corrects a Supplication through PUT /api/v1/supplications/{id}, as a Supplication revision
  The Supplication editor saves one Supplication at a time (#201, #196, ADR
  0027, after ADR 0023's Iltifat save) through an Admin-only
  PUT /api/v1/supplications/{id}. The request is JSON holding the
  Supplication's whole editable state and the version it was made against:
    { "base": <its version>, "surah": n, "ayahFrom": n, "ayahTo": n,
      "speakerId": "<a Speaker's id>", "openings": ["rabbana", …], "kind": "<kind>",
      "spans": [] }
  Each save here sends the Supplication's spans as it has them, none;
  features/api/supplication-spans.feature saves spans (#270).

  A save that passes answers 200 with { "supplication": <the saved
  Supplication> }, in the shape GET /api/v1/supplications lists it, its version
  one more than its base. In the same transaction it writes one Supplication
  revision, a row of `supplication_revision`: supplication_id, author (the
  Admin's email), created_at, base, version, and before and after, the
  Supplication as GET /api/v1/supplications answers it. After it, the
  Supplications page and GET /api/v1/supplications show the save at once.

  A save that is refused answers { "error": "<a sentence the editor shows as
  it is>" } and changes no row: 401 from no Account, 403 from an Account that
  is not an Admin, 404 for an id no Supplication has, 409 for a save made
  against an older version (with the latest Supplication as "supplication"),
  422 for a run outside its Surah or ending before it starts, an Ayah already
  in another Supplication (naming it), no Opening, or an unknown Opening,
  Speaker or kind.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test;
  reader@saaliheen.test signs in but is not an Admin. Supplications are found
  in the run's Postgres by their run, as the curated file loaded them; each
  scenario puts the Supplication it saved back through the endpoint, so the
  other features read the curated file's Supplications. Speaker ids, Surah
  names and runs are the curated file's and the issue's.

  # ---------------------------------------------------------------- a save that passes

  Scenario: An Admin changes the Speaker, Openings and run of the Supplication at 2:127–129, and the save passes
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi" and the kind "supplication", against its own version, with session cookie
    Then the answer's status is 200
    And the answer's Supplication is the noted one with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi", the kind "supplication" and its noted version plus one
    And the noted Supplication in the database has the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi", the kind "supplication" and its noted version plus one

  Scenario: A save writes exactly one Supplication revision, naming the Admin, with the Supplication before and after
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi" and the kind "supplication", against its own version, with session cookie
    Then the answer's status is 200
    And exactly one new Supplication revision names the noted Supplication
    And that Supplication revision's author is "admin@saaliheen.test", made within the last minute
    And that Supplication revision's base is the noted version and its version the noted version plus one
    And that Supplication revision holds the noted Supplication before the save
    And that Supplication revision holds the answer's Supplication after the save

  Scenario: A save through the bearer token passes too, and each save moves the version on by one
    Given I note the Supplication at 28:16 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 28:16 with the run 28:16, the Speaker "musa", the Openings "rabbi, other" and the kind "supplication", against its own version, with bearer token
    Then the answer's status is 200
    When I save the Supplication at 28:16 with the run 28:16, the Speaker "musa", the Openings "other" and the kind "complaint", against its own version, with bearer token
    Then the second save's status is 200 too
    And the noted Supplication in the database has the run 28:16, the Speaker "musa", the Openings "other", the kind "complaint" and its noted version plus two
    And exactly 2 new Supplication revisions name the noted Supplication, their versions the noted version plus one and plus two

  Scenario: Openings are kept once each, in the order Rabbana, Rabbi, Other
    Given I note the Supplication at 28:16 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 28:16 with the run 28:16, the Speaker "musa", the Openings "other, rabbi, other" and the kind "supplication", against its own version, with session cookie
    Then the answer's status is 200
    And the noted Supplication in the database has the run 28:16, the Speaker "musa", the Openings "rabbi, other", the kind "supplication" and its noted version plus one

  Scenario: After a save, GET /api/v1/supplications and the Supplications page show it at once
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/supplications"
    And a reader has read "/en/supplications"
    When I save the Supplication at 2:127–129 with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi" and the kind "supplication", against its own version, with session cookie
    Then the answer's status is 200
    When a reader reads "/api/v1/supplications"
    Then the answer lists the noted Supplication with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi", the kind "supplication" and its noted version plus one
    When a reader reads "/en/supplications"
    Then the page served has an entry headed "Al-Baqarah 2:127–128" and none headed "Al-Baqarah 2:127–129"

  # ---------------------------------------------------------------- refusals: who asks, and which Supplication

  Scenario Outline: A save with <credential> is refused <status>, and changes nothing
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "<email>"
    When I save the Supplication at 2:127–129 with the run 2:127–128, the Speaker "ibrahim", the Openings "rabbana, rabbi" and the kind "supplication", against its own version, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the noted Supplications are as I noted them, with no new Supplication revision

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

  Scenario Outline: A save of <path> is answered 404, with an error
    Given I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129's state to "<path>", with session cookie
    Then the answer's status is 404
    And the answer has an error
    And the database still holds just the curated file's Supplications

    Examples:
      | path                          |
      | /api/v1/supplications/99999   |
      | /api/v1/supplications/abc     |

  Scenario: A body that isn't a save is answered 400, with an error, and changes nothing
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the noted Supplication with its Openings sent as the text "rabbana", with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the noted Supplications are as I noted them, with no new Supplication revision

  # ---------------------------------------------------------------- refusals: an older version

  Scenario Outline: A save made against an older version is refused, with the latest Supplication, through the <credential>
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And the Supplication at 2:127–129 has since been saved with the Openings "rabbana, rabbi"
    When I save the noted Supplication with the Openings "other", against its noted version, with <credential>
    Then the answer's status is 409
    And the answer's error is "This Supplication has been saved since you opened it. The latest is shown beside your choices."
    And the answer's Supplication has the Openings "rabbana, rabbi" and its noted version plus one
    And the noted Supplication in the database has the Openings "rabbana, rabbi" and its noted version plus one
    And exactly one new Supplication revision names the noted Supplication

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  # ---------------------------------------------------------------- refusals: the rules a save keeps

  Scenario Outline: A save of the Supplication at 2:127–129 that breaks a rule is refused, saying which
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I note the Supplication at 2:126 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the noted Supplication with the Surah <surah>, Ayahs <from> to <to>, the Speaker "<speaker>", the Openings "<openings>" and the kind "<kind>", against its own version, with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the noted Supplications are as I noted them, with no new Supplication revision

    Examples:
      | surah | from | to  | speaker            | openings | kind         | error                                                                                                    |
      | 2     | 127  | 287 | ibrahim-and-ismail | rabbana  | supplication | The run must lie within Surah 2, Ayahs 1 to 286.                                                         |
      | 2     | 0    | 129 | ibrahim-and-ismail | rabbana  | supplication | The run must lie within Surah 2, Ayahs 1 to 286.                                                         |
      | 115   | 1    | 1   | ibrahim-and-ismail | rabbana  | supplication | There is no Surah 115: Surahs run from 1 to 114.                                                         |
      | 2     | 129  | 127 | ibrahim-and-ismail | rabbana  | supplication | The run must start at or before the Ayah it ends at.                                                     |
      | 2     | 126  | 129 | ibrahim-and-ismail | rabbana  | supplication | Ayah 2:126 is already in the Supplication at Al-Baqarah 2:126. Take it out of that one first.            |
      | 2     | 127  | 129 | ibrahim-and-ismail |          | supplication | A Supplication needs at least one Opening.                                                               |
      | 2     | 127  | 129 | ibrahim-and-ismail | allahumma | supplication | "allahumma" is no Opening: choose Rabbana, Rabbi or Other.                                              |
      | 2     | 127  | 129 | nobody-at-all      | rabbana  | supplication | No Speaker has the id "nobody-at-all". Choose one of the Speakers.                                       |
      | 2     | 127  | 129 | ibrahim-and-ismail | rabbana  | lament       | "lament" is no kind: choose Supplication or one of the Other words to Allah.                             |

  Scenario: A run taking in Other words to Allah names them as such
    Given I note the Supplication at 2:201 and its Supplication revisions
    And I note the Supplication at 2:200 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the noted Supplication with the Surah 2, Ayahs 200 to 201, the Speaker "people-seeking-good-in-this-world-and-the-hereafter", the Openings "rabbana" and the kind "supplication", against its own version, with session cookie
    Then the answer's status is 422
    And the answer's error is "Ayah 2:200 is already in the Other words to Allah at Al-Baqarah 2:200. Take it out of that one first."
    And the noted Supplications are as I noted them, with no new Supplication revision

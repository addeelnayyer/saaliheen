@issue-202
Feature: An Admin adds and deletes Supplications through POST and DELETE /api/v1/supplications, each as a Supplication revision
  The Supplication editor adds a Supplication (#202, #196, ADR 0027) through an
  Admin-only POST /api/v1/supplications, its body the new Supplication's whole
  editable state:
    { "surah": n, "ayahFrom": n, "ayahTo": n, "speakerId": "<a Speaker's id>",
      "openings": ["rabbana", …], "kind": "<kind>", "spans": [] }
  (each add here with no spans; features/api/supplication-spans.feature adds
  one with spans, #270) and deletes one through an Admin-only DELETE /api/v1/supplications/{id}, its
  body { "base": <the version it was made against> }.

  An add that passes answers 201 with { "supplication": <the new Supplication> }
  at version 1, and writes one Supplication revision whose base is 0, version
  1, before empty (null) and after the new Supplication. A delete that passes
  answers 204 and writes one Supplication revision whose base is the deleted
  Supplication's version, version one more, before the Supplication and after
  empty (null); that revision outlives the Supplication. Both are written in
  one transaction with the row, and GET /api/v1/supplications and the
  Supplications page show them at once.

  Splitting a Supplication is trimming it and adding the rest; joining two is
  extending one and deleting the other.

  Refusals follow the save's (supplication-saves.feature): { "error" } and no
  row changed, 401 from no Account, 403 from an Account that is not an Admin,
  404 for an id no Supplication has, 400 for a body that isn't an add or a
  delete, 409 for a delete made against an older version (with the latest
  Supplication as "supplication"), and 422 for a run outside its Surah, an Ayah
  already in another Supplication (naming it), no Opening, or an unknown
  Speaker or kind.

  Each scenario puts the database back as the curated file's load left it,
  through the endpoints, so the other features read the curated file's
  Supplications: an added Supplication is deleted, a deleted one added again,
  and their Supplication revisions removed. Speaker ids, Surah names and runs
  are the curated file's and the issue's.

  # ---------------------------------------------------------------- adding

  Scenario: An Admin adds Al-Fatiha 1:5–7, at version 1, and GET /api/v1/supplications and the Supplications page show it at once
    Given I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/supplications"
    And a reader has read "/en/supplications"
    When I add a Supplication at 1:5–7, said by "allahs-believing-servants", with the Openings "other" and the kind "supplication", with session cookie
    Then the answer's status is 201
    And the answer's Supplication is at 1:5–7, said by "allahs-believing-servants", with the Openings "other", the kind "supplication" and version 1
    And exactly one Supplication revision names the added Supplication, by "admin@saaliheen.test", with base 0 and version 1, nothing before and the answer's Supplication after
    When a reader reads "/api/v1/supplications"
    Then the answer lists a Supplication at 1:5–7, said by "allahs-believing-servants", with the Openings "other", the kind "supplication" and version 1
    When a reader reads "/en/supplications"
    Then the page served has an entry headed "Al-Fatihah 1:5–7"

  Scenario: An add through the bearer token passes too
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7, said by "allahs-believing-servants", with the Openings "other" and the kind "supplication", with bearer token
    Then the answer's status is 201

  Scenario Outline: An add with <credential> is refused <status>, and adds nothing
    Given I am signed in as "<email>"
    When I add a Supplication at 1:5–7, said by "allahs-believing-servants", with the Openings "other" and the kind "supplication", with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the database still holds just the curated file's Supplications, with no new Supplication revision

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

  Scenario: A body that isn't an add is answered 400, with an error, and adds nothing
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7 with its Openings sent as the text "other", with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the database still holds just the curated file's Supplications, with no new Supplication revision

  Scenario Outline: An add that breaks a rule is refused, saying which, and adds nothing
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication in Surah <surah>, Ayahs <from> to <to>, said by "<speaker>", with the Openings "<openings>" and the kind "<kind>", with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the database still holds just the curated file's Supplications, with no new Supplication revision

    Examples:
      | surah | from | to  | speaker                   | openings | kind         | error                                                                                         |
      | 1     | 5    | 8   | allahs-believing-servants | other    | supplication | The run must lie within Surah 1, Ayahs 1 to 7.                                                |
      | 1     | 7    | 5   | allahs-believing-servants | other    | supplication | The run must start at or before the Ayah it ends at.                                          |
      | 2     | 125  | 126 | allahs-believing-servants | other    | supplication | Ayah 2:126 is already in the Supplication at Al-Baqarah 2:126. Take it out of that one first. |
      | 1     | 5    | 7   | allahs-believing-servants |          | supplication | A Supplication needs at least one Opening.                                                    |
      | 1     | 5    | 7   | nobody-at-all             | other    | supplication | No Speaker has the id "nobody-at-all". Choose one of the Speakers.                            |
      | 1     | 5    | 7   | allahs-believing-servants | other    | lament       | "lament" is no kind: choose Supplication or one of the Other words to Allah.                  |

  # ---------------------------------------------------------------- deleting

  Scenario: An Admin deletes the Supplication at 28:17, and its revision is kept
    Given I note the Supplication at 28:17
    And I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/supplications"
    And a reader has read "/en/supplications"
    When I delete the noted Supplication against its own version, with session cookie
    Then the answer's status is 204
    And the database holds no Supplication at 28:17
    And exactly one Supplication revision names the noted Supplication, by "admin@saaliheen.test", with base its noted version and version one more, the noted Supplication before and nothing after
    When a reader reads "/api/v1/supplications"
    Then the answer lists no Supplication at 28:17
    When a reader reads "/en/supplications"
    Then the page served has an entry headed "Al-Qasas 28:16" and none headed "Al-Qasas 28:17"

  Scenario Outline: A delete with <credential> is refused <status>, and deletes nothing
    Given I note the Supplication at 28:17
    And I am signed in as "<email>"
    When I delete the noted Supplication against its own version, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the database still holds just the curated file's Supplications, with no new Supplication revision

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

  Scenario Outline: A delete of <path> is answered 404, with an error
    Given I am signed in as "admin@saaliheen.test"
    When I delete "<path>" against version 1, with session cookie
    Then the answer's status is 404
    And the answer has an error
    And the database still holds just the curated file's Supplications, with no new Supplication revision

    Examples:
      | path                        |
      | /api/v1/supplications/99999 |
      | /api/v1/supplications/abc   |

  Scenario: A delete with no base is answered 400, and deletes nothing
    Given I note the Supplication at 28:17
    And I am signed in as "admin@saaliheen.test"
    When I delete the noted Supplication with no base, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the database still holds just the curated file's Supplications, with no new Supplication revision

  Scenario: A delete made against an older version is refused, with the latest Supplication
    Given I note the Supplication at 28:17
    And I am signed in as "admin@saaliheen.test"
    And the noted Supplication has since been saved with the Openings "rabbi, other"
    When I delete the noted Supplication against its noted version, with session cookie
    Then the answer's status is 409
    And the answer's error is "This Supplication has been saved since you opened it. The latest is shown beside your choices."
    And the answer's Supplication has the Openings "rabbi, other" and its noted version plus one
    And the noted Supplication is still in the database, with the Openings "rabbi, other"

  # ---------------------------------------------------------------- joining and splitting

  Scenario: An Admin joins 28:16 and 28:17 into 28:16–17, then splits them again by trimming and adding
    Given I note the Supplication at 28:16
    And I note the Supplication at 28:17
    And I am signed in as "admin@saaliheen.test"
    When I delete the Supplication at 28:17 and save the Supplication at 28:16 with the run 28:16–17
    Then GET /api/v1/supplications lists a Supplication at 28:16–17 and none at 28:16 or 28:17
    When I save the Supplication at 28:16–17 with the run 28:16 and add a Supplication at 28:17, said by "musa", with the Openings "rabbi" and the kind "supplication"
    Then GET /api/v1/supplications lists a Supplication at 28:16 and one at 28:17, and none at 28:16–17

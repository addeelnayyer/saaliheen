@issue-154
Feature: A Surah's Allah reference revisions, and undoing a publish, through the API
  An Admin lists a Surah's Allah reference revisions with
  GET /api/v1/allah-references/{surah}/revisions (ADR 0044), answered
  { surah, version, revisions }, newest first: each revision's version, its
  base, when it was made (createdAt), who made it (author: { kind: "seed" },
  or { kind: "admin", email, name } for the Admin's Account), and the Word
  locations it added and removed. Only an Admin may: no Account is answered
  401 and an Account that is not an Admin 403. Scholars are not let in until
  a Scholar role exists (AC-7, handed on).

  An Admin undoes a publish with
  POST /api/v1/allah-references/{surah}/revisions/{version}/undo and
  { base }, the version they saw. The undo is a new revision, made the way a
  publish is (ADR 0043): on the Surah's own lock, in one transaction naming
  the Admin, against the Surah's current version or refused 409 with the
  latest, and readers get it on their next request. It turns back exactly the
  undone publish's Word locations, keeping later publishes' changes. The
  seed's revision cannot be undone (422), nor can an undo that would change
  nothing (422).

  The Admin signs in through the Account test sign-in as admin@saaliheen.test,
  on the test configuration's Admin allow-list; reader@saaliheen.test signs in
  but is not on it. Surahs 102 and 106 are emptied of Allah references and
  revisions before and after each scenario, loaded through the seed the owner
  runs (version 1), and moved on by the Admin's own publishes through the API.
  Surah 106 has four Ayahs, of 2, 4, 4 and 7 Words; Surah 102 eight.

  # ---------------------------------------------------------------- AC-1, AC-6: the list

  @AC-1 @AC-5 @AC-6
  Scenario Outline: An Admin lists a Surah's revisions through the <credential>, newest first, each naming who made it, when, and what it added and removed
    Given the seed has loaded a file of Allah references holding 106:1:1 and 102:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1, 106:1:1" against version 1
    And I have published Surah 106's Allah reference changes "106:3:2" against version 2
    When I list Surah 106's Allah reference revisions, with <credential>
    Then the answer's status is 200
    And the answer holds exactly a surah, a version and its revisions
    And the answer lists Surah 106's revisions at version 3, newest first, exactly:
      | version | base | by        | added   | removed |
      | 3       | 2    | the Admin | 106:3:2 |         |
      | 2       | 1    | the Admin | 106:2:1 | 106:1:1 |
      | 1       | 0    | the seed  | 106:1:1 |         |
    And each revision listed says when it was made, within the last 5 minutes, and none was made after the one listed above it

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  @AC-1 @AC-5 @AC-6
  Scenario: A Surah that has no revision lists none, at version 0
    Given I am signed in as "admin@saaliheen.test"
    When I list Surah 106's Allah reference revisions, with session cookie
    Then the answer's status is 200
    And the answer lists Surah 106's revisions at version 0, newest first, exactly:
      | version | base | by | added | removed |

  @AC-1 @AC-5 @AC-6
  Scenario Outline: Listing the revisions of "<path>", which is no Surah, is answered 404
    Given I am signed in as "admin@saaliheen.test"
    When I GET "/api/v1/allah-references/<path>/revisions" with session cookie
    Then the answer's status is 404
    And the answer has an error

    Examples:
      | path |
      | 0    |
      | 115  |
      | al-  |

  @AC-2 @AC-5 @AC-6
  Scenario Outline: Listing the revisions as <email> with <credential> is refused <status>, and lists nothing
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "<email>"
    When I list Surah 106's Allah reference revisions, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the answer lists no revision

    Examples:
      | email                 | credential                      | status |
      | reader@saaliheen.test | session cookie                  | 403    |
      | reader@saaliheen.test | bearer token                    | 403    |
      | reader@saaliheen.test | neither cookie nor token        | 401    |
      | reader@saaliheen.test | a bearer token that is made up  | 401    |
      | reader@saaliheen.test | a session cookie that is forged | 401    |

  # ---------------------------------------------------------------- AC-3, AC-8: an undo

  @AC-3 @AC-5 @AC-8
  Scenario Outline: An Admin's undo through the <credential> writes a new revision reversing the publish, which readers get on their next request
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1, 106:1:1" against version 1
    When I undo Surah 106's revision at version 2 against version 2, with <credential>
    Then the answer's status is 200
    And the answer holds exactly a surah, a version and its locations
    And the answer is for Surah 106, at version 3, with the Word locations "106:1:1"
    And Surah 106's Allah references in the database are exactly "106:1:1"
    And Surah 106's revisions, listed by the Admin, are at version 3, newest first, exactly:
      | version | base | by        | added   | removed |
      | 3       | 2    | the Admin | 106:1:1 | 106:2:1 |
      | 2       | 1    | the Admin | 106:2:1 | 106:1:1 |
      | 1       | 0    | the seed  | 106:1:1 |         |
    And the endpoint, read with neither cookie nor token, answers Surah 106, at version 3, with the Word locations "106:1:1"
    When I GET Surah 106's parts in English
    Then the parts now mark exactly "106:1:1" as Allah references

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  @AC-3 @AC-5
  Scenario: Undoing an older publish turns back only its own Word locations, keeping a later publish's
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1, 106:3:1" against version 1
    And I have published Surah 106's Allah reference changes "106:3:1, 106:4:7" against version 2
    When I undo Surah 106's revision at version 2 against version 3, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 106, at version 4, with the Word locations "106:1:1, 106:4:7"
    And Surah 106's revisions, listed by the Admin, are at version 4, newest first, exactly:
      | version | base | by        | added            | removed          |
      | 4       | 3    | the Admin |                  | 106:2:1          |
      | 3       | 2    | the Admin | 106:4:7          | 106:3:1          |
      | 2       | 1    | the Admin | 106:2:1, 106:3:1 |                  |
      | 1       | 0    | the seed  | 106:1:1          |                  |

  @AC-3 @AC-5
  Scenario: An undo is a revision of its own: undoing it puts the publish's changes back, and undoing the publish again changes nothing and is refused
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    And I have undone Surah 106's revision at version 2 against version 2
    When I undo Surah 106's revision at version 3 against version 3, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 106, at version 4, with the Word locations "106:1:1, 106:2:1"
    When I undo Surah 106's revision at version 2 against version 4, with session cookie
    Then that undo is answered 200 too
    And the answer is now for Surah 106, at version 5, with the Word locations "106:1:1"
    When I undo Surah 106's revision at version 2 against version 5, with session cookie
    Then the answer's status is 422
    And the answer has an error
    And Surah 106's Allah references in the database are exactly "106:1:1"
    And Surah 106's revisions, listed by the Admin, are at version 5

  @AC-3 @AC-5
  Scenario: An undo's content audit rows name the Admin's Account as their actor
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1, 106:1:1" against version 1
    When I undo Surah 106's revision at version 2 against version 2, with session cookie
    Then the answer's status is 200
    And the content audit rows written since the undo was sent are exactly these, each naming the Admin's Account as its actor:
      | table                  | operation | location |
      | allahReference         | delete    | 106:2:1  |
      | allahReference         | insert    | 106:1:1  |
      | allahReferenceRevision | insert    |          |

  # The Surah's publish lock (ADR 0043) is stood for, as in
  # allah-reference-publishing.feature, by a transaction of the run's Postgres
  # holding pg_advisory_xact_lock(153, 106).
  @AC-3 @AC-5
  Scenario: An undo waits on the Surah's publish lock, as a publish does
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    And a publish in Surah 106 holds Surah 106's publish lock and has not ended
    When I start undoing Surah 106's revision at version 2 against version 2, with session cookie
    Then that undo is still unanswered after 2 seconds, waiting on Surah 106's publish lock
    When the publish holding Surah 106's publish lock ends, writing nothing
    Then that undo is answered within 5 seconds
    And the answer's status is 200
    And the answer is for Surah 106, at version 3, with the Word locations "106:1:1"

  # ---------------------------------------------------------------- AC-9: not the seed

  @AC-3 @AC-5 @AC-9
  Scenario: The seed's revision cannot be undone, and nothing is written
    Given the seed has loaded a file of Allah references holding 106:1:1, 106:2:1
    And I am signed in as "admin@saaliheen.test"
    When I undo Surah 106's revision at version 1 against version 1, with session cookie
    Then the answer's status is 422
    And the answer has an error
    And Surah 106's Allah references in the database are exactly "106:1:1, 106:2:1"
    And Surah 106's revisions, listed by the Admin, are at version 1

  @AC-3 @AC-5
  Scenario Outline: Undoing <what> is answered <status>, and nothing is written
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    When I undo <what>, POSTing "<path>" with session cookie and the body <body>
    Then the answer's status is <status>
    And the answer has an error
    And Surah 106's Allah references in the database are exactly "106:1:1, 106:2:1"
    And Surah 106's revisions, listed by the Admin, are at version 2

    Examples:
      | what                              | path                                                  | body          | status |
      | a revision Surah 106 does not have | /api/v1/allah-references/106/revisions/7/undo       | {"base":2}    | 404    |
      | a revision numbered 0             | /api/v1/allah-references/106/revisions/0/undo         | {"base":2}    | 404    |
      | a revision of no Surah            | /api/v1/allah-references/115/revisions/2/undo         | {"base":2}    | 404    |
      | with a base that is no number     | /api/v1/allah-references/106/revisions/2/undo         | {"base":"2"}  | 400    |
      | with no body                      | /api/v1/allah-references/106/revisions/2/undo         | nothing       | 400    |

  # ---------------------------------------------------------------- AC-4: an older version

  @AC-4 @AC-5
  Scenario Outline: An undo against an older version is refused through the <credential>, with the latest Allah references, and nothing is written
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    And I have published Surah 106's Allah reference changes "106:3:2" against version 2
    When I undo Surah 106's revision at version 2 against version 2, with <credential>
    Then the answer's status is 409
    And the answer has an error
    And the answer's latest is for Surah 106, at version 3, with the Word locations "106:1:1, 106:2:1, 106:3:2"
    And Surah 106's Allah references in the database are exactly "106:1:1, 106:2:1, 106:3:2"
    And Surah 106's revisions, listed by the Admin, are at version 3

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  @AC-4 @AC-5
  Scenario: Two undos against the same version at once: one lands, the other is refused and writes nothing
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    And I have published Surah 106's Allah reference changes "106:3:2" against version 2
    When I undo, at the same moment, Surah 106's revisions at versions 2 and 3, both against version 3
    Then one of the two answers is 200 and the other 409
    And Surah 106's revisions, listed by the Admin, are at version 4

  # ---------------------------------------------------------------- only an Admin undoes

  @AC-3 @AC-5
  Scenario Outline: An undo as <email> with <credential> is refused <status>, and nothing is written
    Given the seed has loaded a file of Allah references holding 106:1:1
    And I am signed in as "admin@saaliheen.test"
    And I have published Surah 106's Allah reference changes "106:2:1" against version 1
    And I am signed in as "<email>"
    When I undo Surah 106's revision at version 2 against version 2, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And Surah 106's Allah references in the database are exactly "106:1:1, 106:2:1"
    And the endpoint, read with neither cookie nor token, answers Surah 106, at version 2, with the Word locations "106:1:1, 106:2:1"

    Examples:
      | email                 | credential                      | status |
      | reader@saaliheen.test | session cookie                  | 403    |
      | reader@saaliheen.test | bearer token                    | 403    |
      | reader@saaliheen.test | neither cookie nor token        | 401    |
      | reader@saaliheen.test | a bearer token that is made up  | 401    |
      | reader@saaliheen.test | a session cookie that is forged | 401    |

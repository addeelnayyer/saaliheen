@issue-174
Feature: A Surah's Passage revisions, GET /api/v1/passages/{surah}/revisions, and undoing one, POST /api/v1/passages/{surah}/revisions/{version}/undo
  Each Passage revision of a Surah (#171) is listed to Admins (#174, ADR
  0049): GET /api/v1/passages/{surah}/revisions answers { surah, version,
  revisions }, the revisions newest first, each { version, base, createdAt,
  author, edits, undoes, changes }: the author is { kind: "seed" } or { kind:
  "admin", email, name }, the edits are those its Publish sent, `undoes` the
  version an undo turned back (null for a Publish), and `changes` the Passage
  and Phrase rows it changed, { passages, phrases }, each { before, after },
  null for a row it made or removed (null for the seed's revision, whose rows
  were not recorded).

  POST /api/v1/passages/{surah}/revisions/{version}/undo with { base }, the
  Surah's Passage version the Admin saw, puts back each row that revision
  changed as it stood before, and writes, in one transaction naming the Admin,
  one more Passage revision, with no edit, `undoes` naming {version}, and the
  rows it changed; then, as a Publish does, it refreshes and warms the Surah's
  pages, and answers 200 in the Publish's shape, { surah, version, passages,
  phrases, allahReferences }. A refusal writes nothing and answers { error }:
  401 from no Account, 403 from one not an Admin, 404 for no Surah or no such
  revision, 400 for a body that is not { base }, 422 for the seed's revision
  or one whose rows were not recorded, and 409 carrying the latest under
  "latest" when {base} is no longer the Surah's Passage version or a later
  revision changed again a row the undo would put back.

  These scenarios run on the neon-rows seam, as passage-publishing.feature's
  do and for its reason, in Surah 107 only: 7 Ayahs, of 4, 4, 5, 2, 5, 3 and
  2 Words, in two Passages, 1–3 and 4–7, and no Phrase. Before and after each
  scenario it is put back by SQL as loaded: its Passages as the Passages file
  held them, no Phrase, its seed Passage revision only (version 1), and no
  Allah reference. The Admin signs in through the Account test sign-in as
  admin@saaliheen.test; reader@saaliheen.test signs in but is not on the Admin
  allow-list.

  Background:
    Given Surah 107 holds its Passages as loaded, no Phrase and its seed Passage revision only
    And I am signed in as "admin@saaliheen.test"

  # ---------------------------------------------------------------- the list

  Scenario: An Admin lists a Surah's Passage revisions newest first, each with its author, time, edits, versions and the rows it changed
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And I have published Surah 107's edits `[{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 2
    When I list Surah 107's Passage revisions with session cookie
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 3, listing versions 3, 2 and 1 in that order
    And revision 3 is by the Admin's Account, made just now, on version 2, undoing nothing, holding the edits `[{"kind":"mark","first":"107:1:1","last":"107:1:4"}]`, and changed the Phrase 107:1:1–107:1:4 from none
    And revision 2 is by the Admin's Account, made just now, on version 1, undoing nothing, holding the edits `[{"kind":"join","from":4}]`, and changed the Passage 1–3 to 1–7 and the Passage 4–7 to none
    And revision 1 is by the seed, on version 0, with no edit and no changes recorded

  Scenario: The list through the bearer token answers the same
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    When I list Surah 107's Passage revisions with bearer token
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 2, listing versions 2 and 1 in that order

  Scenario: The list of Surah 115 is refused 404
    When I list Surah 115's Passage revisions with session cookie
    Then the answer's status is 404
    And the answer has an error

  # ---------------------------------------------------------------- an undo that passes

  Scenario: An Admin's undo puts back the rows the revision changed and writes one more revision naming the Admin and the version it undoes
    Given I have published Surah 107's edits `[{"kind":"join","from":4},{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1
    When I undo Surah 107's Passage revision 2 against Passage version 2, with session cookie
    Then the answer's status is 200
    And the answer holds exactly a surah, a version, its passages, its phrases and its allahReferences
    And the answer is for Surah 107, at Passage version 3
    And the answer's Passages are as loaded, and it has no Phrase
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107's newest Passage revision is version 3, by the Admin's Account, made just now, on version 2, undoing version 2, with no edit
    And every content audit row written since the undo was sent names the Admin's Account as its actor

  Scenario: Within moments of an undo, readers' Surah file from /data/v1 carries the Passages put back
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And a client's Surah 107 file from /data/v1 has exactly one Passage, 1–7
    When I undo Surah 107's Passage revision 2 against Passage version 2, with session cookie
    Then the answer's status is 200
    And within moments a client's Surah 107 file from /data/v1 has its Passages as loaded

  Scenario: An undo through the bearer token passes too, and undoing the undo puts the revision's rows back again
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And I have undone Surah 107's Passage revision 2 against Passage version 2
    When I undo Surah 107's Passage revision 3 against Passage version 3, with bearer token
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 4
    And the answer's Passages are exactly one Passage, 1–7, with Passage 1–3's titles as loaded
    And Surah 107's newest Passage revision is version 4, by the Admin's Account, made just now, on version 3, undoing version 3, with no edit

  Scenario: An undo of an earlier revision keeps what a later revision changed in other rows
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And I have published Surah 107's edits `[{"kind":"mark","first":"107:5:1","last":"107:5:5"}]` against Passage version 2
    When I undo Surah 107's Passage revision 2 against Passage version 3, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 4
    And the answer's Passages are as loaded, and its Phrases are exactly "107:5:1–107:5:5"
    And Surah 107's Passages and Phrases in the database are those the answer holds

  # ---------------------------------------------------------------- clashes and refusals

  Scenario: An undo of a revision whose row a later revision changed again is refused as a clash, naming the row, with the latest, and nothing is written
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And I have published Surah 107's edits `[{"kind":"retitle","from":1,"en":"Retitled after the join","ur":"as loaded"}]` against Passage version 2
    When I undo Surah 107's Passage revision 2 against Passage version 3, with session cookie
    Then the answer's status is 409
    And the answer's error says "Passage 1–7 can't be put back"
    And the answer's latest is for Surah 107, at Passage version 3
    And Surah 107's newest Passage revision is version 3
    And no content audit row is written since the undo was sent

  Scenario: An undo against a Passage version no longer the Surah's is refused as a clash with the latest, and nothing is written
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    When I undo Surah 107's Passage revision 2 against Passage version 1, with session cookie
    Then the answer's status is 409
    And the answer has an error
    And the answer's latest is for Surah 107, at Passage version 2
    And Surah 107's newest Passage revision is version 2
    And no content audit row is written since the undo was sent

  Scenario Outline: An undo of <which> is refused <status>, and nothing is written
    Given <arranged>
    When I undo <which>, Surah <surah>'s Passage revision <version>, against Passage version <base>, with session cookie
    Then the answer's status is <status>
    And the answer has an error
    And no content audit row is written since the undo was sent

    Examples:
      | which                                     | arranged                                                                          | surah | version | base | status |
      | the seed's revision                       | Surah 107 has its seed Passage revision only                                      | 107   | 1       | 1    | 422    |
      | a revision whose rows were not recorded   | another Admin's revision of Surah 107, its rows not recorded, is at version 2     | 107   | 2       | 2    | 422    |
      | a revision the Surah does not have        | Surah 107 has its seed Passage revision only                                      | 107   | 9       | 1    | 404    |
      | a revision of Surah 115                   | Surah 107 has its seed Passage revision only                                      | 115   | 1       | 1    | 404    |

  Scenario: An undo whose body is not { base } is refused 400, and nothing is written
    When I undo Surah 107's Passage revision 1 sending `{"base":"one"}`, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And no content audit row is written since the undo was sent

  # ---------------------------------------------------------------- who may

  Scenario Outline: The list and an undo from <email> with <credential> are refused <status>, and nothing is written
    Given I have published Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1
    And I am signed in as "<email>"
    When I list Surah 107's Passage revisions with <credential>
    Then the answer's status is <status>
    And the answer has an error
    When I undo Surah 107's Passage revision 2 against Passage version 2, with <credential>
    Then the undo's status is <status> too
    And the undo's answer has an error
    And Surah 107's newest Passage revision is version 2

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

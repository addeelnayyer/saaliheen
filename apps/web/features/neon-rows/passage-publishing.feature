@issue-171
Feature: Publishing a Surah's Passage, Phrase and Allah reference edits, POST /api/v1/passages/{surah}
  The Passage editor's one Publish (#171) sends everything waiting in the
  Unpublished changes bar in one request: POST /api/v1/passages/{surah} with
  { base, edits, allahReferences? }. `base` is the Surah's Passage version the
  edits were made on; `edits` is the editor's list of Passage and Phrase
  edits, in the order made (src/admin/passage-edits.ts's kinds: retitle,
  split, join and moveStart, named by the first Ayah of the Passage they
  change; mark, unmark and moveEnd, named by a Phrase's first Word); and
  `allahReferences`, sent only while Allah reference changes wait, is
  { base, changes } as ADR 0043 has it. The server replays the edits on the
  Surah's rows at `base` through the Passage and Phrase rules and, in one
  transaction, writes the rows that changed and one Passage revision (the
  Admin's Account id, the time, the edits, `base`, and `version` one more), and,
  when Allah reference changes come with it, the Allah references and their
  revision too. It answers 200 with { surah, version, passages, phrases,
  allahReferences }: the Surah's Passage version, its Passages ({ from, till,
  en, ur }) and Phrases ({ first, last }) in reading order, and its Allah
  references as their GET answers them ({ surah, version, locations }). A
  refusal writes nothing and answers { error }: 401 from no Account, 403 from
  one not an Admin, 404 for no Surah, 400 for a body that is not a Publish
  (an edit naming a Word outside the Surah) or publishes nothing, 422 when an
  edit breaks a Passage or Phrase rule, its reason in the error, or no longer
  applies to the Surah's rows, and 409 when either version sent is no longer the
  Surah's, carrying the latest under "latest" in the 200's shape.

  These scenarios run on the neon-rows seam (vitest.neon-rows.config.ts),
  whose server and database no parity scenario reads: a Publish refreshes and
  warms its Surah's pages, so a Publish on the API seam would leave them
  showing rows its clean-up put back by SQL to features/api/published-passages
  and passage-load's content hash scenarios. They publish in Surah 107 only,
  which neither passages-read-from-neon.feature's chosen Surah nor its chosen
  Theme uses. Surah 107 has 7 Ayahs, of 4, 4, 5, 2, 5, 3 and 2 Words, in two
  Passages, 1–3 and 4–7, and no Phrase. Before and after each scenario it is
  put back by SQL as loaded: its Passages as the Passages file held them, no
  Phrase, its seed Passage revision only (version 1), no Allah reference and
  no Allah reference revision (version 0), and its stored content hash as
  noted. A retitle written with the Urdu title "as loaded" keeps the Passage's
  Urdu title as the Passages file held it.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test;
  reader@saaliheen.test signs in but is not on the Admin allow-list.

  Background:
    Given Surah 107 holds its Passages as loaded, no Phrase, its seed Passage revision only, and no Allah reference

  # ---------------------------------------------------------------- AC-3: a Publish that passes

  @AC-3 @AC-9
  Scenario: An Admin's Publish writes the changed rows and one Passage revision naming the Admin, and answers them at the next version
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"retitle","from":1,"en":"Those who deny the Judgement","ur":"as loaded"},{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1, with session cookie
    Then the answer's status is 200
    And the answer holds exactly a surah, a version, its passages, its phrases and its allahReferences
    And the answer is for Surah 107, at Passage version 2
    And the answer's Passages are 1–3 titled "Those who deny the Judgement" in English and as loaded in Urdu, and 4–7 as loaded
    And the answer's Phrases are exactly "107:1:1–107:1:4"
    And Surah 107's Passages and Phrases in the database are those the answer holds
    And Surah 107 has exactly one Passage revision since the seed, by the Admin's Account, made just now, holding the edits sent, from version 1 to version 2

  @AC-3 @AC-9
  Scenario: A Publish through the bearer token passes too, and each Publish moves the Passage version on by one
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"retitle","from":1,"en":"Those who deny the Judgement","ur":"as loaded"}]` against Passage version 1, with bearer token
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 2
    When I publish Surah 107's edits `[{"kind":"retitle","from":4,"en":"Prayer without care","ur":"as loaded"}]` against Passage version 2, with bearer token
    Then that answer's status is 200 too
    And the answer is for Surah 107, at Passage version 3
    And the answer's Passages are 1–3 titled "Those who deny the Judgement" in English and as loaded in Urdu, and 4–7 titled "Prayer without care" in English and as loaded in Urdu
    And Surah 107 has exactly 2 Passage revisions since the seed, by the Admin's Account, from version 1 to version 3

  @AC-3
  Scenario: Missing Phrases never block a Publish: a Surah with no Phrase publishes Passage edits alone
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 2
    And the answer holds exactly one Passage, 1–7, with Passage 1–3's titles as loaded
    And the answer's Phrases are exactly ""
    And Surah 107's Passages and Phrases in the database are those the answer holds

  # ---------------------------------------------------------------- AC-3: a rule broken

  @AC-3
  Scenario Outline: A Publish breaking a Passage or Phrase rule is refused with its reason, "<reason>", and nothing is written
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `<edits>` against Passage version 1, with session cookie
    Then the answer's status is 422
    And the answer's error says "<reason>"
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed

    Examples:
      | edits | reason |
      | [{"kind":"retitle","from":1,"en":"","ur":"as loaded"}] | no English Passage title |
      | [{"kind":"mark","first":"107:3:4","last":"107:4:1"}] | a Phrase ends in the Passage it starts in |
      | [{"kind":"mark","first":"107:1:1","last":"107:1:4"},{"kind":"mark","first":"107:1:3","last":"107:2:2"}] | would overlap the Phrase 1:1–1:4 |
      | [{"kind":"mark","first":"107:4:1","last":"107:5:5"},{"kind":"split","from":4,"at":5}] | would put a Passage boundary inside the Phrase |

  @AC-3 @issue-171
  Scenario: A Publish whose edit no longer applies to the Surah's rows is refused, and nothing is written
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"join","from":4},{"kind":"join","from":4}]` against Passage version 1, with session cookie
    Then the answer's status is 422
    And the answer's error says "no longer applies"
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed
    And no content audit row is written since the Publish was sent

  # ---------------------------------------------------------------- AC-3: not a Publish, or no Surah

  @AC-3 @issue-171
  Scenario Outline: A Publish of <what> is refused 400, and nothing is written
    Given I am signed in as "admin@saaliheen.test"
    When I publish <what>, Surah 107's edits `<edits>`, against Passage version 1, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed
    And Surah 107 has no Allah reference and no Allah reference revision
    And no content audit row is written since the Publish was sent

    Examples:
      | what                                            | edits                                                  |
      | a Phrase mark running into Surah 108            | [{"kind":"mark","first":"107:6:1","last":"108:1:1"}]   |
      | a Phrase mark in Surah 115                      | [{"kind":"mark","first":"115:1:1","last":"115:1:1"}]   |
      | no edit and no Allah reference change           | []                                                     |

  @AC-3 @issue-171
  Scenario: A Publish to Surah 115 is refused 404, and nothing is written
    Given I am signed in as "admin@saaliheen.test"
    When I publish to Surah 115 the edits `[{"kind":"join","from":4}]` against Passage version 1, with session cookie
    Then the answer's status is 404
    And the answer has an error
    And Surah 107's Passages and Phrases in the database are as loaded
    And no content audit row is written since the Publish was sent

  # ---------------------------------------------------------------- AC-3: an older version

  @AC-3
  Scenario Outline: A Publish against Passage version <base> is refused as a clash with the latest Passages and Phrases, and nothing is written
    Given another Admin's Publish has joined Surah 107's Passage 4–7 into 1–3, at Passage version 2
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"mark","first":"107:2:1","last":"107:2:4"}]` against Passage version <base>, with session cookie
    Then the answer's status is 409
    And the answer has an error
    And the answer's latest is for Surah 107, at Passage version 2, with exactly one Passage, 1–7, and no Phrase
    And Surah 107 has exactly one Passage revision since the seed, by another Admin, from version 1 to version 2

    # An older version, and one the Surah has not reached.
    Examples:
      | base |
      | 1    |
      | 5    |

  @AC-3
  Scenario: Two Publishes against the same version at once: one lands whole, the other is refused as a clash and writes nothing
    Given I am signed in as "admin@saaliheen.test"
    When I publish, at the same moment, Surah 107's edits `[{"kind":"join","from":4}]` and `[{"kind":"mark","first":"107:4:1","last":"107:4:4"}]`, both against Passage version 1
    Then one of the two answers is 200 and the other 409
    And Surah 107's Passages and Phrases in the database are those the Publish answered 200 holds
    And Surah 107 has exactly one Passage revision since the seed, by the Admin's Account, holding the edits of the Publish answered 200, from version 1 to version 2

  @AC-3
  Scenario Outline: A Publish from <email> with <credential> is refused <status>, and nothing is written
    Given I am signed in as "<email>"
    When I publish Surah 107's edits `[{"kind":"join","from":4}]` against Passage version 1, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed

    Examples:
      | email                 | credential               | status |
      | reader@saaliheen.test | session cookie           | 403    |
      | reader@saaliheen.test | bearer token             | 403    |
      | reader@saaliheen.test | neither cookie nor token | 401    |

  # ---------------------------------------------------------------- AC-4: with Allah reference edits

  @AC-4 @AC-9
  Scenario: A Publish carrying Allah reference changes writes the Passage revision and the Allah reference revision in one transaction
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1, with the Allah reference changes "107:2:1, 107:6:2" against Allah reference version 0, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 2
    And the answer's Allah references are for Surah 107, at version 1, with the Word locations "107:2:1, 107:6:2"
    And Surah 107's Allah references in the database are exactly "107:2:1, 107:6:2"
    And Surah 107 has exactly one Passage revision since the seed, by the Admin's Account, made just now, holding the edits sent, from version 1 to version 2
    And Surah 107 has exactly one Allah reference revision, by the Admin's Account, made just now, adding "107:2:1, 107:6:2" and removing nothing, from version 0 to version 1
    And the Allah references endpoint, read with neither cookie nor token, answers Surah 107 at version 1 with the Word locations "107:2:1, 107:6:2"

  @AC-4
  Scenario: A Publish of Allah reference changes alone writes only the Allah reference revision, and the Passage version stays
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[]` against Passage version 1, with the Allah reference changes "107:2:1" against Allah reference version 0, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 107, at Passage version 1
    And the answer's Allah references are for Surah 107, at version 1, with the Word locations "107:2:1"
    And Surah 107 has no Passage revision since the seed

  @AC-4
  Scenario Outline: A Publish of `<edits>` with the Allah reference changes "<changes>", one of them refused, writes neither revision
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `<edits>` against Passage version 1, with the Allah reference changes "<changes>" against Allah reference version 0, with session cookie
    Then the answer's status is 422
    And the answer has an error
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed
    And Surah 107 has no Allah reference and no Allah reference revision

    Examples:
      | edits | changes |
      | [{"kind":"mark","first":"107:1:1","last":"107:1:4"}] | 107:2:1, 107:2:5 |
      | [{"kind":"mark","first":"107:3:4","last":"107:4:1"}] | 107:2:1 |

  @AC-4
  Scenario Outline: A Publish whose second write fails, refused by the database's <table>, leaves neither revision written
    Given the run's database refuses any row of "<table>" for Surah 107
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1, with the Allah reference changes "107:2:1" against Allah reference version 0, with session cookie
    Then the answer's status is 500
    And the answer has an error
    And Surah 107's Passages and Phrases in the database are as loaded
    And Surah 107 has no Passage revision since the seed
    And Surah 107 has no Allah reference and no Allah reference revision

    Examples:
      | table                  |
      | passage_revision       |
      | allahReferenceRevision |

  @AC-4
  Scenario Outline: A Publish clashes when either version has moved, here because <arranged>, answering the latest of both, and nothing is written
    Given <arranged>
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1, with the Allah reference changes "107:6:2" against Allah reference version 0, with session cookie
    Then the answer's status is 409
    And the answer has an error
    And the answer's latest is for Surah 107, at Passage version <passage version>, with Allah references at version <allah version>, with the Word locations "<locations>"
    And Surah 107's Phrases in the database are exactly ""
    And Surah 107's Allah references in the database are exactly "<locations>"

    Examples:
      | arranged | passage version | allah version | locations |
      | another Admin's Publish has joined Surah 107's Passage 4–7 into 1–3, at Passage version 2 | 2 | 0 |  |
      | another publish of Surah 107's Allah references has added 107:2:1, at Allah reference version 1 | 1 | 1 | 107:2:1 |

  # ---------------------------------------------------------------- AC-9: the endpoint's Publish is audited

  @AC-9
  Scenario: A Publish's content audit rows, through the endpoint, name the Admin's Account as their actor
    Given I am signed in as "admin@saaliheen.test"
    When I publish Surah 107's edits `[{"kind":"join","from":4},{"kind":"mark","first":"107:1:1","last":"107:1:4"}]` against Passage version 1, with the Allah reference changes "107:2:1" against Allah reference version 0, with session cookie
    Then the answer's status is 200
    And every content audit row written since the Publish was sent names the Admin's Account as its actor
    And the content audit rows of the Passage and Allah reference tables written since the Publish was sent are exactly these:
      | table                  | operation | key                            |
      | passage                | update    | Passage 1–3, now 1–7           |
      | passage                | delete    | Passage 4–7                    |
      | phrase                 | insert    | Phrase 107:1:1–107:1:4         |
      | passage_revision       | insert    | version 2                      |
      | allahReference         | insert    | 107:2:1                        |
      | allahReferenceRevision | insert    | version 1                      |

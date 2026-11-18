@issue-153
Feature: Publishing a Surah's Allah reference changes, POST /api/v1/allah-references/{surah}
  An Admin publishes the Allah reference changes waiting in the Passage editor
  (ADR 0035, ADR 0043): POST /api/v1/allah-references/{surah} with
  { base, changes }, the version the changes were made on and the Word
  locations tapped, in order, each turning its Word into an Allah reference
  or out of one. A publish that passes writes, in one transaction, every Word
  location it changed and one Allah reference revision (ADR 0014): the Admin's
  Account id as its author, when it was made, the Word locations added and
  removed, its base, and the version it made, one more than its base. It then
  refreshes the Surah's cache tag, so the Surah's parts mark the change on
  their next request, and answers { surah, version, locations } as the GET
  does, at the new version. A refusal writes nothing: 401 from no Account,
  403 from an Account that is not an Admin, 422 when a change is not a Word of
  that Surah, and 409 against an older version, carrying the latest as
  "latest". Versions are kept per Surah.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test,
  on the test configuration's Admin allow-list; reader@saaliheen.test signs in
  but is not on it. The run's Postgres (features/api/serve-api.ts) is arranged
  for each scenario: the Surahs these scenarios publish in are emptied of
  Allah references and revisions before and after each one, loaded through
  the seed the owner runs (version 1), and moved on by "another publish", an
  Allah reference revision written into the two tables as a publish writes it.
  Word locations are checked against the Quran text's Word counts; Surah 103
  has three Ayahs, of 1, 4 and 9 Words, Surah 110 three of 5, 7 and 7.

  # ---------------------------------------------------------------- AC-1, AC-3: a publish that passes

  @AC-1 @AC-3 @AC-9
  Scenario: An Admin's publish writes every changed Word location and one revision, and the endpoint answers them at a new version
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:2:2, 103:1:1, 103:3:3" against version 1, with session cookie
    Then the answer's status is 200
    And the answer holds exactly a surah, a version and its locations
    And the answer is for Surah 103, at version 2, with the Word locations "103:2:2, 103:3:3"
    And Surah 103's Allah references in the database are exactly "103:2:2, 103:3:3"
    And Surah 103 has exactly one Allah reference revision since the seed, by the Admin's Account, made just now, adding "103:2:2, 103:3:3" and removing "103:1:1", from version 1 to version 2
    And the endpoint, read with neither cookie nor token, answers Surah 103, at version 2, with the Word locations "103:2:2, 103:3:3"

  @AC-1 @AC-3 @AC-9
  Scenario: A publish through the bearer token passes too, and each publish moves the version on by one
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:2:2" against version 1, with bearer token
    Then the answer's status is 200
    And the answer is for Surah 103, at version 2, with the Word locations "103:1:1, 103:2:2"
    When I publish Surah 103's Allah reference changes "103:1:1" against version 2, with bearer token
    Then the second publish is answered 200 too
    And its answer is for Surah 103, at version 3, with the Word locations "103:2:2"
    And Surah 103 has exactly 2 Allah reference revisions since the seed, by the Admin's Account, from version 1 to version 3

  @AC-1 @AC-9
  Scenario: A Word tapped twice is no change, and the revision does not name it
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:2:2, 103:3:3, 103:2:2, 103:1:1, 103:1:1" against version 1, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 103, at version 2, with the Word locations "103:1:1, 103:3:3"
    And Surah 103 has exactly one Allah reference revision since the seed, by the Admin's Account, made just now, adding "103:3:3" and removing nothing, from version 1 to version 2

  @AC-1 @AC-9
  Scenario: A publish's content audit rows name the Admin's Account as their actor
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:2:2, 103:1:1" against version 1, with session cookie
    Then the answer's status is 200
    And the content audit rows written since the publish was sent are exactly these, each naming the Admin's Account as its actor:
      | table                  | operation | location |
      | allahReference         | delete    | 103:1:1  |
      | allahReference         | insert    | 103:2:2  |
      | allahReferenceRevision | insert    |          |

  # ---------------------------------------------------------------- AC-1: all of it or none of it

  @AC-1 @AC-9
  Scenario Outline: A publish holding a change that is not a Word of the Surah, "<changes>", is refused whole, and nothing of it is written
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "<changes>" against version 1, with session cookie
    Then the answer's status is 422
    And the answer has an error
    And Surah 103's Allah references in the database are exactly "103:1:1"
    And Surah 103 has no Allah reference revision since the seed
    And Surah 110's Allah references in the database are exactly ""

    # In turn: a Word of another Surah, after others; a Word past its Ayah's
    # last; an Ayah past the Surah's last; Word 0.
    Examples:
      | changes                   |
      | 103:2:2, 103:1:1, 110:1:1 |
      | 103:2:2, 103:2:5          |
      | 103:3:3, 103:4:1          |
      | 103:2:0, 103:2:2          |

  @AC-1 @AC-4 @AC-9
  Scenario: Two publishes against the same version at once: one lands whole, the other is refused and writes nothing
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish, at the same moment, Surah 103's Allah reference changes "103:2:1, 103:2:2" and "103:3:1, 103:3:2, 103:1:1", both against version 1
    Then one of the two answers is 200 and the other 409
    And Surah 103's Allah references in the database are those the publish answered 200 holds
    And Surah 103 has exactly one Allah reference revision since the seed, by the Admin's Account, made just now, holding the changes of the publish answered 200, from version 1 to version 2

  # ---------------------------------------------------------------- AC-2: the Surah's parts are refreshed

  @AC-2 @AC-9
  Scenario Outline: After a publish, Surah 103's part in <Language> marks the published Allah references on its next request
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:1:1, 103:3:3" against version 1, with session cookie
    Then the answer's status is 200
    When I GET Surah 103's parts in <Language>
    Then the parts now mark exactly "103:3:3" as Allah references

    Examples:
      | Language |
      | English  |
      | Urdu     |

  # ---------------------------------------------------------------- AC-4: an older version

  @AC-4 @AC-9
  Scenario Outline: A publish against an older version is refused through the <credential>, with the latest Allah references, and nothing is written
    Given the seed has loaded a file of Allah references holding 103:1:1
    And another publish of Surah 103's Allah references has added 103:2:2
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:3:3" against version 1, with <credential>
    Then the answer's status is 409
    And the answer has an error
    And the answer's latest is for Surah 103, at version 2, with the Word locations "103:1:1, 103:2:2"
    And Surah 103's Allah references in the database are exactly "103:1:1, 103:2:2"
    And Surah 103 has exactly one Allah reference revision since the seed, by another Admin, from version 1 to version 2

    Examples:
      | credential     |
      | session cookie |
      | bearer token   |

  @AC-4 @AC-9
  Scenario: A publish against a version the Surah has not reached is refused, and nothing is written
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:3:3" against version 5, with session cookie
    Then the answer's status is 409
    And the answer's latest is for Surah 103, at version 1, with the Word locations "103:1:1"
    And Surah 103 has no Allah reference revision since the seed

  # ---------------------------------------------------------------- AC-5: Surahs apart

  @AC-5 @AC-9
  Scenario: A publish in another Surah passes against that Surah's own version, whatever this Surah's
    Given the seed has loaded a file of Allah references holding 103:1:1 and 110:1:3
    And another publish of Surah 103's Allah references has added 103:2:2
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 110's Allah reference changes "110:3:4" against version 1, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 110, at version 2, with the Word locations "110:1:3, 110:3:4"
    And Surah 103's Allah references in the database are exactly "103:1:1, 103:2:2"
    And the endpoint, read with neither cookie nor token, answers Surah 103, at version 2, with the Word locations "103:1:1, 103:2:2"

  @AC-5 @AC-9
  Scenario: A stale publish in one Surah does not stop a publish in another
    Given the seed has loaded a file of Allah references holding 103:1:1 and 110:1:3
    And another publish of Surah 103's Allah references has added 103:2:2
    And I am signed in as "admin@saaliheen.test"
    When I publish Surah 103's Allah reference changes "103:3:3" against version 1, with session cookie
    Then the answer's status is 409
    When I publish Surah 110's Allah reference changes "110:2:5" against version 1, with session cookie
    Then the answer's status is 200
    And the answer is for Surah 110, at version 2, with the Word locations "110:1:3, 110:2:5"

  @AC-5 @AC-9
  Scenario: Publishes in two Surahs at the same moment both pass, each at its own Surah's next version
    Given the seed has loaded a file of Allah references holding 103:1:1 and 110:1:3
    And I am signed in as "admin@saaliheen.test"
    When I publish, at the same moment, Surah 103's Allah reference changes "103:2:2" against version 1 and Surah 110's "110:3:4" against version 1
    Then both answers are 200
    And Surah 103's Allah references in the database are exactly "103:1:1, 103:2:2"
    And Surah 110's Allah references in the database are exactly "110:1:3, 110:3:4"
    And Surah 103 has exactly one Allah reference revision since the seed, by the Admin's Account, made just now, adding "103:2:2" and removing nothing, from version 1 to version 2
    And Surah 110 has exactly one Allah reference revision since the seed, by the Admin's Account, made just now, adding "110:3:4" and removing nothing, from version 1 to version 2

  # The publish lock is Surah 103's alone (ADR 0043): a publish still writing in
  # Surah 103 is stood for by a transaction of the run's Postgres that holds
  # pg_advisory_xact_lock(153, 103), the lock a publish in Surah 103 takes, and
  # rolls back when the scenario says it ends, or when the scenario ends.
  @AC-5 @AC-9
  Scenario: While publishes in Surah 103 hold and wait on its Surah's lock, a publish in Surah 110 is answered at once
    Given the seed has loaded a file of Allah references holding 103:1:1 and 110:1:3
    And I am signed in as "admin@saaliheen.test"
    And a publish in Surah 103 holds Surah 103's publish lock and has not ended
    When I start publishing Surah 103's Allah reference changes "103:2:2" against version 1, with session cookie
    Then that publish is still unanswered after 2 seconds, waiting on Surah 103's publish lock
    When I start publishing Surah 110's Allah reference changes "110:3:4" against version 1, with session cookie
    Then that publish is answered within 5 seconds, while Surah 103's publish lock is still held
    And the answer's status is 200
    And the answer is for Surah 110, at version 2, with the Word locations "110:1:3, 110:3:4"
    When the publish holding Surah 103's publish lock ends, writing nothing
    Then the publish started in Surah 103 is answered within 5 seconds
    And its status is 200
    And its answer is for Surah 103, at version 2, with the Word locations "103:1:1, 103:2:2"

  # ---------------------------------------------------------------- AC-6: only an Admin publishes

  @AC-6 @AC-9
  Scenario Outline: A publish from <email> with <credential> is refused <status>, and nothing is written
    Given the seed has loaded a file of Allah references holding 103:1:1
    And I am signed in as "<email>"
    When I publish Surah 103's Allah reference changes "103:2:2, 103:1:1" against version 1, with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And Surah 103's Allah references in the database are exactly "103:1:1"
    And Surah 103 has no Allah reference revision since the seed
    And the endpoint, read with neither cookie nor token, answers Surah 103, at version 1, with the Word locations "103:1:1"

    Examples:
      | email                 | credential                      | status |
      | reader@saaliheen.test | session cookie                  | 403    |
      | reader@saaliheen.test | bearer token                    | 403    |
      | reader@saaliheen.test | neither cookie nor token        | 401    |
      | reader@saaliheen.test | a bearer token that is made up  | 401    |
      | reader@saaliheen.test | a session cookie that is forged | 401    |

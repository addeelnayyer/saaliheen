@issue-270
Feature: Supplication spans, saved with a Supplication and read from /api/v1/supplications
  A Supplication's spans (#270, #230, ADR 0063) are the stretches of
  consecutive Words in its Ayahs that its Speaker says to Allah. Each is a
  "from" and a "to" Word location (s:a:w), which may be in different Ayahs of
  the run. They are part of the Supplication's whole editable state, so the
  Supplication editor sends them with every save, PUT
  /api/v1/supplications/{id}, and with every add, POST /api/v1/supplications,
  as "spans":
    { "base": n, "surah": n, "ayahFrom": n, "ayahTo": n, "speakerId": "...",
      "openings": [...], "kind": "...",
      "spans": [ { "from": "2:127:8", "to": "2:129:16" }, ... ] }
  A body without "spans", or with a span that is not an object of a text
  "from" and a text "to", is not a save: 400.

  A save that passes keeps exactly the spans it was sent, in place of those
  the Supplication had, an identical span sent twice kept once, and writes
  them into its Supplication revision with the rest of the Supplication:
  "before" and "after" each hold the Supplication's "spans" as the API
  answers them. GET /api/v1/supplications, the answer of a save or an add, and
  the latest Supplication in a 409 answer each give a Supplication's "spans"
  in reading order by "from"; a Supplication with none answers [].

  A save is refused 422, changing nothing and writing no revision, after the
  run's own checks, when one of its spans is wrong. The checks are made in
  turn, each naming the first wrong span in reading order: an end that is no
  Word of the Quran text (an Ayah-end marker, Word 0, an Ayah that does not
  exist, or no s:a:w); an end outside the run being saved, which is also how a
  change of run that would strand a span is refused; a "to" before its
  "from"; and a span that overlaps another of the same Supplication.

  Deleting a Supplication removes its spans; its revisions outlive it, the
  last holding its spans before the delete.

  The Admin signs in through the Account test sign-in as admin@saaliheen.test.
  Supplications are found by their run, as the curated file loaded them, with
  no spans; each scenario puts the Supplications it saved back through the
  endpoint, spans and all, and deletes what it added. Word counts are the
  sources': 2:127 has 14 Words, 2:128 17, 2:129 16, and 2:129:17 is its
  Ayah-end marker.

  # ---------------------------------------------------------------- a save keeps them, the read answers them

  Scenario: An Admin saves the Supplication at 2:127–129 with one span across its Ayahs, and the save and the read answer it
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with the spans "2:127:8–2:129:16", with session cookie
    Then the answer's status is 200
    And the answer's Supplication has the spans "2:127:8–2:129:16" and its noted version plus one
    When a reader reads "/api/v1/supplications"
    Then the answer lists the Supplication at 2:127–129 with the spans "2:127:8–2:129:16"
    And every other Supplication in the answer has the spans []

  Scenario: Several spans, sent out of order, are answered in reading order by "from"
    Given I note the Supplication at 3:35–36 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 3:35–36 with the spans "3:36:6–3:36:24, 3:35:4–3:35:18", with session cookie
    Then the answer's status is 200
    And the answer's Supplication has the spans "3:35:4–3:35:18, 3:36:6–3:36:24" and its noted version plus one
    When a reader reads "/api/v1/supplications"
    Then the answer lists the Supplication at 3:35–36 with the spans "3:35:4–3:35:18, 3:36:6–3:36:24"

  Scenario: A span may stop partway through an Ayah, and may be one Word
    Given I note the Supplication at 7:143 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 7:143 with the spans "7:143:10–7:143:13, 7:143:30–7:143:30", with session cookie
    Then the answer's status is 200
    And the answer's Supplication has the spans "7:143:10–7:143:13, 7:143:30–7:143:30" and its noted version plus one

  Scenario: An identical span sent twice is kept once
    Given I note the Supplication at 2:201 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:201 with the spans "2:201:5–2:201:14, 2:201:5–2:201:14", with session cookie
    Then the answer's status is 200
    And the answer's Supplication has the spans "2:201:5–2:201:14" and its noted version plus one

  Scenario: The Supplication revision holds the spans before and after each save
    Given I note the Supplication at 2:201 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:201 with the spans "2:201:5–2:201:14", with session cookie
    Then the answer's status is 200
    And the newest Supplication revision of the noted Supplication holds the spans [] before and "2:201:5–2:201:14" after
    When I save the Supplication at 2:201 with the spans "2:201:5–2:201:9", with session cookie
    Then the second save's status is 200 too
    And the newest Supplication revision of the noted Supplication holds the spans "2:201:5–2:201:14" before and "2:201:5–2:201:9" after
    When I save the Supplication at 2:201 with no spans, with session cookie
    Then the third save's status is 200 too
    And the answer's Supplication has the spans [] and its noted version plus three
    And the newest Supplication revision of the noted Supplication holds the spans "2:201:5–2:201:9" before and [] after

  Scenario: A save of the spans is audited under the Admin's Account id
    Given I note the Supplication at 2:201 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And I note the latest content audit row
    When I save the Supplication at 2:201 with the spans "2:201:5–2:201:14", with session cookie
    Then the answer's status is 200
    And the content audit since holds exactly one insert into `supplication_span`, by the Admin's Account id

  Scenario: A save made against an older version is refused, and its answer's latest Supplication carries the spans saved since
    Given I note the Supplication at 2:201 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And the Supplication at 2:201 has since been saved with the spans "2:201:5–2:201:14"
    When I save the noted Supplication with the spans "2:201:1–2:201:3", against its noted version, with session cookie
    Then the answer's status is 409
    And the answer's Supplication has the spans "2:201:5–2:201:14" and its noted version plus one
    When a reader reads "/api/v1/supplications"
    Then the answer lists the Supplication at 2:201 with the spans "2:201:5–2:201:14"

  # ---------------------------------------------------------------- not a save

  Scenario Outline: A save whose spans are <what> is not a save, and changes nothing
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with its spans sent as <what>, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the noted Supplications are as I noted them, with no spans and no new Supplication revision

    Examples:
      | what                          |
      | left out                      |
      | not a list                    |
      | a list holding a text         |
      | a span without its "to"       |
      | a span whose "from" is a number |

  Scenario Outline: An add whose spans are <what> is not an add, and adds nothing
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7 with its spans sent as <what>, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the database holds no Supplication at 1:5–7

    Examples:
      | what                          |
      | left out                      |
      | a span without its "to"       |

  # ---------------------------------------------------------------- refused spans

  Scenario Outline: A save of the Supplication at 2:127–129 with the spans <spans> is refused, naming the wrong span
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with the spans "<spans>", with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the noted Supplications are as I noted them, with no spans and no new Supplication revision

    Examples:
      | spans                                  | error                                                                                         |
      # an Ayah-end marker
      | 2:127:8–2:129:17                       | There is no Word at 2:129:17, where the Supplication span from 2:127:8 to 2:129:17 ends.      |
      # Word 0
      | 2:127:0–2:127:5                        | There is no Word at 2:127:0, where the Supplication span from 2:127:0 to 2:127:5 starts.      |
      # an Ayah Al-Baqarah does not have
      | 2:127:8–2:287:1                        | There is no Word at 2:287:1, where the Supplication span from 2:127:8 to 2:287:1 ends.        |
      # an Ayah, not a Word
      | 2:127–2:129:16                         | There is no Word at 2:127, where the Supplication span from 2:127 to 2:129:16 starts.         |
      # before the run
      | 2:126:3–2:127:5                        | The Supplication span from 2:126:3 to 2:127:5 lies outside the run 2:127–129.                 |
      # after the run, in another Surah
      | 2:129:1–3:1:1                          | The Supplication span from 2:129:1 to 3:1:1 lies outside the run 2:127–129.                   |
      # "to" before "from"
      | 2:128:5–2:128:2                        | The Supplication span from 2:128:5 to 2:128:2 ends before it starts.                          |
      # two that overlap
      | 2:127:8–2:128:3, 2:128:3–2:129:16      | The Supplication span from 2:128:3 to 2:129:16 overlaps the one from 2:127:8 to 2:128:3.      |
      # one inside another
      | 2:127:8–2:129:16, 2:128:1–2:128:4      | The Supplication span from 2:128:1 to 2:128:4 overlaps the one from 2:127:8 to 2:129:16.      |
      # two outside the run: the first in reading order is named
      | 2:129:1–3:1:1, 2:126:3–2:127:5         | The Supplication span from 2:126:3 to 2:127:5 lies outside the run 2:127–129.                 |
      # no Word is checked before the run, whichever span comes first
      | 2:126:3–2:127:5, 2:129:1–2:129:17      | There is no Word at 2:129:17, where the Supplication span from 2:129:1 to 2:129:17 ends.      |
      # the run before order, and order before overlap
      | 2:129:5–2:129:1, 2:126:1–2:126:2       | The Supplication span from 2:126:1 to 2:126:2 lies outside the run 2:127–129.                 |
      | 2:127:8–2:128:3, 2:128:1–2:129:16, 2:129:9–2:129:2 | The Supplication span from 2:129:9 to 2:129:2 ends before it starts.              |

  Scenario: The run's own checks come before the spans'
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Supplication at 2:127–129 with the run 2:127–287 and the spans "2:127:8–2:129:17", with session cookie
    Then the answer's status is 422
    And the answer's error reads: The run must lie within Surah 2, Ayahs 1 to 286.

  Scenario Outline: A change of run to <run> that would strand a span is refused
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And the Supplication at 2:127–129 has since been saved with the spans "2:127:8–2:127:14, 2:129:1–2:129:16"
    When I save the Supplication at 2:127–129 with the run <run>, keeping its spans, with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the Supplication at 2:127–129 still has the spans "2:127:8–2:127:14, 2:129:1–2:129:16"

    Examples:
      | run       | error                                                                         |
      | 2:127–128 | The Supplication span from 2:129:1 to 2:129:16 lies outside the run 2:127–128. |
      | 2:128–129 | The Supplication span from 2:127:8 to 2:127:14 lies outside the run 2:128–129. |

  Scenario: A change of run that takes out the span it would strand passes
    Given I note the Supplication at 2:127–129 and its Supplication revisions
    And I am signed in as "admin@saaliheen.test"
    And the Supplication at 2:127–129 has since been saved with the spans "2:127:8–2:127:14, 2:129:1–2:129:16"
    When I save the Supplication at 2:127–129 with the run 2:127–128 and the spans "2:127:8–2:127:14", with session cookie
    Then the answer's status is 200
    And the answer's Supplication has the spans "2:127:8–2:127:14" and its noted version plus two

  # ---------------------------------------------------------------- adds and deletes

  Scenario: An add takes its spans, and a delete removes them while its revisions keep them
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7 with the spans "1:6:1–1:7:9", with session cookie
    Then the answer's status is 201
    And the added Supplication has the spans "1:6:1–1:7:9"
    When I delete the added Supplication, with session cookie
    Then the answer's status is 204
    And no Supplication span is left of the added Supplication
    And the added Supplication's revisions are kept, the delete's holding the spans "1:6:1–1:7:9" before and nothing after

  Scenario: An add with no spans answers the spans []
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7 with no spans, with session cookie
    Then the answer's status is 201
    And the added Supplication has the spans []

  Scenario: An add's spans are checked as a save's
    Given I am signed in as "admin@saaliheen.test"
    When I add a Supplication at 1:5–7 with the spans "1:4:1–1:5:2", with session cookie
    Then the answer's status is 422
    And the answer's error reads: The Supplication span from 1:4:1 to 1:5:2 lies outside the run 1:5–7.
    And the database holds no Supplication at 1:5–7

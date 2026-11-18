@issue-143
Feature: Marked Words, saved with an Iltifat and read from /api/v1/iltifat
  An Admin marks the Words of an Iltifat that carry its turn (#143): its
  "from" Words and its "to" Words, each side one or more whole Words. They are
  part of the Iltifat's whole editable state, so the Iltifat editor sends them
  with every save, PUT /api/v1/iltifat/{id} (ADR 0023), as "markedWords":
    { "base": n, "reason": "...", "ayahFrom": n, "ayahTo": n, "disputed": b,
      "markedWords": [ { "location": "1:2:2", "side": "from" }, ... ] }
  Each Marked Word is a Word location (s:a:w) and its side, "from" or "to".
  A body without "markedWords", or with a Marked Word that is not an object
  of a text "location" and a "side" of "from" or "to", is not a save: 400.

  A save that passes keeps exactly the Marked Words it was sent, in place of
  those the Iltifat had, and writes them into its Iltifat revision with the
  rest of the Iltifat: "before" and "after" each hold the Iltifat's
  "markedWords" as the API answers them. GET /api/v1/iltifat, the 200 answer
  of a save, and the latest Iltifat in a 409 answer each give an Iltifat's
  "markedWords" in reading order (by Ayah, then Word), each
  { "location", "side" }; an Iltifat with none answers [].

  A save is refused 422, changing nothing and writing no revision, when a
  Marked Word is not a Word of the Quran text ("There is no Word at 1:2:9.")
  or lies outside the run being saved ("The Marked Word 1:6:1 lies outside
  the run 1:2–5."), which is also how a change of run that would leave a
  Marked Word outside it is refused. A Word is a Word location the Quran text
  holds, so an Ayah-end marker (1:2:5) is not one. When several are wrong,
  the first in reading order is named, a Word that does not exist before one
  outside the run.

  A Word may be marked in two Iltifat (بَارَكْنَا in 17:1, 17:1:13: the "to" of
  He → We and the "from" of We → He).

  The Admin signs in through the Account test sign-in as admin@saaliheen.test.
  The Iltifat are the catalogue's, found by Iltifat direction and cited Ayah;
  each scenario puts back every Iltifat it saved, Marked Words and all,
  through the endpoint, so the other API features read the catalogue.

  # ---------------------------------------------------------------- AC-4, AC-8: a save keeps them, the read answers them

  @AC-4 @AC-8 @AC-9
  Scenario: An Admin marks the "from" and "to" Words of the He → You Iltifat at 1:2–5, and the save and the read answer them
    Given I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    And the He → You Iltifat cited at 1:5 has no Marked Words
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat cited at 1:5 with the "from" Words 1:2:2 and the "to" Words 1:5:3, 1:5:1, with session cookie
    Then the answer's status is 200
    And the answer's Iltifat has these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
      | 1:5:3    | to   |
    And the answer's Iltifat has its noted version plus one
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer lists the He → You Iltifat cited at 1:5 with these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
      | 1:5:3    | to   |
    And every other Iltifat in the answer has no Marked Words

  @AC-8
  Scenario: Every Iltifat that /api/v1/iltifat answers carries its Marked Words, each a Word location and its side
    Given I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat cited at 1:5 has the "from" Words 1:2:2 and the "to" Words 1:5:1
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer's status is 200
    And each Iltifat in the answer has its Marked Words as a list, each a Word location of its Surah, within its run, and the side "from" or "to"
    And the answer lists the He → You Iltifat cited at 1:5 with these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |

  @AC-4 @AC-9
  Scenario: The Iltifat revision holds the Marked Words before and after the save
    Given I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    And the He → You Iltifat cited at 1:5 has no Marked Words
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat cited at 1:5 with the "from" Words 1:2:2 and the "to" Words 1:5:1, 1:5:3, with session cookie
    Then the answer's status is 200
    And exactly one new Iltifat revision names the He → You Iltifat cited at 1:5
    And that Iltifat revision's author is "admin@saaliheen.test"
    And that Iltifat revision holds, before the save, no Marked Words
    And that Iltifat revision holds, after the save, these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
      | 1:5:3    | to   |

  @AC-4 @AC-8 @AC-9
  Scenario: A later save without a Word takes it out, and its revision shows the Word going
    Given I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat cited at 1:5 has the "from" Words 1:2:2 and the "to" Words 1:5:1, 1:5:3
    And I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    When I save the He → You Iltifat cited at 1:5 with the "from" Words 1:2:2 and the "to" Words 1:5:1, with session cookie
    Then the answer's status is 200
    And the answer's Iltifat has these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
    And exactly one new Iltifat revision names the He → You Iltifat cited at 1:5
    And that Iltifat revision holds, before the save, the Marked Words I noted
    And that Iltifat revision holds, after the save, these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
    When I save the He → You Iltifat cited at 1:5 with no Marked Words, with session cookie
    Then the answer's status is again 200
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer lists the He → You Iltifat cited at 1:5 with no Marked Words

  @AC-4 @AC-9
  Scenario: A save made against an older version is refused, and its answer's latest Iltifat carries the Marked Words saved since
    Given I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat cited at 1:5 has been saved since I noted it, with the "from" Words 1:2:2 and the "to" Words 1:5:1
    When I save the He → You Iltifat cited at 1:5 against its noted version, with the "from" Words 1:2:1 and the "to" Words 1:5:3, with session cookie
    Then the answer's status is 409
    And the answer's Iltifat has these Marked Words, in this order:
      | location | side |
      | 1:2:2    | from |
      | 1:5:1    | to   |
    And the He → You Iltifat cited at 1:5 still has the "from" Words 1:2:2 and the "to" Words 1:5:1, with one new Iltifat revision

  # ---------------------------------------------------------------- AC-2: refused Marked Words

  @AC-2 @AC-9
  Scenario Outline: A save marking <from> as "from" and <to> as "to" in the He → You Iltifat at 1:2–5 is refused with its reason
    Given I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat cited at 1:5 with the "from" Words <from> and the "to" Words <to>, with session cookie
    Then the answer's status is 422
    And the answer's error is "<error>"
    And the He → You Iltifat cited at 1:5 is as I noted it, Marked Words and all, with no new Iltifat revision

    Examples:
      | from  | to           | error                                             |
      # a Word after the run
      | 1:2:2 | 1:6:1        | The Marked Word 1:6:1 lies outside the run 1:2–5. |
      # a Word before the run
      | 1:1:1 | 1:5:1        | The Marked Word 1:1:1 lies outside the run 1:2–5. |
      # a Word of another Surah
      | 2:2:1 | 1:5:1        | The Marked Word 2:2:1 lies outside the run 1:2–5. |
      # a Word its Ayah does not have
      | 1:2:9 | 1:5:1        | There is no Word at 1:2:9.                        |
      # an Ayah-end marker
      | 1:2:5 | 1:5:1        | There is no Word at 1:2:5.                        |
      # Word 0
      | 1:2:0 | 1:5:1        | There is no Word at 1:2:0.                        |
      # an Ayah Al-Fatihah does not have
      | 1:2:2 | 1:8:1        | There is no Word at 1:8:1.                        |
      # an Ayah, not a Word
      | 1:2:2 | 1:5          | There is no Word at 1:5.                          |
      # two wrong, the missing one named
      | 1:2:2 | 1:6:1, 1:5:9 | There is no Word at 1:5:9.                        |

  @AC-2 @AC-9
  Scenario Outline: A change of run that would leave a Marked Word outside it is refused with the reason, run <from> to <to>
    Given I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat cited at 1:5 has the "from" Words 1:2:2 and the "to" Words 1:5:1
    And I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    When I save the He → You Iltifat cited at 1:5 with the run from Ayah <from> to Ayah <to>, keeping its Marked Words, with session cookie
    Then the answer's status is 422
    And the answer's error is "<error>"
    And the He → You Iltifat cited at 1:5 is as I noted it, Marked Words and all, with no new Iltifat revision

    Examples:
      | from | to | error                                             |
      | 3    | 5  | The Marked Word 1:2:2 lies outside the run 1:3–5. |
      | 4    | 7  | The Marked Word 1:2:2 lies outside the run 1:4–7. |

  @AC-2
  Scenario: A change of run that takes out the Words it would leave outside passes
    Given I am signed in as "admin@saaliheen.test"
    And the He → You Iltifat cited at 1:5 has the "from" Words 1:2:2 and the "to" Words 1:5:1
    And I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    When I save the He → You Iltifat cited at 1:5 with the run from Ayah 3 to Ayah 5, the "from" Words 1:3:1 and the "to" Words 1:5:1, with session cookie
    Then the answer's status is 200
    And the answer's Iltifat has these Marked Words, in this order:
      | location | side |
      | 1:3:1    | from |
      | 1:5:1    | to   |

  @AC-2 @AC-9
  Scenario Outline: A save whose Marked Words are <what> is not a save, and changes nothing
    Given I note the He → You Iltifat cited at 1:5, its Marked Words and its Iltifat revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the He → You Iltifat cited at 1:5 with its own fields and the Marked Words sent as <what>, with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the He → You Iltifat cited at 1:5 is as I noted it, Marked Words and all, with no new Iltifat revision

    Examples:
      | what                       |
      | left out                   |
      | a side that is "sideways"  |
      | a location that is a number |
      | not a list                 |

  # ---------------------------------------------------------------- AC-3: one Word in two Iltifat

  @AC-3 @AC-9
  Scenario: The Word at 17:1:13 is marked as the "to" of the He → We Iltifat and the "from" of the We → He Iltifat cited at 17:1
    Given I am signed in as "admin@saaliheen.test"
    And the Word at 17:1:13 is the Word the issue names, بَارَكْنَا
    When I save the He → We Iltifat cited at 17:1 with the "from" Words 17:1:2 and the "to" Words 17:1:13, with session cookie
    Then the answer's status is 200
    When I save the We → He Iltifat cited at 17:1 with the "from" Words 17:1:13 and the "to" Words 17:1:18, with session cookie
    Then the answer's status is again 200
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer lists the He → We Iltifat cited at 17:1 with these Marked Words, in this order:
      | location | side |
      | 17:1:2   | from |
      | 17:1:13  | to   |
    And the answer lists the We → He Iltifat cited at 17:1 with these Marked Words, in this order:
      | location | side |
      | 17:1:13  | from |
      | 17:1:18  | to   |

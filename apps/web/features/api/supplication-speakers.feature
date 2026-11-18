@issue-202
Feature: An Admin keeps the Speakers through /api/v1/supplications/speakers, each save a Speaker revision
  The Supplication editor's Speakers page (#202, #196, ADR 0027) adds a
  Speaker through an Admin-only POST /api/v1/supplications/speakers, its body
    { "nameEn": "<English name>", "nameUr": "<Urdu name>", "includesProphet": true|false }
  saves one through PUT /api/v1/supplications/speakers/{id}, its body the same
  with "base", the version it was made against, and deletes one through
  DELETE /api/v1/supplications/speakers/{id}, its body { "base" }.

  An add that passes answers 201 with { "speaker": <the new Speaker> }: its id
  a slug of its English name, at version 1. A save answers 200 with the saved
  Speaker, its version one more than its base; a delete answers 204. Each
  writes one Speaker revision in `supplication_speaker_revision`, in the same
  transaction: speaker_id, author (the Admin's email), base, version, and
  before and after, the Speaker as GET /api/v1/supplications lists it (empty,
  null, before an add and after a delete). A delete's revision outlives the
  Speaker. A Speaker's names and Prophet mark show through every Supplication
  of that Speaker at once, on GET /api/v1/supplications and the Supplications
  page.

  A refusal answers { "error" } and changes no row: 401 from no Account, 403
  from an Account that is not an Admin, 404 for an id no Speaker has, 400 for
  a body that isn't an add, a save or a delete, 409 for a save or delete made
  against an older version (with the latest Speaker as "speaker"), and 422 for
  a blank name in either Language, an English or Urdu name another Speaker
  has, or deleting a Speaker who still says a Supplication.

  Each scenario puts the Speakers back as the curated file's load left them,
  through the endpoints, at version 1, and removes its Speaker revisions.
  Speaker ids and names are the curated file's; the added Speaker, the people
  of Yunus, is this feature's own.

  # ---------------------------------------------------------------- adding

  Scenario: An Admin adds a Speaker, at version 1, and GET /api/v1/supplications lists it at once
    Given I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/supplications"
    When I add the Speaker "The people of Yunus", "قومِ یونس", who does not include a Prophet, with session cookie
    Then the answer's status is 201
    And the answer's Speaker is "the-people-of-yunus", named "The people of Yunus" and "قومِ یونس", who does not include a Prophet, at version 1
    And exactly one Speaker revision names "the-people-of-yunus", by "admin@saaliheen.test", with base 0 and version 1, nothing before and the answer's Speaker after
    When a reader reads "/api/v1/supplications"
    Then the answer lists the answer's Speaker from before

  Scenario Outline: An add with a blank name or another Speaker's is refused 422, and adds nothing
    Given I am signed in as "admin@saaliheen.test"
    When I add the Speaker "<nameEn>", "<nameUr>", who does not include a Prophet, with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the database still holds just the curated file's Speakers, with no new Speaker revision

    Examples:
      | nameEn              | nameUr    | error                              |
      |                     | قومِ یونس | A Speaker needs a name in English. |
      | The people of Yunus |           | A Speaker needs a name in Urdu.    |
      | musa                | قومِ یونس | Another Speaker is named "Musa".   |
      | The people of Yunus | یوسف      | Another Speaker is named "یوسف".   |

  # ---------------------------------------------------------------- saving

  Scenario: An Admin renames Musa in Urdu and unmarks him as a Prophet, and every Supplication of Musa shows it at once
    Given I note the Speaker "musa" and his Speaker revisions
    And I am signed in as "admin@saaliheen.test"
    And a reader has read "/api/v1/supplications"
    And a reader has read "/en/supplications?prophets=1"
    When I save the Speaker "musa" named "Musa" and "حضرت موسیٰ", who does not include a Prophet, against his own version, with session cookie
    Then the answer's status is 200
    And the answer's Speaker is "musa", named "Musa" and "حضرت موسیٰ", who does not include a Prophet, at his noted version plus one
    And exactly one Speaker revision names "musa", by "admin@saaliheen.test", with base his noted version and version one more, the noted Speaker before and the answer's Speaker after
    When a reader reads "/api/v1/supplications"
    Then the answer lists the answer's Speaker from before
    When a reader reads "/en/supplications?prophets=1"
    Then the page served has no entry for any of the curated file's Supplications said by "musa"

  Scenario: A Speaker save made against an older version is refused, with the latest Speaker
    Given I note the Speaker "musa" and his Speaker revisions
    And I am signed in as "admin@saaliheen.test"
    And the Speaker "musa" has since been saved named "Musa" and "حضرت موسیٰ"
    When I save the Speaker "musa" named "Moses" and "موسیٰ", who includes a Prophet, against his noted version, with session cookie
    Then the answer's status is 409
    And the answer's error is "This Speaker has been saved since you opened it. The latest is shown beside your choices."
    And the answer's Speaker is "musa", named "Musa" and "حضرت موسیٰ", who includes a Prophet, at his noted version plus one

  Scenario Outline: A Speaker save with a blank name or another Speaker's is refused 422, and changes nothing
    Given I note the Speaker "musa" and his Speaker revisions
    And I am signed in as "admin@saaliheen.test"
    When I save the Speaker "musa" named "<nameEn>" and "<nameUr>", who includes a Prophet, against his own version, with session cookie
    Then the answer's status is 422
    And the answer's error reads: <error>
    And the database still holds just the curated file's Speakers, with no new Speaker revision

    Examples:
      | nameEn | nameUr | error                                  |
      |        | موسیٰ  | A Speaker needs a name in English.     |
      | Musa   |        | A Speaker needs a name in Urdu.        |
      | Yusuf  | موسیٰ  | Another Speaker is named "Yusuf".      |

  # ---------------------------------------------------------------- deleting

  Scenario: An Admin deletes a Speaker who says no Supplication, and its revision is kept
    Given I am signed in as "admin@saaliheen.test"
    And I have added the Speaker "The people of Yunus", "قومِ یونس", who does not include a Prophet
    When I delete the Speaker "the-people-of-yunus" against its own version, with session cookie
    Then the answer's status is 204
    And exactly one Speaker revision names "the-people-of-yunus", by "admin@saaliheen.test", with base 1 and version 2, the added Speaker before and nothing after
    When a reader reads "/api/v1/supplications"
    Then the answer lists no Speaker "the-people-of-yunus"

  Scenario: A Speaker who still says a Supplication can't be deleted
    Given I am signed in as "admin@saaliheen.test"
    When I delete the Speaker "musa" against its own version, with session cookie
    Then the answer's status is 422
    And the answer's error says "Musa" still says the curated file's Supplications of "musa"
    And the database still holds just the curated file's Speakers, with no new Speaker revision

  # ---------------------------------------------------------------- who asks, and which Speaker

  Scenario Outline: A Speaker <action> with <credential> is refused <status>, and changes nothing
    Given I am signed in as "<email>"
    When I send the Speaker <action> with <credential>
    Then the answer's status is <status>
    And the answer has an error
    And the database still holds just the curated file's Speakers, with no new Speaker revision

    Examples:
      | action | email                 | credential               | status |
      | add    | reader@saaliheen.test | session cookie           | 403    |
      | add    | reader@saaliheen.test | bearer token             | 403    |
      | add    | reader@saaliheen.test | neither cookie nor token | 401    |
      | save   | reader@saaliheen.test | session cookie           | 403    |
      | save   | reader@saaliheen.test | neither cookie nor token | 401    |
      | delete | reader@saaliheen.test | bearer token             | 403    |
      | delete | reader@saaliheen.test | neither cookie nor token | 401    |

  Scenario Outline: A Speaker <action> of an id no Speaker has is answered 404
    Given I am signed in as "admin@saaliheen.test"
    When I send a Speaker <action> to "/api/v1/supplications/speakers/nobody-at-all", with session cookie
    Then the answer's status is 404
    And the answer has an error

    Examples:
      | action |
      | save   |
      | delete |

  Scenario: A body that isn't a Speaker save is answered 400, and changes nothing
    Given I am signed in as "admin@saaliheen.test"
    When I save the Speaker "musa" with his Prophet mark sent as the text "yes", with session cookie
    Then the answer's status is 400
    And the answer has an error
    And the database still holds just the curated file's Speakers, with no new Speaker revision

@issue-80
Feature: The Free Plan and Question limits
  Every Account is on the Free Plan, the only Plan for now (ADR 0058). A Plan
  sets a daily and a monthly Question limit, kept on its row of Neon's "plan"
  table and read on every question, so a change applies to the next one. Every
  question an Account asks counts against both, by calendar day and month in
  UTC, whatever Conversation, device or credential it is asked from.
  GET /api/v1/question-limits answers an Account's Plan, and for each limit
  how many it allows, how many have been asked, how many are left and when it
  resets. A question past a limit is refused before Claude is asked: 429, with
  the limit it reached ("daily" or "monthly", the monthly when both are) and
  when that limit resets, and it does not count.

  The server's clock is the scenario's: "it is" a time sends it in each
  request's Test-Now header, which the server takes for now only under the
  test configuration. A question "asked earlier" is a row the scenario puts in
  "asked_question" itself. Claude and OpenAI are the fakes of
  ./quran-chat-questions.feature.

  Background:
    Given the Free Plan allows 5 questions a day and 30 a month

  @AC-1
  Scenario: A new Account is on the Free Plan, with every question left
    Given I am signed in to an Account as "new-on-free@saaliheen.test"
    And it is "2026-11-16T09:30:00Z"
    When I GET my Question limits with my bearer token
    Then the API answers 200 with JSON
    And my Plan is "Free"
    And my daily limit allows 5, with 0 asked and 5 left, resetting at "2026-11-17T00:00:00.000Z"
    And my monthly limit allows 30, with 0 asked and 30 left, resetting at "2026-12-01T00:00:00.000Z"

  @AC-1
  Scenario: Question limits need an Account
    When I GET my Question limits with neither cookie nor token
    Then the API answers 401 with JSON

  @AC-1 @AC-5
  Scenario: Each question counts against the day and the month, whichever credential asks it
    Given I am signed in to an Account as "counts-both@saaliheen.test"
    And it is "2026-11-16T09:30:00Z"
    When I ask a question with my bearer token
    And I ask a question with my session cookie
    And I GET my Question limits with my bearer token
    Then my daily limit allows 5, with 2 asked and 3 left, resetting at "2026-11-17T00:00:00.000Z"
    And my monthly limit allows 30, with 2 asked and 28 left, resetting at "2026-12-01T00:00:00.000Z"

  @AC-5
  Scenario: Another Account's questions do not count against mine
    Given I am signed in to an Account as "asks-alone@saaliheen.test"
    And it is "2026-11-16T09:30:00Z"
    And another Account has asked 5 questions earlier on "2026-11-16"
    When I GET my Question limits with my bearer token
    Then my daily limit allows 5, with 0 asked and 5 left, resetting at "2026-11-17T00:00:00.000Z"

  @AC-2 @AC-6
  Scenario: A question past the daily limit is refused, naming the limit and when it resets, and does not count
    Given I am signed in to an Account as "reaches-the-day@saaliheen.test"
    And it is "2026-11-16T09:30:00Z"
    And I have asked 5 questions earlier on "2026-11-16"
    When I ask a question with my bearer token
    Then the API answers 429 with JSON
    And the refusal names the "daily" limit, resetting at "2026-11-17T00:00:00.000Z", 52200 seconds away
    And Claude was not asked
    When I GET my Question limits with my bearer token
    Then my daily limit allows 5, with 5 asked and 0 left, resetting at "2026-11-17T00:00:00.000Z"

  @AC-2
  Scenario: The daily limit resets at midnight UTC, and the day's questions still count against the month
    Given I am signed in to an Account as "asks-next-day@saaliheen.test"
    And I have asked 5 questions earlier on "2026-11-16"
    And it is "2026-11-16T23:59:59Z"
    When I ask a question with my bearer token
    Then the API answers 429 with JSON
    Given the clock moves on to "2026-11-17T00:00:00Z"
    When I ask again with my bearer token
    Then the API answers 200 with newline-delimited JSON
    When I GET my Question limits with my bearer token
    Then my daily limit allows 5, with 1 asked and 4 left, resetting at "2026-11-18T00:00:00.000Z"
    And my monthly limit allows 30, with 6 asked and 24 left, resetting at "2026-12-01T00:00:00.000Z"

  @AC-2 @AC-6
  Scenario Outline: A question at <now>, past the monthly limit, is refused, naming it and the first of the next month
    Given I am signed in to an Account as "<email>"
    And I have asked 30 questions earlier on "<earlier>"
    And it is "<now>"
    When I ask a question with my bearer token
    Then the API answers 429 with JSON
    And the refusal names the "monthly" limit, resetting at "<resets>"
    And Claude was not asked

    # The second has today's limit reached too: the refusal names the month, which resets later.
    Examples:
      | email                            | earlier    | now                  | resets                   |
      | reaches-the-month@saaliheen.test | 2026-11-02 | 2026-11-16T09:30:00Z | 2026-12-01T00:00:00.000Z |
      | reaches-both@saaliheen.test      | 2026-11-16 | 2026-11-16T18:00:00Z | 2026-12-01T00:00:00.000Z |
      | reaches-december@saaliheen.test  | 2026-12-03 | 2026-12-31T22:00:00Z | 2027-01-01T00:00:00.000Z |

  @AC-2
  Scenario: Last month's questions do not count against this month
    Given I am signed in to an Account as "asks-next-month@saaliheen.test"
    And I have asked 30 questions earlier on "2026-11-30"
    And it is "2026-12-01T00:00:00Z"
    When I ask a question with my bearer token
    Then the API answers 200 with newline-delimited JSON

  @AC-4
  Scenario: A change to the Free Plan's limits applies to the next question
    Given I am signed in to an Account as "limits-change@saaliheen.test"
    And it is "2026-11-16T09:30:00Z"
    And I have asked 5 questions earlier on "2026-11-16"
    When the Free Plan's daily limit is changed to 6 in Neon
    And I ask a question with my bearer token
    Then the API answers 200 with newline-delimited JSON
    When the Free Plan's daily limit is changed to 3 in Neon
    And I ask again with my bearer token
    Then the API answers 429 with JSON
    And the refusal names the "daily" limit, resetting at "2026-11-17T00:00:00.000Z"
    When I GET my Question limits with my bearer token
    Then my daily limit allows 3, with 6 asked and 0 left, resetting at "2026-11-17T00:00:00.000Z"

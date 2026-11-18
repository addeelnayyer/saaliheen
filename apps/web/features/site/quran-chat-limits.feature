@issue-80
Feature: Question limits in Quran Chat
  Every Account is on the Free Plan, whose daily and monthly Question limits
  every question counts against, by calendar day and month in UTC (ADR 0058).
  Once fewer than five questions are left today, Quran Chat says how many.
  With a limit reached, it says which, and when it resets, and offers no way to
  ask until then. Opening Quran Chat again, as starting a new Conversation
  does, keeps the count.

  The server's clock is the scenario's: "the server's clock reads" a time,
  which the browser sends in every request's Test-Now header, taken for now
  only under the test configuration. Questions asked earlier are rows the
  scenario puts in the run's Postgres itself; how many the Free Plan allows is
  read from its row there, never changed here (the API contract changes it,
  features/api/quran-chat-limits.feature). Claude is the fixed stub of
  ./quran-chat.feature.

  Background:
    Given a browser with no saved reader settings
    And the server's clock reads "2026-11-16T09:30:00Z"

  @AC-3
  Scenario: With five questions left today Quran Chat says nothing of them; with fewer, it says how many
    Given I sign in to an Account through the test sign-in as "has-five-left@saaliheen.test" via Google
    And I have 5 questions left today
    When I open Quran Chat in English
    Then Quran Chat says nothing of the questions left
    When I ask Quran Chat "Who was Dhul-Qarnayn?"
    Then Quran Chat's answer is the fake Claude's answer to "Who was Dhul-Qarnayn?" in English, written in English
    And Quran Chat says "4 questions left today"

  @AC-3
  Scenario: The last question left today is named as one
    Given I sign in to an Account through the test sign-in as "has-two-left@saaliheen.test" via Google
    And I have 2 questions left today
    When I open Quran Chat in Urdu
    Then Quran Chat says "2 questions left today"
    When I ask Quran Chat "Who was Dhul-Qarnayn?"
    Then Quran Chat says "1 question left today"

  @AC-2
  Scenario: Asking the last question of the day, the reader is told the daily limit is reached and when it resets
    Given I sign in to an Account through the test sign-in as "asks-the-last@saaliheen.test" via Google
    And I have 1 question left today
    When I open Quran Chat in English
    And I ask Quran Chat "What does Al-Kawthar promise?"
    Then the answer links "108:1" to "/en/108#108:1" and "108:2" to "/en/108#108:2"
    And Quran Chat says it has reached today's limit, which resets at "00:00 UTC on 17 November 2026"
    And Quran Chat offers no way to ask until then
    And I save a screenshot "AC-2-daily-limit-reached-light-desktop"

  @AC-2
  Scenario: Opening Quran Chat with this month's questions all asked, the reader is told when the month's limit resets
    Given I sign in to an Account through the test sign-in as "asked-the-month@saaliheen.test" via Google
    And I have asked all of this month's questions, on "2026-11-02"
    When I open Quran Chat in English
    Then Quran Chat says it has reached this month's limit, which resets at "00:00 UTC on 1 December 2026"
    And Quran Chat offers no way to ask until then

  @AC-5
  Scenario: Opening Quran Chat again does not give back the questions asked
    Given I sign in to an Account through the test sign-in as "opens-again@saaliheen.test" via Google
    And I have 3 questions left today
    When I open Quran Chat in English
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    Then Quran Chat says "2 questions left today"
    When I open Quran Chat in English again
    Then Quran Chat says "2 questions left today"

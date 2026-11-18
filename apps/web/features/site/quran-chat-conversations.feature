@issue-79
Feature: Conversations in Quran Chat
  A signed-in reader's questions to Quran Chat are kept in Conversations,
  which follow their Account to every browser. The first question starts a
  Conversation, titled by it; each later one continues it, shown beneath the
  earlier questions and their answers, until the reader starts a New
  Conversation. Beneath the question, Quran Chat lists the Account's
  Conversations, the one asked in most recently first, each to reopen or
  delete.

  Here Claude is the fixed stub of features/site/quran-chat.feature
  (features/api/fake-anthropic.ts).

  Background:
    Given a browser with no saved reader settings
    And I am not signed in

  @AC-1
  Scenario: The first question starts a Conversation, listed by it, and the next continues it
    Given I sign in to an Account through the test sign-in as "conversations-site-start@saaliheen.test" via Google
    When I open Quran Chat in English
    Then Quran Chat lists no Conversations yet
    When I ask Quran Chat "Who was Dhul-Qarnayn?"
    Then Quran Chat's answer is the fake Claude's answer to "Who was Dhul-Qarnayn?" in English, written in English
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    When I ask Quran Chat "Where did he travel?"
    Then the Conversation open shows these questions, each answered:
      | Who was Dhul-Qarnayn? |
      | Where did he travel?  |
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    And I save a screenshot "AC-1-quran-chat-conversation-en-light-desktop"

  @AC-1
  Scenario: A New Conversation starts another, and an earlier one can be reopened and continued
    Given I sign in to an Account through the test sign-in as "conversations-site-reopen@saaliheen.test" via Google
    When I open Quran Chat in English
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    And I start a New Conversation
    Then the Conversation open shows no questions
    When I ask Quran Chat "What does Al-Kawthar promise?"
    Then the Conversation open shows these questions, each answered:
      | What does Al-Kawthar promise? |
    And Quran Chat lists these Conversations:
      | What does Al-Kawthar promise? |
      | Who was Dhul-Qarnayn?         |
    When I reopen the Conversation "Who was Dhul-Qarnayn?"
    Then the Conversation open shows these questions, each answered:
      | Who was Dhul-Qarnayn? |
    When I ask Quran Chat "Where did he travel?"
    Then the Conversation open shows these questions, each answered:
      | Who was Dhul-Qarnayn? |
      | Where did he travel?  |
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn?         |
      | What does Al-Kawthar promise? |

  @AC-1
  Scenario: Deleting a Conversation removes it from the list, and from the page when it is open, for good
    Given I sign in to an Account through the test sign-in as "conversations-site-delete@saaliheen.test" via Google
    When I open Quran Chat in English
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    And I start a New Conversation
    And I ask Quran Chat "What does Al-Kawthar promise?"
    And I delete the Conversation "What does Al-Kawthar promise?"
    Then the Conversation open shows no questions
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    When I delete the Conversation "Who was Dhul-Qarnayn?"
    Then Quran Chat lists no Conversations yet
    When I open Quran Chat in English
    Then Quran Chat lists no Conversations yet

  @AC-2
  Scenario: A Conversation started in one browser is reopened and continued in another, and the first sees it continued
    Given two browsers with no saved reader settings, both signed in to an Account as "conversations-site-devices@saaliheen.test"
    When I turn to the first browser
    And I open Quran Chat in English
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    And I turn to the second browser
    And I open Quran Chat in English
    Then Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    When I reopen the Conversation "Who was Dhul-Qarnayn?"
    And I ask Quran Chat "Where did he travel?"
    Then the Conversation open shows these questions, each answered:
      | Who was Dhul-Qarnayn? |
      | Where did he travel?  |
    When I turn to the first browser
    And I open Quran Chat in English
    And I reopen the Conversation "Who was Dhul-Qarnayn?"
    Then the Conversation open shows these questions, each answered:
      | Who was Dhul-Qarnayn? |
      | Where did he travel?  |

  @AC-2
  Scenario: Asking in a Conversation deleted in another browser keeps the question, to ask again in a new Conversation
    Given two browsers with no saved reader settings, both signed in to an Account as "conversations-site-gone@saaliheen.test"
    When I turn to the first browser
    And I open Quran Chat in English
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    And Quran Chat lists these Conversations:
      | Who was Dhul-Qarnayn? |
    And I turn to the second browser
    And I open Quran Chat in English
    And I delete the Conversation "Who was Dhul-Qarnayn?"
    And I turn to the first browser
    And I ask Quran Chat "Where did he travel?"
    Then Quran Chat says the Conversation was deleted, keeping "Where did he travel?" to ask again
    And the Conversation open shows no questions
    And Quran Chat lists no Conversations yet
    When I ask Quran Chat again
    Then the Conversation open shows these questions, each answered:
      | Where did he travel? |
    And Quran Chat lists these Conversations:
      | Where did he travel? |

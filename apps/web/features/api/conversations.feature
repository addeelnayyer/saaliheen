@issue-79
Feature: Conversations in Quran Chat, kept for an Account
  A person's questions to Quran Chat and its answers are kept in
  Conversations, which follow their Account to every device. Asking,
  POST /api/v1/questions with { question, language }, starts a new
  Conversation, titled by its first question; asking with
  { question, language, conversation } continues that Conversation, and
  Claude is sent its earlier questions and answers before the new question.
  Either way the answer's first event names its Conversation:
  { "type": "conversation", "id" }.

  GET /api/v1/conversations lists the Account's Conversations, the one asked
  in most recently first, as { conversations: [{ id, title, startedAt,
  updatedAt }] }, times in milliseconds since the epoch. GET
  /api/v1/conversations/<id> reopens one: its questions in the order they
  were asked, each with its Language, its answer and whether it was declined,
  as { id, title, startedAt, updatedAt, questions: [{ question, language,
  askedAt, answer, declined }] }. DELETE /api/v1/conversations/<id> deletes
  it and every question in it (204). A Conversation that is not the
  Account's, or no longer is, is not found (404), whoever asks for it.
  Deleting the Account deletes its Conversations.

  Here Claude is the fixed stub of features/api/quran-chat-questions.feature
  (features/api/fake-anthropic.ts): it answers a question with "ruling" in it
  by declining, and any other by citing every source it was sent.

  @AC-1
  Scenario Outline: <method> <path> without signing in is refused
    When I <method> "<path>" sending neither cookie nor token
    Then the API answers 401 with JSON

    Examples:
      | method | path                                                       |
      | GET    | /api/v1/conversations                                      |
      | GET    | /api/v1/conversations/00000000-0000-4000-8000-000000000000 |
      | DELETE | /api/v1/conversations/00000000-0000-4000-8000-000000000000 |

  @AC-1
  Scenario: A new Account has no Conversations yet
    Given I am signed in to an Account as "conversations-none@saaliheen.test"
    When I list my Conversations with my bearer token
    Then the API answers 200 with JSON
    And I have no Conversations

  @AC-1
  Scenario: Asking without a Conversation starts one, titled by the question, which the list shows
    Given I am signed in to an Account as "conversations-start@saaliheen.test"
    When I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    Then the answer's first event names a new Conversation, then the answer arrives and ends
    When I list my Conversations with my bearer token
    Then my Conversations are, newest first:
      | title                 |
      | Who was Dhul-Qarnayn? |
    And the Conversation the answer named is the first of them

  @AC-1
  Scenario: Asking in a Conversation continues it, sending Claude its earlier questions and answers, and reopening it shows them in order
    Given I am signed in to an Account as "conversations-continue@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    When I ask "Where did he travel?" in English in that Conversation with my bearer token
    Then the answer's first event names that Conversation, then the answer arrives and ends
    And Claude was sent "Who was Dhul-Qarnayn?" and its answer before "Where did he travel?"
    When I reopen that Conversation with my bearer token
    Then the API answers 200 with JSON
    And the Conversation is titled "Who was Dhul-Qarnayn?" and holds, in order:
      | question              | language | answer                      | declined |
      | Who was Dhul-Qarnayn? | en       | the fake Claude's answer    | no       |
      | Where did he travel?  | en       | the fake Claude's answer    | no       |
    And listing my Conversations shows only that one

  @AC-1
  Scenario: A declined question is kept, declined, in its Language
    Given I am signed in to an Account as "conversations-declined@saaliheen.test"
    When I ask "What is the ruling on music?" in Urdu with my bearer token
    And I reopen that Conversation with my bearer token
    Then the Conversation is titled "What is the ruling on music?" and holds, in order:
      | question                     | language | answer                    | declined |
      | What is the ruling on music? | ur       | Quran Chat's decline in Urdu | yes   |

  @AC-1
  Scenario: The Conversation asked in most recently is listed first
    Given I am signed in to an Account as "conversations-order@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    And I note that Conversation as "the first"
    And I ask "What does Al-Kawthar promise?" in English with my bearer token
    When I ask "Where did he travel?" in English in the Conversation I noted as "the first" with my bearer token
    And I list my Conversations with my bearer token
    Then my Conversations are, newest first:
      | title                         |
      | Who was Dhul-Qarnayn?         |
      | What does Al-Kawthar promise? |

  @AC-2
  Scenario Outline: A Conversation started with the <first> is listed, reopened and continued with the <second> of another sign-in to the same Account
    Given I am signed in to an Account as "<email>"
    And I ask "Who was Dhul-Qarnayn?" in English with my <first>
    When I sign in to the same Account again, as on another device
    And I list my Conversations with my <second>
    Then my Conversations are, newest first:
      | title                 |
      | Who was Dhul-Qarnayn? |
    When I ask "Where did he travel?" in English in that Conversation with my <second>
    Then the answer's first event names that Conversation, then the answer arrives and ends
    When I reopen that Conversation with my <first>
    Then the Conversation's questions are "Who was Dhul-Qarnayn?" then "Where did he travel?"

    Examples:
      | first          | second         | email                                 |
      | session cookie | bearer token   | conversations-devices-1@saaliheen.test |
      | bearer token   | session cookie | conversations-devices-2@saaliheen.test |

  @AC-1
  Scenario: Deleting a Conversation deletes it and its questions, and leaves the others
    Given I am signed in to an Account as "conversations-delete@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    And I note that Conversation as "the deleted"
    And I ask "What does Al-Kawthar promise?" in English with my bearer token
    When I delete the Conversation I noted as "the deleted" with my bearer token
    Then the API answers 204
    And listing my Conversations gives, newest first:
      | title                         |
      | What does Al-Kawthar promise? |
    And the Account database holds no question of the Conversation I noted as "the deleted"

  @AC-1
  Scenario Outline: A deleted Conversation is not found: <action> answers 404
    Given I am signed in to an Account as "conversations-deleted-<n>@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    And I note that Conversation as "the deleted"
    And I have deleted the Conversation I noted as "the deleted"
    When I <action> the Conversation I noted as "the deleted" with my bearer token
    Then the API answers 404 with JSON
    And Claude was not asked again

    Examples:
      | n | action                          |
      | 1 | reopen                          |
      | 2 | delete                          |
      | 3 | ask "Where did he travel?" in English in |

  @AC-1
  Scenario Outline: Another Account's Conversation is not found: <action> answers 404, and it stays
    Given I am signed in to an Account as "conversations-owner-<n>@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    And I note that Conversation as "the owner's"
    When I sign in to an Account as "conversations-other-<n>@saaliheen.test"
    And I <action> the Conversation I noted as "the owner's" with my bearer token
    Then the API answers 404 with JSON
    And Claude was not asked again
    And I have no Conversations, listing them with my bearer token
    And the Account database still holds the Conversation I noted as "the owner's", with its one question

    Examples:
      | n | action                          |
      | 1 | reopen                          |
      | 2 | delete                          |
      | 3 | ask "Where did he travel?" in English in |

  @AC-1
  Scenario Outline: Asking in a Conversation named by something not the Account's Conversation's id is refused: <status>
    Given I am signed in to an Account as "conversations-bad-id@saaliheen.test"
    When I POST "/api/v1/questions" with my bearer token and the body '<body>'
    Then the API answers <status> with JSON
    And Claude was not asked again

    Examples:
      | body                                                                                                           | status |
      | {"question": "Who was Dhul-Qarnayn?", "language": "en", "conversation": 7}                                     | 400    |
      | {"question": "Who was Dhul-Qarnayn?", "language": "en", "conversation": "00000000-0000-4000-8000-000000000000"} | 404    |
      | {"question": "Who was Dhul-Qarnayn?", "language": "en", "conversation": "not-a-uuid"}                          | 404    |

  @AC-3
  Scenario: Deleting the Account deletes its Conversations and their questions
    Given I am signed in to an Account as "conversations-leaving@saaliheen.test"
    And I ask "Who was Dhul-Qarnayn?" in English with my bearer token
    And I note that Conversation as "the leaving"
    When I delete my Account with my session cookie
    Then the Account database holds no Conversation of the deleted Account
    And the Account database holds no question of the Conversation I noted as "the leaving"

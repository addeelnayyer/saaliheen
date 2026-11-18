@issue-81
Feature: Quran Chat in the app
  Quran Chat works in the app as on the website (#78, #79, #80, ADR 0057 to
  0059). Signed in, the reader asks a question and the answer shows as
  /api/v1/questions streams it, in the reader's Language; each Ayah it cites
  opens that Ayah in the app as a look-up, and the Tafsir is credited beneath
  an answer that cites it. Questions are asked in Conversations, the same ones
  the website lists, to reopen, continue or delete on either. The Question
  limits say what the website's say, in its words, and with a limit reached
  the app offers no way to ask until it resets. Signed out, Quran Chat asks
  the reader to sign in.

  The scenarios drive the app's Quran Chat (src/quran-chat.ts) against a
  stand-in for the website's Quran Chat API (features/quran-chat-api.ts),
  which answers as the website's API contract
  (apps/web/features/api/quran-chat-questions.feature, quran-chat-limits.feature
  and conversations.feature) pins it. How the screen looks, in both colour
  themes and with VoiceOver, is checked by hand on a simulator.

  Background:
    Given the app is launched on a new device

  @AC-1
  Scenario: Signed out, Quran Chat asks the reader to sign in, and asks nothing of the API
    When I open Quran Chat
    Then Quran Chat says "Quran Chat needs an Account. Sign in to ask it about the Quran."
    And the app asked nothing of Quran Chat

  @AC-1
  Scenario: The answer shows as it streams, a citation shown only once it is whole
    Given I sign in with Google as "amina@example.com"
    And Quran Chat answers "Who was Dhul-Qarnayn?" in these parts:
      | part                                   |
      | Dhul-Qarnayn was given power [18:8     |
      | 4] and followed a way [18:85–86].      |
    When I open Quran Chat
    And I ask "Who was Dhul-Qarnayn?" in English, and the first part arrives
    Then the answer so far reads "Dhul-Qarnayn was given power " and Quran Chat is still answering
    When the rest of the answer arrives
    Then the answer reads "Dhul-Qarnayn was given power (18:84) and followed a way (18:85–86)."
    And its citations are "18:84" and "18:85–86"
    And no Tafsir credit shows beneath it

  @AC-1
  Scenario: A cited Ayah opens in the app as a look-up, leaving the Reading places as they were
    Given I sign in with Google as "amina@example.com"
    And Quran Chat answers "Who was Dhul-Qarnayn?" in these parts:
      | part                                     |
      | He followed a way [18:85–86].            |
    When I open Quran Chat
    And I ask "Who was Dhul-Qarnayn?" in English
    And I open the citation "18:85–86"
    Then Surah 18 opens at Ayah 85
    And the Reading places are as they were

  @AC-1
  Scenario Outline: An answer that cites the Tafsir credits it beneath, in <Language>
    Given I sign in with Google as "amina@example.com"
    And Quran Chat answers "<question>" with "<answer>"
    When I open Quran Chat
    And I ask "<question>" in <Language>
    Then its citations are "<citation>"
    And the Tafsir credit beneath it reads "<credit>"

    Examples:
      | Language | question             | answer                                | citation          | credit                                                                                                                     |
      | English  | What is Al-Kawthar?  | A river in Paradise [Tafsir 108:1–3]. | Tafsir 108:1–3    | Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim, by the Tafsir Center for Quranic Studies, English edition (QUL)         |
      | Urdu     | کوثر کیا ہے؟          | جنت کی ایک نہر [Tafsir 108:1]۔        | Tafsir 108:1      | Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim, by the Tafsir Center for Quranic Studies, Urdu edition (mokhtasr.com)   |

  @AC-1
  Scenario: A declined question shows why, in the reader's Language
    Given I sign in with Google as "amina@example.com"
    And Quran Chat declines "Is music forbidden?"
    When I open Quran Chat
    And I ask "Is music forbidden?" in English
    Then the answer reads "Quran Chat does not give rulings or judge between schools of thought. Please ask a Scholar you trust."
    And no Tafsir credit shows beneath it

  @AC-1
  Scenario: With no connection, the question is shown with the website's words for an answer that did not come
    Given I sign in with Google as "amina@example.com"
    And I open Quran Chat
    And the phone has no connection
    When I ask "What is patience?" in English
    Then the answer says "Quran Chat could not answer just now. Please try again."

  @AC-2
  Scenario: The website's Conversations are the app's, to reopen and continue
    Given I sign in with Google as "amina@example.com"
    And on the website, signed in as "amina@example.com", I asked "What is patience?"
    When I open Quran Chat
    Then Quran Chat lists these Conversations:
      | title             |
      | What is patience? |
    When I reopen "What is patience?"
    And I ask "Who showed it?" in English
    Then the Conversation open holds "What is patience?" then "Who showed it?"
    And the website, signed in as "amina@example.com", reads "What is patience?" holding "What is patience?" then "Who showed it?"

  @AC-2
  Scenario: A New Conversation starts with its first question, listed first on the app and the website
    Given I sign in with Google as "amina@example.com"
    And I open Quran Chat
    And I ask "What is patience?" in English
    When I start a New Conversation
    And I ask "What is gratitude?" in English
    Then Quran Chat lists these Conversations:
      | title              |
      | What is gratitude? |
      | What is patience?  |
    And the website, signed in as "amina@example.com", lists the same Conversations

  @AC-2
  Scenario: A Conversation deleted in the app is gone from the website too
    Given I sign in with Google as "amina@example.com"
    And on the website, signed in as "amina@example.com", I asked "What is patience?"
    And I open Quran Chat
    When I delete "What is patience?"
    Then Quran Chat lists no Conversations, saying "No Conversations yet. Your first question starts one."
    And the website, signed in as "amina@example.com", lists no Conversations

  @AC-2
  Scenario: Asking in a Conversation deleted on the website starts again, the question kept to ask
    Given I sign in with Google as "amina@example.com"
    And I open Quran Chat
    And I ask "What is patience?" in English
    And on the website, signed in as "amina@example.com", I delete "What is patience?"
    When I ask "Who showed it?" in English
    Then the question "Who showed it?" is given back to ask again
    And Quran Chat says "This Conversation was deleted, perhaps in another browser. Ask again to start a new one."
    And no Conversation is open
    And Quran Chat lists no Conversations, saying "No Conversations yet. Your first question starts one."

  @AC-3
  Scenario: With fewer than five questions left today, Quran Chat says how many
    Given I sign in with Google as "amina@example.com"
    And "amina@example.com" has asked 16 questions today
    When I open Quran Chat
    Then Quran Chat says "4 questions left today"
    When I ask "What is patience?" in English
    Then Quran Chat says "3 questions left today"

  @AC-3
  Scenario: With today's limit reached, the question is refused, and Quran Chat says when it may be asked again
    Given I sign in with Google as "amina@example.com"
    And "amina@example.com" has asked 19 questions today
    And I open Quran Chat
    And on the website, signed in as "amina@example.com", I asked "What is gratitude?"
    When I ask "What is patience?" in English
    Then the question "What is patience?" is given back to ask again
    And Quran Chat says "You have asked all 20 of today's questions. You can ask again from 00:00 UTC on 2 October 2026."
    And Quran Chat offers no way to ask
    And no Conversation is open

  @AC-3
  Scenario: With this month's limit reached, Quran Chat says so, and when the month resets
    Given it is "2026-10-20T06:00:00Z"
    And I sign in with Google as "amina@example.com"
    And "amina@example.com" has asked 300 questions this month, none of them today
    When I open Quran Chat
    Then Quran Chat says "You have asked all 300 of this month's questions. You can ask again from 00:00 UTC on 1 November 2026."
    And Quran Chat offers no way to ask

  @AC-1
  Scenario: Signed out on the website's side, Quran Chat asks the reader to sign in again
    Given I sign in with Google as "amina@example.com"
    And I open Quran Chat
    And on the website, signed in as "amina@example.com", I delete the Account
    When I ask "What is patience?" in English
    Then Quran Chat says "Quran Chat needs an Account. Sign in to ask it about the Quran."
    And the app holds no sign-in

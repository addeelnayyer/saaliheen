@issue-78
Feature: Quran Chat
  Quran Chat, /<lang>/quran-chat, answers a signed-in reader's question about
  the Quran from the Ayah translations and the Tafsir (ADR 0057), in the
  Language of the page, as it is written. Each Ayah the answer cites is a link
  to it on its Surah page, and an answer that uses the Tafsir credits
  al-Mukhtasar beneath it. A question asking for a ruling is declined, pointing
  the reader to a Scholar. A reader not signed in is asked to sign in. Explore
  has a card for it, after Supplications.

  Here Claude is a fixed stub on the run's machine (features/api/fake-anthropic.ts),
  whose answers are its FIXED_ANSWERS, in each Language; it declines a
  question asking for a "ruling".

  Background:
    Given a browser with no saved reader settings
    And I am not signed in

  # ---------------------------------------------------------------- AC-1: an Account is needed

  @AC-1
  Scenario Outline: Quran Chat in <Language> asks a reader who is not signed in to sign in
    When I open Quran Chat in <Language>
    Then the page's heading reads "Quran Chat"
    And Quran Chat says it needs an Account, linking to "/<lang>/sign-in"
    And Quran Chat offers no way to ask

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  # ---------------------------------------------------------------- AC-2, AC-4: the answer

  @AC-2 @AC-4
  Scenario Outline: Asked in <Language>, Quran Chat answers in <Language>, linking each Ayah it cites and crediting the Tafsir it uses
    Given I sign in to an Account through the test sign-in as "chats-in-<lang>@saaliheen.test" via Google
    When I open Quran Chat in <Language>
    And I ask Quran Chat "Who was Dhul-Qarnayn?"
    Then Quran Chat's answer is the fake Claude's answer to "Who was Dhul-Qarnayn?" in <Language>, written in <Language>
    And the answer links "18:83–84" to "/<lang>/18#18:83" and "18:86" to "/<lang>/18#18:86"
    And the answer cites the Tafsir entry "18:83–84"
    And beneath the answer, Quran Chat credits the Tafsir in <Language>
    And I save a screenshot "AC-2-quran-chat-<lang>-light-desktop"

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  @AC-4
  Scenario: An answer that uses no Tafsir does not credit it
    Given I sign in to an Account through the test sign-in as "chats-without-tafsir@saaliheen.test" via Google
    When I open Quran Chat in English
    And I ask Quran Chat "What does Al-Kawthar promise?"
    Then the answer links "108:1" to "/en/108#108:1" and "108:2" to "/en/108#108:2"
    And Quran Chat does not credit the Tafsir

  # ---------------------------------------------------------------- AC-5: rulings

  @AC-5
  Scenario Outline: A question asking for a ruling, in <Language>, is declined, pointing to a Scholar
    Given I sign in to an Account through the test sign-in as "asks-a-ruling-in-<lang>@saaliheen.test" via Google
    When I open Quran Chat in <Language>
    And I ask Quran Chat "What is the ruling on music?"
    Then Quran Chat declines, in <Language>, saying "<declined>"

    Examples:
      | Language | lang | declined                                                                                                              |
      | English  | en   | Quran Chat does not give rulings or judge between schools of thought. Please ask a Scholar you trust.                 |
      | Urdu     | ur   | قرآن چیٹ شرعی احکام نہیں بتاتا اور نہ مسالک کے درمیان فیصلہ کرتا ہے۔ براہِ کرم کسی ایسے عالم سے پوچھیے جن پر آپ کو اعتماد ہو۔ |

  # ---------------------------------------------------------------- Explore's card

  Scenario Outline: Explore's Quran Chat card in <Language> opens Quran Chat, which leads back to Explore
    Given I open Explore in <Language>
    Then the "Quran Chat" card says what it is for in one line written in <Language>
    When I follow Explore's "Quran Chat" card
    Then I am on the page "/<lang>/quran-chat"
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

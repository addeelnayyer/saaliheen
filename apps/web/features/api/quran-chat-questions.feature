@issue-78
Feature: Asking Quran Chat a question and reading its answer as it is written
  A signed-in person asks Quran Chat a question, POST /api/v1/questions with
  the JSON { question, language }, and reads its answer as Claude writes it
  (ADR 0057): the API answers newline-delimited JSON, one event a line, the
  answer's text in "text" events as it arrives and an "end" event once it is
  whole, after a first "conversation" event naming the Conversation it is
  asked in (#79, features/api/conversations.feature). Quran Chat finds the
  Ayah translations and Tafsir entries the question is about in its index (ADR 0056), its Ayah translations in both
  Languages and its Tafsir in the person's, and asks Claude Sonnet 5.5 to
  answer from them alone, in the person's Language,
  citing each Ayah it rests on as [surah:ayah] and each Tafsir entry as
  [Tafsir surah:ayah]. A question asking for a ruling or a sectarian judgement
  is declined: one "declined" event, in the person's Language, pointing them
  to a Scholar.

  Here Claude is a fixed stub on the run's machine (features/api/fake-anthropic.ts):
  it declines a question asking for a "ruling" or naming a "sect", and answers any other by
  citing every source it was sent, starting "According to the Quran" in
  English and "قرآن کے مطابق" in Urdu. OpenAI is the fake that embeds a text
  by its words (features/api/fake-openai.ts). Each scenario starts with the
  sample's English Tafsir loaded and indexed (features/api/tafsir-sample.json).

  @AC-1
  Scenario Outline: Asking with <credential> is refused
    When I ask "Dhul-Qarnayn" in English, sending <credential>
    Then the API answers 401 with JSON
    And Claude was not asked

    Examples:
      | credential                     |
      | neither cookie nor token       |
      | a bearer token that is made up |
      | a session cookie that is forged |

  @AC-7
  Scenario Outline: A request that is not a question in a Language is refused
    Given I am signed in to an Account as "asks-badly@saaliheen.test"
    When I POST "/api/v1/questions" with my bearer token and the body '<body>'
    Then the API answers 400 with JSON

    Examples:
      | body                                       |
      | not json                                   |
      | {}                                         |
      | {"question": "", "language": "en"}         |
      | {"question": "Dhul-Qarnayn"}               |
      | {"question": "Dhul-Qarnayn", "language": "fr"} |

  @AC-2 @AC-3 @AC-7
  Scenario Outline: An answer streams, citing the Ayahs Quran Chat found, with the <credential>
    Given I am signed in to an Account as "<email>"
    When I ask "Dhul-Qarnayn" in English with my <credential>
    Then the API answers 200 with newline-delimited JSON
    And the answer names its Conversation, then arrives in more than one "text" event, then an "end" event
    And Claude Sonnet 5.5 was asked to answer in English from the sources Quran Chat's index finds for "Dhul-Qarnayn", and from no others
    And the answer cites "[18:83]" and "[18:86]"

    Examples:
      | credential     | email                         |
      | session cookie | asks-by-cookie@saaliheen.test |
      | bearer token   | asks-by-token@saaliheen.test  |

  @AC-2
  Scenario: A question asked in Urdu is answered in Urdu
    Given I am signed in to an Account as "asks-in-urdu@saaliheen.test"
    When I ask "ذوالقرنین" in Urdu with my bearer token
    Then the API answers 200 with newline-delimited JSON
    And Claude Sonnet 5.5 was asked to answer in Urdu from the sources Quran Chat's index finds for "ذوالقرنین", and from no others
    And the answer starts "قرآن کے مطابق"

  @AC-3 @AC-4
  Scenario: A question the Tafsir answers is sent its Tafsir entry, which the answer cites
    Given I am signed in to an Account as "asks-the-tafsir@saaliheen.test"
    When I ask the sample's text of the Tafsir entry for 108:1 in English with my bearer token
    Then the API answers 200 with newline-delimited JSON
    And Claude was sent the English Tafsir entry for 108:1
    And the answer cites "[Tafsir 108:1]"

  @AC-3 @AC-4
  Scenario: A question asked in Urdu is sent no English Tafsir, so the Tafsir it cites is the edition credited in Urdu
    Given I am signed in to an Account as "asks-the-tafsir-in-urdu@saaliheen.test"
    When I ask the sample's text of the Tafsir entry for 108:1 in Urdu with my bearer token
    Then the API answers 200 with newline-delimited JSON
    And Claude Sonnet 5.5 was asked to answer in Urdu from the sources Quran Chat's index finds for the sample's text of the Tafsir entry for 108:1, and from no others
    And Claude was sent no English Tafsir entry

  @AC-5
  Scenario Outline: A question asking for a ruling or a sectarian judgement, "<question>", is declined in <language>, pointing to a Scholar
    Given I am signed in to an Account as "asks-a-ruling@saaliheen.test"
    When I ask "<question>" in <language> with my bearer token
    Then the API answers 200 with newline-delimited JSON
    And the answer names its Conversation, then is one "declined" event, then an "end" event
    And the declined event's text is "<declined>"

    Examples:
      | question                           | language | declined |
      | What is the ruling on music?       | English  | Quran Chat does not give rulings or judge between schools of thought. Please ask a Scholar you trust. |
      | What is the ruling on music?       | Urdu     | قرآن چیٹ شرعی احکام نہیں بتاتا اور نہ مسالک کے درمیان فیصلہ کرتا ہے۔ براہِ کرم کسی ایسے عالم سے پوچھیے جن پر آپ کو اعتماد ہو۔ |
      | Which sect follows the Quran best? | English  | Quran Chat does not give rulings or judge between schools of thought. Please ask a Scholar you trust. |

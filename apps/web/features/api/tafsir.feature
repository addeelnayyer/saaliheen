@issue-233
Feature: A Surah's Tafsir, loaded into Neon and read from /api/v1/tafsir/{surah}
  Saaliheen shows al-Mukhtasar's Tafsir in the reader's Language (ADR 0053).
  It lives in Neon, one row per Tafsir entry, in a table `pnpm db:migrate`
  creates, and the website and the mobile app read a Surah's entries the same
  way: GET /api/v1/tafsir/{surah}?lang=en|ur, needing no Account, answers
  { surah, language, credit, entries }, the entries in order, each with its
  first and last Ayah and its text as published, and the edition's credit
  line. Urdu is answered exactly as English is.

  The owner loads the English edition from QUL's file with
  `pnpm db:load-tafsir <file> [<origin>]`, at any time: a load replaces the
  English rows with the file's, so loading the same file again changes
  nothing, and then asks the deployment at <origin> to refresh the Surahs'
  Tafsir (ADR 0054), so readers see the reload with no deploy. Until the owner
  commits QUL's file, it is exercised on a sample in QUL's format
  (features/api/tafsir-sample.json): al-Mukhtasar's English entries for
  Al-Baqarah 1–5, where 2:3–4 is one entry, and Al-Kawthar 1–3.

  Each scenario starts with no Tafsir in Neon, every Surah's Tafsir refreshed.

  @AC-2
  Scenario: `pnpm db:migrate` made the Tafsir's table, and running it again changes nothing
    When I run `pnpm db:migrate` again
    Then it succeeds, running no content migration
    And I GET "/api/v1/tafsir/2?lang=en" with neither cookie nor token
    And the API answers 200 with JSON
    And the answer lists no Tafsir entries

  @AC-3 @AC-4
  Scenario: A loaded Surah's Tafsir entries are answered in order, a grouped entry once, with the edition's credit line
    Given I have loaded the sample
    When I GET "/api/v1/tafsir/2?lang=en" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer holds exactly a surah, a language, a credit and its entries
    And the answer is for Surah 2 in "en"
    And the answer's entries are, in this order:
      | first | last | text begins                               |
      | 1     | 1    | Alif Lām Mīm – letters like these begin   |
      | 2     | 2    | This is the Qur’ān, in which there is     |
      | 3     | 4    | They believe in the revelation that Allah |
      | 5     | 5    | The people who possess these qualities    |
    And each entry's text is the sample's text for it, exactly
    And the credit line names al-Mukhtasar and its English edition
    And the answer names the minimum app version in its Min-App-Version header

  @AC-3
  Scenario: Loading the same file again leaves the same Tafsir
    Given I have loaded the sample
    And I have read the Tafsir of Surahs 2 and 108 in "en" and noted the answers
    When I load the sample again
    Then the load succeeds
    And the Tafsir of Surahs 2 and 108 in "en" is answered as noted

  @AC-3
  Scenario: A load replaces the English Tafsir with its file's, exactly
    Given I have loaded the sample
    When I load a file in QUL's format holding only the sample's entries for Surah 108
    Then the load succeeds
    And I GET "/api/v1/tafsir/2?lang=en" with neither cookie nor token
    And the API answers 200 with JSON
    And the answer lists no Tafsir entries

  Scenario: A reload reaches readers with no deploy
    Given I have loaded the sample
    And I have read the Tafsir of Surahs 2 and 108 in "en" and noted the answers
    When I load the sample with the text of 108:1 changed to "A corrected text of 108:1"
    And I GET "/api/v1/tafsir/108?lang=en" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer's first entry's text is "A corrected text of 108:1"

  Scenario: A file that breaks QUL's format is refused whole, and the Tafsir is left as it was
    Given I have loaded the sample
    And I have read the Tafsir of Surahs 2 and 108 in "en" and noted the answers
    When I load the sample with 2:4 pointing to "2:2"
    Then the load fails, naming "2:4"
    And the Tafsir of Surahs 2 and 108 in "en" is answered as noted

  @AC-5
  Scenario Outline: A Surah with no Tafsir entries in <lang> answers an empty list
    Given I have loaded the sample
    When I GET "/api/v1/tafsir/<surah>?lang=<lang>" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer is for the Surah and Language asked for
    And the answer lists no Tafsir entries

    Examples:
      | surah | lang |
      | 1     | en   |
      | 114   | en   |
      | 2     | ur   |

  Scenario: The Urdu Tafsir, put into Neon by the owner, is answered as the English is
    Given the owner has put Urdu Tafsir entries for Surah 108 into Neon, 108:1 alone and 108:2–3 together, and refreshed it
    When I GET "/api/v1/tafsir/108?lang=ur" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer is for Surah 108 in "ur"
    And the answer's entries cover, in this order:
      | first | last |
      | 1     | 1    |
      | 2     | 3    |
    And the credit line names al-Mukhtasar and its Urdu edition

  @AC-6
  Scenario Outline: GET /api/v1/tafsir/<surah> is not a Surah, and gets the API's usual error
    When I GET "/api/v1/tafsir/<surah>?lang=en" with neither cookie nor token
    Then the API answers 404 with a JSON error
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | surah |
      | 0     |
      | 115   |
      | 02    |
      | abc   |

  @AC-6
  Scenario Outline: A Language that is not "en" or "ur" (<query>) is refused with the API's usual error
    When I GET "/api/v1/tafsir/2<query>" with neither cookie nor token
    Then the API answers 400 with a JSON error
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      | query    |
      |          |
      | ?lang=ar |
      | ?lang=EN |
      | ?lang=   |

  Scenario Outline: Refreshing the Tafsir is refused <without>
    When I ask the site to refresh every Surah's Tafsir <without>
    Then the API answers 401 with a JSON error

    Examples:
      | without                  |
      | without the secret       |
      | with a secret not its own |

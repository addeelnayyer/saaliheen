@issue-99 @issue-171
Feature: Phrases in the published dataset
  Each Surah file of the published dataset (/data/v1/surahs/<n>.json) carries
  the Surah's Phrases, each as its first and last Word location, in Quran
  order, and each Word of a covered Passage carries its Phrase colour, "a" or
  "b", so a Surah page (or the mobile app) knows which Words take which tint.
  Words of a Passage that is not covered carry no Phrase colour. Expected
  Phrases are read from the committed Phrases file (as last
  committed, and loaded into Neon), never typed. Shapes are written as in the published
  dataset's feature.

  Phrases live in Neon (#171): an Admin's Publish of Phrase edits reaches
  readers of the Surah's page on their next load, with no rebuild and no
  deploy. That scenario publishes, so this feature runs in the serial
  passage-publishing project, and it puts Surah 18 back as arranged
  (../passages-in-the-test-database.ts) when it ends. It publishes in Surah
  18 once, so the reader's page it reads is the one its own Publish
  refreshed.

  @AC-1 @AC-3
  Scenario: Al-Fatihah's Surah file carries its Phrases and each Word's Phrase colour
    When a client fetches "/data/v1/surahs/1.json"
    Then it answers with status 200, a JSON content type and a CDN-cacheable response
    And the file has this shape:
      """
      { "phrases": [{ "first": "string", "last": "string" }],
        "ayahs": [{ "words": [{ "location": "string", "phraseColour": "string" }] }] }
      """
    And the file's Phrases are Surah 1's Phrases in the Phrases file, in Quran order
    And each Word in the file carries the Phrase colour its Phrase takes, alternating from "a" at the first Phrase of each covered Passage

  @AC-3
  Scenario: A Surah whose Passages are not covered carries no Phrase colours in its Surah file
    Given Surah 112's Passages are not covered by the Phrases file
    When a client fetches "/data/v1/surahs/112.json"
    Then it answers with status 200, a JSON content type and a CDN-cacheable response
    And the file's Phrases are those the Phrases file lists in Surah 112, and no Word in it carries a Phrase colour

  @AC-5 @AC-10
  Scenario: Once a Publish covers a Passage with Phrases, readers see its Phrase colours on the Surah page's next load, with no deploy
    Given Neon holds Surah 18 as arranged, put back when the scenario ends
    And a reader opening "/en/18" sees no Word of Passage 103–106 tinted
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:1, then the Word at 106:9
    Then Passage 103–106 shows Neon's Phrases, with "104:1–106:9" added
    And Passage 103–106's heading shows its progress for those Phrases
    When I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Phrases as Neon's, with "104:1–106:9" added
    And a reader opening "/en/18" sees Passage 103–106's Words take tint A and tint B Phrase by Phrase as Neon's Phrases say, with "104:1–106:9" added

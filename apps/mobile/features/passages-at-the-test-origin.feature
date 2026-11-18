@issue-171
Feature: The test origin serves every Surah's Passages and Phrases as published before the move
  Passages and Phrases moved into Neon (#171), and the dataset build writes
  each Surah file with empty `passages` and `phrases` lists, filled from Neon
  when /data/v1 serves it. The app's scenarios are served by a local origin
  (features/support.ts), not the website, so that origin must go on serving
  each Surah file as /data/v1 published it before the move, or every Passage
  heading and Phrase colour scenario would pass on Surahs with none. Expected
  Passages, Phrases and Phrase colours are each Surah's generated file as last
  committed before the move, read from git at 3a52736, with each Surah's
  Passages and Phrases as the website loads them (the Passage load's input,
  which equals the Passages file as last committed, at 646e747, after Surah
  57's Publish, and the Phrases file as last committed, at edc10b5, after
  Surah 2's Phrase Publishes); where those changed a Surah's Phrases, each
  Word's Phrase colour is the one the dataset's Phrase rules give it.

  @AC-8
  Scenario: Every Surah file the test origin serves carries its Passages, Phrases and Phrase colours as committed before the move
    Given the app's test origin is serving /data/v1
    When a client fetches each of the 114 Surah files from it
    Then each Surah file carries the Passages, with both Passage titles, that its committed Surah file carried before the move
    And each Surah file carries the Phrases that its committed Surah file carried before the move
    And each Word carries the Phrase colour that it carried in its committed Surah file before the move, and no Word another

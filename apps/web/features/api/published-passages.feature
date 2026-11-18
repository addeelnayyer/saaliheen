@issue-171
Feature: The published Surah files keep their Passages and Phrases, read from Neon
  The mobile app reads the dataset from `/data/v1` (ADR 0008) and keeps
  Surahs offline by the manifest's hashes (ADR 0025). Passages and Phrases
  move into Neon (ADR 0021), and `/data/v1/surahs/<n>.json` keeps its shape:
  the Surah's `passages` (each one's first and last Ayah and its English and
  Urdu Passage titles), its `phrases` (each one's first and last Word
  location) and each Word's `phraseColour`, now served from Neon.

  This is the parity check: these scenarios fetch the files over HTTP from
  the production build served against the run's own Postgres
  (features/api/serve-api.ts), and compare them with the output as last
  committed before the move (the Passages file, the Phrases file and
  data/generated/surahs/, features/site/committed-output.ts), read from git
  so that they outlive the files' deletion.

  @AC-7
  Scenario: Every Surah file at /data/v1 carries the committed Passages and Phrases, and each Word its committed Phrase colour
    When a client fetches each of the 114 Surah files the manifest lists
    Then each answers 200 with JSON
    And each Surah file's Passages are its committed Surah file's, in order, each with its first and last Ayah and its English and Urdu Passage titles
    And each Surah file's Passages are the committed Passages file's for that Surah
    And each Surah file's Phrases are its committed Surah file's, in Quran order, and those of the committed Phrases file in that Surah
    And each Word of each Surah file carries the Phrase colour its committed Surah file gives it, or none where that gives none

@issue-172
Feature: /data/v1 keeps its addresses and shapes with the Quran read from Neon
  The mobile app reads the dataset from `/data/v1` (ADR 0008) and keeps
  Surahs offline by the manifest's hashes (ADR 0025). The Quran text, Word
  meanings, Word counts and Recitation timings move into Neon (ADR 0049), and
  `/data/v1` keeps every address and every shape: the Surah index, each Surah
  file, each Recitation file and the manifest, now made from Neon's rows.

  This is the parity check: these scenarios fetch the files over HTTP from the
  production build served against the run's own Postgres
  (features/api/serve-api.ts), and compare them with the generated output as
  committed before the move (features/site/committed-output.ts,
  BEFORE_QURAN_MOVED), read from git so that they outlive the files' deletion.
  A Surah file's Passages, Phrases, Phrase colours and Themes already come
  from Neon (#170, #171) and are checked by published-passages and
  published-themes; here they are set aside.

  The files change only when a Publish does, so a CDN keeps them: each
  answers with a long CDN cache lifetime.

  @AC-4
  Scenario: The Surah index is the committed Surah index
    When a client fetches "/data/v1/surahs.json"
    Then it answers 200 with JSON
    And its bytes are the committed Surah index's, published as JSON

  @AC-4
  Scenario: Every Surah file holds the committed Quran text, Word meanings and translations, in the committed shape
    When a client fetches each of the 114 Surah files the manifest lists
    Then each answers 200 with JSON
    And each Surah file, its Passages, Phrases, Phrase colours and Themes set aside, is its committed Surah file, key for key and in order

  @AC-4
  Scenario: Every Recitation file is the committed Recitation file
    When a client fetches each of the 114 Recitation files the manifest lists
    Then each answers 200 with JSON
    And each Recitation file's bytes are its committed Recitation file's, published as JSON

  @AC-4
  Scenario: The manifest names each file by the hash of what it serves, and the dataset version over every published file
    When a client fetches "/data/v1/manifest.json"
    Then it answers 200 with JSON
    And the manifest lists Surahs 1 to 114, each at /data/v1/surahs/ and its Recitation at /data/v1/recitations/
    And each Recitation's hash is the SHA-256 of its committed Recitation file, published as JSON
    And each Surah's hash is the SHA-256 of the bytes its Surah file serves
    And the dataset version is the hash over the committed Surah index, the Surah files served, the committed Roots, the committed Recitations, the committed Juz file and the particle files served
    And the manifest's minimum app version is "1.0.0"

  @AC-4
  Scenario Outline: <file> is served with a long CDN cache lifetime
    When a client fetches "<file>"
    Then it answers 200 with JSON
    And it tells a CDN to keep it for at least a day

    Examples:
      | file                         |
      | /data/v1/surahs.json         |
      | /data/v1/surahs/2.json       |
      | /data/v1/recitations/2.json  |
      | /data/v1/manifest.json       |

@issue-173
Feature: /data/v1 keeps its Root files and Juz file with the Roots read from Neon
  The Root dialog, on the site and in the app, reads a Root's file, and the
  app's Juz tab reads the Juz file (ADR 0008). The Roots, their Lemmas and
  Spellings, and each Script's Juz list move into Neon (ADR 0050), and every
  address keeps its shape and bytes: /data/v1/roots/<id>.json and
  /roots/<id>.json for each Root, /data/v1/juz.json, and the manifest's
  dataset version over them. The app's Known words page (#253) lists every
  Root from /data/v1/roots.json, as the website's lists them from Neon (#248).

  This is the parity check: these scenarios fetch the files over HTTP from the
  production build served against the run's own Postgres
  (features/api/serve-api.ts), and compare them with the generated files as
  last committed, before they were deleted (features/site/committed-output.ts,
  BEFORE_ROOTS_MOVED), read from git.

  @AC-2
  Scenario: Every Root file is its committed Root file
    When a client fetches /data/v1/roots/<id>.json for each of the 1642 committed Root files
    Then each answers 200 with JSON
    And each Root file's bytes are its committed Root file's, published as JSON

  @AC-2
  Scenario: The Root dialog's file for each Root is its committed Root file
    When a client fetches /roots/<id>.json for each of the 1642 committed Root files
    Then each answers 200 with JSON
    And each Root file's bytes are its committed Root file's, published as JSON

  @AC-2
  Scenario: The Juz file is the committed Juz file
    When a client fetches "/data/v1/juz.json"
    Then it answers 200 with JSON
    And its bytes are the committed Juz file's, published as JSON

  @issue-253
  Scenario: The Root list lists every committed Root, with its Lemmas' meanings
    When a client fetches "/data/v1/roots.json"
    Then it answers 200 with JSON
    And it lists the 1642 committed Roots by ascending id, each with its letters and its Lemmas' meanings in each Language, most frequent first, empty ones left out

  @AC-2
  Scenario: The manifest's dataset version is over the committed Root files and Juz file
    When a client fetches "/data/v1/manifest.json"
    Then it answers 200 with JSON
    And the dataset version is the hash over the Surah index, Surah files and Recitation files served, the committed Roots, the committed Juz file and the particle files served

  @AC-2
  Scenario Outline: <address> names no Root, and is not found
    When a client fetches "<address>"
    Then it answers 404

    Examples:
      | address                    |
      | /data/v1/roots/0.json      |
      | /data/v1/roots/01.json     |
      | /data/v1/roots/1643.json   |
      | /data/v1/roots/one.json    |
      | /roots/0.json              |
      | /roots/01.json             |
      | /roots/1643.json           |

  @AC-2
  Scenario Outline: <file> is served with a long CDN cache lifetime
    When a client fetches "<file>"
    Then it answers 200 with JSON
    And it tells a CDN to keep it for at least a day

    Examples:
      | file                   |
      | /data/v1/roots/1.json  |
      | /data/v1/juz.json      |
      | /data/v1/roots.json    |

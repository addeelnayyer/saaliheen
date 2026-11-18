@issue-170
Feature: The published Surah files keep each Ayah's Themes, read from Neon
  The mobile app reads the dataset from `/data/v1` (ADR 0008) and keeps
  Surahs offline by the manifest's hashes (ADR 0025). Themes moved into Neon
  (ADR 0037), and `/data/v1/surahs/<n>.json` keeps its shape: each Ayah's
  `themes`, its Theme slugs in tagged order, now merged from Neon. The
  manifest names the hash of exactly what each Surah file serves.

  These scenarios fetch the files over HTTP from the production build served
  against the run's own Postgres (features/api/serve-api.ts), and compare
  them with the Surah files as last committed before Themes moved
  (data/generated/surahs/ at 5127e94, features/site/committed-output.ts), read
  from git so that they outlive the generated output: each Ayah's Themes as
  committed there, and the rest as the dataset build writes it now, since an
  Admin's Phrase publish commits its source and not the regenerated file.

  @AC-3 @AC-10
  Scenario: Every Surah file at /data/v1 is its committed Surah file, each Ayah's Themes included
    When a client fetches each of the 114 Surah files the manifest lists
    Then each answers 200 with JSON
    And each Ayah of each Surah file has the Themes its committed Surah file gives it, in tagged order
    And each Surah file holds what its committed Surah file holds, field for field

  @AC-3 @AC-10
  Scenario: The manifest names the hash of each Surah file as it is served, and as it was committed
    When a client fetches each of the 114 Surah files the manifest lists
    Then the manifest's hash of each Surah file is the SHA-256 of the bytes that Surah file answers
    And the manifest's hash of each Surah file is the SHA-256 of its committed Surah file as /data/v1 published it

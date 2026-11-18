@issue-172
Feature: `pnpm dev` imports the Quran into its own Postgres on start
  The Quran text, Word meanings, Ayah translations and Recitation timings live
  in Neon (#172, ADR 0049), so a developer's site needs them in its database.
  `pnpm dev` runs `pnpm db:migrate` on its own Postgres when it starts (ADR
  0041), and the import runs inside it, so the Quran is there with no other
  setup, and a restart on unchanged sources imports nothing again.

  Background:
    Given no DATABASE_URL is set, in the environment or in apps/web's .env files
    And the run's dev Postgres has no container and no volume

  @AC-2
  Scenario: `pnpm dev` imports the Quran into its own Postgres when it starts
    When I start `pnpm dev`
    Then its database holds 114 Surahs and 6236 Ayahs, and a hash of the sources they were imported from
    And Word 1:1:1 in its database has the QPC Hafs text at that Word location
    When `pnpm dev` is stopped and started again
    Then its database holds the same sources hash, stored once

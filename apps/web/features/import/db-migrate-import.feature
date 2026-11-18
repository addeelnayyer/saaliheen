@issue-172
Feature: `pnpm db:migrate` runs the import before the content migrations
  The deploy runs `pnpm db:migrate` on production before it deploys, and
  `pnpm dev` runs it on its own Postgres when it starts (ADR 0041). The import
  runs inside it (ADR 0049), ahead of the content migrations, which read the
  Surahs it loads, so both get the Quran with no step of their own. The
  deploy's own wiring is a CHECK line in DELIVERY/evidence.md, and `pnpm dev`'s
  a scenario of features/dev/.

  @AC-2
  Scenario: `pnpm db:migrate` on an empty Postgres imports the Quran, then runs every content migration
    Given an empty Postgres
    When `pnpm db:migrate` runs on it
    Then it exits 0
    And the database holds the Quran the builder makes of the committed sources: 114 Surahs, 6236 Ayahs and every Word
    And it stores a hash of the sources
    And every content migration ran, each after the import was stored

  @AC-2
  Scenario: `pnpm db:migrate` run again imports nothing
    Given a Postgres `pnpm db:migrate` has run on
    When `pnpm db:migrate` runs on it again
    Then it exits 0
    And nothing was written to the import's tables
    And the stored sources hash is the same

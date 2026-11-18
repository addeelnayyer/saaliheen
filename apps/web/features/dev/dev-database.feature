@issue-170
Feature: `pnpm dev` runs on a Postgres of its own
  Pages that show Themes read them from Neon (ADR 0037, ADR 0040), so a
  developer's site needs a database. `pnpm dev` starts its own (ADR 0020,
  ADR 0041): the tests' `pgvector/pgvector:pg17`, in a Docker container on a fixed port,
  its data in a Docker volume, and runs `pnpm db:migrate` on it before Next
  starts, so Theme pages serve with no other setup and what is written to it
  outlives a restart. A DATABASE_URL overrides it: `pnpm dev` then serves the
  database that names, as it is, and starts no Postgres.

  These scenarios start `pnpm dev` on PORT as a developer does, with the dev
  Postgres's container and volume renamed and its port moved for the run
  (DEV_DATABASE_NAME, DEV_DATABASE_PORT), so a developer's own is never
  touched; both are removed afterwards. Restarting Docker itself, or the
  machine, is checked by hand (DELIVERY/by-hand.md).

  Background:
    Given no DATABASE_URL is set, in the environment or in apps/web's .env files
    And the run's dev Postgres has no container and no volume

  @AC-7
  Scenario: `pnpm dev` starts and migrates its own Postgres, and serves Theme pages
    When I start `pnpm dev`
    Then a pgvector/pgvector:pg17 container of the run's name takes connections on 127.0.0.1 at the run's port, keeping its data in a Docker volume of that name
    And its database has run every content migration, and holds 258 Themes in 13 Theme categories
    And the Theme page of "faith" in English answers 200, headed "Faith"
    And the Theme page of "faith" in Urdu answers 200, headed with its Urdu name

  @AC-7
  Scenario: What `pnpm dev`'s Postgres holds survives a restart
    Given `pnpm dev` has served the Theme page of "faith" once
    And the Theme "faith" is renamed "Faith (kept)" in English in its database
    When `pnpm dev` is stopped and its Postgres container removed, leaving its volume
    And I start `pnpm dev` again
    Then its database still names the Theme "faith" "Faith (kept)" in English
    And `pnpm dev` ran no content migration again
    And the Theme page of "faith" in English answers 200, headed "Faith (kept)"

  @AC-7
  Scenario: A DATABASE_URL overrides `pnpm dev`'s own Postgres
    Given a migrated Postgres of its own, in which the Theme "faith" is named "Faith (elsewhere)" in English
    When I start `pnpm dev` with DATABASE_URL naming that Postgres
    Then the Theme page of "faith" in English answers 200, headed "Faith (elsewhere)"
    And no container or volume of the run's dev Postgres was made

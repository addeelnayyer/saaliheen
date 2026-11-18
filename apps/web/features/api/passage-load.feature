@issue-171
Feature: Passages and Phrases loaded into Neon once, by a content migration
  Passages, Passage titles and Phrases are Saaliheen's own data and move into
  Neon (ADR 0011, ADR 0021). A content migration (ADR 0015) creates their
  tables and loads them once from the Passages and Phrases files, carrying its
  own copy of them as the Theme load does (ADR 0041), so the files can be
  deleted:
  - `passage`: one row per Passage, its Surah (`surah`), first and last Ayah
    (`ayah_from`, `ayah_till`) and English and Urdu Passage titles
    (`title_en`, `title_ur`);
  - `phrase`: one row per Phrase, its Surah (`surah`) and first and last Word
    location (`first_word`, `last_word`);
  - `passage_revision`: one row per publish or seed, its Surah (`surah`),
    author, time (`created_at`), edits, `base` version and `version`. The load
    writes one `seed` revision per Surah, base 0 and version 1, with no edits;
  - `surah_content_hash`: each Surah's content hash (`surah`, `hash`), the
    SHA-256 of the Surah file /data/v1 serves for it, written by the load and
    by each publish (ADR 0020, the user's decision of 2026-10-16), which the
    manifest names.
  A loaded database runs the load never again.

  These scenarios read the run's own Postgres (features/api/serve-api.ts),
  which `pnpm db:migrate` has migrated, directly, since no endpoint answers
  these tables, and compare it with the Passages and Phrases files as last
  committed before they moved (read from git at the last Publish to change
  each, features/site/committed-output.ts), which outlive the files'
  deletion. Counts and titles are read from those files, never typed.

  # ---------------------------------------------------------------- AC-1: the load

  @AC-1
  Scenario: Every Passage is loaded, with its Surah, its first and last Ayah and its English and Urdu Passage titles
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    Then the Passages in the database are exactly the committed Passages file's 1618, each with its Surah, its first and last Ayah and its English and Urdu Passage titles

  @AC-1
  Scenario: Every one of the 114 Surahs has its committed Passages, in order, and no other
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    Then each of the 114 Surahs has, in Ayah order, exactly the Passages the committed Passages file gives it

  @AC-1
  Scenario: Every Phrase is loaded, with its Surah and its first and last Word location
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    Then the Phrases in the database are exactly the committed Phrases file's 88, each with its Surah and its first and last Word location

  @AC-1
  Scenario: The load writes one seed Passage revision per Surah, base 0 and version 1, and no other revision
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    Then each of the 114 Surahs has exactly one Passage revision, by "seed", with base 0, version 1 and no edits
    And there is no other Passage revision

  @AC-1 @AC-12
  Scenario: Running `pnpm db:migrate` again changes no row
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    And I note every row of the Passage tables and the stored content hashes, and the latest content audit row
    When I run `pnpm db:migrate` again
    Then it succeeds, reporting 0 content migrations run
    And every row of the Passage tables and the stored content hashes is as noted
    And no content audit row has been written since

  # ---------------------------------------------------------------- AC-12: the stored content hash

  @AC-12
  Scenario: The load stores each Surah's content hash, the SHA-256 of the Surah file /data/v1 serves for it
    Given `pnpm db:migrate` has made the Passage tables in the run's database
    When a client fetches each of the 114 Surah files the manifest lists
    Then each of the 114 Surahs has one stored content hash, and no other Surah has one
    And each Surah's stored content hash is the SHA-256 of the bytes its Surah file answers

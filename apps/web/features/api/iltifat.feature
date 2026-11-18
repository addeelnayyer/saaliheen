@issue-138
Feature: The Iltifat in Neon, loaded once by db:migrate
  The Iltifat live only in Neon (ADR 0012). `db:migrate` gains a step for
  Saaliheen's own content tables and data migrations, each recorded once it has
  run so that it never runs twice in the same database. The first data
  migration loads the 326 Iltifat of the catalogue, version 2.0, committed in
  the repo as its frozen input (data/iltifat/quran_iltifat_person_shifts_2.json).

  Each Iltifat row holds its Iltifat direction, its Surah and run of Ayahs, its
  cited Ayah (the verse of the catalogue's verse_url), its reason, whether it is
  Disputed, its Abdel Haleem section and a version.

  These scenarios read the loaded rows directly from the run's own Postgres,
  which features/api/serve-api.ts started empty and prepared with
  `pnpm db:migrate`, as no read endpoint exists yet. They expect one table,
  `iltifat`, with the columns id, from_person and to_person (first, second or
  third, as in the catalogue), surah, ayah_from, ayah_to, cited_ayah, reason,
  disputed, section and version. Counts are typed from the issue; every other
  value is read from the committed catalogue.

  # ---------------------------------------------------------------- AC-1: 326 Iltifat after db:migrate

  @AC-1 @AC-15
  Scenario: After db:migrate on an empty database, it holds the catalogue's 326 Iltifat
    Then the database holds 326 Iltifat
    And the database holds these Iltifat by Iltifat direction:
      | direction | count |
      | He → We   | 150   |
      | We → He   | 96    |
      | He → You  | 57    |
      | You → He  | 23    |
    And these 16 Iltifat in the database are Disputed, and no other:
      | direction | run      |
      | He → You  | 2:17–21  |
      | You → He  | 2:53–54  |
      | You → He  | 2:187    |
      | You → He  | 2:216    |
      | He → We   | 3:168    |
      | He → You  | 4:11     |
      | He → You  | 9:18–19  |
      | He → We   | 10:22    |
      | He → We   | 32:12    |
      | We → He   | 37:32–33 |
      | He → We   | 39:3     |
      | He → You  | 50:21–24 |
      | He → We   | 72:10–16 |
      | He → We   | 76:8–9   |
      | He → You  | 78:35–36 |
      | He → You  | 87:14–16 |
    And each Iltifat in the database is one entry of the catalogue, with its direction, Surah, run, cited Ayah, reason, Disputed flag and Abdel Haleem section
    And every Iltifat in the database has a version

  @AC-1 @AC-15
  Scenario: Running db:migrate again changes nothing, and keeps a change made since
    Given I note every row in the database
    And the reason of the He → You Iltifat at 1:2–5 has since been changed to "A reason an Admin wrote."
    When I run db:migrate again
    Then the database still holds 326 Iltifat
    And the He → You Iltifat at 1:2–5 still has the reason "A reason an Admin wrote."
    And every other row in the database is as I noted it

  # ---------------------------------------------------------------- AC-2: cited Ayah within the run, run within the Surah

  @AC-2 @AC-15
  Scenario: Every Iltifat's cited Ayah lies within its run, which lies within its Surah
    Then every Iltifat in the database names a Surah from 1 to 114
    And every Iltifat's run starts at Ayah 1 or later and ends at or before its Surah's last Ayah in the Surah metadata
    And every Iltifat's run starts at or before it ends
    And every Iltifat's cited Ayah lies within its run

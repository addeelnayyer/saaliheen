@issue-199
Feature: The Supplications in Neon, loaded once by db:migrate
  The Supplications load once, then live only in Neon (ADR 0027). Content
  migrations appended to db:migrate's list (ADR 0015), each in its own
  transaction and recorded once, create the Supplication and Speaker tables
  and their revision tables, and load the curated file
  (data/supplications/supplications.json) at version 1. The load writes no
  revision: only Admin saves in the Supplication editor (a later issue) will.

  No client can see a table, a refused write or a re-run, so these scenarios
  read and write the run's own Postgres directly, which features/api/serve-api.ts
  started empty and prepared with `pnpm db:migrate`, as the Iltifat's did
  (iltifat.feature). They expect the tables #195 names:
    - supplication_speaker: id (the slug), name_en, name_ur, includes_prophet,
      version;
    - supplication: id (given by Neon when a row is added), surah, ayah_from,
      ayah_to, speaker_id, openings, kind, version;
    - supplication_revision and supplication_speaker_revision, shaped like
      iltifat_revision (ADR 0023).
  Expected values are read from the curated file.

  # ---------------------------------------------------------------- AC-6: the tables, version 1, no revisions

  @AC-6 @AC-17
  Scenario: After db:migrate on an empty database, it holds the curated file's Speakers and Supplications at version 1, and no revision
    Then the database has the tables "supplication_speaker", "supplication", "supplication_revision" and "supplication_speaker_revision"
    And the database holds every Speaker of the curated file, with its names and Prophet mark, each at version 1
    And the database holds every Supplication of the curated file, with its Surah, run, Speaker, Openings and kind, each at version 1
    And the database holds no Supplication revision and no Speaker revision

  # ---------------------------------------------------------------- AC-7: Neon refuses a crossing run or a shared Ayah

  @AC-7 @AC-17
  Scenario Outline: Neon refuses a Supplication <what>
    When I add to the database a Supplication at Surah <surah>, Ayahs <from> to <to>, said by the Speaker of the run at 2:127–129
    Then the database refuses the Supplication <what>
    And the database still holds just the curated file's Supplications

    Examples:
      | what                                              | surah | from | to  |
      | sharing Ayah 2:129 with the run at 2:127–129      | 2     | 129  | 130 |
      | lying wholly inside the run at 2:127–129          | 2     | 128  | 128 |
      | holding the whole run at 2:127–129                | 2     | 126  | 130 |
      | running past the last Ayah of Al-Fatihah          | 1     | 7    | 8   |
      | ending before it starts                           | 1     | 3    | 2   |
      | starting before Ayah 1                            | 1     | 0    | 1   |
      | in a Surah after the last                         | 115   | 1    | 1   |
      | in a Surah before the first                       | 0     | 1    | 1   |

  @AC-7 @AC-17
  Scenario: Neon accepts a Supplication whose Ayahs no other Supplication holds
    When I add to the database a Supplication at Surah 1, Ayahs 5 to 7, said by the Speaker of the run at 2:127–129
    Then the database accepts it
    And the Supplication I added is taken out again

  # ---------------------------------------------------------------- AC-8: re-running changes nothing

  @AC-8 @AC-17
  Scenario: Running db:migrate again changes nothing, and keeps a change made since
    Given I note every row in the database
    And the English name of the Speaker of the run at 28:16 has since been changed in the database to "A name an Admin wrote"
    When I run db:migrate again
    Then the Speaker of the run at 28:16 still has the English name "A name an Admin wrote"
    And every other row in the database is as I noted it, but for the content audit's one entry of that change

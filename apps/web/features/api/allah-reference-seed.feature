@issue-147
Feature: Seeding Allah references into Neon
  Allah references are Saaliheen's own data and live only in Neon from the
  start (ADR 0012). `pnpm db:migrate` creates their two tables beside the
  Account tables: Allah references, one row per Word location with its
  Surah, and Allah reference revisions, one row per publish or seed, with its
  Surah, who made it ("seed" for the seed), and the Word locations it added
  and removed. A one-off seed, `pnpm db:seed-allah-references <file>`, loads
  the owner's JSON array of Word locations exactly as given and records one
  seed revision per Surah. Running it again leaves the same rows, and it
  refuses the whole load, naming them, when any Word location does not exist
  in the Quran text.

  These scenarios run the seed as the owner does, against the run's own
  Postgres (features/api/serve-api.ts), from small files written for each
  scenario, never the owner's file, and read the tables back as they then
  stand.

  @AC-1 @AC-13
  Scenario: `pnpm db:migrate` has created both Allah reference tables, and running it again changes nothing
    Given the run's database holds the Allah references table and the Allah reference revisions table
    And I note every table and column of the run's database
    When I run `pnpm db:migrate` again
    Then it reports 0 tables created and 0 tables altered
    And every table and column of the run's database is as noted

  @AC-2 @AC-13
  Scenario: The seed loads every Word location in the file, exactly as given, and records one seed revision per Surah
    Given a file of Allah references holding the Word locations:
      | location |
      | 1:1:2    |
      | 1:1:3    |
      | 1:2:2    |
      | 12:40:12 |
      | 112:1:3  |
      | 112:2:1  |
    When I run the seed with that file
    Then the seed succeeds
    And the Allah references are exactly the Word locations in the file, each with its Surah
    And there is exactly one seed revision for each of Surahs 1, 12 and 112, adding that Surah's Word locations in the file, and no other revision

  @AC-3 @AC-13
  Scenario: Running the seed again leaves the same rows
    Given a file of Allah references holding the Word locations:
      | location |
      | 1:1:2    |
      | 1:1:3    |
      | 1:2:2    |
      | 12:40:12 |
      | 112:1:3  |
      | 112:2:1  |
    And I have run the seed with that file
    And I note every row of the Allah references and Allah reference revisions tables
    When I run the seed with that file
    Then the seed succeeds
    And every row of the Allah references and Allah reference revisions tables is as noted

  @AC-4 @AC-13
  Scenario Outline: The seed refuses the whole load when the file holds <bad>, and names it
    Given a file of Allah references holding the Word locations:
      | location |
      | 1:1:2    |
      | 1:1:3    |
      | 1:2:2    |
      | 12:40:12 |
      | 112:1:3  |
      | 112:2:1  |
    And I have run the seed with that file
    And I note every row of the Allah references and Allah reference revisions tables
    And a file of Allah references holding 2:255:1, 2:255:2, "<bad>", 113:1:1 and "<also>"
    When I run the seed with that file
    Then the seed fails, naming "<bad>" and "<also>" and no other Word location
    And every row of the Allah references and Allah reference revisions tables is as noted

    Examples:
      # A Word past its Ayah's last, an Ayah past its Surah's last, a Surah
      # past the last, a Word 0, an Ayah-end marker (which is not a Word), and
      # text that is no Word location at all.
      | bad     | also           |
      | 1:1:6   | 112:4:7        |
      | 1:8:1   | 113:6:1        |
      | 115:1:1 | 0:1:1          |
      | 2:255:0 | 1:1:0          |
      | 1:1:5   | 1:7:10         |
      | 1:1     | not-a-location |

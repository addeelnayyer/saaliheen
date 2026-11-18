@issue-172
Feature: The import runs before each deploy and loads only what changed
  The import runs with `pnpm db:migrate` before each deploy (ADR 0049). It
  stores a hash of the sources it loaded, and when the sources are unchanged
  it skips the load and writes nothing at all, so running it twice leaves the
  same rows. It reports, as the builder did, every Word meaning QUL lacks,
  every Word the Recitation gives no timing and every Word whose Root QUL and
  roots.json disagree on (ADR 0003, ADR 0010), and imports those Words all the
  same.

  @AC-1 @AC-8
  Scenario: The first run into an empty Postgres loads the Quran and stores the sources' hash
    Given an empty Postgres
    When the import runs on the committed sources
    Then it exits 0
    And the database holds 114 Surahs, 6236 Ayahs and a Word for every Word location the builder gives
    And it stores a hash of the sources

  @AC-1 @AC-8 @issue-173
  Scenario: The import reports what QUL lacks, as the builder does
    Given an empty Postgres
    When the import runs on the committed sources
    Then it exits 0
    And its output names every Word meaning gap the builder's report lists, 286 in all
    And its output names the untimed Words "21:87:9", "40:40:20", "49:11:33", "74:31:45" and "74:31:46"
    And its output names every Root disagreement the builder's report lists, 456 in all, with QUL's letters and roots.json's
    And each Word with a Word meaning gap is imported with the builder's Word meanings

  @AC-1 @AC-8
  Scenario: A second run with unchanged sources writes nothing
    Given a Postgres holding the import of the committed sources
    When the import runs on the committed sources again
    Then it exits 0
    And nothing was written to any table
    And the stored sources hash is the same

  @AC-1 @AC-8
  Scenario: A changed source loads again, and stores the new sources' hash
    Given a Postgres holding the import of the committed sources
    And a copy of the sources whose Urdu Word meaning of 1:1:1 has " (changed)" added to it
    When the import runs on that copy
    Then it exits 0
    And Word 1:1:1's Urdu Word meaning in the database is QUL's with " (changed)" added to it
    And every other Word's Word meanings in the database are the builder's
    And the stored sources hash differs from the committed sources'

  @AC-1 @AC-8
  Scenario: Running the changed copy again writes nothing
    Given a Postgres holding the import of a copy of the sources whose Urdu Word meaning of 1:1:1 has " (changed)" added to it
    When the import runs on that copy again
    Then it exits 0
    And nothing was written to any table

  @issue-173 @AC-1
  Scenario: A changed Root meaning in roots.json loads again, into the Root's Spelling
    Given a Postgres holding the import of the committed sources
    And a copy of the sources whose roots.json English meaning at "1:1:3" under "ر ح م" has " (changed)" added to it
    When the import runs on that copy
    Then it exits 0
    And the Root "ر ح م" read back from the database gives the Spelling at "1:1:3" roots.json's English meaning with " (changed)" added to it
    And the stored sources hash differs from the committed sources'

  @issue-173 @AC-1
  Scenario: A Postgres the import loaded before the Roots moved into it loads again, with its Roots
    Given a Postgres holding an import made before the Roots moved into it: Words carrying their Root's letters, and no Root or Juz tables
    When the import runs on the committed sources
    Then it exits 0
    And the database holds the builder's Roots and both Scripts' Juz lists
    And no Word row carries its Root's letters, which come from its Root

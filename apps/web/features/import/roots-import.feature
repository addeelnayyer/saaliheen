@issue-173
Feature: The Roots and each Script's Juz list imported into Postgres
  The import loads, beside the Quran text, every QUL Root with its Lemmas and
  Spellings and their meanings, by today's rules (ADR 0003), and each
  Script's 30 Juz (ADR 0021), so that nothing reads a generated file. These
  scenarios read them back through the site's own reads of Neon and hold them
  to what the builder makes of the committed sources: each Root as its Root
  file gives it, each Juz list as the Juz file gives it. Expected values are
  the builder's, never typed.

  Background:
    Given a Postgres holding the import of the committed sources

  @AC-1
  Scenario: Every Root is imported with its Lemmas and Spellings, as the builder gives it
    Then the database holds the builder's 1642 Roots, by QUL id
    And each Root read back from the database is the builder's, with its Lemmas and Spellings in order and their meanings in both Languages
    And the Root of ر ح م read back has 9 Lemmas, 84 Spellings and 339 Word locations

  @AC-1
  Scenario: Each Root's stored hash is the hash of the Root file it publishes
    Then each Root's stored hash is the SHA-256 of the builder's Root as /data/v1 publishes it

  @AC-1
  Scenario: Each Word's Root tag names an imported Root
    Then every imported Word with a Root tag names a Root the database holds, with that Root's letters

  @AC-1
  Scenario: Each Script's Juz list is imported, as the builder gives it
    Then each Script's Juz list read back from the database is the builder's, Juz 1 to 30

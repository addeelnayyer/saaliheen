@issue-249
Feature: The particles imported into Postgres
  The import loads, beside the Roots, every particle (CONTEXT.md) with its
  kind, text, occurrence count and Spellings, their meanings and Word
  locations, as the dataset builder makes them (particle-analysis.feature), and
  each Word with no Root names its particle. These scenarios read them back
  through the site's own reads of Neon and hold them to what the builder makes
  of the committed sources. Expected values are the builder's, never typed, but
  for the counts below.

  Background:
    Given a Postgres holding the import of the committed sources

  @AC-1
  Scenario: Every particle is imported with its Spellings, as the builder gives it
    Then the database holds the builder's 352 particles: 188 Lemma particles and 164 Spelling particles
    And each particle read back from the database is the builder's, with its Spellings in order and their meanings in both Languages
    And the particles' Spellings hold the 27134 Word locations QUL gives no Root, each once

  @AC-1
  Scenario: Each particle's stored hash is the hash of the particle file it publishes
    Then each particle's stored hash is the SHA-256 of the builder's particle as /data/v1 publishes it

  @AC-1
  Scenario: Every Word has a Root or a particle, never both
    Then every imported Word read back has a Root tag or a particle, never both, as the builder gives it
    And the database refuses a Word with both a Root and a particle

  @AC-1
  Scenario: A second run with unchanged sources writes no particle
    When the import runs on the committed sources again
    Then it exits 0
    And nothing was written to any table

  @AC-1
  Scenario: A Postgres the import loaded before particles loads again, with its particles
    Given the import's tables as they were before particles: no particle tables, and no particle on any Word row
    When the import runs on the committed sources
    Then it exits 0
    And the database holds the builder's particles, and each Word with no Root names its particle

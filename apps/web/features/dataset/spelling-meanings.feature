Feature: Spelling and Lemma meanings in the dataset
  A Spelling's meaning comes from `roots.json`, matched by its first Word
  location; a Spelling that `roots.json` does not cover falls back to QUL's
  Word meaning there (ADR 0003). A Lemma's representative meaning is the
  meaning of its most frequent Spelling. Expected meanings are read from
  `roots.json` and the QUL Word meaning files, never typed.

  Background:
    Given the dataset is built from the committed sources

  @AC-5-3
  Scenario: The Spelling first found at 1:1:3 shows the roots.json meaning for that Word location
    When I find the Spelling whose first Word location is "1:1:3"
    Then roots.json lists that Word location, with an Urdu meaning that differs from QUL's Urdu Word meaning there
    And the Spelling's Urdu and English meaning are roots.json's meaning at that Word location

  @AC-5-3
  Scenario: Every Spelling covered by roots.json shows its meaning
    Then every Spelling whose first Word location roots.json lists has roots.json's Urdu and English meaning there

  @AC-5-4
  Scenario: The Spelling first found at 2:223:6 falls back to QUL's Word meaning
    When I find the Spelling whose first Word location is "2:223:6"
    Then roots.json lists none of the Spelling's 15 Word locations
    And the Spelling's Urdu and English meaning are QUL's Word meaning at that Word location

  @AC-5-4
  Scenario: Every Spelling roots.json does not cover falls back to QUL's Word meaning
    Then 18 Spellings have a first Word location roots.json does not list
    And each of them has QUL's Urdu and English Word meaning at its first Word location

  @AC-5-15
  Scenario: Every Lemma's representative meaning is its most frequent Spelling's meaning
    Then every Lemma's Urdu and English meaning is the meaning of its first Spelling

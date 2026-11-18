@issue-249
Feature: Particle analysis in the dataset
  A Word QUL's word root database gives no Root is a particle's (CONTEXT.md):
  the particle is the Lemma QUL's word lemma database gives its Word location,
  or, when it gives none, the Word's Spelling, its Uthmani text with pause
  marks set aside. The dataset builder gives each such Word its particle, as a
  Word with a Root carries its Root tag, and builds every particle with its
  kind, its text, its occurrence count and its Spellings, in the shape of a
  Root's Lemma. Particles are numbered from 1, most frequent first. Expected
  particles and counts are read from the QUL databases and the Script texts,
  never typed, but for the counts below. The issue counted 226 Spelling
  particles by Uthmani text as written; a Spelling is the Word's Uthmani text
  with pause marks set aside, as a Root's Spellings are (ADR 0003), so هُوَ,
  هُوَۖ and ۞ هُوَ are one particle, and there are 164.

  Background:
    Given the dataset is built from the committed sources

  @AC-1
  Scenario: Every rootless Word belongs to exactly one particle, and Words with a Root to none
    Then the dataset holds 188 Lemma particles and 164 Spelling particles
    And every Word QUL gives no Root carries the particle its Lemma, else its Spelling, makes it
    And no Word with a Root carries a particle
    And every particle lists each Word location of its Words exactly once, and no other

  @AC-1
  Scenario: Each particle has its kind, text, occurrence count and Spellings
    Then each Lemma particle's text is QUL's Lemma text, and each Spelling particle's its Uthmani text with pause marks set aside
    And each particle's occurrence count is the number of its Word locations
    And each particle's Spellings are its Words grouped by Uthmani text with pause marks set aside, most frequent first, each with both Scripts' text and its meaning at its first Word location
    And a Spelling particle has one Spelling

  @AC-1
  Scenario: Particles are numbered from 1, most frequent first
    Then the particles are numbered 1 to 352 in order, most frequent first, ties by first Word location
    And the particle numbered 1 is the Lemma particle "مِن"

  @AC-1
  Scenario Outline: The Word at <location> carries the <kind> particle "<text>"
    When I look up the Word at "<location>"
    Then the Word has no Root
    And the Word carries the <kind> particle "<text>"

    Examples:
      | location | kind     | text    |
      | 1:5:1    | Lemma    | إِيَّا    |
      | 1:7:4    | Lemma    | عَلَىٰ   |
      | 17:1:19  | Spelling | هُوَ     |
      | 4:1:22   | Spelling | بِهِۦ    |

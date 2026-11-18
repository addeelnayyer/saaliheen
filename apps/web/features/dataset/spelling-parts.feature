@issue-288
Feature: Each Spelling's Ayahs split into parts of fifty
  A Root page lists, under each Spelling, the Ayahs it occurs in. On a Root of
  more than fifty occurrences each Spelling starts closed and, opened, shows
  its Ayahs fifty at a time (#288): a Spelling's Ayahs are its Word locations'
  Ayahs, each once and in Quran order, cut into parts of fifty, the last part
  holding what is left. Each part is fetched when needed. A Root of fifty
  occurrences or fewer opens with every Spelling open, so every Spelling of it
  is a single part. The Roots are the dataset's, built from QUL's word root and
  word lemma databases (#5). A Root's occurrence count, the one its Root page
  shows, is its Word locations' number, not QUL's words_count, which differs
  for 14 Roots. The issue's ء ل ه is written ا ل ه, as QUL writes it.

  Background:
    Given the dataset is built from the committed sources

  @AC-7
  Scenario: Each Spelling's Ayahs are its Word locations' Ayahs, each once and in Quran order
    Then every Spelling of every Root lists each Ayah one of its Word locations is in, once, in Quran order, and no other

  @AC-7
  Scenario: Each Spelling's Ayahs split into parts of fifty, none lost or repeated
    Then every Spelling's parts, one after another, hold exactly its Ayahs
    And every part but a Spelling's last holds 50 Ayahs, and its last between 1 and 50

  @AC-7
  Scenario: A Root's occurrences add up across its Spellings
    Then every Root's Spellings' Word locations number the Root's occurrence count
    And no Word location is in two Spellings of a Root

  @AC-1 @AC-2
  Scenario: ا ل ه opens closed, and its most frequent Spelling loads in many parts
    Then the Root "ا ل ه" has more than 50 occurrences, so its Spellings start closed
    And its most frequent Spelling has more than 10 parts

  @AC-5
  Scenario Outline: The small Root <letters> opens with every Spelling open, each a single part
    Then the Root "<letters>" has at most 50 occurrences, so its Spellings start open
    And every Spelling of the Root "<letters>" is a single part

    Examples:
      | letters |
      | ح ي ض   |
      | ز ب د   |
      | و ط ر   |

@issue-171
Feature: The dataset holds no Passages or Phrases now they live in Neon
  Passages and Phrases moved into Neon (#171): a content migration loaded
  them from its own frozen input (ADR 0041), and the Passages file
  (data/passages.json) and the Phrases file (data/phrases.json) were deleted.
  The dataset build reads neither file and holds no Passage, Phrase or Phrase
  colour. Each Surah keeps its `passages` and `phrases` keys, empty lists, in
  the place /data/v1 fills from Neon, so the published Surah files keep their
  bytes and hashes. The Surahs are imported into Neon (#172) rather than
  written, and /data/v1 serves each Surah file from their rows in the same
  order (features/api/published-quran.feature).

  @AC-8
  Scenario: The dataset built from the committed sources holds no Passages, Phrases or Phrase colours
    Given the dataset is built from the committed sources
    Then each of the 114 Surahs has an empty list of Passages and an empty list of Phrases
    And none of the Words of the 6236 Ayahs carries a Phrase colour

  @AC-8
  Scenario: A Passages file and a Phrases file put back beside the sources are never read
    Given a copy of the sources holding a Passages file and a Phrases file that are not JSON
    When the dataset is built from that copy
    Then the build succeeds, and no Surah holds a Passage or a Phrase

  @AC-8
  Scenario: The dataset keeps each Surah's empty Passages and Phrases in their place
    Given the dataset is built from the committed sources
    Then each of the 114 Surahs it holds has "passages" and "phrases" as empty lists, after "sectionMarks" and before "ayahs"
    And no Word in them carries a Phrase colour

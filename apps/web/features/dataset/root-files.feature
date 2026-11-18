Feature: One Root file per Root
  The site serves each Root as its own JSON file, named by QUL's Root id, read
  from Neon (#173), so the Root dialog loads it only when it opens. Surah files
  carry only each Word's Root tag, never a Root's Lemmas, so a Surah page does
  not embed every Root.

  Background:
    Given the dataset is built from the committed sources

  @AC-5-7
  # The dataset's Surahs are imported into Neon (#172) rather than written:
  # /data/v1 serves each Surah file from the rows they make.
  Scenario: The dataset's Surahs carry each Word's Root tag and no Root's Lemmas
    Then each Word in every Surah the dataset holds has a Root tag that is its Root's id and letters, or none
    And no Surah the dataset holds has a Lemma or a Spelling

@issue-170
Feature: The dataset holds no Themes now they live in Neon
  Themes moved into Neon (ADR 0037): the content migration 0008-load-themes-file
  loaded them from its own frozen input (ADR 0041), and the Themes file
  (data/themes.json) and its generated output (data/generated/themes.json)
  were deleted, as was the rest of data/generated (#173). The dataset build
  reads no Themes file and holds no Themes or Theme categories. Each Ayah of a
  Surah file keeps its `themes` key, an empty list, in the place /data/v1
  fills from Neon, so the published Surah files keep their bytes and hashes.

  @AC-2
  Scenario: The committed sources and the committed dataset hold no Themes file
    Then the website's data holds no Themes file, "data/themes.json"
    And the committed dataset holds no Themes file, "data/generated/themes.json"

  @AC-2
  Scenario: The dataset built from the committed sources holds no Themes
    Given the dataset is built from the committed sources
    Then the dataset holds no Themes and no Theme categories
    And every one of the 6236 Ayahs has an empty list of Themes

  @AC-2
  Scenario: A Themes file put back beside the sources is never read
    Given a copy of the sources holding a Themes file that is not JSON
    When the dataset is built from that copy
    Then the build succeeds, and the dataset holds no Themes and no Theme categories

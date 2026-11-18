Feature: The manifest of the published dataset
  Any client, not only the website, reads the dataset as static files under
  `/data/v1` (ADR 0008): the Surah index, one file per Surah and one file per
  Root. A manifest lists every Surah file with the hash of its content, the
  dataset's version and the minimum app version still supported, so an
  installed app can tell which of its offline Surahs an Admin's Passage edit
  has made stale. These scenarios check the manifest the dataset build gives,
  and, now Passages live in Neon (#171), the manifest of the Surah files as
  /data/v1 serves them, each carrying its Passages.

  Background:
    Given the dataset is built from the committed sources

  @AC-65-2
  Scenario: The manifest lists every Surah file with the hash of its content
    When I make the manifest
    Then it lists 114 Surah files, Surah 1 first, each at "/data/v1/surahs/<n>.json"
    And each Surah file's hash is the SHA-256 of that Surah's published file, in hex
    And it names the minimum app version "1.0.0"
    And it names a dataset version

  @AC-65-2
  Scenario: The same dataset always gives the same manifest
    When I make the manifest
    And I make the manifest of the dataset built again from the same sources
    Then the two manifests are the same

  @AC-65-4
  Scenario Outline: <edit> changes Surah 18's hash and no other Surah's
    When I make the manifest with Surah 18 served with its Passages as last committed
    And I make the manifest with Surah 18 served with those Passages after <edit>
    Then Surah 18's hash differs between the two manifests
    And every other Surah's hash is the same in both
    And the dataset versions differ

    Examples:
      | edit                                       |
      | 89–91 in Surah 18 retitled in English      |
      | 89–91 in Surah 18 retitled in Urdu         |
      | 83–88 in Surah 18 split at 86              |
      | the start of 95–98 in Surah 18 moved to 96 |

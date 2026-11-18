Feature: The Surah index and every Surah, read from /data/v1
  The app shows the same Quran Analysis as the website, read only from the
  versioned dataset its origin publishes under /data/v1: the Surah index from
  /data/v1/surahs.json and each Surah from /data/v1/surahs/<n>.json. Expected
  names, Words, Word meanings and Root tags are read from the committed
  dataset those files publish. How the screens look, and each Script's
  typeface, are checked by hand on iOS and Android simulators.

  Background:
    Given the app is launched on a new device

  @AC-1
  Scenario: The Surah index lists all 114 Surahs as /data/v1/surahs.json gives them
    When I open the Surah index
    Then it lists Surahs 1 to 114 in order, each with its Arabic name, Latin name, where it was revealed and its Ayah count as /data/v1/surahs.json gives them

  @AC-1
  Scenario Outline: Every Surah opens in the <Script> Script and <Language>
    When I open each of the 114 Surahs in the <Script> Script and <Language>
    Then each shows its Ayahs from 1 to its Ayah count, in order
    And each Ayah shows a Word card for each of its Words, in order, with the Word's <Script> text, its <Language> Word meaning and its Root tag, as its /data/v1 Surah file gives them

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

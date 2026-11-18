Feature: Each Surah split into parts for opening it in the app
  Opening a Surah from inside the app shows it at once and fills it in part by
  part (#24). The parts are runs of whole, consecutive Ayahs, cut by Word
  count: a small first part, so the first Ayahs show soon, then larger ones.
  An Ayah longer than a part's Word budget is a part on its own.

  Background:
    Given the dataset is built from the committed sources

  @AC-24-2
  Scenario: Every Surah's parts cover its Ayahs once each, in order
    Then each of the 114 Surahs' parts run from Ayah 1 to its last Ayah with no gap or overlap
    And every part holds at least one Ayah

  @AC-24-2
  Scenario: Parts keep to their Word budgets
    Then every first part holds at most 60 Words, unless it is a single Ayah
    And every later part holds at most 400 Words, unless it is a single Ayah
    And no part could take its next Ayah without going over its budget

  @AC-24-2
  Scenario Outline: A part in <Language> carries its Ayahs' Words and Ayah translations in <Language> only
    When I take part 2 of Surah 2 in <Language>
    Then it holds the Ayahs of part 2 of Surah 2, in order, with every Word they hold in the dataset
    And each Word's meaning is the dataset's <Language> Word meaning, and nothing in the other Language
    And each Ayah translation is the dataset's <Language> Ayah translation

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-24-2
  Scenario: Al-Baqarah opens with a small first part and loads in many parts
    Then Surah 2 has more than 10 parts
    And Surah 2's first part ends before Ayah 10
    And Surah 112 is a single part

@AC-3-8
Feature: The Surah index lists all 114 Surahs in each Language
  `/ur` and `/en` show a card for every Surah, following the Option B mockup:
  its number, its Latin and Arabic names, its Ayah count and whether it is
  Makki or Madani, as QUL's Surah metadata says. The cards read the same in
  both Languages, in English; only their links keep the reader in the index's
  Language.

  @AC-3-2
  Scenario Outline: The Surah index in <Language> is in the build's HTML with a card for each of the 114 Surahs
    Then the Surah index in <Language> is served with a link to each of the 114 Surah pages in its HTML

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-2
  Scenario Outline: Every index card in <Language> shows its Surah's number, names, Ayah count and Makki or Madani, in order
    Given I open the Surah index in <Language>
    Then the index cards are all 114 Surahs in order
    And every index card shows its Surah's number, Latin and Arabic names, Ayah count and Meccan or Medinan in English, as the Surah metadata says

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-2
  Scenario Outline: The Surah index in <Language> keeps all 114 cards with the system set to <scheme> on a <viewport>
    Given the system colour scheme is <scheme>
    And the browser is a <viewport>
    And I open the Surah index in <Language>
    Then the index cards are all 114 Surahs in order
    And the page is captured as the evidence screen "AC-3-2-index-<lang>-<scheme>-<viewport>"

    Examples:
      | Language | lang | scheme | viewport |
      | Urdu     | ur   | light  | desktop  |
      | Urdu     | ur   | light  | phone    |
      | Urdu     | ur   | dark   | desktop  |
      | Urdu     | ur   | dark   | phone    |
      | English  | en   | light  | desktop  |
      | English  | en   | light  | phone    |
      | English  | en   | dark   | desktop  |
      | English  | en   | dark   | phone    |

  @AC-3-3
  Scenario Outline: The <Language> Surah index names each Surah in Latin transliteration and in Arabic letters
    Given I open the Surah index in <Language>
    Then every index card shows its Surah's Latin name from the Surah metadata
    And every index card shows its Surah's Arabic name from the Surah metadata

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-3
  Scenario: The Urdu and English Surah indexes show the same cards, each linking to its own Language
    Given I open the Surah index in Urdu
    And I note what every index card shows
    When I open the Surah index in English
    Then every index card shows what the Urdu index card of its Surah showed

@AC-2-15
Feature: Ayah markers and the Bismillah
  Each Ayah is marked before its first Word card, in English in every
  Language. As in the Mushaf, At-Tawbah has no Bismillah, in Al-Fatihah it is
  Ayah 1 (its own Word cards), and every other Surah opens with it before
  Ayah 1. The Bismillah's text is Ayah 1:1's Uthmani Words, read from the QPC
  Hafs text.

  @AC-2-9
  Scenario Outline: Surah 1 in <Language> marks each of its 7 Ayahs in English before that Ayah's first Word card
    Given I open Surah 1 in <Language>
    Then Surah 1 has 7 Ayahs in the Surah metadata
    And each Ayah of Surah 1 is marked in English, after the previous Ayah's last Word card and before its own first Word card

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-2-9
  Scenario: The Surah metadata says every Surah but Al-Fatihah and At-Tawbah opens with the Bismillah
    Then the Surah metadata says Surahs 1 and 9 do not open with the Bismillah and the other 112 Surahs do

  @AC-2-9
  Scenario Outline: Surah <Surah> in <Language> shows the Bismillah exactly as its Surah metadata says
    Given I open Surah <Surah> in <Language>
    Then the Word card at <Surah>:1:1 is visible
    And the Bismillah is shown once, before the Word card at <Surah>:1:1, if the Surah metadata says Surah <Surah> opens with it, and not at all otherwise

    Examples: At-Tawbah and its neighbours in Urdu
      | Language | Surah |
      | Urdu     | 1     |
      | Urdu     | 2     |
      | Urdu     | 9     |

    Examples: Every Surah in English
      | Language | Surah |
      | English  | 1     |
      | English  | 2     |
      | English  | 3     |
      | English  | 4     |
      | English  | 5     |
      | English  | 6     |
      | English  | 7     |
      | English  | 8     |
      | English  | 9     |
      | English  | 10    |
      | English  | 11    |
      | English  | 12    |
      | English  | 13    |
      | English  | 14    |
      | English  | 15    |
      | English  | 16    |
      | English  | 17    |
      | English  | 18    |
      | English  | 19    |
      | English  | 20    |
      | English  | 21    |
      | English  | 22    |
      | English  | 23    |
      | English  | 24    |
      | English  | 25    |
      | English  | 26    |
      | English  | 27    |
      | English  | 28    |
      | English  | 29    |
      | English  | 30    |
      | English  | 31    |
      | English  | 32    |
      | English  | 33    |
      | English  | 34    |
      | English  | 35    |
      | English  | 36    |
      | English  | 37    |
      | English  | 38    |
      | English  | 39    |
      | English  | 40    |
      | English  | 41    |
      | English  | 42    |
      | English  | 43    |
      | English  | 44    |
      | English  | 45    |
      | English  | 46    |
      | English  | 47    |
      | English  | 48    |
      | English  | 49    |
      | English  | 50    |
      | English  | 51    |
      | English  | 52    |
      | English  | 53    |
      | English  | 54    |
      | English  | 55    |
      | English  | 56    |
      | English  | 57    |
      | English  | 58    |
      | English  | 59    |
      | English  | 60    |
      | English  | 61    |
      | English  | 62    |
      | English  | 63    |
      | English  | 64    |
      | English  | 65    |
      | English  | 66    |
      | English  | 67    |
      | English  | 68    |
      | English  | 69    |
      | English  | 70    |
      | English  | 71    |
      | English  | 72    |
      | English  | 73    |
      | English  | 74    |
      | English  | 75    |
      | English  | 76    |
      | English  | 77    |
      | English  | 78    |
      | English  | 79    |
      | English  | 80    |
      | English  | 81    |
      | English  | 82    |
      | English  | 83    |
      | English  | 84    |
      | English  | 85    |
      | English  | 86    |
      | English  | 87    |
      | English  | 88    |
      | English  | 89    |
      | English  | 90    |
      | English  | 91    |
      | English  | 92    |
      | English  | 93    |
      | English  | 94    |
      | English  | 95    |
      | English  | 96    |
      | English  | 97    |
      | English  | 98    |
      | English  | 99    |
      | English  | 100   |
      | English  | 101   |
      | English  | 102   |
      | English  | 103   |
      | English  | 104   |
      | English  | 105   |
      | English  | 106   |
      | English  | 107   |
      | English  | 108   |
      | English  | 109   |
      | English  | 110   |
      | English  | 111   |
      | English  | 112   |
      | English  | 113   |
      | English  | 114   |

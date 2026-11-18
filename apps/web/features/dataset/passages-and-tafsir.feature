@issue-235
Feature: Passages never split a Tafsir entry
  Each Passage's Tafsir is its Tafsir entries whole (ADR 0053), so the
  Passages module's publish check takes each Language's Tafsir entry ranges
  beside the Passages: a Passage that begins inside a Tafsir entry, in either
  Language, splits it, and is a problem naming the Passage, the entry and the
  Language. The English and Urdu editions may group Ayahs differently, so
  both are checked; a Language with no entries checks nothing. The rule needs
  no database: the ranges are an input. These scenarios check Al-Kahf
  (Surah 18, 110 Ayahs) as the Passages file has it.

  Background:
    Given Surah 18's Passages from the Passages file

  @AC-1 @AC-2
  Scenario: Every split, in either Language, is a problem of its own, in Passage order
    Given the English Tafsir entries of Surah 18 are one per Ayah, but 88–89
    And the Urdu Tafsir entries of Surah 18 are one per Ayah, but 82–83 and 91–92
    Then Surah 18's Passages are not publishable
    And the problems are, in order:
      | problem                                         |
      | Passage 83–88: splits the Urdu Tafsir entry 82–83   |
      | Passage 89–91: splits the English Tafsir entry 88–89 |
      | Passage 92–94: splits the Urdu Tafsir entry 91–92   |

  @AC-1
  Scenario: A Passage splitting an entry in English is a problem naming the Passage, the entry and English
    Given the English Tafsir entries of Surah 18 are one per Ayah, but 88–89
    And the Urdu Tafsir entries of Surah 18 are one per Ayah
    Then Surah 18's Passages are not publishable
    And the problems are, in order:
      | problem                                              |
      | Passage 89–91: splits the English Tafsir entry 88–89 |

  @AC-2
  Scenario: A Passage splitting an entry only in Urdu is a named problem
    Given the English Tafsir entries of Surah 18 are one per Ayah
    And the Urdu Tafsir entries of Surah 18 are one per Ayah, but 94–96
    Then Surah 18's Passages are not publishable
    And the problems are, in order:
      | problem                                           |
      | Passage 95–98: splits the Urdu Tafsir entry 94–96 |

  @AC-1
  Scenario: A Passage lying inside one entry splits it at both ends
    Given the English Tafsir entries of Surah 18 are one per Ayah, but 88–92
    Then the problems are, in order:
      | problem                                              |
      | Passage 89–91: splits the English Tafsir entry 88–92 |
      | Passage 92–94: splits the English Tafsir entry 88–92 |

  @AC-3
  Scenario: Passages made of whole entries are publishable
    Given the English Tafsir entries of Surah 18 are one per Ayah, but 83–88 and 89–90
    And the Urdu Tafsir entries of Surah 18 are one per Ayah, but 95–98
    Then Surah 18's Passages are publishable

  @AC-3
  Scenario: With no Tafsir entries in either Language, nothing is split
    Given Surah 18 has no Tafsir entries in either Language
    Then Surah 18's Passages are publishable

  @AC-1
  Scenario: A split made by an edit is a problem until the Passages are whole entries again
    Given the English Tafsir entries of Surah 18 are one per Ayah, but 85–86
    Then Surah 18's Passages as the Passages file has them are publishable
    When I split 83–88 at 86
    And I give 86–88 the Passage titles of 89–91
    Then the problems are, in order:
      | problem                                              |
      | Passage 86–88: splits the English Tafsir entry 85–86 |
    When I move the start of 86–88 to 85
    Then Surah 18's Passages are publishable again

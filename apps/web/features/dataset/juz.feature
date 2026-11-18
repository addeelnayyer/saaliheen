@issue-193
Feature: Each Script's Juz
  The dataset builder gives each Script its own list of the 30 Juz (ADR 0021):
  each Juz's number, its name and its first and last Ayah. Uthmani follows
  QUL's Madinah Juz file. Indo-Pak follows Saaliheen's own Juz starts: the
  Madinah start for 23 Juz, and its own start for Juz 4, 7, 11, 14, 20, 21 and
  23. Each Juz is named by its opening words in its own Script, read from that
  Script's Word text at the Juz's first Ayah, never typed. The Juz list is
  written beside the Surah list, as juz.json, for the Surah index's Juz tab.

  Background:
    Given the dataset is built from the committed sources

  @AC-5 @AC-10
  Scenario: The Uthmani Juz are QUL's Madinah Juz
    When I read the Uthmani Juz list
    Then it holds Juz 1 to 30 in order
    And each Juz's first and last Ayah are the ones QUL's Madinah Juz file gives it

  @AC-5 @AC-10
  Scenario: The Indo-Pak Juz start where Saaliheen's Indo-Pak Juz start
    When I read the Indo-Pak Juz list
    Then it holds Juz 1 to 30 in order
    And these Juz start at these Ayahs, unlike QUL's Madinah Juz
      | juz | firstAyah |
      | 4   | 3:92      |
      | 7   | 5:83      |
      | 11  | 9:94      |
      | 14  | 15:2      |
      | 20  | 27:60     |
      | 21  | 29:45     |
      | 23  | 36:22     |
    And every other Juz starts at the Ayah QUL's Madinah Juz file starts it

  @AC-5 @AC-10
  Scenario Outline: The <Script> Juz cover the Quran end to end
    When I read the <Script> Juz list
    Then Juz 1 starts at "1:1" and Juz 30 ends at "114:6"
    And each Juz ends at the Ayah just before the next Juz starts
    And together the Juz hold all 6236 Ayahs, each once

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-5 @AC-10
  Scenario Outline: Each <Script> Juz is named by its opening words in <Script>
    When I read the <Script> Juz list
    Then each Juz's name is the opening Words of its first Ayah in the <Script> text, joined by spaces
    And no Juz's name carries the ۞ sign that marks where a Hizb starts

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-5
  Scenario: Uthmani Juz 23 runs 36:28 to 39:31
    When I read the Uthmani Juz list
    Then Juz 23 runs from "36:28" to "39:31"
    And Juz 23's name starts with the Uthmani text of Word "36:28:1"

  @AC-5
  Scenario: Indo-Pak Juz 23 starts at 36:22 and is named وَمَا لِيَ
    When I read the Indo-Pak Juz list
    Then Juz 23 starts at "36:22"
    And Juz 23 is named "وَمَا لِيَ"
    And that name is the Indo-Pak text of Words "36:22:1" and "36:22:2", joined by a space

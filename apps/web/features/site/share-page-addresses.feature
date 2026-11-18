@AC-10 @issue-55
Feature: Share page addresses: allowed Shared Ayahs
  Shared Ayahs are Ayahs that exist, from ≤ to, within one Surah, at most 10
  Ayahs, except that a run exactly matching a Passage is always allowed.
  Anything else is not found. The address is
  /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>] (see
  share-page.feature); a run across Surahs is one whose to Ayah runs past its
  Surah's last Ayah. Whether a run is a Passage is read from the Passages file
  (as last committed), never assumed.

  @AC-5
  Scenario: Runs across Surahs, of 11 or more Ayahs that are not a Passage, of missing Surahs or Ayahs, or with from > to are not found
    Given 2:1–11 is not a Passage in the Passages file
    And 2:270–281 is not a Passage in the Passages file
    And Surah 1 has 7 Ayahs in the Surah metadata
    Then the Share pages of these Shared Ayahs are not found, in either Language:
      | Shared Ayahs | why                                   |
      | 1:7–8        | runs across from Surah 1 into Surah 2  |
      | 1:1–8        | runs across from Surah 1 into Surah 2  |
      | 2:1–11       | 11 Ayahs and not exactly a Passage     |
      | 2:270–281    | 12 Ayahs and not exactly a Passage     |
      | 115:1        | a missing Surah                        |
      | 0:1          | a missing Surah                        |
      | 1:8          | a missing Ayah                         |
      | 1:0          | a missing Ayah                         |
      | 2:287        | a missing Ayah                         |
      | 18:88–83     | from > to                              |

  @AC-5
  Scenario: An address that names no known Language, Script or Share layout is not found
    Then these addresses are not found:
      | /fr/share/1/1-7/uthmani             |
      | /en/share/1/1-7/naskh               |
      | /en/share/1/1-7/uthmani/poster      |
      | /en/share/1/1-7                     |
      | /en/share/1/x-7/uthmani             |

  @AC-5
  Scenario Outline: <Shared Ayahs> is allowed: <why>
    Given <precondition>
    When I open the Share page of <Shared Ayahs> in English and Uthmani
    Then the Share page shows <Shared Ayahs> Ayah by Ayah in Uthmani and English

    Examples:
      | Shared Ayahs | why                                        | precondition                                        |
      | 20:24–36     | a Passage longer than 10 Ayahs             | 20:24–36 is a Passage of 13 Ayahs in the Passages file |
      | 2:1–10       | 10 Ayahs, the most a run may hold          | 2:1–10 is not a Passage in the Passages file        |
      | 1:1–7        | a whole Surah of 7 Ayahs                   | Surah 1 has 7 Ayahs in the Surah metadata           |
      | 114:6        | the last Ayah of the last Surah            | Surah 114 has 6 Ayahs in the Surah metadata         |

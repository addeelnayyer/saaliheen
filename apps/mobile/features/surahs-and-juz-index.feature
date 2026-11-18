@issue-193
Feature: The Surahs and Juz index on the Read screen
  The app's Read screen holds the same Surah index as the website's Read
  page: two tabs, Surahs first and then Juz, one search box for both, and
  Juz that follow the reader's Script (ADR 0021). The Juz come from
  /data/v1/juz.json, beside the Surah list in /data/v1/surahs.json, and
  expected Juz, names and Ayahs are read from the committed dataset those
  files publish. Opening a Juz opens the Surah where it starts, at its first
  Ayah. How the tabs look, follow a swipe and keep their scroll is checked
  on an iOS simulator.

  Background:
    Given the app is launched on a new device

  @AC-8 @AC-10
  Scenario: The Read screen's index has the Surahs and Juz tabs, Surahs first
    Then the Read screen's index has the tabs "Surahs" and "Juz", in that order

  @AC-8 @AC-10
  Scenario Outline: The Juz tab lists the <Script> Juz as /data/v1/juz.json gives them
    When I open the Juz tab in the <Script> Script
    Then it lists Juz 1 to 30 in order, each with its <Script> name, first Ayah and last Ayah as /data/v1/juz.json gives them

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-8 @AC-10
  Scenario Outline: Juz 23 starts where the <Script> Script starts it
    When I open the Juz tab in the <Script> Script
    Then Juz 23 starts at "<first>"

    Examples:
      | Script   | first |
      | Uthmani  | 36:28 |
      | Indo-Pak | 36:22 |

  @AC-8 @AC-10
  Scenario: Indo-Pak Juz 23 is named وَمَا لِيَ
    When I open the Juz tab in the Indo-Pak Script
    Then Juz 23 is named "وَمَا لِيَ"

  @AC-8 @AC-10
  Scenario: A Juz row says where the Juz runs
    When I open the Juz tab in the Uthmani Script
    Then Juz 2's row says it runs "Al-Baqarah 142 → 252"
    And Juz 23's row names Surah 36 and its Ayah 28, then Surah 39 and its Ayah 31

  @AC-8 @AC-10
  Scenario Outline: A number finds the Surah and the Juz with that number in <Script>
    When I search the index for "23" in the <Script> Script
    Then it finds Surah 23 alone and Juz 23 alone

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-8 @AC-10
  Scenario Outline: Searching "Yasin" finds Surah 36 and every <Script> Juz holding part of it
    When I search the index for "Yasin" in the <Script> Script
    Then it finds Surah 36 alone
    And it finds every <Script> Juz that holds an Ayah of Surah 36, and no other Juz

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-8 @AC-10
  Scenario: Surah 36's Arabic name finds it
    When I search the index for Surah 36's Arabic name in the Uthmani Script
    Then it finds Surah 36 alone

  @AC-8 @AC-4 @AC-10
  Scenario Outline: The search reads "<query>" by the website's rules
    When I search the index for "<query>" in the Uthmani Script
    Then it finds the Surahs "<surahs>" and the Juz "<juz>"

    Examples:
      | query  | surahs | juz   |
      | ۲۳     | 23     | 23    |
      | 023    | 23     | 23    |
      | YA SIN | 36     | 22,23 |
      | ya-sin | 36     | 22,23 |
      | -      |        |       |

  @AC-8 @AC-4 @AC-10
  Scenario: Surah 36's Arabic name typed with an Urdu keyboard's letters finds it
    When I search the index for Surah 36's Arabic name, without harakat and in an Urdu keyboard's yeh, kaf and heh, in the Uthmani Script
    Then it finds Surah 36 alone

  @AC-8 @AC-10
  Scenario: A search that finds nothing says what to search by
    When I search the index for "qqqq" in the Uthmani Script
    Then it finds no Surah and no Juz
    And it says to search by a number or a name

  @AC-8 @AC-4 @AC-10
  Scenario: A blank search finds every Surah and every Juz
    When I search the index for only spaces in the Uthmani Script
    Then it finds all 114 Surahs and all 30 Juz, in order
    And it says nothing about what to search by

  @AC-8 @AC-6 @AC-10
  Scenario Outline: Opening Juz 23 in <Script> opens Surah 36 at Ayah <ayah>
    When I open Juz 23 from the Juz tab in the <Script> Script
    Then Surah 36's screen opens at Ayah <ayah>

    Examples:
      | Script   | ayah |
      | Uthmani  | 28   |
      | Indo-Pak | 22   |

  @AC-8 @AC-6 @AC-10
  Scenario Outline: The <Script> Juz holding the latest Reading place is marked
    Given I read Surah 36 up to Ayah 25
    When I open the Juz tab in the <Script> Script
    Then only Juz <juz> is marked as holding the latest Reading place

    Examples:
      | Script   | juz |
      | Uthmani  | 22  |
      | Indo-Pak | 23  |

  @AC-8 @AC-6 @AC-10
  Scenario: No Juz is marked before any Reading place
    When I open the Juz tab in the Uthmani Script
    Then no Juz is marked as holding the latest Reading place

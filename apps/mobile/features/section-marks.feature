@issue-194
Feature: Section marks on a Surah's screen
  As on the website, a Surah's screen marks the reader's chosen traditional
  division between Ayahs (CONTEXT.md: Section marks; ADR 0020): Hizb quarters,
  where every reader starts, or Rukus. Each mark stands directly above the
  Ayah it starts at, above any Passage heading at that Ayah, and shows its
  medallion sign, ۞ for a Hizb quarter and ع for a Ruku, and its label. The
  marks are the same in both Scripts. The choice is kept on the device under
  the website's own key and value ("qwt-section-marks": "hizb" or "ruku"),
  never synced, and Me offers it as a setting. Expected marks are read from
  the Surah's /data/v1 Surah file; only Surah 63's labels, the issue's own
  demo, are written out.

  Background:
    Given the app is launched on a new device

  @AC-6 @AC-8
  Scenario Outline: On a new device, Surah 63 in <Script> marks its Hizb quarter "¼ Hizb 56" above Ayah 63:4, and no Ruku
    When I open Surah 63 in the <Script> Script and English
    Then the Section marks setting is Hizb quarters
    And Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 4     | ۞    | ¼ Hizb 56 |

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-6 @AC-8
  Scenario Outline: With Rukus chosen, Surah 63 in <Script> marks its Rukus above 63:1 and 63:9, above their Passage headings
    Given I choose Rukus for Section marks
    When I open Surah 63 in the <Script> Script and English
    Then Surah 63 shows exactly these Section marks
      | above | sign | label                 |
      | 1     | ع    | Ruku 1 of 2 · 8 Ayahs |
      | 9     | ع    | Ruku 2 of 2 · 3 Ayahs |
    And each of Surah 63's Section marks stands above the Passage heading at its Ayah, where there is one

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-6 @AC-8
  Scenario Outline: In <Mode> mode, every Section mark of Surah <Surah> is the one its /data/v1 Surah file gives, in both Scripts
    Given I choose <Mode> for Section marks
    When I open Surah <Surah> in the Uthmani Script and Urdu
    Then Surah <Surah> shows exactly the <Mode> marks of its /data/v1 Surah file, each directly above its Ayah or that Ayah's Passage heading
    When I open Surah <Surah> in the Indo-Pak Script and English
    Then in Indo-Pak too, Surah <Surah> shows exactly the <Mode> marks of its /data/v1 Surah file, each directly above its Ayah or that Ayah's Passage heading

    Examples:
      | Mode          | Surah |
      | Hizb quarters | 1     |
      | Hizb quarters | 2     |
      | Hizb quarters | 65    |
      | Rukus         | 2     |
      | Rukus         | 73    |
      | Rukus         | 114   |

  @AC-6 @AC-8
  Scenario: The choice is kept on the device: after the app is launched again, Rukus are still chosen
    Given I choose Rukus for Section marks
    When the app is launched again on the same device
    Then the Section marks setting is Rukus
    And the device keeps "ruku" under "qwt-section-marks"
    When I open Surah 63 in the Uthmani Script and English
    Then Surah 63 shows a Section mark "Ruku 2 of 2 · 3 Ayahs" above Ayah 63:9
    When I choose Hizb quarters for Section marks
    And I open Surah 63 in the Uthmani Script and English
    Then Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 4     | ۞    | ¼ Hizb 56 |

  @AC-6 @AC-8
  Scenario: The Word cards of Surah 63 show no printed ۞
    When I open Surah 63 in the Uthmani Script and English
    Then no Word card of Surah 63 holds ۞
    And the Word card at 63:4:1 shows the Uthmani text its /data/v1 Surah file gives

  @AC-6
  Scenario: Me offers the Section marks setting after the sizes
    When I open the Me tab
    Then Me offers a "Section marks" setting, after "Meaning size" and before "Credits"

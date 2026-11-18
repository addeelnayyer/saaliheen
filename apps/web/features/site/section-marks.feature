@issue-194
Feature: Section marks on a Surah page
  Any reader chooses which traditional division is marked between Ayahs
  (CONTEXT.md: Section marks; ADR 0020): Hizb quarters, where every reader
  starts, or Rukus. The choice is a per-device reader setting, "Section
  marks", a group of two buttons, "Hizb quarters" and "Rukus", wherever the
  reader settings are (Me and the Surah bar's Reading settings sheet). It is
  stored in the browser and set on <html> as data-section-marks, "hizb" or
  "ruku", before the page is first drawn, like the Ayah layout and Phrase
  colours; it does not follow the Account.

  A Surah page renders both kinds of mark and the stylesheet shows the chosen
  one, so switching never draws the Ayahs again. A Section mark is a note
  (role "note") between Ayahs, above any Passage heading at the same Ayah:
  a rule across the column with a medallion, ۞ for a Hizb quarter and ع for
  a Ruku, and its label. A mark the reader has not chosen is hidden from
  sight and from screen readers alike. The marks are the same in both Scripts
  and in Study and Flowing.

  The marks every Surah should show are read from its generated Surah file;
  only Surah 63's labels, the issue's own demo, are written out.

  Background:
    Given a browser with no saved reader settings

  @AC-1 @AC-2 @AC-4 @AC-8
  Scenario Outline: On Surah 63 in <Script>, a new reader sees "¼ Hizb 56" above 63:4, and switching to Rukus marks 63:1 and 63:9 without drawing the Ayahs again
    Given I open "/en/63"
    And I choose the <Script> Script
    Then the page's root element has data-section-marks "hizb"
    And Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 63:4  | ۞    | ¼ Hizb 56 |
    When I note the Ayahs on the page
    And I choose "Rukus" for Section marks
    Then the page's root element has data-section-marks "ruku"
    And Surah 63 shows exactly these Section marks
      | above | sign | label                 |
      | 63:1  | ع    | Ruku 1 of 2 · 8 Ayahs |
      | 63:9  | ع    | Ruku 2 of 2 · 3 Ayahs |
    And the Ayahs on the page are the ones I noted, not drawn again
    When I choose "Hizb quarters" for Section marks
    Then Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 63:4  | ۞    | ¼ Hizb 56 |
    And the Ayahs on the page are the ones I noted, not drawn again
    And the Word card at 63:4:1 shows its <Script> text without a printed ۞

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-1 @AC-8
  Scenario Outline: In <Mode> mode, Surah <surah> in <Language> shows exactly the marks of its Surah file
    Given I open "/<lang>/<surah>"
    When I choose "<Mode>" for Section marks
    Then Surah <surah> shows exactly the <Mode> marks of its Surah file, each above its Ayah

    Examples:
      | Mode          | surah | Language | lang |
      | Hizb quarters | 1     | English  | en   |
      | Hizb quarters | 2     | Urdu     | ur   |
      | Hizb quarters | 65    | English  | en   |
      | Rukus         | 2     | English  | en   |
      | Rukus         | 73    | Urdu     | ur   |
      | Rukus         | 114   | English  | en   |

  @AC-4 @AC-8
  Scenario: Rukus chosen on an earlier visit apply before first paint and survive a reload
    Given on an earlier visit to "/en/63" I chose, in order:
      | Rukus |
    When I open "/en/63" in a fresh browser with an empty cache that keeps those choices
    Then when the first content entered the page and in the first animation frame, the page's root element had data-section-marks "ruku"
    And Surah 63 shows exactly these Section marks
      | above | sign | label                 |
      | 63:1  | ع    | Ruku 1 of 2 · 8 Ayahs |
      | 63:9  | ع    | Ruku 2 of 2 · 3 Ayahs |
    When I reload the page
    Then the page's root element has data-section-marks "ruku"
    And the Section marks setting shows "Rukus" chosen

  @AC-4
  Scenario: A new reader's page has Hizb quarters from the first paint
    When I open "/en/63" in a fresh browser with an empty cache that keeps those choices
    Then when the first content entered the page and in the first animation frame, the page's root element had data-section-marks "hizb"
    And the Section marks setting shows "Hizb quarters" chosen

  @AC-4
  Scenario: The Section marks setting is on Me, offering Hizb quarters and Rukus
    When I open Me in English
    Then Me's reader settings offer "Section marks" with "Hizb quarters" and "Rukus", "Hizb quarters" chosen

  @AC-5 @AC-8
  Scenario Outline: In Flowing, in <Script>, Surah 63 shows its Section marks between the running Ayahs
    Given I open "/en/63"
    And I choose the <Script> Script
    When I switch the Ayah layout to Flowing
    Then Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 63:4  | ۞    | ¼ Hizb 56 |
    When I choose "Rukus" for Section marks
    Then Surah 63 shows exactly these Section marks
      | above | sign | label                 |
      | 63:1  | ع    | Ruku 1 of 2 · 8 Ayahs |
      | 63:9  | ع    | Ruku 2 of 2 · 3 Ayahs |
    And Surah 63 is shown Flowing

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-5 @AC-8
  Scenario: Surah 63 opened from the Surah index, part by part, shows its Section marks
    Given I open "/en"
    When I follow the index card of Surah 63
    Then every Ayah of Surah 63 is shown
    And Surah 63 shows exactly these Section marks
      | above | sign | label     |
      | 63:4  | ۞    | ¼ Hizb 56 |

  @passage-headings-on @AC-5
  Scenario Outline: In <Layout>, each Ruku mark of Surah 63 sits above the Passage heading at its Ayah
    Given I open "/en/63"
    And I choose "Rukus" for Section marks
    When I switch the Ayah layout to <Layout>
    Then the Section mark "Ruku 1 of 2 · 8 Ayahs" is drawn above the Passage heading above Ayah 63:1
    And the Section mark "Ruku 2 of 2 · 3 Ayahs" is drawn above the Passage heading above Ayah 63:9

    Examples:
      | Layout  |
      | Study   |
      | Flowing |

  @AC-7
  Scenario: Screen readers are told of the chosen marks only, by their labels
    Given I open "/en/63"
    Then the page's accessibility tree holds exactly these Section marks
      | label     |
      | ¼ Hizb 56 |
    When I choose "Rukus" for Section marks
    Then the page's accessibility tree holds exactly these Section marks
      | label                 |
      | Ruku 1 of 2 · 8 Ayahs |
      | Ruku 2 of 2 · 3 Ayahs |

  @AC-7
  Scenario Outline: In the <theme> theme, on a <viewport>, the marks read well
    Given I choose the <theme> theme
    And I open "/en/63" on a <viewport> screen
    Then the label of the Section mark "¼ Hizb 56" contrasts with what is behind it by at least 4.5 to 1, and its sign by at least 3 to 1
    And I save a screenshot of the Section mark "¼ Hizb 56" "AC-7-surah-63-hizb-<theme>-<viewport>"
    When I choose "Rukus" for Section marks
    Then the label of the Section mark "Ruku 2 of 2 · 3 Ayahs" contrasts with what is behind it by at least 4.5 to 1, and its sign by at least 3 to 1
    And I save a screenshot of the Section mark "Ruku 2 of 2 · 3 Ayahs" "AC-7-surah-63-ruku-<theme>-<viewport>"

    Examples:
      | theme | viewport |
      | light | desktop  |
      | dark  | desktop  |
      | light | phone    |
      | dark  | phone    |

  @AC-7
  Scenario Outline: In <Script>, each Section mark's sign sits in the middle of its disc
    Given I open "/en/63"
    And I choose the <Script> Script
    Then the ink of the Section mark "¼ Hizb 56"'s sign is centred in its disc, within 1 pixel
    And I save an enlarged screenshot of the Section mark "¼ Hizb 56" "AC-7-medallion-<name>-hizb-light-desktop"
    When I choose "Rukus" for Section marks
    Then the ink of the Section mark "Ruku 2 of 2 · 3 Ayahs"'s sign is centred in its disc, within 1 pixel
    And I save an enlarged screenshot of the Section mark "Ruku 2 of 2 · 3 Ayahs" "AC-7-medallion-<name>-ruku-light-desktop"

    Examples:
      | Script   | name    |
      | Uthmani  | uthmani |
      | Indo-Pak | indopak |

  @AC-7
  Scenario: With reduced motion, switching Section marks moves nothing
    Given my system prefers reduced motion
    And I open "/en/63"
    When I choose "Rukus" for Section marks
    Then nothing on the page is animating or in transition
    When I choose "Hizb quarters" for Section marks
    Then nothing on the page is animating or in transition

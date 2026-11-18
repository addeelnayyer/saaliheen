@issue-129
Feature: Theme pages' Passage groups in the dataset
  A Theme page lists its Theme's Ayahs in Quran order, grouped by Passage:
  matching Ayahs that come one after another in that list and lie in one
  Passage form one group, under the Passage's full Ayah range, even when other
  Ayahs of the Passage fall between them. Each Theme's Ayahs are those the
  Theme load puts into Neon (its own input, ADR 0041), grouped by the
  Passages of the dataset built from the committed sources, as the website's
  Theme pages group them (#170).

  @AC-9 @AC-16
  Scenario Outline: <theme>'s Theme page has these Passage groups
    Given the dataset is built from the committed sources
    Then the Theme "<theme>" has <count> Ayahs in these Passage groups, in order: <groups>

    Examples:
      | theme            | count | groups                                                                            |
      | Battle of Hunayn | 3     | 9:25–27 [25 26 27]                                                                |
      | Dhul-Kifl        | 3     | 21:85–86 [85 86]; 38:45–48 [48]                                                   |
      | Elisha           | 2     | 6:84–87 [86]; 38:45–48 [48]                                                       |
      | Contracts        | 5     | 2:282–282 [282]; 5:1–2 [1]; 24:32–34 [33]; 28:26–28 [27 28]                       |
      | Extravagance     | 8     | 6:141–144 [141]; 7:31–33 [31]; 17:26–30 [26 27 29]; 25:63–67 [67]; 26:128–135 [128]; 90:5–10 [6] |

  @AC-9 @AC-16
  Scenario: A Passage whose matching Ayahs are not consecutive Ayahs is still one group
    Given the dataset is built from the committed sources
    Then the Theme "Extravagance" has one Passage group for "17:26–30", holding Ayahs 26, 27 and 29 but not 28

  @AC-9 @AC-16
  Scenario: Every Theme's Passage groups hold exactly its Ayahs, in Quran order, each group within its Passage
    Given the dataset is built from the committed sources
    Then for every Theme, its Passage groups' Ayahs are, in order, every Ayah that has that Theme
    And every Passage group's range is a Passage of the Passages file, holding all of the group's Ayahs
    And no two Passage groups one after another are of the same Passage

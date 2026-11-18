@issue-139
Feature: Every Iltifat, read from /api/v1/iltifat, as the mobile app reads them
  The mobile app's way into the Iltifat (#136, ADR 0012): one public read
  endpoint, GET /api/v1/iltifat, answering every Iltifat with the counts in one
  JSON answer small enough to cache whole, through the shared respond helpers,
  so it carries Min-App-Version as every /api/v1 answer does.

  The answer is an object with two lists:
    - "iltifat": every Iltifat in Quran order (by Surah, then run, then cited
      Ayah), each with "id", "direction" (its Iltifat direction's slug:
      "he-to-we", "we-to-he", "he-to-you" or "you-to-he"), "surah",
      "ayahFrom" and "ayahTo" (its run), "citedAyah", "reason", "disputed"
      and "markedWords", its Marked Words (#143): each a Word "location" and
      its "side", "from" or "to", in reading order; the catalogue marks none,
      so the list is empty until an Admin marks them in the Iltifat editor;
    - "counts": each Iltifat direction, in the overview's order, with
      "direction", "counted" (its Iltifat that are not Disputed) and "disputed"
      (its Disputed Iltifat, counted apart).

  The run's Postgres holds the catalogue's 326 Iltifat after db:migrate
  (#138). Counts are typed from the issues; every other value is read from the
  committed catalogue (data/iltifat/quran_iltifat_person_shifts_2.json).

  # ---------------------------------------------------------------- AC-1: no Account, all 326, Quran order, every field

  @AC-1 @AC-5
  Scenario: With no Account, GET /api/v1/iltifat answers all 326 Iltifat in Quran order, each with every field
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer's status is 200
    And the answer lists 326 Iltifat
    And each Iltifat in the answer has an id, an Iltifat direction, a Surah, a run, a cited Ayah, a reason, a Disputed flag and Marked Words
    And no two Iltifat in the answer share an id
    And the Iltifat in the answer are in Quran order
    And the Iltifat in the answer are the catalogue's, each with its direction, Surah, run, cited Ayah, reason and Disputed flag
    And every Iltifat in the answer has no Marked Words, as the catalogue marks none

  # ---------------------------------------------------------------- AC-2: per-direction counts, Disputed apart

  @AC-2 @AC-5
  Scenario: The answer counts each Iltifat direction, with its Disputed Iltifat counted apart
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer counts these Iltifat by Iltifat direction, in this order:
      | direction | counted | disputed |
      | He → We   | 144     | 6        |
      | We → He   | 95      | 1        |
      | He → You  | 51      | 6        |
      | You → He  | 20      | 3        |
    And the answer's counts are those of the Iltifat it lists

  # ---------------------------------------------------------------- AC-3: Min-App-Version

  @AC-3 @AC-5
  Scenario: The answer to GET /api/v1/iltifat names the minimum app version the manifest names
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the answer names the minimum app version in its Min-App-Version header
    And that minimum app version is the one "/data/v1/manifest.json" names, "1.0.0"

  # ---------------------------------------------------------------- AC-4: the Iltifat cited at an Ayah, from the answer alone

  @AC-4 @AC-5
  Scenario Outline: From the answer alone, an app finds the Iltifat cited at <ayah>
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then the Iltifat the answer cites at <ayah> are <cited>

    Examples:
      | ayah  | cited                                                   |
      | 1:5   | He → You 1:2–5                                          |
      | 17:1  | He → We 17:1, We → He 17:1                              |
      | 10:22 | We → He 10:21–22, You → He 10:22, He → We 10:22         |
      | 1:2   | none                                                    |
      | 1:1   | none                                                    |

  @AC-4 @AC-5
  Scenario: From the answer alone, an app finds the Iltifat cited at every Ayah the catalogue cites
    When I GET "/api/v1/iltifat" with neither cookie nor token
    Then for every Ayah the catalogue cites, the Iltifat the answer cites there are the catalogue's entries cited there

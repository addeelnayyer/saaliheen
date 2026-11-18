@issue-199
Feature: Every Supplication and Speaker, read from /api/v1/supplications
  The Supplications page and, later, the mobile app read the Supplications
  through one public endpoint (#195, ADR 0027): GET /api/v1/supplications
  answers every Supplication and every Speaker at once, with no Account,
  through the shared JSON responder, so it carries Min-App-Version as every
  /api/v1 answer does. It is cached by tag, so the Supplication editor can
  refresh it.

  The answer is an object with two lists:
    - "supplications": every Supplication and every one of the Other words to
      Allah, in Quran order (by Surah, then first Ayah), each with "id",
      "surah", "ayahFrom" and "ayahTo" (its run), "speakerId", "openings" (a
      non-empty list of "rabbana", "rabbi" and "other"), "kind" and
      "version". Its kind is "supplication" for a Supplication; the Other words
      to Allah carry their label's slug: "plea-at-the-judgment",
      "request-for-this-world-only", "complaint", "mockery", "hypothetical" or
      "reported-words". It carries no Ayah text.
    - "speakers": every Speaker, each with "id" (a slug), "nameEn", "nameUr"
      and "includesProphet", its Prophet mark.

  The run's Postgres holds the curated file after db:migrate. Expected values
  are read from the raw list (data/quran_supplications_categorized.json) and
  the curated file built from it (data/supplications/supplications.json),
  never typed, apart from the runs, Speakers and labels #195 names.

  # ---------------------------------------------------------------- AC-9, AC-10: no Account, everything, Quran order

  @AC-9 @AC-10 @AC-17
  Scenario: With no Account, GET /api/v1/supplications answers every Supplication and Speaker of the curated file, in Quran order
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the answer's status is 200
    And each Supplication in the answer has an id, a Surah, a run, a Speaker id, Openings, a kind, a version and its spans
    And no two Supplications in the answer share an id
    And the Supplications in the answer are in Quran order
    And the Supplications in the answer are the curated file's, each with its Surah, run, Speaker, Openings and kind
    And each Speaker in the answer has an id, an English name, an Urdu name and a Prophet mark
    And the Speakers in the answer are the curated file's, each with its English name, Urdu name and Prophet mark
    And every Supplication in the answer is said by a Speaker in the answer

  @AC-9 @AC-17
  Scenario: The answer to GET /api/v1/supplications names the minimum app version the manifest names
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the answer names the minimum app version in its Min-App-Version header
    And that minimum app version is the one "/data/v1/manifest.json" names, "1.0.0"

  @AC-6 @AC-10 @AC-17
  Scenario: Every Supplication in the answer is at version 1, as the content migrations loaded it
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then every Supplication in the answer is at version 1

  # ---------------------------------------------------------------- AC-1, AC-2: every raw row, in exactly one

  @AC-1 @AC-2 @AC-17
  Scenario: Every row of the raw list lies inside exactly one Supplication or one of the Other words to Allah
    Given the curated file "data/supplications/supplications.json" is committed beside the raw list "data/quran_supplications_categorized.json"
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then every row of the raw list lies inside exactly one run in the answer
    And every Ayah of every run in the answer is a row of the raw list, but 14:39

  @AC-7 @AC-17
  Scenario: In the answer no Ayah is in two Supplications and no run crosses its Surah
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then no Ayah lies in two runs in the answer
    And every run in the answer names a Surah from 1 to 114, starts at Ayah 1 or later, ends at or before its Surah's last Ayah in the Surah metadata, and starts at or before it ends

  # ---------------------------------------------------------------- AC-3: grouping

  @AC-3 @AC-17
  Scenario: The runs in the answer are the raw list's runs of one speaker, with 28:16–17 split in two and 14:35–41 made one
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the runs in the answer are the raw list's runs of consecutive Ayahs with one speaker, except that:
      | raw runs           | become        |
      | 28:16–17           | 28:16, 28:17  |
      | 14:35–38, 14:40–41 | 14:35–41      |

  @AC-3 @AC-17
  Scenario Outline: <run> is one <kind> with the Openings <openings>
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the answer has one run at <run>, a <kind>, with the Openings <openings>

    Examples:
      | run       | kind         | openings      |
      | 2:127–129 | Supplication | as the raw list's rows give them |
      | 28:16     | Supplication | as the raw list's rows give them |
      | 28:17     | Supplication | as the raw list's rows give them |
      | 14:35–41  | Supplication | Rabbana, Rabbi |
      | 10:85–86  | Supplication | Rabbana       |

  @AC-3 @AC-17
  Scenario: Each run's Openings are the invocation forms of its raw rows, a continuation taking its run's
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then each run's Openings in the answer are the invocation forms of the raw rows inside it, leaving out "continuation"

  # ---------------------------------------------------------------- AC-4: kinds

  @AC-4 @AC-17
  Scenario: Each raw row's context type gives the kind of the run it lies in, as #195 maps them
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the run each raw row lies in has the kind its context type gives:
      | context type             | kind                        |
      | supplication             | Supplication                |
      | intercession             | Supplication                |
      | judgment_statement       | Plea at the Judgment        |
      | worldly_request          | Request for this world only |
      | complaint                | Complaint                   |
      | mocking_demand           | Mockery                     |
      | hypothetical_statement   | Hypothetical                |
      | reported_statement       | Reported words              |
      | non_invocative_reference | Reported words              |

  @AC-4 @AC-17
  Scenario Outline: <run> is <kind>
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the answer has one run at <run>, a <kind>, with the Openings as the raw list's rows give them

    Examples:
      | run        | kind                 |
      | 40:7–8     | Supplication         |
      | 23:106–107 | Plea at the Judgment |

  # ---------------------------------------------------------------- AC-5: Speakers

  @AC-5 @AC-10 @AC-17
  Scenario: The raw speakers become clean Speakers, one per person or group, named in English and Urdu
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then all the raw rows of each raw speaker lie in runs said by one Speaker
    And every Speaker in the answer says at least one run in the answer
    And there are no more Speakers in the answer than the raw list's 62 speakers
    And no Speaker's English name has a bracket in it, and no two Speakers share an English name
    And every Speaker's Urdu name is written in Urdu letters, and no two Speakers share an Urdu name

  @AC-5 @AC-10 @AC-17
  Scenario: Musa is one Speaker who includes a Prophet; the wife of Imran's Speaker does not
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the 24 raw rows of "Musa" lie in runs said by one Speaker, who includes a Prophet
    And the raw rows of "Wife of Imran (mother of Maryam)" lie in runs said by one Speaker, who does not include a Prophet

  @AC-5 @AC-10 @AC-17
  Scenario: Each raw speaker's Speaker is marked as including a Prophet as #195 lists them
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the Speaker of each of these raw speakers includes a Prophet:
      | raw speaker                                                                  |
      | Adam and his wife Hawwa                                                      |
      | Nuh                                                                          |
      | Ibrahim                                                                      |
      | Ibrahim and Ismail                                                           |
      | Ibrahim and the believers with him                                           |
      | Lut                                                                          |
      | Yusuf                                                                        |
      | Shuayb and the believers with him                                            |
      | Ayyub                                                                        |
      | Yunus (Dhu al-Nun)                                                           |
      | Musa                                                                         |
      | Musa and Harun                                                               |
      | Sulayman                                                                     |
      | Zakariya                                                                     |
      | Isa ibn Maryam                                                               |
      | Muhammad (commanded to say)                                                  |
      | The Messenger and the believers                                              |
      | Prophet sent to a denying community (name not stated in immediate passage)   |
    And the Speaker of every other raw speaker does not include a Prophet, leaving these, which a Scholar is asked about:
      | raw speaker                                         |
      | The Prophet and believers with him                  |
      | Believers who fought alongside prophets             |
      | Believer praying for parents (commanded invocation) |

  # ---------------------------------------------------------------- AC-11, AC-14: cached by tag

  @AC-11 @AC-17
  Scenario: The answer is kept in the cache: a change made in Neon since does not reach it
    Given I GET "/api/v1/supplications" with neither cookie nor token
    And the English name of the Speaker of the run at 28:16 has since been changed in the database to "A name an Admin wrote"
    When I GET "/api/v1/supplications" with neither cookie nor token
    Then the answer names the Speaker of the run at 28:16 as the curated file does

  @AC-11 @AC-14 @AC-17
  Scenario: The answer and the Supplications page are kept in the cache: a change made in Neon since reaches neither
    Given I GET "/api/v1/supplications" with neither cookie nor token
    And I fetch "/en/supplications"
    And the English name of the Speaker of the run at 28:16 has since been changed in the database to "A name an Admin wrote"
    When I GET "/api/v1/supplications" with neither cookie nor token
    And I fetch "/en/supplications" again
    Then the answer names the Speaker of the run at 28:16 as the curated file does
    And the page names the Speaker of the run at 28:16 as the curated file does, and not "A name an Admin wrote"

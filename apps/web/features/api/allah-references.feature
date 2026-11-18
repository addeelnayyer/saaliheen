@issue-150
Feature: A Surah's Allah references, read from /api/v1/allah-references/{surah}
  The way any client other than the website's own pages reads a Surah's Allah
  references (#137, ADR 0014): GET /api/v1/allah-references/{surah}, needing no
  Account, answers { surah, version, locations }, the Surah's number, the
  version its Allah references are at (its latest Allah reference revision's,
  0 before any) and their Word locations in Quran order (by Ayah, then Word).
  The mobile app keeps a Surah's Allah references and reads them again when
  the version moves, so an Admin's correction reaches it with no deploy and no
  app update. Every answer, an error too, goes through the /api/v1 respond
  helpers, so it carries Min-App-Version as every /api/v1 answer does.

  The run's Postgres (features/api/serve-api.ts) is arranged for each
  scenario: the Surahs these scenarios read are emptied of Allah references and
  revisions before and after each one, loaded through the seed the owner runs
  (`pnpm db:seed-allah-references`, version 1), and changed by Allah reference
  revisions written into the two tables as an Admin's publish writes them
  (allah-reference-publishing.feature drives the publish itself, #153): the
  Word locations changed and one revision moving
  the Surah one version on. The Word locations are taken from the owner's
  list (data/allah-references.json).

  # ---------------------------------------------------------------- AC-1: Word locations in Quran order, and the version

  @AC-1 @AC-6
  Scenario: A seeded Surah's Allah references are answered in Quran order, with the seed's version
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 2:255:1  |
      | 2:30:20  |
      | 2:10:5   |
      | 2:30:3   |
      | 2:9:2    |
      | 2:19:17  |
      | 2:7:2    |
      | 2:30:5   |
    When I GET "/api/v1/allah-references/2" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer holds exactly a surah, a version and its locations
    And the answer is for Surah 2, at version 1
    And the answer's Word locations are, in this order:
      | location |
      | 2:7:2    |
      | 2:9:2    |
      | 2:10:5   |
      | 2:19:17  |
      | 2:30:3   |
      | 2:30:5   |
      | 2:30:20  |
      | 2:255:1  |

  @AC-1 @AC-6
  Scenario: After an Admin's revision, a Surah's answer is at that revision's version
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 59:1:2   |
      | 59:1:9   |
      | 59:2:1   |
    And an Admin's Allah reference revision of Surah 59 has added 59:22:2 and removed 59:1:9
    When I GET "/api/v1/allah-references/59" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer is for Surah 59, at version 2
    And the answer's Word locations are, in this order:
      | location |
      | 59:1:2   |
      | 59:2:1   |
      | 59:22:2  |

  @AC-1 @AC-6
  Scenario: Every Surah from 1 to 114 answers its own number, a version, and Word locations of that Surah only, in Quran order
    When I GET the Allah references of every Surah from 1 to 114 with neither cookie nor token
    Then each answer is 200, holding exactly a surah, a version and its locations
    And each answer is for the Surah asked for, at a version that is a whole number of 0 or more
    And each answer's Word locations are Word locations of that Surah, in Quran order, none twice

  # ---------------------------------------------------------------- AC-2: no Allah references: an empty list and a version

  @AC-2 @AC-6
  Scenario: A Surah that has never held Allah references answers an empty list, at version 0
    Given Surah 108 holds no Allah references and no Allah reference revision
    When I GET "/api/v1/allah-references/108" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer holds exactly a surah, a version and its locations
    And the answer is for Surah 108, at version 0
    And the answer lists no Word locations

  @AC-2 @AC-5 @AC-6
  Scenario: A Surah whose every Allah reference an Admin's revision removed answers an empty list, at that revision's version
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 114:1:3  |
      | 114:2:1  |
      | 114:3:1  |
    And an Admin's Allah reference revision of Surah 114 has removed 114:1:3, 114:2:1 and 114:3:1
    When I GET "/api/v1/allah-references/114" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer is for Surah 114, at version 2
    And the answer lists no Word locations

  # ---------------------------------------------------------------- AC-3: not a Surah: the API's usual error

  @AC-3 @AC-6
  Scenario Outline: GET /api/v1/allah-references/<surah> is not a Surah, and gets the API's usual error
    When I GET "/api/v1/allah-references/<surah>" with neither cookie nor token
    Then the API answers 404 with a JSON error
    And the answer names the minimum app version in its Min-App-Version header

    Examples:
      # Below the first Surah, past the last, negative, not whole, not a
      # number at all, and a number with more after it.
      | surah |
      | 0     |
      | 115   |
      | -1    |
      | 1.5   |
      | abc   |
      | 2x    |

  # ---------------------------------------------------------------- AC-4: no Account needed

  @AC-4 @AC-6
  Scenario Outline: With <credential>, a Surah's Allah references are answered all the same
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 108:1:1  |
      | 108:2:2  |
    When I GET "/api/v1/allah-references/108" with <credential>
    Then the API answers 200 with JSON
    And the answer is for Surah 108, at version 1
    And the answer's Word locations are, in this order:
      | location |
      | 108:1:1  |
      | 108:2:2  |
    And the answer names the minimum app version in its Min-App-Version header
    And that minimum app version is the one "/data/v1/manifest.json" names, "1.0.0"

    Examples:
      | credential                      |
      | neither cookie nor token        |
      | a bearer token that is made up  |
      | a session cookie that is forged |

  # ---------------------------------------------------------------- AC-5: the version moves with the Surah's Allah references

  @AC-5 @AC-6
  Scenario: An Admin's revision adding an Allah reference moves the Surah's version, and the answer shows it at once
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 59:1:2   |
      | 59:2:1   |
    And I have read the Allah references of Surah 59 and noted the answer
    When an Admin's Allah reference revision of Surah 59 has added 59:23:2
    And I GET "/api/v1/allah-references/59" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer's version is not the one noted
    And the answer's Word locations are, in this order:
      | location |
      | 59:1:2   |
      | 59:2:1   |
      | 59:23:2  |

  @AC-5 @AC-6
  Scenario: An Admin's revision removing an Allah reference moves the Surah's version again, and the answer shows it at once
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 59:1:2   |
      | 59:2:1   |
    And an Admin's Allah reference revision of Surah 59 has added 59:23:2
    And I have read the Allah references of Surah 59 and noted the answer
    When an Admin's Allah reference revision of Surah 59 has removed 59:2:1
    And I GET "/api/v1/allah-references/59" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer's version is not the one noted
    And the answer's Word locations are, in this order:
      | location |
      | 59:1:2   |
      | 59:23:2  |

  @AC-5 @AC-6
  Scenario: A change to another Surah's Allah references leaves this Surah's answer as it was
    Given the seed has loaded a file of Allah references holding, in this order:
      | location |
      | 59:1:2   |
      | 59:2:1   |
      | 114:1:3  |
    And I have read the Allah references of Surah 59 and noted the answer
    When an Admin's Allah reference revision of Surah 114 has added 114:2:1
    And I GET "/api/v1/allah-references/59" with neither cookie nor token
    Then the API answers 200 with JSON
    And the answer is the one noted

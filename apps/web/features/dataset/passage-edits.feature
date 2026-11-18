Feature: Editing a Surah's Passages
  The Passages module owns the edit rules an Admin will edit Passages with
  (ADR 0006): retitle, split, join and move a start. Each edit gives the
  Surah's Passages after it and how the summary names it. An edit that
  would change nothing, or is impossible, gives no edit. No edit changes the
  Passages it was given. The publish check and the summary belong to
  the module too. These scenarios edit Al-Kahf (Surah 18, 110 Ayahs) as the
  Passages file has it.

  Background:
    Given Surah 18's Passages from the Passages file

  @AC-4
  Scenario: Retitling a Passage changes only its Passage titles
    When I retitle 89–91 with the Passage titles of 92–94
    Then the edit is named "retitle 89–91"
    And 89–91 has the Passage titles of 92–94
    And every other Passage is as the Passages file has it
    And the Passages given to the edit are unchanged

  @AC-4
  Scenario: Retitling a Passage in one Language is an edit
    When I retitle 89–91 with the English title of 92–94 and its own Urdu title
    Then the edit is named "retitle 89–91"
    And 89–91 has the English title of 92–94 and its own Urdu title

  @AC-4
  Scenario: Retitling a Passage with its own Passage titles is no edit
    When I retitle 89–91 with its own Passage titles
    Then there is no edit
    And the Passages given to the edit are unchanged

  @AC-4
  Scenario Outline: Splitting 83–88 at <at>
    When I split 83–88 at <at>
    Then the edit is named "split 83–88 at <at>"
    And <upper> has the Passage titles of 83–88
    And <lower> has no Passage titles
    And every other Passage is as the Passages file has it
    And the Passages still cover Surah 18's 110 Ayahs once each, in order
    And the Passages given to the edit are unchanged

    Examples:
      | at | upper | lower |
      | 86 | 83–85 | 86–88 |
      | 84 | 83    | 84–88 |
      | 88 | 83–87 | 88    |

  @AC-4
  Scenario: Joining a Passage into the one above
    When I join 92–94
    Then the edit is named "join 92–94 into 89–91"
    And 89–94 has the Passage titles of 89–91
    And every other Passage is as the Passages file has it
    And the Passages still cover Surah 18's 110 Ayahs once each, in order
    And the Passages given to the edit are unchanged

  @AC-4
  Scenario Outline: Moving the start of 95–98 to <to>
    When I move the start of 95–98 to <to>
    Then the edit is named "move start of 95–98 to <to>"
    And <above> has the Passage titles of 92–94
    And <moved> has the Passage titles of 95–98
    And every other Passage is as the Passages file has it
    And the Passages still cover Surah 18's 110 Ayahs once each, in order
    And the Passages given to the edit are unchanged

    Examples:
      | to | above | moved |
      | 96 | 92–95 | 96–98 |
      | 98 | 92–97 | 98    |
      | 93 | 92    | 93–98 |

  @AC-4
  Scenario Outline: An impossible edit is no edit: <edit>
    When I <edit>
    Then there is no edit
    And the Passages given to the edit are unchanged

    Examples:
      | edit                                 |
      | split 83–88 at 83                    |
      | split 83–88 at 89                    |
      | split 83–88 at 82                    |
      | split 84–88 at 86                    |
      | join 1–5                             |
      | move the start of 1–5 to 3           |
      | move the start of 95–98 to 92        |
      | move the start of 95–98 to 91        |
      | move the start of 95–98 to 99        |
      | move the start of 95–98 to 95        |

  @AC-4
  Scenario: Surah 18's Passages as the Passages file has them are publishable
    Then Surah 18's Passages are publishable

  @AC-4
  Scenario: A split leaves an untitled Passage, which blocks publishing until it has both Passage titles
    When I split 83–88 at 86
    Then Surah 18's Passages are not publishable
    When I retitle 86–88 with the English title of 89–91 and no Urdu title
    Then Surah 18's Passages are still not publishable
    When I retitle 86–88 with the Passage titles of 89–91
    Then Surah 18's Passages are publishable

  @AC-4
  Scenario Outline: Surah 18's Passages are not publishable with <problem>
    Given Surah 18's Passages with <problem>: <change>
    Then Surah 18's Passages are not publishable

    Examples:
      | problem                                | change                                  |
      | a missing English title                | 83–88 with no English title             |
      | a missing Urdu title                   | 83–88 with no Urdu title                |
      | a blank English title                  | 83–88 with an English title of spaces   |
      | a gap                                  | 83–88 ending at Ayah 87                 |
      | a gap before the first Passage         | 1–5 starting at Ayah 2                  |
      | an overlap                             | 89–91 starting at Ayah 88               |
      | a Passage running past the Surah's end | 109–110 ending at Ayah 111              |
      | a Passage ending short of the end      | 109–110 ending at Ayah 109              |

  @AC-4
  Scenario: The summary names the Surah and each edit, in order, and leaves out no-ops
    When I split 83–88 at 86
    And I retitle 89–91 with the Passage titles of 92–94
    And I retitle 89–91 with its own Passage titles
    And I join 92–94
    And I move the start of 95–98 to 96
    Then the summary is "Surah 18: split 83–88 at 86; retitle 89–91; join 92–94 into 89–91; move start of 95–98 to 96"

  @AC-4
  Scenario: The summary writes a one-Ayah Passage as its Ayah alone
    When I split 83–88 at 88
    And I join 88
    Then the summary is "Surah 18: split 83–88 at 88; join 88 into 83–87"

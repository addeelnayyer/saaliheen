@issue-69 @AC-7
Feature: Reading places on this device
  A browser keeps its ten most recent Reading places, one per Surah, newest
  first, and the Surah index offers to continue from each of them. Reading in a
  Surah moves that Surah's Reading place and brings it to the top, never
  listing a Surah twice; reading in an eleventh Surah drops the Reading place
  read longest ago. A look-up (a Word location or an Ayah in the URL) and a
  Share page are not reading: they leave the Reading places, and their order,
  as they were. A Reading place saved before there were Reading places carries
  over into the list. Reading places are shared across Languages.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: newest first

  @AC-1
  Scenario: Reading 18:1–40 then 2:255 lists Surah 2 at 2:255 above Surah 18 at 18:40
    Given I open "/ur/18"
    When I scroll until Ayah 18:40 is at the top of the screen
    And I open "/ur/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |
      | 18. Al-Kahf · Ayah 40    | /ur/18 |
    And I save a screenshot "AC-1-reading-places-light-desktop"

  @AC-1
  Scenario: Any Reading place on the Surah index can be continued, not only the newest
    Given I open "/ur/18"
    When I scroll until Ayah 18:40 is at the top of the screen
    And I open "/ur/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/ur"
    And I follow Continue reading at "18. Al-Kahf · Ayah 40"
    Then I am on "/ur/18" with nothing added to the URL
    And Ayah 18:40 is at the top of the screen
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 40    | /ur/18 |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |

  # ---------------------------------------------------------------- AC-2: returning to a Surah

  @AC-2
  Scenario: Returning to Surah 18 and reading to 18:60 moves its Reading place to 18:60 and to the top, without a duplicate
    Given I open "/ur/18"
    When I scroll until Ayah 18:40 is at the top of the screen
    And I open "/ur/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/ur/18"
    Then Ayah 18:40 is at the top of the screen
    When I scroll until Ayah 18:60 is at the top of the screen
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 60    | /ur/18 |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |

  @AC-2
  Scenario: Reading another Surah leaves the first Surah's Reading place where it was
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/18"
    Then Ayah 18:45 is at the top of the screen
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |
      | 19. Maryam · Ayah 1   | /ur/19 |

  # ---------------------------------------------------------------- AC-3: at most ten

  @AC-3
  Scenario: Reading in an eleventh Surah drops the oldest Reading place
    Given I open "/en/105"
    And I open "/en/106"
    And I open "/en/107"
    And I open "/en/108"
    And I open "/en/109"
    And I open "/en/110"
    And I open "/en/111"
    And I open "/en/112"
    And I open "/en/113"
    And I open "/en/114"
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                     | link    |
      | 114. An-Nas · Ayah 1      | /en/114 |
      | 113. Al-Falaq · Ayah 1    | /en/113 |
      | 112. Al-Ikhlas · Ayah 1   | /en/112 |
      | 111. Al-Masad · Ayah 1    | /en/111 |
      | 110. An-Nasr · Ayah 1     | /en/110 |
      | 109. Al-Kafirun · Ayah 1  | /en/109 |
      | 108. Al-Kawthar · Ayah 1  | /en/108 |
      | 107. Al-Ma'un · Ayah 1    | /en/107 |
      | 106. Quraysh · Ayah 1     | /en/106 |
      | 105. Al-Fil · Ayah 1      | /en/105 |
    When I open "/en/1"
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                     | link    |
      | 1. Al-Fatihah · Ayah 1    | /en/1   |
      | 114. An-Nas · Ayah 1      | /en/114 |
      | 113. Al-Falaq · Ayah 1    | /en/113 |
      | 112. Al-Ikhlas · Ayah 1   | /en/112 |
      | 111. Al-Masad · Ayah 1    | /en/111 |
      | 110. An-Nasr · Ayah 1     | /en/110 |
      | 109. Al-Kafirun · Ayah 1  | /en/109 |
      | 108. Al-Kawthar · Ayah 1  | /en/108 |
      | 107. Al-Ma'un · Ayah 1    | /en/107 |
      | 106. Quraysh · Ayah 1     | /en/106 |
    Given my system prefers a dark colour scheme
    When I view the page on a 390×844 phone
    And I reload the page
    Then I save a screenshot "AC-3-ten-reading-places-dark-phone"

  @AC-3
  Scenario: The Reading place dropped is the one read longest ago, not the one listed first
    Given I open "/en/105"
    And I open "/en/106"
    And I open "/en/107"
    And I open "/en/108"
    And I open "/en/109"
    And I open "/en/110"
    And I open "/en/111"
    And I open "/en/112"
    And I open "/en/113"
    And I open "/en/114"
    And I open "/en/105"
    When I open "/en/1"
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                     | link    |
      | 1. Al-Fatihah · Ayah 1    | /en/1   |
      | 105. Al-Fil · Ayah 1      | /en/105 |
      | 114. An-Nas · Ayah 1      | /en/114 |
      | 113. Al-Falaq · Ayah 1    | /en/113 |
      | 112. Al-Ikhlas · Ayah 1   | /en/112 |
      | 111. Al-Masad · Ayah 1    | /en/111 |
      | 110. An-Nasr · Ayah 1     | /en/110 |
      | 109. Al-Kafirun · Ayah 1  | /en/109 |
      | 108. Al-Kawthar · Ayah 1  | /en/108 |
      | 107. Al-Ma'un · Ayah 1    | /en/107 |

  # ---------------------------------------------------------------- AC-4: look-ups and Share pages

  @AC-4
  Scenario: A look-up leaves the Reading places, and their order, unchanged
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/18#18:10:3"
    Then the Word card at 18:10:3 is in the viewport
    When I open "/ur/2#2:30:1"
    Then the Word card at 2:30:1 is in the viewport
    When I scroll until Ayah 2:40 is at the top of the screen
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

  @AC-4
  Scenario: A Share page leaves the Reading places, and their order, unchanged
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open the Share page of 18:83–88 in Urdu and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and Urdu
    When I scroll to the bottom of the page
    And I open the Share page of 2:255 in Urdu and Uthmani
    Then the Share page shows 2:255 Ayah by Ayah in Uthmani and Urdu
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

  # ---------------------------------------------------------------- AC-5: the single Reading place carried over

  @AC-5
  Scenario: A Reading place this browser saved before Reading places is listed and can be continued
    Given this browser saved the single Reading place 18:45 before there were Reading places
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |
    When I follow Continue reading at "18. Al-Kahf · Ayah 45"
    Then I am on "/ur/18" with nothing added to the URL
    And Ayah 18:45 is at the top of the screen

  @AC-5
  Scenario: The carried-over Reading place stays in the list when the first page opened is another Surah
    Given this browser saved the single Reading place 18:45 before there were Reading places
    When I open "/ur/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |
      | 18. Al-Kahf · Ayah 45    | /ur/18 |
    When I open "/ur/18"
    Then Ayah 18:45 is at the top of the screen
    When I scroll until Ayah 18:50 is at the top of the screen
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 50    | /ur/18 |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |

  # ---------------------------------------------------------------- AC-6: across Languages

  @AC-6
  Scenario: Reading places read in Urdu and in English are one list in both Languages
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |
      | 18. Al-Kahf · Ayah 45    | /en/18 |
    When I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 2. Al-Baqarah · Ayah 255 | /ur/2  |
      | 18. Al-Kahf · Ayah 45    | /ur/18 |
    When I follow Continue reading at "18. Al-Kahf · Ayah 45"
    Then I am on "/ur/18" with nothing added to the URL
    And Ayah 18:45 is at the top of the screen

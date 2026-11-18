@issue-56
Feature: The Share page's edit strip
  Someone who arrives at a Share page from inside the app (an Ayah's or a
  Passage heading's share button, the site bar's "Share Ayahs" link, or "Share
  your own") gets the edit strip: a group named "Choose Ayahs to share" whose
  lists choose the Surah ("Surah"), the from Ayah ("From Ayah") and the to
  Ayah ("To Ayah"), and whose "Share layout" buttons choose Ayah by Ayah or
  Flowing. Each choice updates the page and its address at once, keeping the
  Language and the Script.

  Only allowed Shared Ayahs can be chosen (share-page-addresses.feature): Ayahs
  of one Surah, from ≤ to, at most 10 of them, except that a run that is
  exactly a Passage is always allowed. The To Ayah list offers only those; a
  From Ayah that would leave the run disallowed moves the run, never past
  those limits.

  The address a sharer sends is the page's address without anything after its
  path, on https://saaliheen.com. Whoever opens it, the sharer included, sees
  no edit strip.

  Expected Arabic, Ayah translations, Ayah counts and Passages are read from the
  committed sources and the Passages file, never typed.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-4: choosing in the edit strip

  @AC-4
  Scenario: The edit strip changes the to Ayah, the Share layout, the Surah and the from Ayah; the page and its address follow each choice
    Given I open "/en/2"
    When I tap the share button of Ayah 2:255
    Then I am on the Share page of 2:255 in English and Uthmani, with the edit strip
    And the edit strip shows Surah 2, from Ayah 255 to Ayah 255
    When in the edit strip I choose to Ayah 257
    Then I am on the Share page of 2:255–257 in English and Uthmani, with the edit strip
    And the Share page shows 2:255–257 Ayah by Ayah in Uthmani and English
    And the edit strip shows Surah 2, from Ayah 255 to Ayah 257
    And the edit strip shows Ayah by Ayah chosen
    When in the edit strip I choose the Flowing Share layout
    Then I am on the Share page of 2:255–257 in English and Uthmani, Flowing, with the edit strip
    And the Share page shows 2:255–257 Flowing in Uthmani and English
    And the edit strip shows Flowing chosen
    When in the edit strip I choose the Ayah by Ayah Share layout
    Then I am on the Share page of 2:255–257 in English and Uthmani, with the edit strip
    And the Share page shows 2:255–257 Ayah by Ayah in Uthmani and English
    When in the edit strip I choose Surah 112
    Then the edit strip, the address and the page agree on allowed Shared Ayahs of Surah 112
    When in the edit strip I choose to Ayah 4
    And in the edit strip I choose from Ayah 2
    Then I am on the Share page of 112:2–4 in English and Uthmani, with the edit strip
    And the Share page shows 112:2–4 Ayah by Ayah in Uthmani and English
    And the edit strip shows Surah 112, from Ayah 2 to Ayah 4

  @AC-4
  Scenario Outline: In <Language> with the <Script> Script, the edit strip keeps the Language and Script as it changes the Ayahs
    Given I open "/<lang>/18"
    When I choose the <Script> Script
    And I tap the share button of Ayah 18:83
    Then I am on the Share page of 18:83 in <Language> and <Script>, with the edit strip
    When in the edit strip I choose to Ayah 88
    Then I am on the Share page of 18:83–88 in <Language> and <Script>, with the edit strip
    And the Share page shows 18:83–88 Ayah by Ayah in <Script> and <Language>
    And I save a screenshot of the Share page "AC-4-edit-strip-<lang>-light-desktop"
    When I view the page on a 390×844 phone
    Then I save a screenshot of the Share page "AC-4-edit-strip-<lang>-light-phone"

    Examples:
      | Language | lang | Script   |
      | Urdu     | ur   | Indo-Pak |
      | English  | en   | Uthmani  |

  @AC-4
  Scenario: The edit strip offers every Surah
    Given I open "/en/2"
    When I tap the share button of Ayah 2:255
    Then the edit strip offers each of the 114 Surahs in order

  @AC-4
  Scenario Outline: From Ayah <ayah>, the edit strip offers to Ayahs <choices> only: <why>
    Given I open "/en/<surah>"
    When I tap the share button of Ayah <ayah>
    Then the edit strip shows Surah <surah>, from Ayah <from> to Ayah <from>
    And the edit strip offers to Ayahs "<choices>" and no others

    Examples:
      | surah | ayah  | from | choices          | why                                                     |
      | 2     | 2:255 | 255  | 255 to 264       | at most 10 Ayahs, none before the from Ayah             |
      | 1     | 1:5   | 5    | 5 to 7           | never past the Surah's last Ayah                        |
      | 20    | 20:24 | 24   | 24 to 33, and 36 | the Passage 20:24–36, of 13 Ayahs, begins at 20:24      |

  @AC-4
  Scenario Outline: Choosing from Ayah <from> with the run at 2:255–257 leaves allowed Shared Ayahs from Ayah <from>: <why>
    Given I open "/en/2"
    When I tap the share button of Ayah 2:255
    And in the edit strip I choose to Ayah 257
    Then I am on the Share page of 2:255–257 in English and Uthmani, with the edit strip
    When in the edit strip I choose from Ayah <from>
    Then the edit strip, the address and the page agree on allowed Shared Ayahs of Surah 2, from Ayah <from>

    Examples:
      | from | why                                    |
      | 250  | a run of 8 Ayahs                       |
      | 200  | 58 Ayahs would be more than 10         |
      | 260  | a from Ayah after the to Ayah          |

  # ---------------------------------------------------------------- AC-5: the address a sharer sends

  @AC-5
  Scenario Outline: A visitor opening the address of a Share page I made in <Language>, <layout>, sees no edit strip
    Given I open "/<lang>/18"
    When I tap the share button of Ayah 18:83
    And in the edit strip I choose to Ayah 88
    And in the edit strip I choose the <layout> Share layout
    Then I am on the Share page of 18:83–88 in <Language> and Uthmani, <layout>, with the edit strip
    When a visitor opens this Share page's address in a fresh browser
    Then the Share page shows 18:83–88 <layout> in Uthmani and <Language>
    And there is no edit strip
    And I save a screenshot of the Share page "AC-5-visitor-<lang>-<shot>-light-desktop"

    Examples:
      | Language | lang | layout       | shot         |
      | English  | en   | Flowing      | flowing      |
      | Urdu     | ur   | Ayah by Ayah | ayah-by-ayah |

  @AC-5
  Scenario: Opening the address of the Share page I made, in my own browser, shows no edit strip either
    Given I open "/en/2"
    When I tap the share button of Ayah 2:255
    And in the edit strip I choose to Ayah 257
    Then I am on the Share page of 2:255–257 in English and Uthmani, with the edit strip
    When I open this Share page's address again
    Then the Share page shows 2:255–257 Ayah by Ayah in Uthmani and English
    And there is no edit strip

  @AC-5
  Scenario Outline: A Share page opened from its address in <Language> has no edit strip, as served and once its scripts have run
    Given I open the Share page of <ayahs> in <Language> and Uthmani
    Then the Share page shows <ayahs> Ayah by Ayah in Uthmani and <Language>
    And there is no edit strip
    And the Share page as served holds no edit strip

    Examples:
      | ayahs    | Language |
      | 2:255    | English  |
      | 18:83–88 | Urdu     |

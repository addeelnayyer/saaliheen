@AC-8 @issue-56
Feature: Sharing Ayahs from the app
  Static text cannot be selected (ADR 0004), so sharing starts from a share
  button. Each Ayah's "Ayah N" heading is one, named "Share Ayah <surah>:<ayah>".
  Each Passage heading has one too, named "Share Passage <surah>:<from>–<to>"
  (or "Share Passage <surah>:<ayah>" for a one-Ayah Passage). The Surah bar's
  full form has a "Share Ayahs" link (the site bar's until #192), and a Share
  page has "Share your own" below its frame.

  None of them shares anything straight away any more (#19 did). Each opens
  the Share page (share-page.feature): for that Ayah, for exactly that
  Passage, or, from "Share Ayahs" and "Share your own", for 1:1–7. It is in the
  page's Language and the reader's current Script, and it has the edit strip,
  which is shown only to someone who arrived from inside the app
  (share-page-edit-strip.feature). Sending and copying happen there.

  The browser's share sheet and clipboard are stood in for, so a step can see
  that nothing was handed to them. Expected Arabic, Ayah translations and
  Passages are read from the committed sources and the Passages file.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: the Ayah share button

  @AC-1
  Scenario Outline: On /<lang>/1 each Ayah's heading is a share button with a share icon
    Given I open "/<lang>/1"
    Then each Al-Fatihah Ayah's "Ayah N" heading is a share button named "Share Ayah 1:N" with a share icon

    Examples:
      | lang |
      | ur   |
      | en   |

  @AC-1
  Scenario Outline: In <Language> with the <Script> Script, Ayah 2:255's share button opens its Share page with the edit strip, sharing nothing yet
    Given my browser has a native share sheet
    And I open "/<lang>/2"
    When I choose the <Script> Script
    And I tap the share button of Ayah 2:255
    Then I am on the Share page of 2:255 in <Language> and <Script>, with the edit strip
    And the Share page shows 2:255 Ayah by Ayah in <Script> and <Language>
    And the edit strip shows Surah 2, from Ayah 255 to Ayah 255
    And the share sheet did not open
    And nothing was copied to the clipboard
    And I save a screenshot of the Share page "AC-1-from-ayah-<lang>-<shot>-light-desktop"

    Examples:
      | Language | lang | Script   | shot    |
      | English  | en   | Uthmani  | uthmani |
      | English  | en   | Indo-Pak | indopak |
      | Urdu     | ur   | Uthmani  | uthmani |
      | Urdu     | ur   | Indo-Pak | indopak |

  @AC-1
  Scenario: Without a share sheet, the Ayah share button still only opens the Share page: nothing is copied
    Given my browser has no native share sheet
    And I open "/en/1"
    When I tap the share button of Ayah 1:5
    Then I am on the Share page of 1:5 in English and Uthmani, with the edit strip
    And the Share page shows 1:5 Ayah by Ayah in Uthmani and English
    And nothing was copied to the clipboard
    And no copy message is shown

  @AC-1 @issue-24
  Scenario: In a Surah opened in parts from the index, an Ayah that arrived later opens its Share page in the reader's Script
    Given my browser has no native share sheet
    And I open "/en"
    When I follow the index card of Surah 7
    Then every Ayah of Surah 7 is shown
    When I choose the Indo-Pak Script
    And I tap the share button of Ayah 7:206
    Then I am on the Share page of 7:206 in English and Indo-Pak, with the edit strip
    And the Share page shows 7:206 Ayah by Ayah in Indo-Pak and English
    And the edit strip shows Surah 7, from Ayah 206 to Ayah 206

  # ---------------------------------------------------------------- AC-2: the Passage heading share button

  @AC-2 @passage-headings-on
  Scenario Outline: On /<lang>/18 each Passage heading has a share button named for its Passage
    Given I open Surah 18 in <Language>
    Then each Passage heading of Surah 18 has a share button on it, named for its Passage in the run's database

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-2 @passage-headings-on
  Scenario Outline: In <Language> with the <Script> Script, the share button of the Passage 18:83–88 opens the Share page of exactly that Passage
    Given my browser has a native share sheet
    And I open Surah 18 in <Language>
    When I choose the <Script> Script
    And I tap the share button of the Passage 18:83–88
    Then I am on the Share page of 18:83–88 in <Language> and <Script>, with the edit strip
    And the Share page shows 18:83–88 Ayah by Ayah in <Script> and <Language>
    And the frame's head shows the Passage title of 18:83–88 in <Language>, above the first Shared Ayah
    And the edit strip shows Surah 18, from Ayah 83 to Ayah 88
    And the share sheet did not open
    And nothing was copied to the clipboard
    And I save a screenshot of the Share page "AC-2-from-passage-<lang>-light-desktop"

    Examples:
      | Language | lang | Script   |
      | Urdu     | ur   | Indo-Pak |
      | English  | en   | Uthmani  |

  @AC-2 @passage-headings-on
  Scenario: The share button of a Passage longer than 10 Ayahs opens the Share page of the whole Passage
    Given 20:24–36 is a Passage of 13 Ayahs in the Passages file
    And I open Surah 20 in English
    When I tap the share button of the Passage 20:24–36
    Then I am on the Share page of 20:24–36 in English and Uthmani, with the edit strip
    And the Share page shows 20:24–36 Ayah by Ayah in Uthmani and English
    And the edit strip shows Surah 20, from Ayah 24 to Ayah 36

  @AC-2 @passage-headings-off
  Scenario: With Passage headings held back, there is no Passage share button
    Given I open Surah 18 in English
    Then there is no Passage share button

  # ---------------------------------------------------------------- AC-3: "Share Ayahs" and "Share your own"

  @AC-3
  Scenario Outline: On <page>, the Surah bar's "Share Ayahs" link opens the Share page on 1:1–7 in <Language>, with the edit strip
    Given my browser has a native share sheet
    And I open "<address>"
    When I follow the Surah bar's "Share Ayahs" link
    Then I am on the Share page of 1:1–7 in <Language> and Uthmani, with the edit strip
    And the Share page shows 1:1–7 Ayah by Ayah in Uthmani and <Language>
    And the edit strip shows Surah 1, from Ayah 1 to Ayah 7
    And the share sheet did not open
    And nothing was copied to the clipboard

    Examples:
      | page      | address | Language |
      | Surah 1   | /ur/1   | Urdu     |
      | Surah 18  | /en/18  | English  |

  @AC-3
  Scenario Outline: "Share your own" below a visited Share page in <Language> opens the Share page on 1:1–7 with the edit strip
    Given I open the Share page of 18:83–88 in <Language> and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and <Language>
    And there is no edit strip
    When I follow "Share your own" below the frame
    Then I am on the Share page of 1:1–7 in <Language> and Uthmani, with the edit strip
    And the Share page shows 1:1–7 Ayah by Ayah in Uthmani and <Language>
    And the edit strip shows Surah 1, from Ayah 1 to Ayah 7

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- the Reading place

  Scenario: A link to an Ayah in Quran Analysis, as a Share page's colophon gives, is a look-up that leaves the Reading place where it was
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/2#2:255"
    Then Ayah 2:255 is at the top of the screen
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

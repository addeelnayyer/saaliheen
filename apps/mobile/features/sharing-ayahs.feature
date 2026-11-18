@issue-76
Feature: Sharing Ayahs from the app
  A reader shares Ayahs from the app the way the website's Share flow does
  (#55, #56). An Ayah's share button, a Passage heading's share button and the
  Surah bar's "Share Ayahs" (on 1:1–7, as on the website) each open a Share
  page in the app, in the reader's Language and Script, with the edit strip:
  its lists choose the Surah, the from Ayah and the to Ayah, offering only
  allowed Shared Ayahs (Ayahs of one Surah, from ≤ to, at most 10 of them,
  except that a run that is exactly a Passage is always allowed), and for a
  run its Share layouts choose Ayah by Ayah or Flowing. "Share" hands the
  phone's share sheet the reference and the Share page's link on
  https://saaliheen.com, a blank line between, as the website's Share does.

  A Share page link opens the same Share page in the app, with no edit strip,
  in the Language, Script and Share layout the link names: on
  https://saaliheen.com, which the app claims as its own on iOS and Android,
  and under the app's own saaliheen:// scheme. Opening a Share page is not
  reading, so it leaves the Reading places as they were.

  The share sheet is stood in for, so a step sees what it was handed. Expected
  Arabic, Ayah translations, Surah names, Ayah counts and Passages are read
  from the committed dataset and the Passage load, never typed. How the Share
  page looks and answers touch is checked by hand on a simulator.

  Background:
    Given the app is launched on a new device, with Passage headings on

  # ---------------------------------------------------------------- AC-1: picking Shared Ayahs and sharing a Share page link

  @AC-1
  Scenario Outline: In <Language> with the <Script> Script, Ayah 2:255's share button opens its Share page with the edit strip, and Share hands over its link
    Given the reader reads in <Language> with the <Script> Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    Then the Share page of 2:255 is open in <Language> and <Script>, with the edit strip
    And the Share page shows 2:255 in <Script> and <Language>
    And the Share page shows the Passage title of 2:255 in <Language>
    And the edit strip shows Surah 2, from Ayah 255 to Ayah 255, with no Share layout to choose
    When I tap Share and send it
    Then the share sheet was handed "Al-Baqarah 2:255" and the link "https://saaliheen.com/<lang>/share/2/255/<script>", a blank line between

    Examples:
      | Language | lang | Script   | script  |
      | English  | en   | Uthmani  | uthmani |
      | English  | en   | Indo-Pak | indopak |
      | Urdu     | ur   | Uthmani  | uthmani |
      | Urdu     | ur   | Indo-Pak | indopak |

  @AC-1
  Scenario: On the edit strip I pick 2:255–257 set out Flowing, and Share hands over that Share page's link
    Given the reader reads in English with the Uthmani Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    And on the edit strip I choose to Ayah 257
    Then the Share page of 2:255–257 is open in English and Uthmani, Ayah by Ayah, with the edit strip
    And the Share page shows 2:255–257 in Uthmani and English
    And the Share page shows no Passage title
    And the edit strip offers the Share layouts Ayah by Ayah and Flowing
    When on the edit strip I choose the Flowing Share layout
    Then the Share page of 2:255–257 is open in English and Uthmani, Flowing, with the edit strip
    When I tap Share and send it
    Then the share sheet was handed "Al-Baqarah 2:255–257" and the link "https://saaliheen.com/en/share/2/255-257/uthmani/flowing", a blank line between

  @AC-1
  Scenario Outline: In <Language> with the <Script> Script, the share button of the Passage 18:83–88 opens the Share page of exactly that Passage
    Given the reader reads in <Language> with the <Script> Script
    When I open Surah 18 from the Surah index
    And I tap the share button of the Passage heading 18:83–88
    Then the Share page of 18:83–88 is open in <Language> and <Script>, Ayah by Ayah, with the edit strip
    And the Share page shows 18:83–88 in <Script> and <Language>
    And the Share page shows the Passage title of 18:83–88 in <Language>
    And the edit strip shows Surah 18, from Ayah 83 to Ayah 88
    When I tap Share and send it
    Then the share sheet was handed "Al-Kahf 18:83–88" and the link "https://saaliheen.com/<lang>/share/18/83-88/<script>", a blank line between

    Examples:
      | Language | lang | Script   | script  |
      | Urdu     | ur   | Indo-Pak | indopak |
      | English  | en   | Uthmani  | uthmani |

  @AC-1
  Scenario: The share button of a Passage longer than 10 Ayahs opens the Share page of the whole Passage
    Given 20:24–36 is a Passage of 13 Ayahs in the Passage load
    And the reader reads in English with the Uthmani Script
    When I open Surah 20 from the Surah index
    And I tap the share button of the Passage heading 20:24–36
    Then the Share page of 20:24–36 is open in English and Uthmani, Ayah by Ayah, with the edit strip
    And the Share page shows 20:24–36 in Uthmani and English

  @AC-1
  Scenario Outline: In <Language>, the Surah bar's "Share Ayahs" opens the Share page on 1:1–7 with the edit strip
    Given the reader reads in <Language> with the Uthmani Script
    When I open Surah 18 from the Surah index
    And I tap the Surah bar's "Share Ayahs"
    Then the Share page of 1:1–7 is open in <Language> and Uthmani, Ayah by Ayah, with the edit strip
    And the Share page shows 1:1–7 in Uthmani and <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-1
  Scenario: The edit strip offers every Surah
    Given the reader reads in English with the Uthmani Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    Then the edit strip offers each of the 114 Surahs in order, and every Ayah of Surah 2 as the from Ayah

  @AC-1
  Scenario Outline: From Ayah <ayah>, the edit strip offers to Ayahs <choices> only
    # 2:255: at most 10 Ayahs, none before the from Ayah. 1:5: never past the
    # Surah's last Ayah. 20:24: the Passage 20:24–36, of 13 Ayahs, begins there.
    Given the reader reads in English with the Uthmani Script
    When I open Surah <surah> from the Surah index
    And I tap the share button of Ayah <ayah>
    Then the edit strip shows Surah <surah>, from Ayah <from> to Ayah <to>, with no Share layout to choose
    And the edit strip offers to Ayahs "<choices>" and no others

    Examples:
      | surah | ayah  | from | to  | choices          |
      | 2     | 2:255 | 255  | 255 | 255 to 264       |
      | 1     | 1:5   | 5    | 5   | 5 to 7           |
      | 20    | 20:24 | 24   | 24  | 24 to 33, and 36 |

  @AC-1
  Scenario Outline: Choosing from Ayah <from> with the run at 2:255–257 moves the run to 2:<from>–<to>
    # 250: a run of 8 Ayahs keeps its to Ayah. 200: 58 Ayahs would be more
    # than 10, so it ends at 209. 260: a from Ayah after the to Ayah takes the
    # to Ayah with it.
    Given the reader reads in English with the Uthmani Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    And on the edit strip I choose to Ayah 257
    And on the edit strip I choose from Ayah <from>
    Then the edit strip shows Surah 2, from Ayah <from> to Ayah <to>
    And the Share page shows 2:<from>–<to> in Uthmani and English

    Examples:
      | from | to  |
      | 250  | 257 |
      | 200  | 209 |
      | 260  | 260 |

  @AC-1
  Scenario: Choosing another Surah on the edit strip opens its first Ayah, keeping the Language and Script
    Given the reader reads in Urdu with the Indo-Pak Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    And on the edit strip I choose Surah 112
    Then the Share page of 112:1 is open in Urdu and Indo-Pak, with the edit strip
    And the Share page shows 112:1 in Indo-Pak and Urdu
    When on the edit strip I choose to Ayah 4
    And on the edit strip I choose from Ayah 2
    Then the Share page of 112:2–4 is open in Urdu and Indo-Pak, Ayah by Ayah, with the edit strip
    And the Share page shows 112:2–4 in Indo-Pak and Urdu

  @AC-1
  Scenario: Dismissing the share sheet sends nothing and leaves the Share page as it was
    Given the reader reads in English with the Uthmani Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    And I tap Share and dismiss the share sheet
    Then the share sheet was handed "Al-Baqarah 2:255" and the link "https://saaliheen.com/en/share/2/255/uthmani", a blank line between
    And the Share page of 2:255 is open in English and Uthmani, with the edit strip

  # ---------------------------------------------------------------- AC-2: a Share page link opens in the app

  @AC-2
  Scenario Outline: The link <link> opens the Share page of <shared> in <Language> and <Script>, <layout>, with no edit strip
    Given the reader reads in <reader's Language> with the <reader's Script> Script
    When I open the link "<link>" on the phone
    Then the Share page of <shared> is open in <Language> and <Script>, <layout>, with no edit strip
    And the Share page shows <shared> in <Script> and <Language>

    Examples:
      | link                                                       | shared   | Language | Script   | layout      | reader's Language | reader's Script |
      | https://saaliheen.com/en/share/2/255-257/uthmani           | 2:255–257 | English  | Uthmani  | Ayah by Ayah | Urdu              | Indo-Pak        |
      | saaliheen://en/share/2/255-257/uthmani                     | 2:255–257 | English  | Uthmani  | Ayah by Ayah | Urdu              | Indo-Pak        |
      | https://saaliheen.com/ur/share/18/83-88/indopak/flowing    | 18:83–88 | Urdu     | Indo-Pak | Flowing     | English           | Uthmani         |
      | saaliheen://ur/share/18/83-88/indopak/flowing              | 18:83–88 | Urdu     | Indo-Pak | Flowing     | English           | Uthmani         |
      | https://saaliheen.com/en/share/20/24-36/indopak            | 20:24–36 | English  | Indo-Pak | Ayah by Ayah | Urdu              | Uthmani         |

  @AC-2
  Scenario Outline: The single-Ayah link <link> opens the Share page of 2:255 in <Language> with its Passage title and no edit strip
    When I open the link "<link>" on the phone
    Then the Share page of 2:255 is open in <Language> and Uthmani, with no edit strip
    And the Share page shows 2:255 in Uthmani and <Language>
    And the Share page shows the Passage title of 2:255 in <Language>

    Examples:
      | link                                         | Language |
      | https://saaliheen.com/ur/share/2/255/uthmani | Urdu     |
      | saaliheen://en/share/2/255/uthmani           | English  |

  @AC-2
  Scenario: The link I shared opens, on another phone with the app, the Share page I made, with no edit strip
    Given the reader reads in English with the Uthmani Script
    When I open Surah 2 from the Surah index
    And I tap the share button of Ayah 2:255
    And on the edit strip I choose to Ayah 257
    And on the edit strip I choose the Flowing Share layout
    And I tap Share and send it
    And the app is launched on a second, new device
    And I open the link the share sheet was handed on that phone
    Then the Share page of 2:255–257 is open in English and Uthmani, Flowing, with no edit strip
    And the Share page shows 2:255–257 in Uthmani and English

  @AC-2
  Scenario: Links that name no Share page, or Ayahs that may not be shared, open no Share page
    Given 2:1–11 is not a Passage in the Passage load
    Then each of these links opens no Share page in the app:
      | link                                            | why                                   |
      | https://saaliheen.com/en/share/2/1-11/uthmani   | 11 Ayahs and not exactly a Passage    |
      | https://saaliheen.com/en/share/1/7-8/uthmani    | runs across from Surah 1 into Surah 2 |
      | saaliheen://en/share/1/8/uthmani                | a missing Ayah                        |
      | https://saaliheen.com/en/share/115/1/uthmani    | a missing Surah                       |
      | https://saaliheen.com/en/share/18/88-83/uthmani | from > to                             |
      | https://saaliheen.com/fr/share/1/1-7/uthmani    | no known Language                     |
      | https://saaliheen.com/en/share/1/1-7/naskh      | no known Script                       |
      | https://saaliheen.com/en/share/1/1-7/uthmani/poster | no known Share layout             |
      | https://saaliheen.com/en/share/1/1-7            | no Script                             |
      | https://saaliheen.com/en/2                      | a Surah page, not a Share page        |
      | https://example.com/en/share/2/255/uthmani      | not Saaliheen's site                  |

  @AC-2
  Scenario: The app as built claims Share page links on saaliheen.com, on iOS and Android, and keeps its saaliheen:// scheme
    Then the app's config keeps the scheme "saaliheen"
    And the app's config names the iOS associated domain "applinks:saaliheen.com"
    And the app's config has an Android intent filter, verified automatically, that opens https links on saaliheen.com
    And that intent filter opens these addresses on saaliheen.com in the app, and no others of them:
      | address                               | claimed |
      | /en/share/2/255/uthmani               | yes     |
      | /ur/share/18/83-88/indopak/flowing    | yes     |
      | /en/share/2/255-257/uthmani           | yes     |
      | /en/2                                 | no      |
      | /ur                                   | no      |
      | /en/themes                            | no      |
      | /data/v1/surahs.json                  | no      |

  # ---------------------------------------------------------------- AC-3: Reading places

  @AC-3
  Scenario: Picking and sharing Ayahs from Surah 2 leaves the Reading places as they were
    Given the reader reads in English with the Uthmani Script
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:250 is at the top of the screen
    And what the app keeps in this device's storage is noted
    And I tap the share button of Ayah 2:255
    And on the edit strip I choose to Ayah 257
    And on the edit strip I choose the Flowing Share layout
    And on the edit strip I choose Surah 112
    And I tap Share and send it
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 250  |
      | 18    | 40   |
    And what the app keeps in this device's storage is as it was noted

  @AC-3
  Scenario Outline: Opening <how> leaves the Reading places as they were
    Given the reader reads in English with the Uthmani Script
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:250 is at the top of the screen
    And what the app keeps in this device's storage is noted
    And I open <how>
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 250  |
      | 18    | 40   |
    And what the app keeps in this device's storage is as it was noted

    Examples:
      | how                                                                  |
      | the link "https://saaliheen.com/en/share/18/83-88/uthmani" on the phone |
      | the link "saaliheen://ur/share/2/255/indopak" on the phone             |
      | the link "https://saaliheen.com/en/share/112/1-4/uthmani" on the phone  |
      | the Share page from the Surah bar's "Share Ayahs"                    |
      | the Share page from the share button of the Passage heading 2:1–5   |

  # ---------------------------------------------------------------- AC-4: the edit strip as it opens on a phone

  @AC-4
  Scenario Outline: On a phone whose edit strip rows are <row> points wide, the share button of Ayah <ayah> opens each row with its chosen chip wholly in view
    # How the strip looks is checked by hand; this checks where each row opens
    # scrolled to. 1:1: the first chips, at the rows' start. 2:255: the 255th
    # of 286 from Ayahs, far along. 2:286: the last chips, at the rows' end.
    Given the reader reads in English with the Uthmani Script
    When I open Surah <surah> from the Surah index
    And I tap the share button of Ayah <ayah>
    Then on a phone whose edit strip rows are <row> points wide, the Surah, from Ayah and to Ayah rows each open with the chosen chip wholly in view

    Examples:
      | surah | ayah    | row |
      | 1     | 1:1     | 361 |
      | 2     | 2:255   | 361 |
      | 2     | 2:286   | 361 |
      | 114   | 114:6   | 361 |
      | 2     | 2:255   | 288 |
      | 2     | 2:255   | 992 |

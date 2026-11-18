@issue-192
Feature: Read, Explore and Me
  The app's root is three tabs, Read, Explore and Me, with the same entries
  and words as the website, in the same order (the issue's navigation
  prototype, phone layout). Read is the Surah index and the tab the app opens
  on. Explore lists every way into the Quran besides reading in order, each
  with one line in the reader's Language and no count: Themes, Iltifat,
  since #199 Supplications, and since #81 Quran Chat, which the app has a
  screen of its own for (features/quran-chat.feature). Me holds Sign in, this device's
  Reading places, Known words (#253), the Language (moved out of the settings sheet), the other
  settings, then Credits, Privacy and Terms. An entry the app has no screen of
  its own for opens the website's page in the reader's Language. A Surah
  screen's tab bar gets out of the way while reading down, comes back on
  scrolling up, and stays away while the Recitation bar is on screen. How the
  tabs and screens look, in both colour themes, with VoiceOver and with
  reduced motion, is checked by hand on a simulator.

  Background:
    Given the app is launched on a new device

  @AC-10 @AC-12
  Scenario: The app opens on Read, with Read, Explore and Me as tabs
    Then the tab bar shows, in order:
      | tab     |
      | Read    |
      | Explore |
      | Me      |
    And the app opens on the Read tab

  @issue-192 @AC-10
  Scenario: Each tab carries the website's icon over its word
    Then each tab shows its icon over its word:
      | tab     | icon      |
      | Read    | open-book |
      | Explore | compass   |
      | Me      | person    |
    And each tab's icon is drawn from the same path as the website's

  @AC-10 @AC-12 @issue-199 @AC-15 @issue-81
  Scenario Outline: Explore lists Themes, Iltifat, Supplications, then Quran Chat, each with its line in <Language>
    Given the Language is <Language>
    When I open the Explore tab
    Then its title is "Explore"
    And it shows four ways of exploring, Themes, Iltifat, Supplications, then Quran Chat
    And Themes' line is "<themes>"
    And Iltifat's line is "<iltifat>"
    And Supplications' line is "<supplications>"
    And Quran Chat's line is "<quranChat>"
    And each but Quran Chat opens its page on the website under "/<lang>/"
    And Quran Chat opens the app's own Quran Chat screen

    Examples:
      | Language | lang | themes                                                          | iltifat                                                                  | supplications                                                         | quranChat                                                        |
      | English  | en   | What the Quran speaks of, by subject, with every Ayah on each. | Sudden turns between I, We, You and He that still mean the same person. | What people in the Quran ask of Allah, in order, with who says each. | Ask about the Quran, answered from its translations and Tafsir. |
      | Urdu     | ur   | قرآن کن موضوعات پر بات کرتا ہے، ہر موضوع کی تمام آیات کے ساتھ۔ | میں، ہم، تم اور وہ کے درمیان اچانک موڑ، جن سے مراد وہی ہستی رہتی ہے۔      | قرآن میں لوگ اللہ سے کیا مانگتے ہیں، ترتیب سے، اور ہر دعا کون کرتا ہے۔ | قرآن کے بارے میں پوچھیے، جواب اس کے تراجم اور تفسیر سے۔          |

  @AC-10 @AC-12
  Scenario: Me holds Sign in, Reading places, Known words, Language, the settings, then Credits, Privacy and Terms
    When I open the Me tab
    Then its title is "Me"
    And it shows these entries, in order:
      | entry                  |
      | Sign in                |
      | Reading places         |
      | Known words            |
      | Language               |
      | Arabic script          |
      | Ayah translation       |
      | Allah reference colour |
      | Known words colour     |
      | Hide Word meanings     |
      | Arabic size            |
      | Meaning size           |
      | Section marks          |
      | Credits                |
      | Privacy                |
      | Terms                  |

  @AC-10 @AC-12
  Scenario Outline: Me's website entries open the website in <Language>
    Given the Language is <Language>
    When I open the Me tab
    Then Credits opens the website's "/<lang>/credits"
    And Privacy opens the website's Privacy and Terms opens the website's Terms, both in <Language>

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  @AC-10 @AC-12
  Scenario: Me lists this device's Reading places, newest first, each opening its Surah at that Ayah
    Given I read Surah 18 to Ayah 45 and then Surah 2 to Ayah 255
    When I open the Me tab
    Then its Reading places are "2. Al-Baqarah · Ayah 255" then "18. Al-Kahf · Ayah 45"
    And the first opens Surah 2 at Ayah 255 and the second Surah 18 at Ayah 45

  @AC-10 @AC-12
  Scenario: The Language is chosen in Me, and kept after the app is closed and opened again
    When I open the Me tab
    Then its Language offers "English" and "اردو", with "اردو" chosen
    When I choose "English" in Me's Language
    And I close the app and open it again on the same device
    And I open the Me tab again
    Then its Language offers "English" and "اردو", with "English" chosen

  @AC-12
  Scenario: A Surah screen's tab bar hides while reading down and comes back on scrolling up
    Given I open Surah 2
    Then the tab bar shows as the Surah opens
    When I scroll down to 40 points
    Then the tab bar still shows
    When I scroll down to 600 points
    Then the tab bar is hidden
    When I scroll down to 1200 points
    Then the tab bar stays hidden
    When I scroll up to 1100 points
    Then the tab bar shows again

  @AC-12
  Scenario: A Surah screen's tab bar never shows with the Recitation bar
    Given I open Surah 2
    And I scroll down to 600 points
    When I press play with Ayah 1 at the top of the screen
    Then the Recitation bar is on screen
    When I scroll up to 300 points
    Then the tab bar is hidden
    When I scroll up to 0 points
    Then the tab bar stays hidden
    When I press Stop on the Recitation bar
    And I scroll down to 20 points
    And I scroll up to 0 points
    Then the tab bar shows

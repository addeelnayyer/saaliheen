Feature: Credits in each Language
  Each Language has a credits page, in English like the rest of the interface,
  naming where the text and meanings come from: QUL/Tarteel, KFGQPC, Digital
  Khatt and the translators, Jalandhari and Saheeh International, and the Urdu
  typeface, Dubai, from the Dubai Executive Council (#339). Me links to it
  (#192; the Surah index did until then).

  @AC-3-7
  Scenario Outline: The <Language> credits page names QUL/Tarteel, KFGQPC, Digital Khatt, the translators and the Urdu typeface
    Given I open the credits page in <Language>
    Then the page is found
    And the page's lang is "en" and its dir is "ltr"
    And the page names each of these sources:
      | QUL                     |
      | Tarteel                 |
      | KFGQPC                  |
      | Digital Khatt           |
      | Urdu typeface (Dubai)   |
      | Dubai Executive Council |
      | Jalandhari              |
      | Saheeh International    |
    And no interface text on the page is written in Urdu or Arabic letters
    And the page is captured as the evidence screen "AC-3-7-credits-<lang>-light-desktop"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-3-7 @AC-3-8
  Scenario: Me in Urdu links to the Urdu credits page
    Given I open Me in Urdu
    Then a link to the credits page is visible
    And the credits link reads "Credits"
    When I follow the credits link
    Then I am on the credits page in Urdu
    And the page names "KFGQPC"

  @AC-3-7 @AC-3-8
  Scenario: Me in English links to the English credits page
    Given I open Me in English
    Then a link to the credits page is visible
    And the credits link reads "Credits"
    When I follow the credits link
    Then I am on the credits page in English
    And the page names "KFGQPC"

  @issue-275 @AC-5
  Scenario: The credits name the Quranic Arabic Corpus with its copyright notice, and link to corpus.quran.com
    Given I open the credits page in English
    Then the page names each of these sources:
      | Quranic Arabic Corpus      |
      | mustafa0x/quran-morphology |
      | GNU General Public License |
    And the page gives the copyright notice the Word grammar source carries: the Corpus's name and version, its copyright and its licence
    And the page links to "https://corpus.quran.com"

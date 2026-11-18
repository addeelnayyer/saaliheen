Feature: Root dialog
  As on the website, tapping a Word card's Root tag opens the Root dialog: the
  Root's letters, its transliteration and its counts, then its Lemmas, most
  frequent first, each with its count and representative meaning in the
  Language, and each Lemma's Spellings, most frequent first, in the chosen
  Script only, with their meanings in the Language and their Word locations in
  Quran order. It opens on the tapped Word (#323): that Word's Lemma, or the
  row of Words with no Lemma, is marked and open at first, in its usual place,
  with the Word's Spelling and Word location marked within it. The dialog is
  read from /data/v1/roots/<id>.json; expected values are read from the
  committed Root file it publishes.

  Background:
    Given the app is launched on a new device

  @AC-3 @AC-6 @AC-9
  Scenario Outline: The Root dialog for ر ح م in <Language> with the <Script> Script
    Given I open Surah 1 in the <Script> Script and <Language>
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And its header shows "ر ح م", "r-ḥ-m", 339 occurrences and 47 unique Words
    And it lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in <Language>
    And each Lemma lists its Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and its Word locations in Quran order
    And it shows 84 Spellings and 339 Word locations in all

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

  @AC-3 @AC-6
  Scenario: Each Root tag of Surah 1 opens the Root dialog of the Root it names
    Given I open Surah 1 in the Uthmani Script and English
    When I open the Root tag on every Word card of Surah 1 that has one
    Then each opens the Root dialog for that Root tag's letters, as its /data/v1 Root file gives them

  @issue-323
  Scenario Outline: The Root dialog opens on the tapped Word's Lemma, <Word> in the <Script> Script
    Given I open Surah 1 in the <Script> Script and English
    When I open the Root tag on the Word card at <Word>
    Then the Root dialog for "ر ح م" is open
    And it marks the Lemma "<Lemma>", the Spelling that holds <Word>, and the Word location <Word>
    And the Lemma "<Lemma>" is the one open at first, and every other Lemma starts closed
    And ر ح م's Lemmas are in the order its /data/v1 Root file gives them

    Examples:
      | Word  | Lemma  | Script   |
      | 1:1:3 | رَّحْمَٰن | Uthmani  |
      | 1:1:3 | رَّحْمَٰن | Indo-Pak |
      | 1:1:4 | رَّحِيم  | Uthmani  |

  @issue-323
  Scenario: A Word with no Lemma marks the row of Words with no Lemma
    Given I open Surah 24 in the Uthmani Script and English
    When I open the Root tag on the Word card at 24:33:30
    Then the Root dialog for "ف ت ي" is open
    And it marks the row of Words with no Lemma, the Spelling that holds 24:33:30, and the Word location 24:33:30
    And the row of Words with no Lemma is the one open at first, and every other Lemma starts closed

  @issue-323
  Scenario: With no Word, the Root dialog marks nothing
    Given I open Surah 1 in the Uthmani Script and English
    When I open the Root dialog of the Root tag on the Word card at 1:1:3 without naming its Word
    Then the Root dialog for "ر ح م" is open
    And it marks nothing, and every Lemma starts closed

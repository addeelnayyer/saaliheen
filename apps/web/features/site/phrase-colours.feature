@issue-99
Feature: Phrase colours in Quran Analysis
  Readers of Quran Analysis see where to start and stop reciting: in every
  covered Passage, the Word cards take two soft tints, the Phrase colours,
  that alternate Phrase by Phrase (ADR 0009). Each Passage starts on tint
  A, and a Phrase that runs past an Ayah's end keeps its tint across it. A
  Passage is covered when every one of its Words is in a Phrase; a Passage
  that is not covered shows no tints. The Arabic, the Word meaning and the
  Root tag keep their own colours, readable on both tints in light and dark.

  A Phrase colours switch sits in the Settings drawer beside Arabic size. It
  is on by default, kept per device (never synced to an Account), applied
  before the page is first drawn, and the page still works when the browser's
  storage is unavailable. Share pages never show Phrase colours.

  Al-Fatihah's Phrases are read from the committed Phrases file
  (as last committed, before Phrases moved into Neon) and its Passages from the Passages file, never typed.
  None of them runs past an Ayah's end, so a tint carried across one is
  checked in the dataset (dataset/phrases.feature), not on the page. A
  Word card's tint is the background colour drawn behind it, read with the
  pointer away from every card; an untinted card is drawn on the page's paper.

  An Allah reference's Arabic is drawn in Allah reference colour over the
  tints instead (#147, allah-reference-colour.feature), a colour #147 fixes,
  so it is held to WCAG's 3 to 1 for large text rather than 4.5 to 1. The
  Allah references are the seeded list (features/site/allah-references.json).

  Background:
    Given a browser with no saved reader settings

  @AC-4 @AC-8
  Scenario Outline: In <Language>, Al-Fatihah's Word cards alternate between tint A and tint B, Phrase by Phrase, each Passage starting on A
    Given I open Surah 1 in <Language>
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4 @AC-8
  Scenario: Al-Fatihah opened from the Surah index, part by part, shows the same Phrase colours
    Given I open "/en"
    When I follow the index card of Surah 1
    Then every Ayah of Surah 1 is shown
    And Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A

  @AC-4 @AC-8
  Scenario Outline: A Passage that is not covered shows no tints, on Surah <surah> in <Language>
    Given Surah <surah>'s Passages are not covered by the Phrases file
    When I open Surah <surah> in <Language>
    Then no Word card of Surah <surah> is tinted

    Examples:
      | surah | Language |
      | 112   | English  |
      | 103   | Urdu     |

  @AC-5 @AC-8
  Scenario Outline: In the <theme> theme the tints keep the Arabic, the Word meaning and the Root tag in their own colours and readable
    Given I open Surah 112 in English
    And I choose the <Theme> theme
    And I note the colours of the Arabic, the Word meaning and the Root tag on the untinted Word card at 112:1:1
    When I open Surah 1 in English
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And the Arabic, the Word meaning and the Root tag on every tinted Word card of Al-Fatihah keep their noted colours
    And on every tinted Word card of Al-Fatihah the Arabic and the Word meaning contrast with the tint by at least 4.5 to 1
    And I save a screenshot "AC-5-phrase-colours-surah-1-<theme>-desktop"

    Examples:
      | Theme | theme |
      | Light | light |
      | Dark  | dark  |

  @AC-5 @AC-8
  Scenario Outline: Al-Fatihah at phone width in the <theme> theme, with its Phrase colours
    Given the browser is a phone
    And I open Surah 1 in English
    And I choose the <Theme> theme
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And the page does not scroll horizontally
    And I save a screenshot "AC-8-phrase-colours-surah-1-<theme>-phone"

    Examples:
      | Theme | theme |
      | Light | light |
      | Dark  | dark  |

  @AC-6 @AC-8
  Scenario: The Phrase colours switch sits beside Arabic size in the Settings drawer and starts on
    Given I open Surah 1 in English
    When I open the Settings drawer
    Then the Phrase colours switch is on
    And the Phrase colours switch sits next to Arabic size, with no other control between them

  @AC-6 @AC-8
  Scenario: Phrase colours switch off and on, survive a reload without a flash, and follow to the other Language
    Given I open Surah 1 in Urdu
    When I turn Phrase colours off
    Then no Word card of Surah 1 is tinted
    When I reload the page, watching the first frame it is drawn in
    Then the Phrase colours switch is off
    And no Word card of Surah 1 is tinted
    And no Word card of Surah 1 was tinted in the first frame the page was drawn in
    And I am on "/ur/1" with nothing added to the URL
    When I switch Language to English
    Then no Word card of Surah 1 is tinted
    When I turn Phrase colours on
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    When I reload the page, watching the first frame it is drawn in
    Then the Phrase colours switch is on
    And Al-Fatihah's Word cards were already tinted in the first frame the page was drawn in

  @AC-6 @AC-8
  Scenario: Phrase colours switched off in one signed-in browser stay on in another browser of the same Account
    Given two browsers with no saved reader settings, both signed in to an Account as "phrase-colours@saaliheen.test"
    When I turn to the first browser
    And I open "/en/1"
    And I turn Phrase colours off
    And I choose the Indo-Pak Script
    And I turn to the second browser
    And I open "/en/1"
    Then the Indo-Pak Script is selected
    And the Phrase colours switch is on
    And Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    When I turn to the first browser
    And I reload the page
    Then the Phrase colours switch is off
    And no Word card of Surah 1 is tinted

  @AC-6 @AC-8
  Scenario: With the browser's storage unavailable, Phrase colours start on and still switch off
    Given a browser whose storage is unavailable
    When I open "/en/1"
    Then Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And the Phrase colours switch is on
    When I turn Phrase colours off
    Then no Word card of Surah 1 is tinted

  @AC-7
  Scenario Outline: The Share page of <ayahs>, <layout>, shows no Phrase colours
    Given I open Surah 1 in English
    And I note the two tints of Al-Fatihah's Word cards
    When I open the Share page of <ayahs> in English and Uthmani, <layout>
    Then nothing on the Share page is drawn in either noted tint

    Examples:
      | ayahs   | layout       |
      | 1:1–7   | Ayah by Ayah |
      | 1:1–7   | Flowing      |
      | 1:5–7   | Ayah by Ayah |

  @AC-7
  Scenario: The Share page of a single Ayah of Al-Fatihah shows no Phrase colours
    Given I open Surah 1 in English
    And I note the two tints of Al-Fatihah's Word cards
    When I open the Share page of 1:6 in English and Uthmani
    Then nothing on the Share page is drawn in either noted tint

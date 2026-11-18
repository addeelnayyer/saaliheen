@issue-277
Feature: The Word grammar dialog
  Tapping a Word on a Grammar page opens its Word grammar dialog, built like
  the Root dialog: its head, the Word in the reader's Script and its Word
  location, stays in view while its Segments follow in order, each in the
  Quranic Arabic Corpus's Uthmani text with its Part of speech and every
  feature the Corpus gives it, in English with the Arabic term beside it; a
  Verb form by numeral and pattern. An Indo-Pak reader is told the Segments
  are in Uthmani. The dialog leads to the Word's Root dialog, with the Root
  Study shows, opened on the Word and marked as from a Word card (#325), or
  for a Word with no Root its Particle dialog. It closes with its close
  button, Escape or a click outside, gives focus back to the Word, and the
  page beneath has not moved. Segments are read from the committed
  Corpus source, Words and Roots from QUL's sources, never typed but for the
  tables below, which the issue gives.

  Background:
    Given a browser with no saved reader settings

  @AC-1
  Scenario: Tapping وَبِٱلْيَوْمِ opens its dialog with its Word location and its four Segments in order
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:8:7 on the Grammar page
    Then the Word grammar dialog for Word 2:8:7 is open, its head showing its Uthmani text and its Word location
    And the Word grammar dialog lists Word 2:8:7's Segments in order, each in the source's text with its Part of speech
    And the Word grammar dialog's Segments read:
      | Segment | Terms                                                       |
      | وَ      | Harf · حَرْف; Prefix · سَابِقَة; Conjunction · حَرْف عَطْف        |
      | بِ      | Harf · حَرْف; Prefix · سَابِقَة; Preposition · حَرْف جَرّ         |
      | ٱلْ     | Harf · حَرْف; Prefix · سَابِقَة; Definite article · أَدَاة تَعْرِيف |
      | يَوْمِ   | Ism · اِسْم; Genitive · مَجْرُور; Masculine · مُذَكَّر               |
    And the Word grammar dialog is a modal dialog named by its Word, with its close button named "Close"
    And I save a screenshot of the Word grammar dialog "issue-277-word-grammar-2-8-7-light-desktop"

  @AC-1
  Scenario: A definite Ism gives its prefix and its stem each its own features
    When I open the Grammar page of Surah 1 in English
    And I tap Word 1:2:4 on the Grammar page
    Then the Word grammar dialog lists Word 1:2:4's Segments in order, each in the source's text with its Part of speech
    And the Word grammar dialog's Segments read:
      | Segment | Terms                                                              |
      | ٱلْ     | Harf · حَرْف; Prefix · سَابِقَة; Definite article · أَدَاة تَعْرِيف        |
      | عَٰلَمِينَ | Ism · اِسْم; Genitive · مَجْرُور; Masculine · مُذَكَّر; Plural · جَمْع         |

  @AC-2
  Scenario: A derived Fi'l shows its Verb form by numeral and pattern
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:8:5 on the Grammar page
    Then the Word grammar dialog lists Word 2:8:5's Segments in order, each in the source's text with its Part of speech
    And the Word grammar dialog's Segments read:
      | Segment | Terms                                                                                    |
      | ءَامَ    | Fi'l · فِعْل; Perfect · مَاضِي; Form IV · أَفْعَلَ; First person · مُتَكَلِّم; Plural · جَمْع    |
      | نَّا     | Ism · اِسْم; Suffix · لَاحِقَة; Pronoun · ضَمِير; First person · مُتَكَلِّم; Plural · جَمْع       |
    And I save a screenshot of the Word grammar dialog "issue-277-word-grammar-2-8-5-light-phone" on a phone

  @AC-3
  Scenario Outline: A <Script> reader's dialog <shows> the note that the Segments are in Uthmani
    Given I open Surah 1 in English
    And I choose the <Script> Script
    When I open the Grammar page of Surah 1 in English
    And I tap Word 1:2:3 on the Grammar page
    Then the Word grammar dialog for Word 1:2:3 is open, its head showing its <Script> text and its Word location
    And the Word grammar dialog <shows> the note that its Segments are in Uthmani
    And the Word grammar dialog lists Word 1:2:3's Segments in order, each in the source's text with its Part of speech

    Examples:
      | Script   | shows         |
      | Indo-Pak | shows         |
      | Uthmani  | does not show |

  @AC-4
  Scenario: The dialog opens the Word's Root dialog, with the Root Study shows, and comes back to it
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:8:7 on the Grammar page
    And I open the Root tag in the Word grammar dialog
    Then the Root dialog for the Root QUL gives 2:8:7 is open over the Word grammar dialog
    When I close the top dialog with Escape
    Then the Word grammar dialog for Word 2:8:7 is open, its head showing its Uthmani text and its Word location
    And the Root tag in the Word grammar dialog has focus

  @AC-325
  Scenario Outline: The dialog's Root tag opens the Root dialog on <location>, marked as from a Word card
    When I open the Grammar page of Surah 1 in English
    And I tap Word <location> on the Grammar page
    And I open the Root tag in the Word grammar dialog
    Then the Root dialog for the Root QUL gives <location> is open over the Word grammar dialog
    And Lemma row <row>, "<lemma>", is the one marked, tinted and expanded
    And every Lemma row but row <row>, the marked one, is collapsed
    And in Lemma row <row> only the Spelling holding <location> is tinted, in the Root page's tint
    And only the Word location link <location> is tinted and says it is the current one
    And Lemma row <row> says, to a screen reader only, that it is this Word's Lemma

    Examples:
      | location | row | lemma    |
      | 1:1:3    | 3   | رَّحْمَٰن |
      | 1:1:4    | 1   | رَّحِيم   |

  @AC-4
  Scenario: The dialog of a Word with no Root opens its Particle dialog
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:8:9 on the Grammar page
    And I open the Particle tag in the Word grammar dialog
    Then the Particle dialog for Word 2:8:9's particle is open over the Word grammar dialog

  @AC-4
  Scenario: A Word with no Word grammar says so in its dialog, and still leads to its Root
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:181:3 on the Grammar page
    Then the Word grammar dialog for Word 2:181:3 is open, its head showing its Uthmani text and its Word location
    And the Word grammar dialog says the Word has no Word grammar
    And the Word grammar dialog offers the Root QUL gives 2:181:3

  @AC-5
  Scenario Outline: The dialog closes with <way>, gives focus back to the Word, and the page has not moved
    When I open the Grammar page of Surah 2 in English
    And I scroll the Grammar page down by 4000 pixels
    And I note where the Grammar page is
    And I tap the first Word on screen on the Grammar page
    Then the Word grammar dialog is open
    When I turn the mouse wheel down by 3000 pixels over the Word grammar dialog
    And I close the Word grammar dialog with <way>
    Then no Word grammar dialog is open
    And the Word I tapped has focus
    And the Grammar page has not moved

    Examples:
      | way              |
      | its close button |
      | Escape           |
      | a click outside  |

  @AC-5
  Scenario: Closing the Root dialog and then the Word grammar dialog leaves the page held until the last closes
    When I open the Grammar page of Surah 2 in English
    And I scroll the Grammar page down by 4000 pixels
    And I note where the Grammar page is
    And I tap the first Word on screen with a Root on the Grammar page
    And I open the Root tag in the Word grammar dialog
    And I close the top dialog with Escape
    And I turn the mouse wheel down by 3000 pixels over the Word grammar dialog
    Then the Grammar page has not moved
    When I close the Word grammar dialog with Escape
    Then no Word grammar dialog is open
    And the Grammar page has not moved

  @AC-1
  Scenario: A Word reached with the keyboard opens its dialog with Enter
    When I open the Grammar page of Surah 1 in English
    And I focus Word 1:5:4 on the Grammar page and press Enter
    Then the Word grammar dialog for Word 1:5:4 is open, its head showing its Uthmani text and its Word location

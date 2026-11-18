Feature: Root dialog
  Clicking a Root tag opens a centred Root dialog (Option B). Its header shows
  the Root's letters, its transliteration and its counts, and no Root meaning.
  Below it, one row per Lemma — most frequent first — shows the Lemma, its
  count and its representative meaning, and expands to the Lemma's Spellings
  in the chosen Script, each with its meaning and Word locations. The dialog
  closes with its close button, Escape or a click outside, keeps focus inside
  while open and is announced as a modal dialog named by its Root. The dialog
  is English in both Languages; only its Lemma and Spelling meanings are in the
  Language. Expected Lemmas, Spellings, counts and meanings are read from QUL's
  word root and word lemma databases, roots.json and the Script and Word
  meaning sources.
  The dialog opens on the Word whose Root tag was tapped (#322): that Word's
  Lemma row, or the row of Words with no Lemma, stays in its place but is
  tinted and opened, with the Word's Spelling and Word location tinted in it,
  in the pale tint a Root page marks its Words with. The tint stays until the
  dialog closes.

  Background:
    Given a browser with no saved reader settings

  @AC-5-9 @AC-5-13
  Scenario Outline: The Root dialog for ر ح م in <Language> shows its header and its Lemmas, most frequent first
    Given I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And the Root dialog is centred on the screen
    And the Root dialog's header shows "ر ح م", "r-ḥ-m", 339 occurrences and 47 unique Words
    And the Root dialog's header shows no meaning
    And the Root dialog is English and runs left to right, with its "Root" label, its "Lemmas" title and its counts as "339 occurrences · 47 unique words"
    And the Root dialog lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in <Language>
    And each Lemma row's representative meaning is marked lang "<lang>" and runs "<dir>"
    And every Lemma row but row 3, the marked one, is collapsed
    And I save a screenshot of the Root dialog "AC-9-root-dialog-<lang>-light-desktop"

    Examples:
      | Language | lang | dir |
      | Urdu     | ur   | rtl |
      | English  | en   | ltr |

  @AC-5-9 @AC-5-13
  Scenario Outline: In <Language> with the <Script> Script, a Lemma row expands to its Spellings in <Script>, with meanings and Word locations, and collapses again
    Given I open "/<lang>/1"
    And I choose the <Script> Script
    When I open the Root tag on the Word card at 1:1:3
    And I expand Lemma row 1 of the Root dialog
    Then Lemma row 1 is expanded
    And Lemma row 1 shows its 12 Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and a link to each of its Word locations in Quran order
    And each Spelling meaning of Lemma row 1 is marked lang "<lang>" and runs "<dir>"
    And I save a screenshot of the Root dialog "AC-9-root-dialog-<lang>-<script>-expanded-light-desktop"
    And Lemma row 3 is expanded
    And Lemma row 3 shows its 5 Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and a link to each of its Word locations in Quran order
    When I collapse Lemma row 1 of the Root dialog
    Then Lemma row 1 is collapsed and its Spellings are hidden
    When I collapse Lemma row 3 of the Root dialog
    Then Lemma row 3 is collapsed and its Spellings are hidden

    Examples:
      | Language | lang | dir | Script   | script  |
      | Urdu     | ur   | rtl | Uthmani  | uthmani |
      | Urdu     | ur   | rtl | Indo-Pak | indopak |
      | English  | en   | ltr | Uthmani  | uthmani |
      | English  | en   | ltr | Indo-Pak | indopak |

  @AC-5-9
  Scenario Outline: On a <viewport> in <Language> the Root dialog shows its Arabic flush right and the text that goes with it to its left
    Given the browser is a <viewport>
    And I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    And I expand Lemma row 1 of the Root dialog
    Then Lemma row 1 is expanded
    And the Root dialog's header shows its letters flush right and their transliteration to their left
    And every Lemma row shows its Lemma to the right of its representative meaning
    And every Spelling of Lemma row 1 shows its text to the right of its meaning
    And I save a screenshot of the Root dialog "AC-9-root-dialog-<lang>-sides-light-<viewport>"

    Examples:
      | viewport | Language | lang |
      | desktop  | Urdu     | ur   |
      | desktop  | English  | en   |
      | phone    | Urdu     | ur   |
      | phone    | English  | en   |

  @AC-5-9
  Scenario: Every Lemma of ر ح م expands to all of its Spellings
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I expand every Lemma row of the Root dialog
    Then every Lemma row shows its Spellings, most frequent first, each in its Uthmani text only, with its meaning in English and a link to each of its Word locations in Quran order
    And the Root dialog shows 84 Spellings and links to all 339 of ر ح م's Word locations

  @AC-5-11 @AC-5-13
  Scenario Outline: In <Language> the Root dialog closes with <way> and gives focus back to the Root tag
    Given I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    When I close the Root dialog with <way>
    Then no Root dialog is open
    And the Root tag on the Word card at 1:1:3 has focus

    Examples:
      | Language | lang | way              |
      | Urdu     | ur   | its close button |
      | Urdu     | ur   | Escape           |
      | Urdu     | ur   | a click outside  |
      | English  | en   | its close button |
      | English  | en   | Escape           |
      | English  | en   | a click outside  |

  @AC-5-11
  Scenario Outline: In <Language> the Root dialog is a modal dialog named by its Root that keeps focus inside
    Given I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog is a modal dialog whose accessible name holds "ر ح م"
    And focus is inside the Root dialog
    And its close button is named "Close"
    When I press Tab 30 times
    Then focus stayed inside the Root dialog after every press
    When I press Shift+Tab 30 times
    Then focus stayed inside the Root dialog after every press
    And every Lemma row is a button that says whether it is expanded and names the Spellings it controls

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-5-11 @AC-5-13
  Scenario: A Root dialog opened again after closing shows the Root it was opened for
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I close the Root dialog with Escape
    And I open the Root tag on the Word card at 1:2:2
    Then the Root dialog for the Root QUL gives 1:2:2 is open
    And no Root dialog for "ر ح م" is open

  @AC-5-12 @AC-5-13
  Scenario Outline: On a 390×844 phone in <Language> the Root dialog fits the screen and can be expanded, scrolled and closed
    Given the browser is a phone
    And I open "/<lang>/1"
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog for "ر ح م" is open
    And the Root dialog fits within the screen
    And the page does not scroll horizontally
    And I save a screenshot of the Root dialog "AC-12-root-dialog-<lang>-light-phone"
    When I expand Lemma row 1 of the Root dialog
    Then Lemma row 1 shows its 12 Spellings, most frequent first, each in its Uthmani text only, with its meaning in <Language> and a link to each of its Word locations in Quran order
    And the Root dialog fits within the screen
    And every Spelling of Lemma row 1 fits within the screen's width
    And the last Word location link of Lemma row 1 can be scrolled into view inside the Root dialog
    And I save a screenshot of the Root dialog "AC-12-root-dialog-<lang>-expanded-light-phone"
    When I close the Root dialog with its close button
    Then no Root dialog is open

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-5-12
  Scenario Outline: The Root dialog is readable in the <theme> theme on a <viewport>
    Given I open "/en/1"
    And I choose the <Theme> theme
    And the browser is a <viewport>
    When I open the Root tag on the Word card at 1:1:3
    And I expand Lemma row 1 of the Root dialog
    Then the Root dialog fits within the screen
    And I save a screenshot of the Root dialog "AC-12-root-dialog-en-<theme>-<viewport>"

    Examples:
      | Theme | theme | viewport |
      | Light | light | phone    |
      | Dark  | dark  | phone    |
      | Dark  | dark  | desktop  |

  @AC-322
  Scenario Outline: In <Language> with the <Script> Script, the Root dialog opened from 1:1:3 marks رَحْمَٰن, its Spelling and 1:1:3
    Given I open "/<lang>/1"
    And I choose the <Script> Script
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in <Language>
    And Lemma row 3, "رَّحْمَٰن", is the one marked, tinted and expanded
    And every Lemma row but row 3, the marked one, is collapsed
    And in Lemma row 3 only the Spelling holding 1:1:3 is tinted, in the Root page's tint
    And only the Word location link 1:1:3 is tinted and says it is the current one
    And Lemma row 3 says, to a screen reader only, that it is this Word's Lemma
    And I save a screenshot of the Root dialog "AC-322-root-dialog-marked-<lang>-<script>-light-desktop"

    Examples:
      | Language | lang | Script   | script  |
      | Urdu     | ur   | Uthmani  | uthmani |
      | Urdu     | ur   | Indo-Pak | indopak |
      | English  | en   | Uthmani  | uthmani |
      | English  | en   | Indo-Pak | indopak |

  @AC-322
  Scenario: The Root dialog opened from 1:1:4 marks رَحِيم instead, its Lemmas in the same order
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:4
    Then the Root dialog lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in English
    And Lemma row 1, "رَّحِيم", is the one marked, tinted and expanded
    And every Lemma row but row 1, the marked one, is collapsed
    And in Lemma row 1 only the Spelling holding 1:1:4 is tinted, in the Root page's tint
    And only the Word location link 1:1:4 is tinted and says it is the current one

  @AC-322
  Scenario: Closing the marked Lemma keeps its tint, and opening others leaves the mark where it is
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I collapse Lemma row 3 of the Root dialog
    Then Lemma row 3 is collapsed and its Spellings are hidden
    And only Lemma row 3 is tinted
    When I expand Lemma row 1 of the Root dialog
    And I expand Lemma row 2 of the Root dialog
    Then only Lemma row 3 is tinted
    When I expand Lemma row 3 of the Root dialog
    Then in Lemma row 3 only the Spelling holding 1:1:3 is tinted, in the Root page's tint
    And only the Word location link 1:1:3 is tinted and says it is the current one

  @AC-322
  Scenario: A Word with no Lemma marks and opens the row of Words with no Lemma
    Given I open "/en/98"
    When I open the Root tag on the Word card at 98:8:13
    Then the Root dialog for "ر ض و" is open
    And Lemma row 1, the Words with no Lemma, is the one marked, tinted and expanded
    And every Lemma row but row 1, the marked one, is collapsed
    And in Lemma row 1 only the Spelling holding 98:8:13 is tinted, in the Root page's tint
    And only the Word location link 98:8:13 is tinted and says it is the current one

  @AC-322
  Scenario: A Word location the Root's file does not list opens the dialog with no mark
    Given I open "/en/1"
    And ر ح م's Root file is served without the Word location 1:1:3
    When I open the Root tag on the Word card at 1:1:3
    Then the Root dialog lists ر ح م's 9 Lemmas, most frequent first, each with its Lemma, its count and its representative meaning in English
    And every Lemma row is collapsed and no Spelling is shown
    And no Lemma row is tinted
    When I close the Root dialog with Escape
    Then the Root tag on the Word card at 1:1:3 has focus

  @AC-322
  Scenario: A Root dialog opened again after closing marks the Word it was opened for
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I close the Root dialog with Escape
    Then the Root tag on the Word card at 1:1:3 has focus
    When I open the Root tag on the Word card at 1:1:4
    Then Lemma row 1, "رَّحِيم", is the one marked, tinted and expanded
    And every Lemma row but row 1, the marked one, is collapsed

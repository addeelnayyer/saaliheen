@issue-249
Feature: Particle dialog
  Tapping a Particle tag opens the Particle dialog, as a Root tag opens the
  Root dialog. Its head shows a "Particle" label and the particle in the
  reader's Script; below them, the particle's occurrence count and its
  Spellings, most frequent first, each in the reader's Script with its meaning
  in the reader's Language and a link to each of its Word locations. The
  dialog is English in both Languages; only its Spelling meanings are in the
  Language. Its head stays pinned while the Spellings scroll beneath it, and
  the page beneath holds still. Opened on a tapped Word (#327), it marks that
  Word's Spelling and Word location as the Root dialog does, and once the
  particle's file has loaded scrolls the marked Spelling into view, once, then
  never moves on its own. It closes with its close button, Escape, a
  click outside or a chosen Word location, gives focus back to the Particle
  tag, keeps focus inside while open and is announced as a modal dialog named
  by its particle. Expected Spellings, counts and meanings are read from QUL's
  word root and word lemma databases, roots.json and the Script and Word
  meaning sources.

  Background:
    Given a browser with no saved reader settings

  @AC-5
  Scenario Outline: In <Language> with the <Script> Script, the Particle dialog for إِيَّا shows its count and Spellings
    Given I open "/<lang>/1"
    And I choose the <Script> Script
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog for "إِيَّا" is open
    And the Particle dialog is English and runs left to right, with its "Particle" label, its "Spellings" title and its count as "24 occurrences"
    And the Particle dialog's count is its particle's 24 occurrences
    And the Particle dialog lists its 9 Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and a link to each of its Word locations in Quran order
    And each Spelling meaning of the Particle dialog is marked lang "<lang>" and runs "<dir>"
    And I save a screenshot of the Particle dialog "AC-5-particle-dialog-<lang>-<script>-light-desktop"

    Examples:
      | Language | lang | dir | Script   | script  |
      | Urdu     | ur   | rtl | Uthmani  | uthmani |
      | Urdu     | ur   | rtl | Indo-Pak | indopak |
      | English  | en   | ltr | Uthmani  | uthmani |
      | English  | en   | ltr | Indo-Pak | indopak |

  @AC-5
  Scenario Outline: With the <Script> Script, the Particle dialog for a Spelling particle shows it in <Script>
    Given I open "/en/109"
    And I choose the <Script> Script
    When I open the Particle tag on the Word card at 109:6:1
    Then the Particle dialog for "<text>" is open
    And the Particle dialog's count is its particle's 163 occurrences
    And the Particle dialog lists its 1 Spelling, most frequent first, each in its <Script> text only, with its meaning in English and a link to each of its Word locations in Quran order

    Examples:
      | Script   | text   |
      | Uthmani  | لَكُمۡ  |
      | Indo-Pak | لَكُمْ  |

  @AC-5
  Scenario Outline: The Particle dialog closes with <way> and gives focus back to the Particle tag
    Given I open "/en/1"
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog for "إِيَّا" is open
    When I close the Particle dialog with <way>
    Then no Particle dialog is open
    And the Particle tag on the Word card at 1:5:1 has focus

    Examples:
      | way              |
      | its close button |
      | Escape           |
      | a click outside  |

  @AC-5
  Scenario: The Particle dialog is a modal dialog named by its particle that keeps focus inside
    Given I open "/ur/1"
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog is a modal dialog whose accessible name holds "إِيَّا"
    And focus is inside the Particle dialog
    And its close button is named "Close"
    When I press Tab 30 times
    Then focus stayed inside the Particle dialog after every press
    When I press Shift+Tab 30 times
    Then focus stayed inside the Particle dialog after every press

  @AC-5
  Scenario: A Word location in the Particle dialog closes it and goes to that Word card
    Given I open "/en/1"
    When I open the Particle tag on the Word card at 1:5:1
    And I choose the Word location 1:5:3 in the Particle dialog
    Then I am on "/en/1#1:5:3"
    And no Particle dialog is open
    And the Word card at 1:5:3 is in the viewport

  @AC-5
  Scenario Outline: On a <viewport> the Particle dialog's head stays pinned while its Spellings scroll
    Given the browser is a <viewport>
    And I open "/en/1"
    When I open the Particle tag on the Word card at 1:7:4
    Then the Particle dialog for "عَلَىٰ" is open
    When I scroll the Particle dialog's Spellings back to the top
    Then the Particle dialog's head has no line under it
    When I scroll the Particle dialog's Spellings down by 600 pixels
    Then the Particle dialog's head is pinned at its top, showing its label, its close button and "عَلَىٰ"
    And the Particle dialog's head has a line under it
    And I save a screenshot of the Particle dialog "AC-5-particle-dialog-scrolled-light-<viewport>"
    When I scroll the Particle dialog's Spellings back to the top
    Then the Particle dialog's head has no line under it

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-5
  Scenario Outline: On a <viewport> the page under the Particle dialog holds still
    Given the browser is a <viewport>
    And I open Surah 2 in English
    And I scroll down by 30000 pixels
    When I note where the page is
    And I open the first Particle tag on screen
    Then nothing on the page has moved, even sideways
    When I turn the mouse wheel down by 800 pixels over the backdrop
    And I turn the mouse wheel down by 4000 pixels over the Particle dialog
    And I swipe up by 600 pixels on the backdrop
    And I swipe up by 4000 pixels on the Particle dialog
    And I press PageDown, End and ArrowDown in the Particle dialog
    Then nothing on the page has moved, even sideways
    When I close the Particle dialog with Escape
    Then no Particle dialog is open
    And nothing on the page has moved, even sideways

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-5
  Scenario Outline: On a phone in <Language> the Particle dialog fits the screen
    Given the browser is a phone
    And I open "/<lang>/1"
    When I open the Particle tag on the Word card at 1:7:4
    Then the Particle dialog fits within the screen
    And the page does not scroll horizontally
    And every Spelling of the Particle dialog fits within the screen's width
    And I save a screenshot of the Particle dialog "AC-5-particle-dialog-<lang>-light-phone"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-327
  Scenario Outline: In <Language> with the <Script> Script, the Particle dialog opened from 2:22:9 marks the Spelling of مِن holding it and 2:22:9
    Given I open "/<lang>/2"
    And I choose the <Script> Script
    When I open the Particle tag on the Word card at 2:22:9
    Then the Particle dialog for "مِن" is open
    And in the Particle dialog only the Spelling holding 2:22:9 is tinted, in the Root dialog's tint
    And in the Particle dialog only the Word location link 2:22:9 is tinted and says it is the current one
    And the Word location link 2:22:9 is in view beneath the Particle dialog's head
    And I save a screenshot of the Particle dialog "AC-327-particle-dialog-marked-<lang>-<script>-light-desktop"

    Examples:
      | Language | lang | Script   | script  |
      | Urdu     | ur   | Uthmani  | uthmani |
      | Urdu     | ur   | Indo-Pak | indopak |
      | English  | en   | Uthmani  | uthmani |
      | English  | en   | Indo-Pak | indopak |

  @AC-327
  Scenario: A particle with no Lemma marks its one Spelling and the Word location
    Given I open "/en/109"
    When I open the Particle tag on the Word card at 109:6:1
    Then the Particle dialog for "لَكُمۡ" is open
    And in the Particle dialog only the Spelling holding 109:6:1 is tinted, in the Root dialog's tint
    And in the Particle dialog only the Word location link 109:6:1 is tinted and says it is the current one
    And the Word location link 109:6:1 is in view beneath the Particle dialog's head

  @AC-327
  Scenario Outline: On a <viewport>, opened on مِّنَّا, the 31st of مِن's Spellings, the Particle dialog brings it into view once its file has loaded, then holds still
    Given the browser is a <viewport>
    And I open "/en/7"
    And the Particle's file is held back until I let it through
    When I open the Particle tag on the Word card at 7:72:5
    Then the Particle dialog shows "مِن" while its Spellings load
    When I let the Particle file through
    Then in the Particle dialog only the Spelling holding 7:72:5 is tinted, in the Root dialog's tint
    And the Spelling holding 7:72:5 is wholly in view beneath the Particle dialog's head
    And the Particle dialog's head has a line under it
    And I save a screenshot of the Particle dialog "AC-327-particle-dialog-marked-in-view-light-<viewport>"
    When I note where the Particle dialog is scrolled
    And I scroll the Particle dialog's Spellings up by 300 pixels
    Then the Particle dialog has scrolled up by 300 pixels since I noted it, and stays there

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-327
  Scenario: Opened from a Word grammar dialog's Particle tag, the Particle dialog marks that Word
    When I open the Grammar page of Surah 2 in English
    And I tap Word 2:22:9 on the Grammar page
    And I open the Particle tag in the Word grammar dialog
    Then the Particle dialog for Word 2:22:9's particle is open over the Word grammar dialog
    And in the Particle dialog only the Spelling holding 2:22:9 is tinted, in the Root dialog's tint
    And in the Particle dialog only the Word location link 2:22:9 is tinted and says it is the current one

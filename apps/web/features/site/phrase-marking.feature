@issue-100 @issue-171
Feature: Marking Phrases in the Passage editor
  In Phrases mode (phrases-mode.feature) an Admin marks a Phrase by tapping
  its first Word, then its last Word; the last may be in a later Ayah of the
  same Passage. A run that would overlap a Phrase, or leave its Passage, is
  refused, and an alert gives the reason ("overlap"; the Passage it would
  leave).

  Tapping a Word in a Phrase selects that Phrase, and the editor then offers
  "Delete Phrase", "Move first Word" and "Move last Word". After a Move, the
  next Word tapped is the Phrase's new first or last Word, under the same
  rules and refusals.

  Each Phrase edit is one Unpublished change: Undo reverses it, and it is kept
  in the Admin's browser, surviving a reload, like the Passage edits
  (passage-editor.feature).

  Passage edits keep Phrases whole. Join with above keeps both Passages'
  Phrases, their tints now alternating from the joined Passage's first
  Phrase. A split, a ↑ / ↓ or a drag that would put a Passage boundary inside
  a Phrase is refused, and an alert explains that the Phrase must be changed
  first; a drag may instead leave such a gap out of its drop places.

  The editor reads the Surah's Phrases from Neon (#171). The run's Postgres
  holds Surah 18's Phrases as ../passages-in-the-test-database.ts arranges
  them: 99:1–100:1, 100:2–100:5 and 101:1–102:14 (Passage 99–102, covered)
  and 103:1–103:5 (Passage 103–106, whose Ayahs 104 to 106 are unmarked).
  Phrases are written <Ayah>:<Word>–<Ayah>:<Word> in the open Surah; every
  Word location a step names is checked against the sources, and every one
  of Neon's Phrases against those Neon is arranged to hold. Tints and unmarked Words are
  read as phrases-mode.feature reads them.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # -------------------------------------------------------------------- marking

  @AC-2 @AC-9
  Scenario: Tapping a first and a last Word makes a Phrase, across an Ayah end within the Passage
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    Then Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    And Passage 103–106's heading shows its progress for those Phrases
    And there is 1 Unpublished change

  @AC-2 @AC-9
  Scenario: A Phrase may be a single Word
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 106:4, then the Word at 106:4
    Then Passage 103–106 shows Neon's Phrases, with "106:4–106:4" added
    And there is 1 Unpublished change

  @AC-2 @AC-9
  Scenario: A run that would overlap a Phrase is refused with a reason
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 105:2, then the Word at 105:3
    And I tap the Word at 104:1, then the Word at 106:1
    Then I am told the Phrase would overlap another
    And Passage 103–106 shows Neon's Phrases, with "105:2–105:3" added
    And there is 1 Unpublished change

  @AC-2 @AC-9
  Scenario: A run that would leave its Passage is refused with a reason
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 106:9, then the Word at 107:1
    Then I am told the Phrase would leave its Passage
    And Passage 103–106 shows Neon's Phrases
    And there are no Unpublished changes

  # -------------------------------------------------------------------- editing

  @AC-3 @AC-9
  Scenario: Tapping a Word in a Phrase selects the Phrase, which can be deleted
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 103:2
    Then the editor offers "Delete Phrase", "Move first Word" and "Move last Word"
    When I delete the selected Phrase
    Then Passage 103–106 shows Neon's Phrases, with "103:1–103:5" removed
    And Passage 103–106's heading shows its progress for those Phrases
    And there is 1 Unpublished change

  @AC-3 @AC-9
  Scenario Outline: A selected Phrase's <End> Word can be moved to <To>, within its Passage
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 103:2
    And I move the selected Phrase's <End> Word to <To>
    Then Passage 103–106 shows Neon's Phrases, with "<Moved>" in place of "103:1–103:5"
    And Passage 103–106's heading shows its progress for those Phrases
    And there is 1 Unpublished change

    Examples:
      | End   | To    | Moved       |
      | last  | 104:3 | 103:1–104:3 |
      | first | 103:3 | 103:3–103:5 |
      | last  | 103:4 | 103:1–103:4 |

  @AC-3 @AC-9
  Scenario: Moving a Phrase's end over another Phrase is refused with a reason
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 105:1, then the Word at 105:2
    And I tap the Word at 103:2
    And I move the selected Phrase's last Word to 105:5
    Then I am told the Phrase would overlap another
    And Passage 103–106 shows Neon's Phrases, with "105:1–105:2" added
    And there is 1 Unpublished change

  @AC-3 @AC-9
  Scenario: Moving a Phrase's end out of its Passage is refused with a reason
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 103:2
    And I move the selected Phrase's last Word to 107:1
    Then I am told the Phrase would leave its Passage
    And Passage 103–106 shows Neon's Phrases
    And there are no Unpublished changes

  # ------------------------------------------------------- Unpublished changes

  @AC-4 @AC-9
  Scenario: Undo reverses Phrase edits one at a time
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    And I tap the Word at 103:2
    And I delete the selected Phrase
    Then there are 2 Unpublished changes
    And Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added and "103:1–103:5" removed
    When I undo
    Then there is 1 Unpublished change
    And Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    When I undo
    Then there are no Unpublished changes
    And Passage 103–106 shows Neon's Phrases
    And Passage 103–106's heading shows its progress for those Phrases
    And Undo is disabled

  @AC-4 @AC-9
  Scenario: Phrase edits survive a reload as Unpublished changes
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    And I tap the Word at 99:2
    And I move the selected Phrase's last Word to 99:11
    And I reload the page
    And I turn Phrases mode on
    Then there are 2 Unpublished changes
    And Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    And Passage 99–102 shows Neon's Phrases, with "99:1–99:11" in place of "99:1–100:1"
    And Passage 99–102's heading shows its progress for those Phrases
    When I undo
    Then there is 1 Unpublished change
    And Passage 99–102 shows Neon's Phrases

  # ------------------------------------------------------------ Passage edits

  @AC-7 @AC-9
  Scenario: Join keeps both Passages' Phrases
    When I open the Passage editor for Surah 18
    And I join 103–106 with the Passage above
    Then the editor's Passages are Neon's, with "99–106" in place of "99–102, 103–106"
    And there is 1 Unpublished change
    When I turn Phrases mode on
    Then Passage 99–106 shows Neon's Phrases
    And Passage 99–106's heading shows its progress for those Phrases

  @AC-7 @AC-9
  Scenario Outline: A split inside a Phrase is refused, explaining the Phrase must be changed first
    When I open the Passage editor for Surah 18
    And I split 99–102 at Ayah <Ayah>
    Then I am told the Phrase must be changed first
    And the editor's Passages are Neon's
    And there are no Unpublished changes

    Examples:
      | Ayah |
      | 100  |
      | 102  |

  @AC-7 @AC-9
  Scenario: A split between two Phrases is allowed
    When I open the Passage editor for Surah 18
    And I split 99–102 at Ayah 101
    Then the editor's Passages are Neon's, with "99–100, 101–102" in place of "99–102"
    And there is 1 Unpublished change

  @AC-7 @AC-9
  Scenario Outline: Moving a start by <Arrow> into a Phrase is refused, explaining the Phrase must be changed first
    When I open the Passage editor for Surah 18
    And I move the start of <Passage> one Ayah <Way>
    Then I am told the Phrase must be changed first
    And the editor's Passages are Neon's
    And there are no Unpublished changes

    Examples:
      | Arrow | Passage | Way     |
      | ↓     | 99–102  | later   |
      | ↑     | 103–106 | earlier |

  @AC-7 @AC-9
  Scenario: Dragging a Passage heading can't put its start inside a Phrase
    When I open the Passage editor for Surah 18
    And I start dragging the Passage heading of 103–106
    Then the gaps before Ayahs "101, 104, 105, 106" are drop places
    And the gaps before Ayahs "100, 102" are not drop places, or dropping it on them is refused, explaining the Phrase must be changed first
    And the editor's Passages are Neon's
    And there are no Unpublished changes

  # ------------------------------------------------------------------ on a phone

  @AC-8 @AC-2 @AC-3 @AC-4
  Scenario: On a 390×844 phone, Phrases are marked, refused, edited and undone by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    Then Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    When I tap the Word at 106:9, then the Word at 107:1
    Then I am told the Phrase would leave its Passage
    When I tap the Word at 104:4
    And I move the selected Phrase's last Word to 106:2
    Then Passage 103–106 shows Neon's Phrases, with "104:3–106:2" added
    When I tap the Word at 103:2
    And I delete the selected Phrase
    Then Passage 103–106 shows Neon's Phrases, with "104:3–106:2" added and "103:1–103:5" removed
    And there are 3 Unpublished changes
    When I undo
    Then Passage 103–106 shows Neon's Phrases, with "104:3–106:2" added
    And the page does not scroll sideways

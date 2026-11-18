@issue-171
Feature: The Passage editor
  An Admin edits a Surah's Passages at /admin/<Surah>, on a page that looks
  like a Surah page: Ayahs flow down the main area, each in the Arabic of the chosen
  Script with the Ayah translation the editor's toolbar picks (Off, Urdu or
  English: passage-editor-toolbar.feature), and no Word cards. Each Passage is a region named "Passage <range>" (Passage 83–88)
  holding its Passage heading and its Ayahs; neighbouring Passages have faint,
  alternating backgrounds.

  The editor shows the latest Passages and Phrases Neon holds (#171), read
  from the run's own Postgres on every open. Before any scenario runs, that
  database is arranged (features/site/passages-in-the-test-database.ts) as if
  another Admin had published once in Surah 18: its 107–108 and 109–110 joined
  as 107–110, and its 99–102 and 103–106 given Phrases, at version 2. So it is
  never the committed copy the site was once built from. A scenario that
  changes another Surah in Neon, to arrange a precondition, uses a Surah no
  other scenario reads (67, 76) and puts it back when it ends.

  Every edit goes through the Passages module's rules (#41):
  - Retitle: "Edit the Passage titles of <range>" opens two fields, "English
    Passage title" and "Urdu Passage title" (right to left). Enter, or tapping
    elsewhere, keeps the edit; Escape puts the titles back. An empty field is
    marked (aria-invalid). An English title over 60 characters gets a soft
    warning that it will be "cut short in the Surah bar", and no hard limit.
  - Split: "✂︎ New Passage from Ayah <n>" in the gap before each Ayah but a
    Passage's first. The new Passage's title fields open, focused.
  - Join: "Join with above" on every Passage heading but the first.
  - Move a start: "Start one Ayah earlier" (↑) and "Start one Ayah later" (↓)
    on every Passage heading but the first, disabled where the move would empty
    a Passage. On a desktop the Passage heading can be dragged: while it is,
    each valid drop place, and no other, shows "Start at Ayah <n>".

  The "Unpublished changes" bar, fixed at the foot, says how many there are
  ("No Unpublished changes", "1 Unpublished change", "3 Unpublished changes"),
  holds the summary behind a "Summary" button, says how many
  Passages are untitled ("1 untitled") and how many titles are long ("1 long
  title"), and offers Undo (one change at a time) and Publish, disabled while
  any Passage lacks a title in either Language. Pressing Publish is #45's.
  Unpublished changes (Passage, Phrase and Allah reference edits) are kept in
  the Admin's browser, by Surah and by the Surah's version, and survive a
  reload; once that version has moved (another Admin published), they are set
  aside and the editor shows Neon's latest Passages.

  Titles and ranges are read from the committed Passages and what Neon holds,
  never typed.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # ------------------------------------------------------------- latest Passages

  @AC-1 @AC-2 @AC-10
  Scenario: The editor shows Surah 18's Passages and Phrases from Neon, not the committed copy
    Given the committed Passages have Surah 18's Passages "107–108" and "109–110"
    And Neon holds Surah 18's "107–108" and "109–110" joined as "107–110"
    And Neon holds Phrases covering Surah 18's 99–102, which the committed Phrases don't
    When I open the Passage editor for Surah 18
    Then the editor's Passages are Neon's
    And 107–110 has the Passage titles of 107–110
    And there are no Unpublished changes
    When I turn Phrases mode on
    Then Passage 99–102 shows Neon's Phrases
    And Passage 99–102's heading shows "Phrases ✓"

  @AC-1 @AC-2 @AC-10
  Scenario: A Passage title changed in Neon shows in the editor when it next opens
    When I open the Passage editor for Surah 67
    Then the editor's Passages are Neon's
    And 6–11 has the Passage titles of 6–11
    When Neon's Surah 67 Passage 6–11 is given the Passage titles of 12–14
    And I open the Passage editor for Surah 67
    Then the editor's Passages are Neon's
    And 6–11 has the Passage titles of 12–14
    And there are no Unpublished changes

  @AC-1
  Scenario: The Passage editor still names its Surah and says it is the Passage editor
    When I open the Passage editor for Surah 18
    Then the page names Surah 18's Latin name and says it is the Passage editor

  # ---------------------------------------------------------------------- layout

  @AC-2
  Scenario Outline: The editor shows each Ayah in the chosen <Script> Script, with no Word cards
    Given I am signed in as the Admin in a browser that chose the <Script> Script
    When I open the Passage editor for Surah 18
    Then Ayah 18:1 shows its <Script> text and not its <Other> text
    And Ayah 18:110 shows its <Script> text and not its <Other> text
    And no Word card is shown

    Examples:
      | Script   | Other    |
      | Uthmani  | Indo-Pak |
      | Indo-Pak | Uthmani  |

  @AC-2
  Scenario: The toolbar's Ayah translation switch moves between Urdu and English
    When I open the Passage editor for Surah 18
    And I switch the Ayah translation to Urdu
    Then Ayah 18:10 shows its Urdu Ayah translation and not its English one
    And Ayah 18:110 shows its Urdu Ayah translation and not its English one
    When I switch the Ayah translation to English
    Then Ayah 18:10 shows its English Ayah translation and not its Urdu one
    And Ayah 18:110 shows its English Ayah translation and not its Urdu one

  @AC-2
  Scenario: Neighbouring Passages have alternating backgrounds
    When I open the Passage editor for Surah 18
    Then every Passage's background differs from the next one's and matches the one after that
    And I save a screenshot "AC-2-passage-editor-light-desktop"

  # --------------------------------------------------------------------- retitle

  @AC-3 @AC-10
  Scenario: Enter keeps a retitle
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I press Enter
    Then 89–91's title fields are closed
    And 89–91 has the Passage titles of 92–94
    And there is 1 Unpublished change
    And the summary is "Surah 18: retitle 89–91"

  @AC-3
  Scenario: Tapping elsewhere keeps a retitle
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I tap elsewhere on the page
    Then 89–91's title fields are closed
    And 89–91 has the Passage titles of 92–94
    And there is 1 Unpublished change

  @AC-3 @AC-10
  Scenario: Escape puts the titles back
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I press Escape
    Then 89–91's title fields are closed
    And 89–91 has the Passage titles of 89–91
    And there are no Unpublished changes

  @AC-3 @AC-10
  Scenario: A title that didn't really change is no Unpublished change
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I press Enter
    Then there are no Unpublished changes
    When I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I type the Passage titles of 89–91 into 89–91's title fields
    And I press Enter
    Then 89–91 has the Passage titles of 89–91
    And there are no Unpublished changes

  @AC-3
  Scenario: Empty title fields are marked, and the Urdu field runs right to left
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    Then 89–91's Urdu title field runs right to left
    And 89–91's English title field is not marked as empty
    And 89–91's Urdu title field is not marked as empty
    When I clear 89–91's English title field
    Then 89–91's English title field is marked as empty
    And 89–91's Urdu title field is not marked as empty
    When I clear 89–91's Urdu title field
    Then 89–91's Urdu title field is marked as empty
    When I press Enter
    Then there is 1 Unpublished change
    And the bar counts 1 untitled
    And Publish is disabled

  @AC-3
  Scenario Outline: An English title of <Length> characters <Outcome>
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I type an English title of <Length> characters into 89–91's title field
    Then 89–91 <Warning> a warning that its English title will be cut short in the Surah bar
    And 89–91's English title field holds all <Length> characters
    When I press Enter
    Then there is 1 Unpublished change
    And the bar counts <Long> long title

    Examples:
      | Length | Outcome                | Warning   | Long |
      | 60     | gets no warning        | shows no  | 0    |
      | 61     | gets the soft warning  | shows     | 1    |
      | 90     | gets the soft warning  | shows     | 1    |

  # ----------------------------------------------------------------------- split

  @AC-4 @AC-10
  Scenario: Splitting 83–88 at Ayah 86 gives an untitled second Passage with its fields open and focused
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    Then the editor's Passages are Neon's, with "83–85, 86–88" in place of "83–88"
    And 86–88's title fields are open
    And the focus is in 86–88's title fields
    And 86–88 has no Passage titles
    And 86–88's English title field is marked as empty
    And 86–88's Urdu title field is marked as empty
    And there is 1 Unpublished change
    And the bar counts 1 untitled
    And Publish is disabled
    When I press Escape
    Then 83–85 has the Passage titles of 83–88

  @AC-4 @AC-7 @AC-10
  Scenario: Naming the new Passage after a split makes the Passages publishable
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    And I type the English title of 89–91 into 86–88's English title field
    And I press Enter
    Then the bar counts 1 untitled
    And Publish is disabled
    When I edit the Passage titles of 86–88
    And I type the Passage titles of 89–91 into 86–88's title fields
    And I press Enter
    Then 86–88 has the Passage titles of 89–91
    And there are 3 Unpublished changes
    And the bar counts 0 untitled
    And Publish is enabled
    And the summary is "Surah 18: split 83–88 at 86; retitle 86–88; retitle 86–88"

  # ------------------------------------------------------------------------ join

  @AC-5 @AC-10
  Scenario: Join with above merges a Passage into the one above, which keeps its titles
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    And 89–94 has the Passage titles of 89–91
    And there is 1 Unpublished change
    And the summary is "Surah 18: join 92–94 into 89–91"
    And Publish is enabled

  @AC-5
  Scenario: Every Passage but the first offers Join with above
    When I open the Passage editor for Surah 18
    Then 1–5 offers no Join with above
    And every Passage but the first offers Join with above

  # ---------------------------------------------------------------- move a start

  @AC-6 @AC-10
  Scenario: ↓ moves a start one Ayah later, and is disabled where the Passage would be emptied
    When I open the Passage editor for Surah 18
    And I move the start of 95–98 one Ayah later
    Then the editor's Passages are Neon's, with "92–95, 96–98" in place of "92–94, 95–98"
    And there is 1 Unpublished change
    And the summary is "Surah 18: move start of 95–98 to 96"
    When I move the start of 96–98 one Ayah later
    And I move the start of 97–98 one Ayah later
    Then the editor's Passages are Neon's, with "92–97, 98" in place of "92–94, 95–98"
    And moving the start of 98 one Ayah later is disabled
    And moving the start of 98 one Ayah earlier is enabled
    And there are 3 Unpublished changes

  @AC-6 @AC-10
  Scenario: ↑ moves a start one Ayah earlier, and is disabled where the Passage above would be emptied
    When I open the Passage editor for Surah 18
    And I move the start of 95–98 one Ayah earlier
    Then the editor's Passages are Neon's, with "92–93, 94–98" in place of "92–94, 95–98"
    And the summary is "Surah 18: move start of 95–98 to 94"
    When I move the start of 94–98 one Ayah earlier
    Then the editor's Passages are Neon's, with "92, 93–98" in place of "92–94, 95–98"
    And moving the start of 93–98 one Ayah earlier is disabled
    And moving the start of 93–98 one Ayah later is enabled
    And there are 2 Unpublished changes

  @AC-6
  Scenario: The Surah's first Passage can't be moved
    When I open the Passage editor for Surah 18
    Then 1–5 offers no way to move its start

  @AC-6 @AC-10
  Scenario: Dragging a Passage heading moves its start, and only valid drop places are highlighted
    When I open the Passage editor for Surah 18
    And I start dragging the Passage heading of 95–98
    Then only the gaps before Ayahs "93, 94, 96, 97, 98" are highlighted as drop places
    When I drop it on the gap before Ayah 97
    Then the editor's Passages are Neon's, with "92–96, 97–98" in place of "92–94, 95–98"
    And there is 1 Unpublished change
    And the summary is "Surah 18: move start of 95–98 to 97"

  # ------------------------------------------------------- Unpublished changes

  @AC-7 @AC-10
  Scenario: Undo steps back one change at a time
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    And I type the Passage titles of 89–91 into 86–88's title fields
    And I press Enter
    And I join 92–94 with the Passage above
    Then there are 3 Unpublished changes
    And the summary is "Surah 18: split 83–88 at 86; retitle 86–88; join 92–94 into 89–91"
    When I undo
    Then there are 2 Unpublished changes
    And the editor's Passages are Neon's, with "83–85, 86–88" in place of "83–88"
    And 86–88 has the Passage titles of 89–91
    And the summary is "Surah 18: split 83–88 at 86; retitle 86–88"
    When I undo
    Then there is 1 Unpublished change
    And 86–88 has no Passage titles
    When I undo
    Then there are no Unpublished changes
    And the editor's Passages are Neon's
    And Undo is disabled

  @AC-7 @AC-10
  Scenario Outline: Publish is disabled while a Passage has no <Language> title
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    And I clear 89–91's <Language> title field
    And I press Enter
    Then there is 1 Unpublished change
    And the bar counts 1 untitled
    And Publish is disabled
    When I undo
    Then the bar counts 0 untitled

    Examples:
      | Language |
      | English  |
      | Urdu     |

  # ------------------------------------------------------- kept in the browser

  @AC-8 @AC-10
  Scenario: Unpublished changes survive a reload
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    And I type the Passage titles of 89–91 into 86–88's title fields
    And I press Enter
    And I join 92–94 with the Passage above
    And I reload the page
    Then there are 3 Unpublished changes
    And the editor's Passages are Neon's, with "83–85, 86–88, 89–94" in place of "83–88, 89–91, 92–94"
    And 86–88 has the Passage titles of 89–91
    And the summary is "Surah 18: split 83–88 at 86; retitle 86–88; join 92–94 into 89–91"
    When I undo
    Then there are 2 Unpublished changes
    And the editor's Passages are Neon's, with "83–85, 86–88" in place of "83–88"

  @AC-8 @AC-2 @AC-10
  Scenario: Passage, Phrase and Allah reference changes survive a reload, kept under the Surah and its version
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I turn Phrases mode on
    And I tap the Word at 1:1, then the Word at 1:3
    Then there are 2 Unpublished changes
    When I turn marking Allah references on
    And I tap the Word card at 18:2:1
    Then there is 1 Allah reference change waiting
    When I reload the page
    Then there are 2 Unpublished changes
    And the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    When I turn Phrases mode on
    Then Passage 1–5 shows Neon's Phrases, with "1:1–1:3" added
    When I turn marking Allah references on
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 18 are gold as the seeded list says, with "18:2:1" marked

  @AC-8 @AC-2 @AC-10
  Scenario: Once the Surah's version has moved, reopening the editor sets the Unpublished changes aside and shows Neon's latest Passages
    When I open the Passage editor for Surah 76
    And I join 4–6 with the Passage above
    Then there is 1 Unpublished change
    When another Admin publishes Surah 76's 11–14 and 15–18 joined, moving its version on
    And I open the Passage editor for Surah 76
    Then there are no Unpublished changes
    And the editor's Passages are Neon's
    And Undo is disabled
    When I join 4–6 with the Passage above
    And I reload the page
    Then there is 1 Unpublished change
    And the editor's Passages are Neon's, with "1–6" in place of "1–3, 4–6"

  @AC-8 @AC-10
  Scenario: Unpublished changes are kept for their own Surah
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I open the Passage editor for Surah 19
    Then there are no Unpublished changes
    And the editor's Passages are Neon's
    When I open the Passage editor for Surah 18
    Then there is 1 Unpublished change
    And the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"

  # ----------------------------------------------------------------------- phone

  @AC-9 @AC-10
  Scenario: On a phone, ✂︎ is always visible, and splitting and naming a Passage work by tapping, with the title fields stacked
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    Then the ✂︎ New Passage from Ayah 86 control is visible without hovering
    When I split 83–88 at Ayah 86
    Then the editor's Passages are Neon's, with "83–85, 86–88" in place of "83–88"
    And the focus is in 86–88's title fields
    And 86–88's Urdu title field is below its English one
    When I type the Passage titles of 89–91 into 86–88's title fields
    And I tap elsewhere on the page
    Then 86–88's title fields are closed
    And 86–88 has the Passage titles of 89–91
    And there are 2 Unpublished changes
    And Publish is enabled
    And I save a screenshot "AC-9-passage-editor-light-phone"

  @AC-9 @AC-10
  Scenario: On a phone, retitle, join, ↑ / ↓, the summary, Undo and the translation switch work by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    And I switch the Ayah translation to Urdu
    Then Ayah 18:10 shows its Urdu Ayah translation and not its English one
    When I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I tap elsewhere on the page
    Then 89–91 has the Passage titles of 92–94
    When I join 92–94 with the Passage above
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    When I move the start of 95–98 one Ayah later
    And I move the start of 96–98 one Ayah earlier
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    And there are 4 Unpublished changes
    And the summary is "Surah 18: retitle 89–91; join 92–94 into 89–91; move start of 95–98 to 96; move start of 96–98 to 95"
    When I undo
    Then there are 3 Unpublished changes
    And the editor's Passages are Neon's, with "89–95, 96–98" in place of "89–91, 92–94, 95–98"

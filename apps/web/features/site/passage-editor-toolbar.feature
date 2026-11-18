@issue-171
Feature: The Passage editor's toolbar
  An Admin reviews a Surah's Passages in the Passage editor in the way that
  suits the check they are doing. One toolbar at the top of the editor, which
  sticks to the top of the window while the page scrolls, holds:
  - the Ayah translation switch, "Ayah translation": Off · Urdu · English;
  - the Ayah layout switch, "Ayah layout": Ayah by Ayah · Flowing;
  - two icon buttons with no text, only a tooltip and an aria-label, "Expand
    all Passages" and "Collapse all Passages", each disabled when it would
    change nothing (collapsed-passages.feature).
  On a phone the toolbar wraps to two rows: the switches on one, the icons at
  the end of the other.

  With the Ayah translation Off only the Arabic is shown, in either Ayah
  layout. Flowing sets out each Passage on its own as the Share page's Flowing
  does: its Ayahs' Arabic runs together, each ending with its end-of-Ayah
  marker, then, when an Ayah translation is on, the Ayah translations as one
  paragraph with each Ayah's number marked. Flowing is for reading only: no ✂︎,
  no drop places, no draggable Passage heading; Retitle, Join with above and
  ↑ / ↓ still work.

  The Ayah translation and Ayah layout choices are kept in the Admin's
  browser, per device, for all Surahs; a first visit starts on English and Ayah
  by Ayah, and the editor still works when browser storage is unavailable. No
  choice here is an Unpublished change or changes the summary.

  Arabic, end-of-Ayah markers and Ayah translations are read from the sources;
  ranges from what Neon holds (the run's Postgres, as
  passages-in-the-test-database.ts arranges it); none is typed.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # --------------------------------------------------------------- the toolbar

  @AC-1
  Scenario: One toolbar at the top of the editor holds both switches and the two icon buttons
    When I open the Passage editor for Surah 18
    Then the editor's toolbar is above its first Passage
    And the toolbar's Ayah translation switch offers "Off, Urdu, English", with English chosen
    And the toolbar's Ayah layout switch offers "Ayah by Ayah, Flowing", with Ayah by Ayah chosen
    And the toolbar holds "Expand all Passages", with a tooltip and no text
    And the toolbar holds "Collapse all Passages", with a tooltip and no text
    And the page has only the toolbar's Ayah translation switch

  @AC-1
  Scenario: The toolbar sticks to the top of the window while the editor scrolls
    When I open the Passage editor for Surah 18
    And I scroll down to Ayah 18:100
    Then the toolbar is at the top of the window
    And Ayah 18:1 is scrolled out of sight

  # ------------------------------------------------------- Ayah translation Off

  @AC-7
  Scenario Outline: With the Ayah translation Off, <Layout> shows only the Arabic
    Given I am signed in as the Admin in a browser that chose the Uthmani Script
    When I open the Passage editor for Surah 18
    And I choose the <Layout> Ayah layout
    And I turn the Ayah translation Off
    Then the Ayah translation switch shows Off chosen
    And Ayah 18:10 shows its Uthmani text and no Ayah translation
    And Ayah 18:84 shows its Uthmani text and no Ayah translation
    And Ayah 18:110 shows its Uthmani text and no Ayah translation

    Examples:
      | Layout       |
      | Ayah by Ayah |
      | Flowing      |

  @AC-7
  Scenario: Turning the Ayah translation back on shows it again
    When I open the Passage editor for Surah 18
    And I turn the Ayah translation Off
    And I switch the Ayah translation to Urdu
    Then Ayah 18:10 shows its Urdu Ayah translation and not its English one

  # ------------------------------------------------------------------- Flowing

  @AC-8
  Scenario Outline: Flowing runs each Passage's <Script> Arabic together with end-of-Ayah markers, then one <Language> paragraph with Ayah numbers marked
    Given I am signed in as the Admin in a browser that chose the <Script> Script
    When I open the Passage editor for Surah 18
    And I switch the Ayah translation to <Language>
    And I choose the Flowing Ayah layout
    Then the Ayah layout switch shows Flowing chosen
    And 83–88 shows its Ayahs Flowing in <Script>, then its <Language> Ayah translations as one paragraph with each Ayah's number marked
    And 89–91 shows its Ayahs Flowing in <Script>, then its <Language> Ayah translations as one paragraph with each Ayah's number marked

    Examples:
      | Script   | Language |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |

  @AC-8 @AC-7
  Scenario: Flowing with the Ayah translation Off runs each Passage's Arabic together and shows no translation paragraph
    Given I am signed in as the Admin in a browser that chose the Uthmani Script
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    And I turn the Ayah translation Off
    Then 83–88 shows its Ayahs Flowing in Uthmani, with no Ayah translation

  @AC-8
  Scenario: Flowing offers no ✂︎, no drop places and no draggable Passage heading
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    Then no ✂︎ New Passage control is offered
    And no Passage heading is draggable
    When I start dragging the Passage heading of 95–98
    Then no drop place is shown

  @AC-8 @AC-10
  Scenario: In Flowing, Retitle, Join with above and ↑ / ↓ still work
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I press Enter
    Then 89–91 has the Passage titles of 92–94
    When I join 92–94 with the Passage above
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    When I move the start of 95–98 one Ayah later
    Then the editor's Passages are Neon's, with "89–95, 96–98" in place of "89–91, 92–94, 95–98"
    When I move the start of 96–98 one Ayah earlier
    Then the editor's Passages are Neon's, with "89–94, 95–98" in place of "89–91, 92–94, 95–98"
    And there are 4 Unpublished changes
    And the summary is "Surah 18: retitle 89–91; join 92–94 into 89–91; move start of 95–98 to 96; move start of 96–98 to 95"
    And the Ayah layout switch shows Flowing chosen

  # -------------------------------------------------------- remembered choices

  @AC-9
  Scenario: A first visit starts on English and Ayah by Ayah
    When I open the Passage editor for Surah 18
    Then the Ayah translation switch shows English chosen
    And the Ayah layout switch shows Ayah by Ayah chosen
    And Ayah 18:10 shows its English Ayah translation and not its Urdu one

  @AC-9
  Scenario: The Ayah translation and Ayah layout choices survive a reload and carry across Surahs
    Given I am signed in as the Admin in a browser that chose the Uthmani Script
    When I open the Passage editor for Surah 18
    And I switch the Ayah translation to Urdu
    And I choose the Flowing Ayah layout
    And I reload the page
    Then the Ayah translation switch shows Urdu chosen
    And the Ayah layout switch shows Flowing chosen
    And 83–88 shows its Ayahs Flowing in Uthmani, then its Urdu Ayah translations as one paragraph with each Ayah's number marked
    When I open the Passage editor for Surah 19
    Then the Ayah translation switch shows Urdu chosen
    And the Ayah layout switch shows Flowing chosen
    When I turn the Ayah translation Off
    And I choose the Ayah by Ayah Ayah layout
    And I open the Passage editor for Surah 18
    Then the Ayah translation switch shows Off chosen
    And the Ayah layout switch shows Ayah by Ayah chosen
    And Ayah 18:10 shows its Uthmani text and no Ayah translation

  @AC-9 @AC-10
  Scenario: With browser storage unavailable the editor still works, and its choices last only until a reload
    Given I am signed in as the Admin in a browser whose storage is unavailable
    When I open the Passage editor for Surah 18
    Then the Ayah translation switch shows English chosen
    And the Ayah layout switch shows Ayah by Ayah chosen
    When I switch the Ayah translation to Urdu
    And I choose the Flowing Ayah layout
    Then the Ayah translation switch shows Urdu chosen
    And the Ayah layout switch shows Flowing chosen
    When I collapse all Passages
    Then every Passage is collapsed
    When I join 92–94 with the Passage above
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    When I reload the page
    Then the Ayah translation switch shows English chosen
    And the Ayah layout switch shows Ayah by Ayah chosen

  # ----------------------------------------------------- not Unpublished changes

  @AC-10
  Scenario: Switching the Ayah translation and Ayah layout and collapsing Passages is no Unpublished change
    When I open the Passage editor for Surah 18
    And I turn the Ayah translation Off
    And I choose the Flowing Ayah layout
    And I collapse all Passages
    And I expand Passage 89–91
    And I expand all Passages
    And I collapse Passage 83–88
    Then there are no Unpublished changes
    And Undo is disabled

  @AC-10
  Scenario: These choices leave an Unpublished change and its summary as they were
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    Then there is 1 Unpublished change
    And the summary is "Surah 18: join 92–94 into 89–91"
    When I switch the Ayah translation to Urdu
    And I turn the Ayah translation Off
    And I choose the Flowing Ayah layout
    And I choose the Ayah by Ayah Ayah layout
    And I collapse Passage 89–94
    And I collapse all Passages
    And I expand all Passages
    Then there is 1 Unpublished change
    And the summary is "Surah 18: join 92–94 into 89–91"
    When I undo
    Then there are no Unpublished changes
    And the editor's Passages are Neon's

  # --------------------------------------------------------------------- phone

  @AC-11 @AC-1
  Scenario: On a phone the toolbar wraps to two rows, the switches on one and the icons at the end of the other
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    Then the toolbar's two switches share one row
    And the toolbar's icon buttons are on the row below, at its end
    And the toolbar fits the phone's width

  @AC-11 @AC-7 @AC-8 @AC-9 @AC-10
  Scenario: On a phone, the Ayah translation and Ayah layout switch by tapping, and Flowing still edits by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    And I turn the Ayah translation Off
    Then the Ayah translation switch shows Off chosen
    And Ayah 18:10 shows its Arabic and no Ayah translation
    When I switch the Ayah translation to English
    And I choose the Flowing Ayah layout
    Then the Ayah layout switch shows Flowing chosen
    And no ✂︎ New Passage control is offered
    When I join 92–94 with the Passage above
    And I move the start of 95–98 one Ayah later
    Then the editor's Passages are Neon's, with "89–95, 96–98" in place of "89–91, 92–94, 95–98"
    And there are 2 Unpublished changes
    When I reload the page
    Then the Ayah translation switch shows English chosen
    And the Ayah layout switch shows Flowing chosen

  # --------------------------------------------------------------- screenshots

  @AC-12 @AC-8
  Scenario: Flowing in light mode on a desktop
    Given my system prefers a light colour scheme
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    Then 1–5 shows its Ayahs Flowing, then its English Ayah translations as one paragraph with each Ayah's number marked
    And I save a screenshot "AC-12-flowing-light-desktop"

  @AC-12 @AC-8 @AC-11
  Scenario: Flowing in light mode on a phone
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    And my system prefers a light colour scheme
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    Then 1–5 shows its Ayahs Flowing, then its English Ayah translations as one paragraph with each Ayah's number marked
    And I save a screenshot "AC-12-flowing-light-phone"

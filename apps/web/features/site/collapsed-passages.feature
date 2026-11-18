@issue-171
Feature: Collapsed Passages in the Passage editor
  An Admin collapses Passages to scan their titles and boundaries. Each
  Passage heading starts with a chevron, ▾ when the Passage is open and ▸ when
  it is collapsed, labelled "Collapse Passage 83–88" or "Expand Passage 83–88";
  only the chevron toggles, and the title still opens the title fields. A
  Collapsed Passage shows only its Passage heading, its Ayahs hidden: Retitle,
  Join with above and ↑ / ↓ still work on it, and ✂︎ isn't offered. The
  toolbar's "Collapse all Passages" and "Expand all Passages" icon buttons
  collapse or expand every Passage, each disabled when it would change nothing.

  Collapsed state follows a Passage through edits: Join gives the merged
  Passage the state of the Passage above; ↑ / ↓ keep each Passage's state while
  its range changes; Split, possible only on an open Passage, leaves both halves
  open; a Passage that Undo brings back is open. Dragging a Passage heading
  opens the dragged Passage and the one above for as long as the drag lasts
  before putting back their earlier state. Collapsed state isn't kept: every Surah
  opens with every Passage open, after a reload or a Publish too (that one is
  proved in publishing.feature, where scenarios that publish run one at a time). Collapsing is
  never an Unpublished change.

  A Passage is open when its Ayahs' Arabic is shown in it, and collapsed when
  none of its Ayahs' Arabic or Ayah translations is. Arabic and Ayah
  translations are read from the sources; ranges and titles from what Neon
  holds (the run's Postgres, as passages-in-the-test-database.ts arranges it);
  none is typed.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # ------------------------------------------------------------------ chevrons

  @AC-2
  Scenario: Every Passage heading starts with a chevron, and every Passage opens open
    When I open the Passage editor for Surah 18
    Then every Passage heading starts with a chevron labelled "Collapse Passage <range>"
    And every Passage is open
    And "Expand all Passages" is disabled
    And "Collapse all Passages" is enabled

  @AC-2 @AC-3
  Scenario: The chevron collapses and expands only its own Passage
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    Then Passage 89–91 is collapsed
    And its chevron is labelled "Expand Passage 89–91"
    And every Passage but 89–91 is open
    When I expand Passage 89–91
    Then Passage 89–91 is open
    And its chevron is labelled "Collapse Passage 89–91"
    And every Passage is open

  @AC-2
  Scenario: Clicking a Passage's title opens its title fields and doesn't collapse or expand it
    When I open the Passage editor for Surah 18
    And I edit the Passage titles of 89–91
    Then 89–91's title fields are open
    And Passage 89–91 is open
    When I press Escape
    And I collapse Passage 89–91
    And I edit the Passage titles of 89–91
    Then 89–91's title fields are open
    And Passage 89–91 is collapsed

  # --------------------------------------------------------- a Collapsed Passage

  @AC-3
  Scenario: A Collapsed Passage shows only its Passage heading and offers no ✂︎
    When I open the Passage editor for Surah 18
    And I collapse Passage 83–88
    Then Passage 83–88 is collapsed
    And 83–88 shows its Passage titles
    And 83–88 offers no ✂︎
    And 83–88 offers Join with above, and ↑ and ↓

  @AC-3 @AC-10
  Scenario: A Collapsed Passage can be retitled
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I press Enter
    Then 89–91's title fields are closed
    And 89–91 has the Passage titles of 92–94
    And Passage 89–91 is collapsed
    And there is 1 Unpublished change
    And the summary is "Surah 18: retitle 89–91"

  @AC-3 @AC-5 @AC-10
  Scenario: A Collapsed Passage can be joined with the one above, and moved by ↑ and ↓
    When I open the Passage editor for Surah 18
    And I collapse Passage 95–98
    And I move the start of 95–98 one Ayah later
    Then the editor's Passages are Neon's, with "92–95, 96–98" in place of "92–94, 95–98"
    And Passage 96–98 is collapsed
    And Passage 92–95 is open
    When I move the start of 96–98 one Ayah earlier
    Then the editor's Passages are Neon's
    And Passage 95–98 is collapsed
    When I join 95–98 with the Passage above
    Then the editor's Passages are Neon's, with "92–98" in place of "92–94, 95–98"
    And there are 3 Unpublished changes

  # ----------------------------------------------------- Collapse all, Expand all

  @AC-4 @AC-1
  Scenario: Collapse all collapses every Passage and Expand all expands every Passage; each Passage still toggles after
    When I open the Passage editor for Surah 18
    And I collapse all Passages
    Then every Passage is collapsed
    And "Collapse all Passages" is disabled
    And "Expand all Passages" is enabled
    When I expand Passage 89–91
    Then every Passage but 89–91 is collapsed
    And "Collapse all Passages" is enabled
    And "Expand all Passages" is enabled
    When I expand all Passages
    Then every Passage is open
    And "Expand all Passages" is disabled
    And "Collapse all Passages" is enabled
    When I collapse Passage 89–91
    Then every Passage but 89–91 is open
    And "Expand all Passages" is enabled

  @AC-4 @AC-1
  Scenario: Collapsing every Passage one by one disables Collapse all
    When I open the Passage editor for Surah 1
    And I collapse every Passage by its chevron
    Then every Passage is collapsed
    And "Collapse all Passages" is disabled
    And "Expand all Passages" is enabled

  # ------------------------------------------------- state through edits

  @AC-5 @AC-10
  Scenario Outline: Join gives the merged Passage the state of the Passage above (<Above> above, <Below> below)
    When I open the Passage editor for Surah 18
    And I make Passage 89–91 <Above>
    And I make Passage 92–94 <Below>
    And I join 92–94 with the Passage above
    Then the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    And Passage 89–94 is <Above>
    And there is 1 Unpublished change

    Examples:
      | Above     | Below     |
      | collapsed | open      |
      | open      | collapsed |

  @AC-5 @AC-10
  Scenario: ↑ keeps each Passage's state while its range changes
    When I open the Passage editor for Surah 18
    And I collapse Passage 92–94
    And I move the start of 95–98 one Ayah earlier
    Then the editor's Passages are Neon's, with "92–93, 94–98" in place of "92–94, 95–98"
    And Passage 92–93 is collapsed
    And Passage 94–98 is open

  @AC-5 @AC-10
  Scenario: Split, offered only on an open Passage, leaves both halves open and opens the new half's title fields
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    And I split 83–88 at Ayah 86
    Then the editor's Passages are Neon's, with "83–85, 86–88" in place of "83–88"
    And Passage 83–85 is open
    And Passage 86–88 is open
    And 86–88's title fields are open
    And Passage 89–91 is collapsed

  @AC-5 @AC-10
  Scenario: A Passage that Undo brings back is open
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    And I collapse Passage 92–94
    And I join 92–94 with the Passage above
    Then Passage 89–94 is collapsed
    When I undo
    Then the editor's Passages are Neon's
    And Passage 92–94 is open

  # ------------------------------------------------------------------ dragging

  @AC-6
  Scenario: Dragging a Collapsed Passage's heading opens it and the Passage above while the drag lasts, then puts back their state
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    And I collapse Passage 92–94
    And I collapse Passage 95–98
    And I start dragging the Passage heading of 95–98
    Then only the gaps before Ayahs "93, 94, 96, 97, 98" are highlighted as drop places
    And Passage 92–94 is open
    And Passage 89–91 is collapsed
    When I let go of it where it can't be dropped
    Then no drop place is shown
    And Passage 92–94 is collapsed
    And Passage 95–98 is collapsed
    And Passage 89–91 is collapsed
    And there are no Unpublished changes

  @AC-6 @AC-5 @AC-10
  Scenario: After a drop, the dragged Passage and the one above go back to their state with their new ranges
    When I open the Passage editor for Surah 18
    And I collapse Passage 92–94
    And I collapse Passage 95–98
    And I start dragging the Passage heading of 95–98
    Then only the gaps before Ayahs "93, 94, 96, 97, 98" are highlighted as drop places
    When I drop it on the gap before Ayah 97
    Then the editor's Passages are Neon's, with "92–96, 97–98" in place of "92–94, 95–98"
    And Passage 92–96 is collapsed
    And Passage 97–98 is collapsed
    And there is 1 Unpublished change

  @AC-6
  Scenario: Dragging an open Passage's heading under a Collapsed Passage leaves the dragged Passage open after
    When I open the Passage editor for Surah 18
    And I collapse Passage 92–94
    And I start dragging the Passage heading of 95–98
    Then only the gaps before Ayahs "93, 94, 96, 97, 98" are highlighted as drop places
    When I let go of it where it can't be dropped
    Then Passage 92–94 is collapsed
    And Passage 95–98 is open

  # ---------------------------------------------------------------- not kept

  @AC-9
  Scenario: A reload opens every Passage
    When I open the Passage editor for Surah 18
    And I collapse all Passages
    And I reload the page
    Then every Passage is open
    And "Expand all Passages" is disabled

  @AC-9
  Scenario: Every Surah opens with every Passage open, even one left collapsed
    When I open the Passage editor for Surah 18
    And I collapse Passage 89–91
    And I open the Passage editor for Surah 19
    Then every Passage is open
    When I open the Passage editor for Surah 18
    Then every Passage is open

  # ------------------------------------------------------------------- phone

  @AC-11 @AC-2 @AC-3 @AC-4 @AC-10
  Scenario: On a phone, collapsing, expanding and editing a Collapsed Passage work by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    And I collapse all Passages
    Then every Passage is collapsed
    When I expand Passage 89–91
    Then every Passage but 89–91 is collapsed
    When I collapse Passage 89–91
    And I edit the Passage titles of 89–91
    And I type the Passage titles of 92–94 into 89–91's title fields
    And I tap elsewhere on the page
    Then 89–91 has the Passage titles of 92–94
    When I join 92–94 with the Passage above
    And I move the start of 95–98 one Ayah later
    Then the editor's Passages are Neon's, with "89–95, 96–98" in place of "89–91, 92–94, 95–98"
    And Passage 89–95 is collapsed
    And Passage 96–98 is collapsed
    When I expand all Passages
    Then every Passage is open
    And there are 3 Unpublished changes

  # --------------------------------------------------------------- screenshots

  @AC-12 @AC-3
  Scenario: The collapsed view in light mode on a desktop
    Given my system prefers a light colour scheme
    When I open the Passage editor for Surah 18
    And I collapse all Passages
    And I expand Passage 83–88
    Then every Passage but 83–88 is collapsed
    And I save a screenshot "AC-12-collapsed-passages-light-desktop"

  @AC-12 @AC-3 @AC-11
  Scenario: The collapsed view in light mode on a phone
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    And my system prefers a light colour scheme
    When I open the Passage editor for Surah 18
    And I collapse all Passages
    Then every Passage is collapsed
    And I save a screenshot "AC-12-collapsed-passages-light-phone"

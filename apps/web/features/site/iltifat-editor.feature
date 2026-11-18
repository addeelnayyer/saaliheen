@issue-142
Feature: The Iltifat editor
  An Admin goes through the Iltifat one at a time at /admin/iltifat, behind the
  Admin gate and allow-list, reached from the Admin home. Marked Words are
  #143's, not this editor's yet.

  The list, /admin/iltifat, is headed "Iltifat" and shows the Iltifat by
  Iltifat direction, in the overview's order (He → We, We → He, He → You,
  You → He): each direction a heading naming it, then a link for each of its
  Iltifat, in Quran order, naming its run (1:2–5) and opening
  /admin/iltifat/{id}.

  An Iltifat's editor, /admin/iltifat/{id}, is headed with its Iltifat
  direction and run, and shows its run as Word cards in the Script this
  browser chose, then its fields: "Reason" (a text box), "First Ayah" and
  "Last Ayah" (number fields, its run within its Surah) and "Disputed" (a
  checkbox), and a "Save" button. A save that passes says "Saved"; a save the
  server refuses shows its message as an alert, the edits kept. "Previous
  Iltifat" and "Next Iltifat" move along the list, the first having no
  Previous and the last no Next. With unsaved changes, following them, or
  leaving the page, asks first through the browser's own confirmation; Iltifat
  are never added or deleted there.

  These scenarios save Iltifat, so they run on their own, one at a time, once
  every other site scenario has run (playwright.config.ts's project
  "iltifat-editor"). Each saving scenario saves an Iltifat of its own. The
  Iltifat are read from the run's own Postgres at the moment a step needs
  them; Arabic is read from the sources; reasons an Admin types are English
  sentences written here.

  # ---------------------------------------------------------------- AC-1: Admins only

  @AC-1 @AC-12
  Scenario Outline: A signed-in person not on the Admin allow-list can't reach <Path>
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open "<Path>"
    Then I see the "not an Admin" page, not an error
    And the page shows no Iltifat editor

    Examples:
      | Path              |
      | /admin/iltifat    |
      | /admin/iltifat/1  |

  @AC-1
  Scenario Outline: A visitor who isn't signed in and opens <Path> is sent to sign in
    Given I am not signed in
    When I open "<Path>"
    Then I am on the admin sign-in page, offering GitHub and Google

    Examples:
      | Path              |
      | /admin/iltifat    |
      | /admin/iltifat/1  |

  # ---------------------------------------------------------------- AC-2: the list, and opening each Iltifat

  @AC-2
  Scenario: The Admin home links to the Iltifat editor
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I follow the Admin home's link "Iltifat"
    Then I am on the admin page "/admin/iltifat"

  @AC-2
  Scenario: The list shows every Iltifat by Iltifat direction, in Quran order
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Iltifat editor's list
    Then the Iltifat editor's list is headed "Iltifat"
    And the Iltifat editor's list shows these Iltifat directions, in this order, each heading its own Iltifat:
      | direction |
      | He → We   |
      | We → He   |
      | He → You  |
      | You → He  |
    And under each direction the list links to every Iltifat of that direction in the database, in Quran order, each link naming its run

  @AC-2
  Scenario: Every Iltifat in the list opens its editor, headed with its direction and run
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Iltifat editor's list
    Then every link of the Iltifat editor's list opens an editor headed with that Iltifat's direction and run

  @AC-2
  Scenario: Opening the He → You Iltifat at 1:2–5 shows its direction, its run as Word cards and its fields
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Iltifat editor's list
    And I follow the list's link to the He → You Iltifat at 1:2–5
    Then the editor is headed with the Iltifat direction "He → You" and the run "1:2–5"
    And the editor's Word cards are exactly the Word locations of Ayahs 1:2 to 1:5, in reading order
    And the editor's Reason holds that Iltifat's reason from the database
    And the editor's run is First Ayah 2 and Last Ayah 5
    And the editor's Disputed checkbox is not checked

  @AC-2
  Scenario Outline: The editor's Word cards are in the chosen <Script> Script
    Given I am signed in as the Admin in a browser that chose the <Script> Script
    When I open the editor of the He → You Iltifat at 1:2–5
    Then every Word card of the editor shows its <Script> text and not its <Other> text

    Examples:
      | Script   | Other    |
      | Uthmani  | Indo-Pak |
      | Indo-Pak | Uthmani  |

  # ---------------------------------------------------------------- AC-3, AC-8, AC-12: edit, save, see it

  @AC-3 @AC-8 @AC-12
  Scenario: An Admin edits the reason of the He → You Iltifat at 1:2–5, saves, and its Iltifat page shows it
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And a reader has opened "/en/iltifat/he-to-you"
    When I open the editor of the He → You Iltifat at 1:2–5
    And I replace the editor's Reason with "The praise turns into direct address once the worshipper stands before Him."
    And I press the editor's "Save"
    Then the editor says "Saved"
    When I open "/en/iltifat/he-to-you"
    Then the entry of the He → You Iltifat cited at 1:5 shows the reason "The praise turns into direct address once the worshipper stands before Him."
    When I reload the editor of the He → You Iltifat cited at 1:5
    Then the editor's Reason holds "The praise turns into direct address once the worshipper stands before Him."

  @AC-3 @AC-8
  Scenario: An Admin marks the He → We Iltifat at 17:1 Disputed, and its chip and its entry say so
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And a reader has opened "/en/17"
    When I open the editor of the He → We Iltifat at 17:1
    And I tick the editor's Disputed checkbox
    And I press the editor's "Save"
    Then the editor says "Saved"
    When I open "/en/17"
    Then Ayah 17:1's chip for the He → We Iltifat cited there says Disputed
    And Ayah 17:1's chip for the We → He Iltifat cited there does not say Disputed
    When I open "/en/iltifat/he-to-we"
    Then the entry of the He → We Iltifat cited at 17:1 shows a Disputed tag

  @AC-3 @AC-8
  Scenario: An Admin moves the run of the You → He Iltifat at 10:22 within its Surah, and its entry is headed with the new run
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the You → He Iltifat at 10:22
    And I set the editor's run to First Ayah 22 and Last Ayah 23
    And I press the editor's "Save"
    Then the editor says "Saved"
    And the editor's Word cards are exactly the Word locations of Ayahs 10:22 to 10:23, in reading order
    When I open "/en/iltifat/you-to-he"
    Then the entry of the You → He Iltifat cited at 10:22 is headed with the run "10:22–23"

  # ---------------------------------------------------------------- AC-4, AC-5, AC-6: refused saves, shown clearly

  @AC-5
  Scenario: A save with an empty reason is refused with a clear message, and the edits are kept
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → You Iltifat at 2:23–25
    And I replace the editor's Reason with ""
    And I press the editor's "Save"
    Then the editor shows the alert "The reason can't be empty."
    And the editor's Reason holds ""
    And the He → You Iltifat at 2:23–25 in the database is unchanged

  @AC-6
  Scenario Outline: A save of the run <from> to <to> for the He → You Iltifat at 2:23–25 is refused with a clear message
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → You Iltifat at 2:23–25
    And I set the editor's run to First Ayah <from> and Last Ayah <to>
    And I press the editor's "Save"
    Then the editor shows the alert "<message>"
    And the He → You Iltifat at 2:23–25 in the database is unchanged

    Examples:
      | from | to  | message                                            |
      | 23   | 287 | The run must lie within Surah 2, Ayahs 1 to 286.   |
      | 23   | 24  | The run must hold the cited Ayah, 2:25.            |

  @AC-4
  Scenario: A save made in a second tab after another save is refused with a clear message
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → You Iltifat at 2:23–25 in two tabs
    And in the first tab I replace the editor's Reason with "Saved first, in the first tab." and press "Save"
    Then the first tab's editor says "Saved"
    When in the second tab I replace the editor's Reason with "Saved second, in the second tab." and press "Save"
    Then the second tab's editor shows the alert "This Iltifat has been saved since you opened it. Reload it to see the latest."
    And the He → You Iltifat at 2:23–25 in the database has the reason "Saved first, in the first tab."

  # ---------------------------------------------------------------- AC-9: next, previous, unsaved changes

  @AC-9
  Scenario: Next and Previous move along the list, across Iltifat directions
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the first Iltifat of the list
    Then the editor offers no "Previous Iltifat"
    When I follow the editor's "Next Iltifat"
    Then the editor is the list's second Iltifat
    When I follow the editor's "Previous Iltifat"
    Then the editor is the list's first Iltifat
    When I open the editor of the last He → We Iltifat of the list
    And I follow the editor's "Next Iltifat"
    Then the editor is the list's first We → He Iltifat
    When I open the editor of the last Iltifat of the list
    Then the editor offers no "Next Iltifat"

  @AC-9
  Scenario: Leaving an Iltifat with unsaved changes asks first, and staying keeps them
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → You Iltifat at 1:2–5
    And I replace the editor's Reason with "An unsaved reason."
    And I follow the editor's "Next Iltifat", choosing to stay when asked
    Then the browser asked me to confirm leaving
    And the editor is the He → You Iltifat at 1:2–5
    And the editor's Reason holds "An unsaved reason."
    When I follow the editor's "Next Iltifat", choosing to leave when asked
    Then the browser asked me to confirm leaving
    And the editor is the Iltifat after the He → You Iltifat at 1:2–5 in the list
    And the He → You Iltifat cited at 1:5 in the database does not have the reason "An unsaved reason."

  @AC-9
  Scenario: Reloading with unsaved changes asks first; without changes, nothing asks
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → You Iltifat at 1:2–5
    And I follow the editor's "Next Iltifat"
    Then the browser did not ask me to confirm leaving
    And the editor is the Iltifat after the He → You Iltifat at 1:2–5 in the list
    When I tick the editor's Disputed checkbox
    And I reload the page, choosing to stay when asked
    Then the browser asked me to confirm leaving

  # ---------------------------------------------------------------- AC-10: no adding, no deleting

  @AC-10
  Scenario: Neither the list nor an Iltifat's editor offers adding or deleting an Iltifat
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Iltifat editor's list
    Then the page offers no control to add, create, delete or remove an Iltifat
    When I open the editor of the He → You Iltifat at 1:2–5
    Then the page offers no control to add, create, delete or remove an Iltifat

  # ---------------------------------------------------------------- AC-11: phone width, keyboard

  @AC-11
  Scenario: On a phone, the list and the editor fit the screen, and a save works by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Iltifat editor's list
    Then nothing on the page reaches past the screen's width
    And I save a screenshot "AC-11-iltifat-list-light-phone"
    When I open the editor of the We → He Iltifat at 10:21–22
    Then nothing on the page reaches past the screen's width
    And the editor's Word cards, Reason, First Ayah, Last Ayah, Disputed and Save all lie within the screen's width
    When I tap the editor's Reason and replace it with "Saved by tapping on a phone."
    And I tap the editor's "Save"
    Then the editor says "Saved"
    And I save a screenshot "AC-11-iltifat-editor-light-phone"

  @AC-11
  Scenario: By keyboard alone, an Admin reaches every field in order, edits, ticks Disputed and saves
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the He → We Iltifat at 10:23
    And I press Tab from the top of the page
    Then pressing Tab reaches Reason, First Ayah, Last Ayah, Disputed and Save in that order, each showing a focus ring
    When I press Tab until the editor's Reason has the focus
    And I select all and type "Saved by keyboard alone."
    And I press Tab until the editor's Disputed checkbox has the focus
    And I press Space
    And I press Tab until the editor's "Save" has the focus
    And I press Enter
    Then the editor says "Saved"
    And the He → We Iltifat cited at 10:23 in the database has the reason "Saved by keyboard alone." and is Disputed
    And I save a screenshot "AC-11-iltifat-editor-keyboard-light-desktop"

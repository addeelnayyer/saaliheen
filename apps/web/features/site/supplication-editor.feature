@issue-201
Feature: The Supplication editor
  An Admin corrects the Supplications one at a time at /admin/supplications,
  behind the Admin gate and allow-list, reached from the Admin home.

  The list, /admin/supplications, is headed "Supplications" and keeps its
  entries with the Supplications page's filters: the Opening chips, "Prophets
  only" and "Show other words to Allah", off at first. Each entry is headed
  with its Surah's Latin name and run ("Al-Baqarah 2:127–129"), a link
  opening /admin/supplications/{id}.

  A Supplication's editor, /admin/supplications/{id}, is headed with its kind
  and its Surah and run, and shows its Ayahs, each as Word cards (#271) with
  its Ayah translation, then its fields: "Speaker" (a choice of the Speakers), the
  Openings "Rabbana", "Rabbi" and "Other" (checkboxes), "Kind" (Supplication
  or one of the Other words to Allah) and "First Ayah" and "Last Ayah" (number
  fields, its run within its Surah), and a "Save" button. A save that passes
  says "Saved"; a save the server refuses shows its sentence as an alert, the
  choices kept. A save made against an older version also shows the latest
  save beside the choices, and Save then saves the choices over it.

  The list links to "Add a Supplication", /admin/supplications/new, where a
  "Surah" is chosen before the fields a Supplication's editor has, and "Add"
  adds it and opens its editor; and to "Speakers",
  /admin/supplications/speakers, where each Speaker is a form named with their
  English name, of "English name", "Urdu name", "Includes a Prophet" and
  "Save" (#202). A Supplication's editor also has "Delete", which asks for a
  second press, "Delete for good", and then goes back to the list. A save
  sends the Supplication's spans with the rest, kept as they were unless the
  Admin marks them on the Word cards
  (features/site/supplication-editor-spans.feature), and an add sends none
  (#270).

  These scenarios save, add and delete Supplications and save Speakers, so
  they run on their own, one at a time, in order, once every other site
  scenario has run (playwright.config.ts's project "supplication-editor").
  Each leaves the Supplications as the scenarios after it read them. The
  Supplications are read from the run's own Postgres at the moment a step
  needs them; runs, Speakers and Surah names are the curated file's.

  # ---------------------------------------------------------------- Admins only

  Scenario Outline: A signed-in person not on the Admin allow-list can't reach <Path>
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open "<Path>"
    Then I see the "not an Admin" page, not an error
    And the page shows no Supplication editor

    Examples:
      | Path                    |
      | /admin/supplications    |
      | /admin/supplications/1  |

  Scenario Outline: A visitor who isn't signed in and opens <Path> is sent to sign in
    Given I am not signed in
    When I open "<Path>"
    Then I am on the admin sign-in page, offering GitHub and Google

    Examples:
      | Path                    |
      | /admin/supplications    |
      | /admin/supplications/1  |

  # ---------------------------------------------------------------- the list, and a Supplication's editor

  Scenario: The Admin home links to the Supplication editor
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I follow the Admin home's link "Supplications"
    Then I am on the admin page "/admin/supplications"

  Scenario: Opening the Supplication at 28:16 shows its Ayah and its fields
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the Supplication at 28:16
    Then the editor is headed "Supplication · Al-Qasas 28:16"
    And the editor shows the Word cards and the Ayah translation of Ayah 28:16, and no other Ayah
    And the editor's Speaker is "Musa", its Openings are "Rabbi", its kind is "Supplication" and its run is First Ayah 16 and Last Ayah 16

  # ---------------------------------------------------------------- correcting a Supplication

  Scenario: An Admin finds the Supplication at 2:127–129 through the filters, corrects its Openings and run, and the Supplications page shows it
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And a reader has opened "/en/supplications?opening=rabbi"
    When I open "/admin/supplications"
    And I choose the "Rabbana" Opening chip on the Supplications page
    And I follow the Supplication editor's list's link "Al-Baqarah 2:127–129"
    And I tick the editor's Opening "Rabbi"
    And I set the editor's run to First Ayah 127 and Last Ayah 128
    And I press the editor's "Save"
    Then the editor says "Saved"
    And the editor is headed "Supplication · Al-Baqarah 2:127–128"
    And the Supplication at 2:127–128 in the database has the Openings "rabbana, rabbi"
    When I open "/en/supplications?opening=rabbi"
    Then the Supplications page has an entry headed "Al-Baqarah 2:127–128" and none headed "Al-Baqarah 2:127–129"

  Scenario: A run taking in another Supplication's Ayah is refused, naming it, and the choices are kept
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the Supplication at 28:16
    And I set the editor's run to First Ayah 16 and Last Ayah 17
    And I press the editor's "Save"
    Then the editor shows the alert "Ayah 28:17 is already in the Supplication at Al-Qasas 28:17. Take it out of that one first."
    And the editor's run is First Ayah 16 and Last Ayah 17
    And the Supplication at 28:16 in the database is as it was when its editor opened

  Scenario: A save made in a second tab after another save is refused, showing the latest save beside the choices
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the Supplication at 14:35–41 in two tabs
    And in the first tab I tick the editor's Opening "Other" and press "Save"
    Then the editor in the first tab says "Saved"
    When in the second tab I untick the editor's Opening "Rabbi" and press "Save"
    Then the editor in the second tab shows the alert "This Supplication has been saved since you opened it. The latest is shown beside your choices."
    And the editor in the second tab shows the latest save with the Openings "Rabbana, Rabbi, Other"
    And the editor's Openings in the second tab are "Rabbana"
    And the Supplication at 14:35–41 in the database has the Openings "rabbana, rabbi, other"
    When in the second tab I press "Save"
    Then the editor in the second tab says "Saved"
    And the Supplication at 14:35–41 in the database has the Openings "rabbana"

  # ---------------------------------------------------------------- spans, kept as they were (#270)

  @issue-270
  Scenario: A save from the editor keeps the Supplication's spans as they were
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And the Supplication at 7:23 has the spans "7:23:1–7:23:2, 7:23:5–7:23:9", saved through the API
    When I open the editor of the Supplication at 7:23
    And I tick the editor's Opening "Other"
    And I press the editor's "Save"
    Then the editor says "Saved"
    And the Supplication at 7:23 in the database has the Openings "rabbana, other"
    And the Supplication at 7:23 in the database has the spans "7:23:1–7:23:2, 7:23:5–7:23:9"
    When the Supplication at 7:23 is put back as it was, with no spans

  # ---------------------------------------------------------------- adding, deleting and the Speakers (#202)

  @issue-202
  Scenario: An Admin adds Al-Fatiha 1:5–7, and the Supplications page shows it
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And a reader has opened "/en/supplications"
    When I open "/admin/supplications"
    And I follow the Supplication editor's link "Add a Supplication"
    And I choose "1. Al-Fatihah" as the editor's "Surah"
    And I choose "Allah’s believing servants" as the editor's "Speaker"
    And I tick the editor's Opening "Other"
    And I set the editor's run to First Ayah 5 and Last Ayah 7
    And I press the editor's "Add"
    Then the editor is headed "Supplication · Al-Fatihah 1:5–7"
    When I open "/en/supplications"
    Then the Supplications page has an entry headed "Al-Fatihah 1:5–7"

  @issue-202
  Scenario: An Admin joins 28:16 and 28:17 by deleting one and extending the other, then splits 28:16–17 by trimming it and adding 28:17
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the editor of the Supplication at 28:17
    And I press the editor's "Delete"
    And I press the editor's "Delete for good"
    Then I am on the admin page "/admin/supplications"
    When I open the editor of the Supplication at 28:16
    And I set the editor's run to First Ayah 16 and Last Ayah 17
    And I press the editor's "Save"
    Then the editor is headed "Supplication · Al-Qasas 28:16–17"
    When I set the editor's run to First Ayah 16 and Last Ayah 16
    And I press the editor's "Save"
    Then the editor is headed "Supplication · Al-Qasas 28:16"
    When I open "/admin/supplications/new"
    And I choose "28. Al-Qasas" as the editor's "Surah"
    And I choose "Musa" as the editor's "Speaker"
    And I tick the editor's Opening "Rabbi"
    And I set the editor's run to First Ayah 17 and Last Ayah 17
    And I press the editor's "Add"
    Then the editor is headed "Supplication · Al-Qasas 28:17"
    When I open "/en/supplications"
    Then the Supplications page has an entry headed "Al-Qasas 28:16"
    And the Supplications page has an entry headed "Al-Qasas 28:17"

  @issue-202
  Scenario: An Admin renames Musa in Urdu on the Speakers page, and the Urdu Supplications page names him so
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And a reader has opened "/ur/supplications"
    When I open "/admin/supplications"
    And I follow the Supplication editor's link "Speakers"
    And I set the Speaker "Musa"'s "Urdu name" to "حضرت موسیٰ"
    And I press the Speaker "Musa"'s "Save"
    Then the Speaker "Musa" says "Saved"
    When I open "/ur/supplications"
    Then the Supplications page names a Speaker "حضرت موسیٰ"

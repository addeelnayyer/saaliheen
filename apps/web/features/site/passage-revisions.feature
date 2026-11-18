@issue-174
Feature: A Surah's Passage revisions in the admin area, and undoing one
  From the Passage editor, an Admin opens the Surah's Passage revisions
  (ADR 0049): every revision, newest first, each saying its version and the
  version it was made on, who made it (the Admin's email, or "the seed") and
  when, the edits its Publish sent (or the version it undid), and the
  Passages and Phrases it changed. Every Admin's revision whose changes were
  recorded offers Undo. An undo is a revision of its own, listed on top,
  putting back the Passages and Phrases that revision changed; readers see it
  on their next load, with no rebuild, exactly as after a Publish. Only an
  Admin sees the revisions.

  These scenarios change what the run's Postgres holds of Surah 18, so they
  run in a project of their own, one at a time, after the Passage publishing
  project, and each puts Surah 18 back as arranged when it ends
  (../passages-in-the-test-database.ts: at version 2, through a revision by
  "site-tests" written straight into the run's Postgres, its changes not
  recorded). Titles are read from what Neon holds, never typed.

  Background:
    Given Neon holds Surah 18 as arranged, put back when the scenario ends

  Scenario: An Admin opens a Surah's Passage revisions from the Passage editor, undoes a Publish, and readers see it with no rebuild
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I publish
    Then I see that the Publish went through
    When I open the Passage revisions from the Passage editor
    Then the Passage revisions are listed, newest first, exactly:
      | version | on | by                   | edits                                            | changes                    |
      | 3       | 2  | admin@saaliheen.test | join the Passage from Ayah 92 into the one above | 89–91 → 89–94; 92–94 removed |
      | 2       | 1  | site-tests           |                                                  |                            |
      | 1       | 0  | the seed             |                                                  |                            |
    And each Passage revision listed says when it was made, the newest first
    And only Passage revision 3 offers Undo
    And I save a screenshot "passage-revisions-light-desktop"
    When I undo Passage revision 3
    Then I see that Passage revision 3 was undone
    And the Passage revisions are listed, newest first, exactly:
      | version | on | by                   | edits                                            | changes                    |
      | 4       | 3  | admin@saaliheen.test | undo version 3                                   | 89–94 → 89–91; 92–94 added |
      | 3       | 2  | admin@saaliheen.test | join the Passage from Ayah 92 into the one above | 89–91 → 89–94; 92–94 removed |
      | 2       | 1  | site-tests           |                                                  |                            |
      | 1       | 0  | the seed             |                                                  |                            |
    And I save a screenshot "passage-revision-undone-light-desktop"
    And Neon holds Surah 18's Passages as Neon's, at version 4
    And a reader opening "/en/18" gets its Passages as Neon's

  Scenario: An undo of a Publish whose Passage a later Publish changed again is refused, and nothing is written
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I publish
    Then I see that the Publish went through
    When I join 89–94 with the Passage above
    And I publish
    Then I see that the Publish went through
    When I open the Passage revisions of Surah 18 by their address
    And I undo Passage revision 3
    Then I see that the undo was refused because "Passage 89–94 can't be put back"
    And Neon holds Surah 18's Passages as Neon's, with "83–94" in place of "83–88, 89–91, 92–94", at version 4

  Scenario: A signed-in person who is not an Admin can't see a Surah's Passage revisions
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open the Passage revisions of Surah 18 by their address
    Then I see the "not an Admin" page, not an error
    And I do not see any Passage revision

  Scenario: A visitor who isn't signed in and opens a Surah's Passage revisions is sent to sign in
    Given I am not signed in
    When I open the Passage revisions of Surah 18 by their address
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see any Passage revision

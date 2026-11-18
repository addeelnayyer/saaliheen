@issue-154
Feature: A Surah's Allah reference revisions in the admin area, and undoing a publish
  From the Passage editor, an Admin opens the Surah's Allah reference
  revisions: every revision, newest first, each saying who made it (the
  Admin's email, or "the seed"), when, and the Words it added and removed,
  each shown as its Arabic beside its Word location (ADR 0044). Every
  revision but the seed's offers Undo. An undo is a revision of its own,
  listed on top, that turns back the publish's Words; readers see it on their
  next load, with no rebuild, exactly as after a publish. An undo made on a
  version someone has since published past is refused: the Admin sees
  "Someone published first" and the latest revisions, and nothing is written.
  Only an Admin sees the revisions; Scholars wait for a Scholar role (AC-7).

  These scenarios change what readers of Surahs 102 and 106 see, so they run
  in a project of their own, one at a time, after the Allah reference
  publishing project. Each starts with its Surah emptied of Allah references
  and revisions, then loaded through the seed the owner runs. The Admin's
  publishes are made in the Passage editor or, "from another tab", through
  the Allah references API with the Admin's own session. Arabic is read from
  the sources by Word location, never typed.

  # ---------------------------------------------------- the list

  @AC-1 @AC-5 @AC-6
  Scenario: An Admin opens a Surah's Allah reference revisions from the Passage editor and sees each, newest first
    Given Surah 106 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 106's Allah references holding "106:1:1"
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 106
    And I turn marking Allah references on
    And I tap the Word card at 106:2:1
    And I tap the Word card at 106:1:1
    And I publish
    Then I see that the Publish went through
    When I open the Allah reference revisions from the Passage editor
    Then the Allah reference revisions are listed, newest first, exactly:
      | by                   | added   | removed |
      | admin@saaliheen.test | 106:2:1 | 106:1:1 |
      | the seed             | 106:1:1 |         |
    And each revision listed says when it was made, the newest first
    And every revision listed offers Undo but the seed's
    And I save a screenshot "AC-1-allah-reference-revisions-light-desktop"

  @AC-2 @AC-5 @AC-6
  Scenario: A signed-in person who is not an Admin can't see a Surah's Allah reference revisions
    Given Surah 106 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 106's Allah references holding "106:1:1"
    And I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open the Allah reference revisions of Surah 106 by their address
    Then I see the "not an Admin" page, not an error
    And I do not see any Allah reference revision

  @AC-2 @AC-5 @AC-6
  Scenario: A visitor who isn't signed in and opens a Surah's Allah reference revisions is sent to sign in
    Given Surah 106 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 106's Allah references holding "106:1:1"
    And I am not signed in
    When I open the Allah reference revisions of Surah 106 by their address
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see any Allah reference revision

  # ---------------------------------------------------- an undo readers see

  @AC-3 @AC-5 @AC-8 @AC-9
  Scenario: An Admin undoes a publish, and readers see it on the Surah page and its parts with no rebuild
    Given Surah 106 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 106's Allah references holding "106:1:1"
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 106
    And I turn marking Allah references on
    And I tap the Word card at 106:2:1
    And I publish
    Then I see that the Publish went through
    When I open "/en/106"
    Then the Word cards of Surah 106 are gold as the seeded list says, with "106:1:1, 106:2:1" marked
    When I open the Allah reference revisions of Surah 106 by their address
    And I undo the newest revision listed
    Then I see that the publish was undone
    And the Allah reference revisions are listed, newest first, exactly:
      | by                   | added   | removed |
      | admin@saaliheen.test |         | 106:2:1 |
      | admin@saaliheen.test | 106:2:1 |         |
      | the seed             | 106:1:1 |         |
    And every revision listed offers Undo but the seed's
    And the Allah references API answers Surah 106's Word locations as exactly "106:1:1", at version 3
    And I save a screenshot "AC-3-allah-reference-undone-light-desktop"
    When I open "/en/106"
    Then the Word cards of Surah 106 are gold as the seeded list says, with "106:1:1" marked
    And Surah 106's parts in English mark exactly "106:1:1" as Allah references

  # ---------------------------------------------------- an older version

  @AC-4 @AC-5
  Scenario: An undo made on an older version is refused: the Admin sees the latest revisions, and nothing is written
    Given Surah 102 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 102's Allah references holding "102:1:1"
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    And I have published, from another tab, Surah 102's Allah reference changes "102:2:1"
    When I open the Allah reference revisions of Surah 102 by their address
    And I publish, from another tab, Surah 102's Allah reference changes "102:3:1"
    And I undo the newest revision listed
    Then I see that the undo was refused because someone published first
    And the Allah reference revisions are listed, newest first, exactly:
      | by                   | added   | removed |
      | admin@saaliheen.test | 102:3:1 |         |
      | admin@saaliheen.test | 102:2:1 |         |
      | the seed             | 102:1:1 |         |
    And the Allah references API answers Surah 102's Word locations as exactly "102:1:1, 102:2:1, 102:3:1", at version 3
    And I save a screenshot "AC-4-allah-reference-undo-published-first-light-desktop"
    When I open "/en/102"
    Then the Word cards of Surah 102 are gold as the seeded list says, with "102:1:1, 102:2:1, 102:3:1" marked

  # ---------------------------------------------------- phone

  @AC-1 @AC-3 @AC-5
  Scenario: On a 390×844 phone, an Admin reads a Surah's Allah reference revisions and undoes a publish
    Given Surah 102 holds no Allah references and no Allah reference revision
    And the seed has loaded Surah 102's Allah references holding "102:1:1"
    And I am signed in as the Admin on a 390×844 phone with a touch screen
    And I have published, from another tab, Surah 102's Allah reference changes "102:1:1, 102:8:4"
    When I open the Allah reference revisions of Surah 102 by their address
    Then the Allah reference revisions are listed, newest first, exactly:
      | by                   | added   | removed |
      | admin@saaliheen.test | 102:8:4 | 102:1:1 |
      | the seed             | 102:1:1 |         |
    And the page does not scroll sideways
    And I save a screenshot "AC-1-allah-reference-revisions-light-phone"
    When I undo the newest revision listed
    Then I see that the publish was undone
    And the Allah references API answers Surah 102's Word locations as exactly "102:1:1", at version 3
    And the page does not scroll sideways

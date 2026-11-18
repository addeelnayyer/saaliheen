@issue-171
Feature: Publishing Unpublished changes
  Publish in the Passage editor's "Unpublished changes" bar writes all of an
  Admin's Unpublished changes to Neon in one transaction (ADR 0011): the
  Surah's new Passages, and one Passage revision naming the Admin's Account,
  made on the Surah's version the editor opened on, one version on, holding
  the edits as the editor sent them. The server checks the session and the
  Admin allow-list again before it writes; it never trusts the browser.
  Readers see the change on their next load of the Surah's page, with no
  deploy.

  - Success: a confirmation starting "Published", with no link; the
    Unpublished changes are cleared.
  - Clash: if the Surah's version moved on since the editor opened (another
    Admin published), the Publish is refused: the Admin sees "Someone
    published first" and the latest Passages, their outdated Unpublished
    changes are set aside, and nothing of theirs is written.
  - Failure (the network, the database refusing the write, a check refused
    on the server): nothing is written, the Unpublished changes are kept and
    the Admin is asked to try again.

  Publishing changes what the run's Postgres holds of Surah 18, so these
  scenarios run in the serial passage-publishing project, one at a time, on
  the shared test server, and each puts Surah 18 back as arranged when it
  ends (../passages-in-the-test-database.ts: 107–108 and 109–110 joined as
  107–110, at version 2). "Another Admin's Publish" is written straight into
  the run's Postgres: the Passages and a Passage revision one version on.

  Titles and ranges are read from what Neon holds, never typed.

  Background:
    Given Neon holds Surah 18 as arranged, put back when the scenario ends

  # ---------------------------------------------------------------- success

  @AC-1 @AC-4 @AC-6 @AC-7 @AC-10
  Scenario: Publish writes the new Passages and one Passage revision naming the Admin, and readers see them with no deploy
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    And I type the Passage titles of 89–91 into 86–88's title fields
    And I press Enter
    And I join 92–94 with the Passage above
    Then the summary is "Surah 18: split 83–88 at 86; retitle 86–88; join 92–94 into 89–91"
    When I publish
    Then I see that the Publish went through
    And the confirmation links to nothing
    And there are no Unpublished changes
    And Neon holds Surah 18's Passages as Neon's, with "83–85, 86–88, 89–94" in place of "83–88, 89–91, 92–94", at version 3
    And in Neon 83–85 has the Passage titles of 83–88, 86–88 those of 89–91, and 89–94 those of 89–91
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits split, retitle and join
    And the editor's Passages are Neon's, with "83–85, 86–88, 89–94" in place of "83–88, 89–91, 92–94"
    When I reload the page
    Then there are no Unpublished changes
    And the editor's Passages are Neon's, with "83–85, 86–88, 89–94" in place of "83–88, 89–91, 92–94"
    And a reader opening "/en/18" gets its Passages as Neon's, with "83–85, 86–88, 89–94" in place of "83–88, 89–91, 92–94"
    And I save a screenshot "AC-4-published-light-desktop"

  # ------------------------------------------------- checks on the server

  @AC-2 @AC-7 @AC-10
  Scenario: The server refuses a Publish from someone no longer signed in, writes nothing, and the Unpublished changes are kept
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And my session ends while the editor is open
    And I publish
    Then I see that the publish was refused
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And no Passage revision of Surah 18 names the Admin's Account
    And there is 1 Unpublished change
    When I sign in through the test sign-in as "admin@saaliheen.test" via GitHub
    And I open the Passage editor for Surah 18
    Then there is 1 Unpublished change
    And the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"

  @AC-2 @AC-7 @AC-10
  Scenario: The server refuses a Publish from someone not on the Admin allow-list, writes nothing, and the Unpublished changes are kept
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And "reader@saaliheen.test", who is not an Admin, signs in in another tab of this browser
    And I publish
    Then I see that the publish was refused
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And no Passage revision of Surah 18 names the Admin's Account
    And there is 1 Unpublished change
    When I sign in through the test sign-in as "admin@saaliheen.test" via GitHub
    And I open the Passage editor for Surah 18
    Then there is 1 Unpublished change

  # ------------------------------------------------------------------ clash

  @AC-2 @AC-3 @AC-7 @AC-10
  Scenario: A Publish made on an older version of the Surah than Neon's is refused, and the Admin sees the latest Passages
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And another Admin publishes Surah 18's 92–94 and 95–98 joined, moving its version on
    And I publish
    Then I see "Someone published first"
    And the editor's Passages are Neon's
    And there are no Unpublished changes
    And Neon holds Surah 18's Passages as Neon's, at version 3
    And no Passage revision of Surah 18 names the Admin's Account
    And I save a screenshot "AC-3-someone-published-first-light-desktop"
    When I reload the page
    Then there are no Unpublished changes
    And the editor's Passages are Neon's

  # ---------------------------------------------------------------- failure

  @AC-5 @AC-7 @AC-10
  Scenario: When the network fails, nothing is written, the Unpublished changes are kept, and trying again publishes them
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And the network drops every request the page sends but a GET
    And I publish
    Then I see that the publish was refused, and am asked to try again
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And there is 1 Unpublished change
    And I save a screenshot "AC-5-publish-failed-light-desktop"
    When the network is back
    And I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits join
    And there are no Unpublished changes

  @AC-2 @AC-5 @AC-10
  Scenario: When the database refuses the write, nothing is written, the Unpublished changes are kept, and trying again once it accepts publishes them
    Given the run's database refuses every new Passage revision of Surah 18
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I publish
    Then I see that the publish was refused, and am asked to try again
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And there is 1 Unpublished change
    When I reload the page
    Then there is 1 Unpublished change
    And the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"
    When the run's database accepts Passage revisions again
    And I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits join
    And there are no Unpublished changes

  # ------------------------------------------------------------------------
  # Moved from collapsed-passages.feature (#171): it publishes, so it runs here,
  # one scenario at a time, on the run's Postgres, and puts Surah 18 back after.

  @AC-9 @AC-10
  Scenario: After a Publish every Passage is open
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I collapse Passage 83–88
    And I collapse Passage 92–94
    And I join 92–94 with the Passage above
    And I publish
    Then I see that the Publish went through
    And every Passage is open
    And there are no Unpublished changes
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    When I reload the page
    Then every Passage is open
    And there are no Unpublished changes
    And the editor's Passages are Neon's, with "89–94" in place of "89–91, 92–94"

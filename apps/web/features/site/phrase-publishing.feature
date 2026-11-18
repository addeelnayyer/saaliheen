@issue-100 @issue-171
Feature: Publishing Phrases from the Passage editor
  An Admin's Phrase edits are Unpublished changes like Passage edits, and the
  same Publish sends them (ADR 0009, ADR 0011). The contracts:

  - One transaction. A Publish holding Phrase edits, with or without Passage
    or Passage title edits, writes the Surah's new Phrases and Passages to
    Neon together with one Passage revision naming the Admin's Account, made
    on the Surah's version the editor opened on, one version on, holding the
    edits as the editor sent them. A Publish of Phrase edits alone writes no
    Passage. If the database refuses any part of it, nothing is written.
  - Missing Phrases never block a Publish: a partly covered or bare Passage
    publishes, and the Surah file /data/v1 serves gives its Words no Phrase
    colour, so readers see no tints for it until it is covered.
  - Clash. A Publish is made on the Surah's version the editor opened on; if
    another Admin published in that Surah since, it is refused: "Someone
    published first", the latest Passages and Phrases shown, and the outdated
    Unpublished changes set aside.

  Publishing changes what the run's Postgres holds of Surah 18, so these
  scenarios run in the serial passage-publishing project, one at a time, and
  each puts Surah 18 back as arranged when it ends
  (../passages-in-the-test-database.ts: Surah 18's 99–102 covered by Phrases,
  103–106 partly covered, only 103:1–103:5, at version 2). "Another Admin's
  Publish" is written straight into the run's Postgres: the Phrase and a
  Passage revision one version on. Phrases and Passages are read from what
  Neon holds, Word locations checked against the sources; none is typed as
  data.

  Background:
    Given Neon holds Surah 18 as arranged, put back when the scenario ends

  # ------------------------------------------------------- one transaction

  @AC-4 @AC-9 @AC-10
  Scenario: One Publish writes Phrase edits together with a Passage edit, and one Passage revision naming the Admin
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    And I tap the Word at 99:2
    And I move the selected Phrase's last Word to 99:11
    Then there are 3 Unpublished changes
    And the summary is "Surah 18: join 92–94 into 89–91; change Phrases in 99–102, 103–106"
    When I publish
    Then I see that the Publish went through
    And the confirmation links to nothing
    And there are no Unpublished changes
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    And Neon holds Surah 18's Phrases as Neon's, with "104:3–105:2" added and "99:1–99:11" in place of "99:1–100:1"
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits join, mark and moveEnd
    And Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    When I reload the page
    And I turn Phrases mode on
    Then there are no Unpublished changes
    And Passage 99–102 shows Neon's Phrases, with "99:1–99:11" in place of "99:1–100:1"
    And Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    And I save a screenshot "AC-4-published-phrases-light-desktop"

  # ---------------------------------------------- partly covered, or bare

  @AC-4 @AC-6 @AC-9 @AC-10
  Scenario: A Phrase-only Publish leaves a Passage partly covered, writes no Passage, and the Surah file gives that Passage no Phrase colours
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    Then Passage 103–106 shows Neon's Phrases, with "104:3–105:2" added
    And Passage 103–106's heading shows its progress for those Phrases
    When I publish
    Then I see that the Publish went through
    And there are no Unpublished changes
    And Neon holds Surah 18's Passages as Neon's, at version 3
    And Neon holds Surah 18's Phrases as Neon's, with "104:3–105:2" added
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits mark
    And a client fetching "/data/v1/surahs/18.json" gets Surah 18's Phrases as Neon's, with "104:3–105:2" added, and Phrase colours on the Words of its covered Passages only, none on 103–106

  @AC-6 @AC-9 @AC-10
  Scenario: Missing Phrases never block a Publish of Passage edits
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    And Neon holds Surah 18's Phrases as Neon's
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits join

  # ------------------------------------------------------------------ clash

  @AC-2 @AC-3 @AC-5 @AC-9 @AC-10
  Scenario: A Publish made on an older version of the Surah than Neon's is refused, and the Admin sees the latest Phrases
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    And another Admin publishes the Phrase 106:1–106:3 in Surah 18, moving its version on
    And I publish
    Then I see "Someone published first"
    And the editor's Passages are Neon's
    And there are no Unpublished changes
    And Passage 103–106 shows Neon's Phrases, with "106:1–106:3" added
    And Neon holds Surah 18's Passages as Neon's, at version 3
    And Neon holds Surah 18's Phrases as Neon's, with "106:1–106:3" added
    And no Passage revision of Surah 18 names the Admin's Account
    And I save a screenshot "AC-5-someone-published-phrases-first-light-desktop"
    When I reload the page
    And I turn Phrases mode on
    Then there are no Unpublished changes
    And the editor's Passages are Neon's
    And Passage 103–106 shows Neon's Phrases, with "106:1–106:3" added

  # ------------------------------------------------- the database refusing

  @AC-4 @AC-9 @AC-10
  Scenario: When the database refuses the Passage revision, neither the Phrases nor the Passages are written, and trying again once it accepts publishes them together
    Given the run's database refuses every new Passage revision of Surah 18
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And I turn Phrases mode on
    And I tap the Word at 104:3, then the Word at 105:2
    And I publish
    Then I see that the publish was refused, and am asked to try again
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And Neon holds Surah 18's Phrases as Neon's
    And there are 2 Unpublished changes
    When the run's database accepts Passage revisions again
    And I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Passages as Neon's, with "89–94" in place of "89–91, 92–94", at version 3
    And Neon holds Surah 18's Phrases as Neon's, with "104:3–105:2" added
    And Neon got exactly one Passage revision of Surah 18, naming the Admin's Account, made on version 2 as version 3, holding the edits join and mark
    And there are no Unpublished changes

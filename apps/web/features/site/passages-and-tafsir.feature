@issue-235
Feature: The Passage editor refuses Passages that split a Tafsir entry
  Each Passage's Tafsir is its Tafsir entries whole (ADR 0053), so an Admin
  redrawing Passages sees the Surah's Tafsir entries in both Languages: Ayah
  by Ayah, each Ayah an entry starts at says "Tafsir entry:" and the entry in
  each Language ("Urdu 85–87 · English 85–86"), so where it ends is in its
  range, and a ✂︎ inside an entry names the entry a new Passage there would
  split. The Unpublished changes bar lists each Passage that splits an entry,
  naming the Passage, the entry and its Language, and Publish stays disabled
  while any does. The editor reads the Tafsir entry ranges from Neon with the
  Passages; the server checks a Publish's Passages against the Tafsir in Neon
  again, and refuses it, writing nothing, when the Tafsir can't be read.

  Urdu is checked as English is: it needs only its rows in Neon. Each
  scenario puts Surah 18's Tafsir entries straight into the run's Postgres,
  one per Ayah but those it names, with placeholder text, and removes them
  when it ends. It publishes, so it runs in the serial passage-publishing
  project and puts Surah 18 back as arranged
  (../passages-in-the-test-database.ts).

  Background:
    Given Neon holds Surah 18 as arranged, put back when the scenario ends
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub

  @AC-4
  Scenario: The editor shows where Tafsir entries start and end in both Languages
    Given Neon holds Surah 18's English Tafsir entries one per Ayah, but 85–86
    And Neon holds Surah 18's Urdu Tafsir entries one per Ayah, but 85–87
    When I open the Passage editor for Surah 18
    Then in Passage 83–88, Ayah 85 is marked "Tafsir entry: Urdu 85–87 · English 85–86"
    And in Passage 83–88, Ayah 88 is marked "Tafsir entry: Urdu 88 · English 88"
    And in Passage 83–88, Ayah 86 is marked as starting no Tafsir entry
    And in Passage 83–88, Ayah 87 is marked "Tafsir entry: English 87"
    And in Passage 83–88, the ✂︎ before Ayah 86 says it is inside the Urdu Tafsir entry 85–87 and the English Tafsir entry 85–86
    And in Passage 83–88, the ✂︎ before Ayah 87 says it is inside the Urdu Tafsir entry 85–87
    And in Passage 83–88, the ✂︎ before Ayah 88 says it is inside no Tafsir entry
    And no Passage is listed as splitting a Tafsir entry
    And I save a screenshot "AC-4-tafsir-entries-light-desktop"

  @AC-1 @AC-3
  Scenario: A Passage splitting an English entry is listed and blocks Publish, and Passages of whole entries publish
    Given Neon holds Surah 18's English Tafsir entries one per Ayah, but 85–86
    When I open the Passage editor for Surah 18
    And I split 83–88 at Ayah 86
    And I type the Passage titles of 89–91 into 86–88's title fields
    And I press Enter
    Then the Passages listed as splitting a Tafsir entry are exactly:
      | Passage 86–88: splits the English Tafsir entry 85–86 |
    And Publish is disabled
    And I save a screenshot "AC-1-passage-splits-tafsir-light-desktop"
    When I move the start of 86–88 one Ayah earlier
    Then no Passage is listed as splitting a Tafsir entry
    And Publish is enabled
    When I publish
    Then I see that the Publish went through
    And Neon holds Surah 18's Passages as Neon's, with "83–84, 85–88" in place of "83–88", at version 3

  @AC-2
  Scenario: A Passage splitting an entry only in Urdu is listed and blocks Publish
    Given Neon holds Surah 18's English Tafsir entries one per Ayah
    And Neon holds Surah 18's Urdu Tafsir entries one per Ayah, but 88–89
    When I open the Passage editor for Surah 18
    Then the Passages listed as splitting a Tafsir entry are exactly:
      | Passage 89–91: splits the Urdu Tafsir entry 88–89 |
    When I join 92–94 with the Passage above
    Then Publish is disabled
    When I join 89–94 with the Passage above
    Then no Passage is listed as splitting a Tafsir entry
    And Publish is enabled

  @AC-1
  Scenario: The server checks the Passages against the Tafsir in Neon again, and refuses a Publish that splits an entry
    Given Neon holds Surah 18's English Tafsir entries one per Ayah
    When I open the Passage editor for Surah 18
    And I join 92–94 with the Passage above
    And Neon's English Tafsir entries of Surah 18 become one per Ayah, but 94–95
    And I publish
    Then I see that the publish was refused, saying "Passage 95–98: splits the English Tafsir entry 94–95"
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And no Passage revision of Surah 18 names the Admin's Account
    And there is 1 Unpublished change

  @AC-5
  Scenario: A Publish is refused, with its reason, when the Tafsir can't be read from Neon
    Given the run's database can't give the Tafsir
    When I open the Passage editor for Surah 18
    Then I see "The Tafsir couldn’t be read"
    When I join 92–94 with the Passage above
    And I publish
    Then I see that the publish was refused, saying "the Tafsir couldn't be read from the database"
    And Neon holds Surah 18's Passages as Neon's, at version 2
    And no Passage revision of Surah 18 names the Admin's Account
    And there is 1 Unpublished change
    And I save a screenshot "AC-5-tafsir-unread-light-desktop"

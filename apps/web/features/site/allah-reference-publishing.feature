@issue-153 @issue-171
Feature: Publishing Allah reference changes from the Passage editor
  An Admin's Allah reference changes (allah-reference-marking.feature) are
  published by the one Publish of the Unpublished changes bar, which carries
  the Admin's Passage, Phrase and Allah reference edits together, written to
  Neon in one transaction (#171); Allah references have no Publish button of
  their own any more. The Allah reference changes are written with a
  revision naming the Admin; a Publish carrying only Allah reference changes
  writes no Passage revision. The Surah's cache tag is refreshed: readers see
  the change on the Surah page, its Surah parts and a Share page of its Ayahs
  on their next load, with no rebuild or deploy, and the Allah references API
  answers it at a new version. The Admin's Unpublished changes for that Surah
  are then cleared. A Publish made on an older version of the Surah's Allah
  references, or of its Passages, is refused: the Admin sees "Someone
  published first" and the latest Allah references, and nothing of theirs is
  written.

  These scenarios change what readers of their Surahs see, so they run in a
  project of their own, one at a time, after the rest of the suite, in Surahs
  no other site feature reads Allah references in: 97, 103, 105 and 110. Each
  starts with its Surah holding no Allah references and no revision; a
  scenario that publishes Passages or Phrases puts the Surah's Passages and
  Phrases back as loaded when it ends. "Another publish" is arranged by
  writing an Allah reference revision for the Surah, one version on, with the
  Word location it adds, straight into the site tests' Postgres. Word
  locations are checked against the sources; which Words are gold is read
  from the taps the scenario made, never typed.

  # ---------------------------------------------------- a publish readers see

  @AC-1 @AC-2 @AC-3 @AC-7 @AC-8 @AC-10
  Scenario Outline: A mark, a publish, and readers in <Language> see it on Surah <surah>'s page, its parts and a Share page, with no rebuild
    Given Surah <surah> holds no Allah references and no Allah reference revision
    And I open "/<lang>/<surah>"
    Then the Arabic of no Word card of Surah <surah> is gold
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah <surah>
    And I turn marking Allah references on
    And I tap the Word card at <first>
    And I tap the Word card at <second>
    Then there are 2 Allah reference changes waiting
    And the Unpublished changes bar offers exactly one Publish button, and none for Allah references alone
    When I publish
    Then I see that the Publish went through
    And there are no Allah reference changes waiting
    And the Word cards of Surah <surah> are gold as the seeded list says, with "<first>, <second>" marked
    And the Allah references API answers Surah <surah>'s Word locations as exactly "<first>, <second>", at version 1
    And no Passage revision of Surah <surah> names the Admin's Account
    When I reload the page
    And I turn marking Allah references on
    Then there are no Allah reference changes waiting
    And the Word cards of Surah <surah> are gold as the seeded list says, with "<first>, <second>" marked
    When I open "/<lang>/<surah>"
    Then the Word cards of Surah <surah> are gold as the seeded list says, with "<first>, <second>" marked
    And Surah <surah>'s parts in <Language> mark exactly "<first>, <second>" as Allah references
    When I open the Share page of <ayahs> in <Language> and Uthmani, Ayah by Ayah
    Then the Arabic of exactly the Words at "<first>, <second>" is gold on the Share page
    And I save a screenshot "AC-2-published-allah-references-<lang>-light-desktop"

    Examples:
      | Language | lang | surah | first  | second | ayahs   |
      | English  | en   | 103   | 103:2:2 | 103:3:3 | 103:1–3 |
      | Urdu     | ur   | 97    | 97:1:2  | 97:4:6  | 97:1–5  |

  @AC-2 @AC-7 @AC-8 @AC-10
  Scenario: Unmarking a published Allah reference and publishing again takes its gold away from readers
    Given Surah 105 holds no Allah references and no Allah reference revision
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 105
    And I turn marking Allah references on
    And I tap the Word card at 105:2:1
    And I tap the Word card at 105:3:2
    And I publish
    Then I see that the Publish went through
    When I open "/en/105"
    Then the Word cards of Surah 105 are gold as the seeded list says, with "105:2:1, 105:3:2" marked
    When I open the Passage editor for Surah 105
    And I turn marking Allah references on
    And I tap the Word card at 105:2:1
    Then there is 1 Allah reference change waiting
    When I publish
    Then I see that the Publish went through
    And there are no Allah reference changes waiting
    And the Allah references API answers Surah 105's Word locations as exactly "105:3:2", at version 2
    And no Passage revision of Surah 105 names the Admin's Account
    When I open "/en/105"
    Then the Word cards of Surah 105 are gold as the seeded list says, with "105:3:2" marked

  @AC-7 @AC-8 @AC-10
  Scenario: One Publish carries the Phrase change and the Allah reference change waiting, and leaves nothing waiting
    Given Surah 110 holds no Allah references and no Allah reference revision
    And Neon holds Surah 110 as arranged, put back when the scenario ends
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 110
    And I turn Phrases mode on
    And I tap the Word at 1:1, then the Word at 1:2
    Then there is 1 Unpublished change
    When I turn marking Allah references on
    And I tap the Word card at 110:1:3
    Then there is 1 Allah reference change waiting
    And the Unpublished changes bar offers exactly one Publish button, and none for Allah references alone
    When I publish
    Then I see that the Publish went through
    And there are no Allah reference changes waiting
    And there are no Unpublished changes
    And Neon holds Surah 110's Phrases as Neon's, with "1:1–1:2" added
    And Neon got exactly one Passage revision of Surah 110, naming the Admin's Account, made on version 1 as version 2, holding the edits mark
    And the Allah references API answers Surah 110's Word locations as exactly "110:1:3", at version 1
    When I reload the page
    Then there are no Unpublished changes
    And there are no Allah reference changes waiting

  @AC-4 @AC-10
  Scenario: One Publish carrying a Passage edit and an Allah reference change in the same Surah writes both, and readers see both
    Given Surah 103 holds no Allah references and no Allah reference revision
    And Neon holds Surah 103 as arranged, put back when the scenario ends
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 103
    And I split 1–3 at Ayah 3
    And I type the Passage titles of 1–3 into 3's title fields
    And I press Enter
    And I turn marking Allah references on
    And I tap the Word card at 103:2:2
    Then there is 1 Allah reference change waiting
    And the Unpublished changes bar offers exactly one Publish button, and none for Allah references alone
    When I publish
    Then I see that the Publish went through
    And there are no Unpublished changes
    And there are no Allah reference changes waiting
    And Neon holds Surah 103's Passages as Neon's, with "1–2, 3" in place of "1–3", at version 2
    And Neon got exactly one Passage revision of Surah 103, naming the Admin's Account, made on version 1 as version 2, holding the edits split and retitle
    And the Allah references API answers Surah 103's Word locations as exactly "103:2:2", at version 1
    When I reload the page
    Then there are no Unpublished changes
    And the editor's Passages are Neon's, with "1–2, 3" in place of "1–3"
    And a reader opening "/en/103" gets its Passages as Neon's, with "1–2, 3" in place of "1–3"
    When I open "/en/103"
    Then the Word cards of Surah 103 are gold as the seeded list says, with "103:2:2" marked
    And I save a screenshot "AC-4-published-passages-and-allah-references-light-desktop"

  # ---------------------------------------------------- an older version

  @AC-2 @AC-4 @AC-8 @AC-10
  Scenario: A Publish made on an older version of the Allah references is refused: the Admin sees the latest Allah references, and nothing is written
    Given Surah 110 holds no Allah references and no Allah reference revision
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 110
    And I turn marking Allah references on
    And I tap the Word card at 110:3:4
    Then there is 1 Allah reference change waiting
    When another publish of Surah 110's Allah references adds 110:1:3
    And I publish
    Then I see that the publish was refused because someone published first
    And the Allah references API answers Surah 110's Word locations as exactly "110:1:3", at version 1
    And the Word cards of Surah 110 are gold as the seeded list says, with "110:1:3" marked
    And there are no Allah reference changes waiting
    And no Passage revision of Surah 110 names the Admin's Account
    When I open "/en/110"
    Then the Arabic of the Word card at 110:3:4 is not gold
    And I save a screenshot "AC-4-allah-references-published-first-light-desktop"

  # ---------------------------------------------------- phone

  @AC-1 @AC-7 @AC-8 @AC-10
  Scenario: On a 390×844 phone, an Admin marks and publishes an Allah reference
    Given Surah 97 holds no Allah references and no Allah reference revision
    And I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 97
    And I turn marking Allah references on
    And I tap the Word card at 97:1:2
    And I publish
    Then I see that the Publish went through
    And there are no Allah reference changes waiting
    And the Allah references API answers Surah 97's Word locations as exactly "97:1:2", at version 1
    And no Passage revision of Surah 97 names the Admin's Account
    And the page does not scroll sideways
    And I save a screenshot "AC-1-published-allah-references-light-phone"

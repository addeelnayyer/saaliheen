@issue-152 @issue-171
Feature: Marking Allah references in the Passage editor
  An Admin marks and unmarks Allah references in the Passage editor's mode
  for marking them. A switch in the editor's toolbar, "Allah references",
  next to "Phrases", turns the mode on and off; it starts off, and only one of
  the two modes is on at a time, so a tap on a Word card has one meaning. In
  the mode each open Passage shows its Ayahs as Word cards, and each Word
  card's Arabic is drawn in Allah reference colour exactly as readers see it
  (allah-reference-colour.feature): every Allah reference gold, no other Word.

  Tapping a Word card turns it into an Allah reference, or stops it being
  one, and its gold follows at once. Each tap is one Unpublished change of
  its own, kept in the Admin's browser by Surah and by the version of that
  Surah's Allah references it was made on (ADR 0014), apart from the Passage
  and Phrase edits (ADR 0018): the Unpublished changes bar counts the Allah
  reference changes waiting on their own. They survive a reload, and Undo
  steps back through them one at a time. A change to the Surah's version by
  another publish sets the old ones aside rather than applying them to the
  new version. Until the bar's one Publish sends them, with any Passage and
  Phrase edits (allah-reference-publishing.feature, #153, #171), readers, and
  the Allah references API, see none of them.

  Allah references come from the site tests' Postgres, seeded with
  features/site/allah-references.json ("the seeded list"); Surah 108 has none
  there. Word locations a step names are checked against the sources; which
  Words are gold is read from the seeded list and the taps the scenario made,
  never typed. "Another publish" is arranged by writing an Allah reference
  revision for the Surah, one version on, straight into that Postgres.
  Every scenario but the two for someone who is not an Admin starts signed
  in as the Admin "admin@saaliheen.test".

  # ------------------------------------------------------------------ the mode

  @AC-1 @AC-8
  Scenario: The toolbar's "Allah references" switch turns marking Allah references on and off, apart from Phrases mode
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    Then the toolbar holds the "Allah references" switch, off
    And no Word card is shown
    When I turn marking Allah references on
    Then the "Allah references" switch is on
    And the "Phrases" switch is off
    And every Passage shows its Ayahs Ayah by Ayah as Word cards, each with its Arabic and its English Word meaning
    When I turn Phrases mode on
    Then the "Phrases" switch is on
    And the "Allah references" switch is off
    When I turn marking Allah references on
    Then the "Phrases" switch is off
    When I turn marking Allah references off
    Then no Word card is shown

  @AC-1 @AC-8
  Scenario Outline: In the <Script> Script, the mode draws Surah <surah>'s Allah references in gold exactly as readers see them
    Given I am signed in as the Admin in a browser that chose the <Script> Script
    When I open the Passage editor for Surah <surah>
    And I turn marking Allah references on
    Then the Arabic of every Allah reference of Surah <surah> in the seeded list is gold
    And the Arabic of no other Word card of Surah <surah> is gold

    Examples:
      | surah | Script   |
      | 1     | Uthmani  |
      | 1     | Indo-Pak |
      | 112   | Uthmani  |
      | 112   | Indo-Pak |

  @AC-1 @AC-8
  Scenario Outline: With the system's <scheme> colour scheme, the mode's gold is <gold>, as readers see it
    Given my system prefers a <scheme> colour scheme
    And I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 1
    And I turn marking Allah references on
    Then the Arabic of every Allah reference of Surah 1 in the seeded list is drawn in <gold>
    And the Arabic of no other Word card of Surah 1 is gold
    And I save a screenshot "AC-1-marking-allah-references-<scheme>-desktop"

    Examples:
      | scheme | gold    |
      | light  | #A87A0A |
      | dark   | #E3B84F |

  # ------------------------------------------------------------------- tapping

  @AC-2 @AC-8
  Scenario: Tapping a Word card marks or unmarks it, and the gold follows at once
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:1:1
    Then the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked
    When I tap the Word card at 112:2:1
    Then the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked and "112:2:1" unmarked
    And there are 2 Allah reference changes waiting

  @AC-2 @AC-8
  Scenario: In Phrases mode a tap marks a Phrase, not an Allah reference
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn Phrases mode on
    And I tap the Word card at 112:1:1
    Then there are no Allah reference changes waiting
    When I turn marking Allah references on
    Then the Word cards of Surah 112 are gold as the seeded list says

  # -------------------------------------------------------- Unpublished changes

  @AC-3 @AC-8
  Scenario: Undo steps back through Allah reference changes one at a time
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:1:1
    And I tap the Word card at 112:3:1
    And I tap the Word card at 112:1:3
    Then there are 3 Allah reference changes waiting
    When I undo
    Then there are 2 Allah reference changes waiting
    And the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1, 112:3:1" marked
    When I undo
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked
    When I undo
    Then there are no Allah reference changes waiting
    And the Word cards of Surah 112 are gold as the seeded list says
    And Undo is disabled

  @AC-3 @AC-8
  Scenario: Allah reference changes survive a reload, and Undo still steps back one at a time
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:1:1
    And I tap the Word card at 112:2:2
    And I reload the page
    And I turn marking Allah references on
    Then there are 2 Allah reference changes waiting
    And the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked and "112:2:2" unmarked
    When I undo
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked

  @AC-3 @AC-8
  Scenario: Allah reference changes are kept for their own Surah
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:1:1
    And I open the Passage editor for Surah 1
    And I turn marking Allah references on
    Then there are no Allah reference changes waiting
    And the Word cards of Surah 1 are gold as the seeded list says
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 112 are gold as the seeded list says, with "112:1:1" marked

  @AC-4 @AC-8
  Scenario: Changes made on an older version of a Surah's Allah references are not applied to the new one
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 108
    And I turn marking Allah references on
    And I tap the Word card at 108:1:1
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 108 are gold as the seeded list says, with "108:1:1" marked
    When another publish moves Surah 108's Allah references to a new version
    And I reload the page
    And I turn marking Allah references on
    Then there are no Allah reference changes waiting
    And the Word cards of Surah 108 are gold as the seeded list says
    And Undo is disabled
    When I tap the Word card at 108:1:1
    And I reload the page
    And I turn marking Allah references on
    Then there is 1 Allah reference change waiting
    And the Word cards of Surah 108 are gold as the seeded list says, with "108:1:1" marked

  # --------------------------------------------------------- the changes bar

  @AC-5 @AC-8
  Scenario: The changes bar counts Allah reference changes apart from Passage and Phrase changes
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I split 1–4 at Ayah 3
    And I turn Phrases mode on
    And I tap the Word at 1:1, then the Word at 1:2
    Then there are 2 Unpublished changes
    And there are no Allah reference changes waiting
    When I turn marking Allah references on
    And I tap the Word card at 112:1:1
    And I tap the Word card at 112:3:1
    And I tap the Word card at 112:4:1
    Then there are 3 Allah reference changes waiting
    And there are 2 Unpublished changes
    When I reload the page
    Then there are 2 Unpublished changes
    And there are 3 Allah reference changes waiting

  # ------------------------------------------------------------------ readers

  @AC-6 @AC-8
  Scenario Outline: Readers in <Language> see none of the Admin's Allah reference changes
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:1:1
    And I tap the Word card at 112:1:3
    Then there are 2 Allah reference changes waiting
    When I open "/<lang>/112"
    Then the Word cards of Surah 112 are gold as the seeded list says
    And the Allah references API answers Surah 112's Word locations in the seeded list

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  # ----------------------------------------------------------------- gating

  @AC-7 @AC-8
  Scenario: A reader signed in to their Account who is not an Admin can't reach the mode
    Given I am signed in as "reader@saaliheen.test", who is not an Admin
    When I open "/admin/112"
    Then I see the "not an Admin" page, not an error
    And I do not see a Passage editor
    And I do not see the "Allah references" switch

  @AC-7 @AC-8
  Scenario: Someone not signed in can't reach the mode
    Given I am not signed in
    When I open "/admin/112"
    Then I am on the admin sign-in page, offering GitHub and Google
    And I do not see a Passage editor
    And I do not see the "Allah references" switch

  # ------------------------------------------------------------------- phone

  @AC-2 @AC-3 @AC-8
  Scenario: On a 390×844 phone, Allah references are marked, unmarked and undone by tapping
    Given I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 112
    And I turn marking Allah references on
    And I tap the Word card at 112:3:1
    And I tap the Word card at 112:1:4
    Then the Word cards of Surah 112 are gold as the seeded list says, with "112:3:1" marked and "112:1:4" unmarked
    And there are 2 Allah reference changes waiting
    When I undo
    Then the Word cards of Surah 112 are gold as the seeded list says, with "112:3:1" marked
    And there is 1 Allah reference change waiting
    And the page does not scroll sideways
    And I save a screenshot "AC-2-marking-allah-references-light-phone"

@issue-100 @issue-171
Feature: Phrases mode in the Passage editor
  An Admin marks Phrases in the Passage editor. A switch in the editor's
  toolbar, "Phrases", turns Phrases mode on and off; it starts off, and with
  it off the editor shows no Word cards. In Phrases mode each open Passage
  shows its Ayahs Ayah by Ayah as Word cards, each with its Arabic and its
  Word meaning, whichever Ayah layout is chosen.

  The Word cards are tinted live with the Phrase colours readers see in Quran
  Analysis: in each Passage the first Phrase takes tint A, the next tint B,
  and so on, a Phrase keeping its tint across an Ayah's end. Unlike a
  reader's page, the editor tints the Phrases of a Passage that is not yet
  covered too, so the Admin sees what is marked. A Word in no Phrase is
  marked as unmarked: drawn on no tint, outlined unlike a Word in a Phrase,
  and described as "Unmarked" to a screen reader. Each Passage heading shows
  its progress: "Phrases ✓" once every Word is in a Phrase, else
  "Phrases <n> / <N> Words", n of its N Words being in a Phrase. A Collapsed
  Passage hides its Phrases.

  The editor reads the Surah's Phrases from Neon, as it reads its Passages
  (ADR 0011, #171). The run's Postgres (../passages-in-the-test-database.ts)
  holds the committed Phrases and Surah 18 Phrases the committed ones lack:
  99–102 covered (99's first Word to 100's first, the rest of 100, then 101's
  first Word to 102's last) and 103–106 partly covered (Ayah 103 as one
  Phrase). Words, Arabic and Word meanings are read from the sources and
  Phrases from what Neon is arranged to hold; none is typed. A tint is the
  colour drawn behind a Word card, as phrase-colours.feature reads it.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  @AC-1
  Scenario: The toolbar's Phrases switch turns Phrases mode on and off
    When I open the Passage editor for Surah 18
    Then the toolbar holds the "Phrases" switch, off
    And no Word card is shown
    When I turn Phrases mode on
    Then the "Phrases" switch is on
    And every Passage shows its Ayahs Ayah by Ayah as Word cards, each with its Arabic and its English Word meaning
    When I turn Phrases mode off
    Then the "Phrases" switch is off
    And no Word card is shown

  @AC-1
  Scenario: Phrases mode shows Word cards Ayah by Ayah even when Flowing is chosen
    When I open the Passage editor for Surah 18
    And I choose the Flowing Ayah layout
    And I turn Phrases mode on
    Then every Passage shows its Ayahs Ayah by Ayah as Word cards, each with its Arabic and its English Word meaning

  @AC-1 @AC-2 @AC-10
  Scenario: Word cards take the Phrase colours readers see, Phrase by Phrase, from Neon's Phrases
    Given I note the two tints readers see on Al-Fatihah's Word cards
    And the committed Phrases have no Phrase in Surah 18
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then Passage 99–102's Word cards take tint A and tint B Phrase by Phrase as Neon's Phrases say, starting on tint A and carrying across Ayah ends
    And no Word card of Passage 99–102 is marked as unmarked
    And Passage 103–106's Word cards in Neon's Phrases take tint A and tint B Phrase by Phrase, starting on tint A
    And Passage 103–106's other Word cards are marked as unmarked

  @AC-1
  Scenario: A Passage with no Phrases shows every Word as unmarked
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then every Word card of Passage 83–88 is marked as unmarked

  @AC-1 @AC-2 @AC-10
  Scenario: Each Passage heading shows its Phrase progress, counted from Neon's Phrases
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then Passage 99–102's heading shows "Phrases ✓"
    And Passage 103–106's heading shows "Phrases <n> / <N> Words", counted from Neon's Phrases
    And Passage 83–88's heading shows "Phrases <n> / <N> Words", counted from Neon's Phrases
    And every Passage heading shows its progress, counted from Neon's Phrases

  @AC-1 @AC-2 @AC-10
  Scenario: A Collapsed Passage hides its Phrases
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    And I collapse Passage 103–106
    Then Passage 103–106 shows no Word cards
    And Passage 99–102 shows its Word cards
    When I expand Passage 103–106
    Then Passage 103–106 shows its Word cards
    And Passage 103–106's Word cards in Neon's Phrases take tint A and tint B Phrase by Phrase, starting on tint A

  @AC-8 @AC-2 @AC-10
  Scenario: On a 390×844 phone, Phrases mode is turned on by a tap and its Word cards fit the width
    Given I note the two tints readers see on Al-Fatihah's Word cards
    And I am signed in as the Admin on a 390×844 phone with a touch screen
    When I open the Passage editor for Surah 18
    And I turn Phrases mode on
    Then the "Phrases" switch is on
    And Passage 99–102's Word cards take tint A and tint B Phrase by Phrase as Neon's Phrases say, starting on tint A and carrying across Ayah ends
    And Passage 103–106's other Word cards are marked as unmarked
    And Passage 99–102's heading shows "Phrases ✓"
    And the page does not scroll sideways

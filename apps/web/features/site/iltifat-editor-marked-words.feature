@issue-143
Feature: Marking the Words of an Iltifat in the Iltifat editor
  In an Iltifat's editor an Admin chooses a side, "From" or "To", and taps
  Word cards to put them among the Iltifat's "from" Words or "to" Words; a
  tap on a marked Word card takes it out. Each side holds one or more whole
  Words. The editor draws the marked Word cards in the reader's two tints, the
  ones the Iltifat pages draw Marked Words in, and a screen reader hears each
  marked card's side ("from He", "to You"). Marked Words are saved with the
  rest of the Iltifat, by "Save". A change of run that would leave a Marked
  Word outside it is refused with the reason. The editor's list says which
  Iltifat are marked (both sides holding a Word), and a "Not yet marked"
  filter narrows it to the others.

  Each scenario says, through the API, which Iltifat have Marked Words before
  it starts, every other Iltifat having none. These scenarios save Iltifat, so
  they run after the rest of the suite, one at a time (playwright.config.ts).

  The editor's shape these steps expect, beyond the #142 editor's
  (features/site/iltifat-editor.feature): two radio buttons, "From" and "To",
  choosing the side a tap marks; each Word card, the element whose id is its
  Word location, marks and unmarks on a tap. The list's link to a marked
  Iltifat says "Marked"; "Not yet marked" is a checkbox, or a button that is
  pressed while the filter is on.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # ---------------------------------------------------------------- AC-1: marking and unmarking

  @AC-1
  Scenario: An Admin marks "from" and "to" Words on the Word cards, sees them in two tints, takes one out, and saves
    Given no Iltifat has Marked Words
    When I open the editor of the He → You Iltifat at 1:2–5
    And I note how the editor draws its Word cards unmarked
    And I choose the editor's side "From"
    And I tap the Word cards at 1:2:2
    And I choose the editor's side "To"
    And I tap the Word cards at 1:5:1, 1:5:3
    Then the editor draws the Word cards at 1:2:2 in the "from" tint and the Word cards at 1:5:1, 1:5:3 in the "to" tint, and no other Word card tinted
    And the "from" tint and the "to" tint are two colours, neither of them how an unmarked Word card is drawn
    And a screen reader hears the Word cards at 1:2:2 as "from He" and the Word cards at 1:5:1, 1:5:3 as "to You"
    When I tap the Word cards at 1:5:3
    Then the editor draws the Word cards at 1:2:2 in the "from" tint and the Word cards at 1:5:1 in the "to" tint, and no other Word card tinted
    And a screen reader hears nothing of a side on the Word card at 1:5:3
    When I press the editor's "Save"
    Then the editor says "Saved"
    And the API answers the He → You Iltifat cited at 1:5 with the "from" Words 1:2:2 and the "to" Words 1:5:1
    When I reload the editor of the He → You Iltifat cited at 1:5
    Then the editor draws the Word cards at 1:2:2 in the "from" tint and the Word cards at 1:5:1 in the "to" tint, and no other Word card tinted

  # ---------------------------------------------------------------- AC-9: from the editor to the He → You page

  @AC-9 @AC-1 @AC-6
  Scenario: An Admin marks the He → You Iltifat at 1:2–5 and sees it tinted on the He → You page, in the editor's two tints
    Given no Iltifat has Marked Words
    When I open the editor of the He → You Iltifat at 1:2–5
    And I note how the editor draws its Word cards unmarked
    And I choose the editor's side "From"
    And I tap the Word cards at 1:2:2
    And I choose the editor's side "To"
    And I tap the Word cards at 1:5:1, 1:5:3
    And I press the editor's "Save"
    Then the editor says "Saved"
    And the editor draws the Word cards at 1:2:2 in the "from" tint and the Word cards at 1:5:1, 1:5:3 in the "to" tint, and no other Word card tinted
    When I open "/en/iltifat/he-to-you"
    Then the entry of the He → You Iltifat cited at 1:5 tints its "from" Words 1:2:2 in one colour and its "to" Words 1:5:1, 1:5:3 in another, and no other Word
    And the page drew the "from" Words in the editor's "from" tint and the "to" Words in its "to" tint
    And that entry's key shows "From He" beside a swatch of the "from" tint and "To You" beside a swatch of the "to" tint
    And a screen reader hears the Word at 1:2:2 as its Arabic and "from He", and the Word at 1:5:1 as its Arabic and "to You"
    And I save a screenshot "AC-9-iltifat-he-to-you-marked-1-2-5"

  # ---------------------------------------------------------------- AC-2: a change of run that would leave Marked Words outside it

  @AC-2
  Scenario: In the editor, a change of run that would leave a Marked Word outside it is refused with the reason
    Given only these Iltifat have Marked Words:
      | Iltifat                | from  | to    |
      | He → You cited at 1:5 | 1:2:2 | 1:5:1 |
    When I open the editor of the He → You Iltifat at 1:2–5
    And I set the editor's run to First Ayah 3 and Last Ayah 5
    And I press the editor's "Save"
    Then the editor shows the alert "The Marked Word 1:2:2 lies outside the run 1:3–5."
    And the He → You Iltifat at 1:2–5 in the database is unchanged
    And the API answers the He → You Iltifat cited at 1:5 with the "from" Words 1:2:2 and the "to" Words 1:5:1

  # ---------------------------------------------------------------- AC-5: the list

  @AC-5
  Scenario: The list says which Iltifat are marked, and "Not yet marked" narrows it to the others
    Given only these Iltifat have Marked Words:
      | Iltifat                | from    | to      |
      | He → You cited at 1:5 | 1:2:2   | 1:5:1   |
      | He → We cited at 17:1  | 17:1:2  | 17:1:13 |
      | We → He cited at 17:1  | 17:1:13 |         |
    When I open the Iltifat editor's list
    Then the list's links to these Iltifat say "Marked", and no other link does:
      | Iltifat                |
      | He → You cited at 1:5 |
      | He → We cited at 17:1  |
    When I turn the list's "Not yet marked" filter on
    Then the list links to every Iltifat but these, in the list's order:
      | Iltifat                |
      | He → You cited at 1:5 |
      | He → We cited at 17:1  |
    When I turn the list's "Not yet marked" filter off
    Then the list links to every Iltifat, in the list's order

@issue-271
Feature: Marking Supplication spans on Word cards in the Supplication editor
  In a Supplication's editor an Admin marks its Supplication spans (ADR 0063)
  on the run's Word cards: a first tap on a Word card starts a span, and a
  second tap, on the same Word or a later one, ends it, so a span lies within
  one Ayah, across Ayahs, or is one Word. A tap on a Word inside a span takes
  that span out. The editor draws the cards in a span on the Supplication span
  tint the Supplications page draws spans on, and a screen reader hears each
  card's being in a span, or being a span's pending start. Spans are saved
  with the rest of the Supplication by the one "Save"; a save the server
  refuses shows its sentence, and one made against an older version shows the
  latest save, its spans with it, and saves the choices over it when Save is
  pressed again. The editor's list says "Marked" for a Supplication with a
  span, and a "Not yet marked" filter leaves those out.

  Each scenario says, through the API, which Supplications have spans before
  it starts, every other Supplication having none. These scenarios save
  Supplications, so they run after the Supplication span scenarios, one at a
  time (playwright.config.ts).

  The editor's shape these steps expect, beyond the #201 editor's
  (features/site/supplication-editor.feature): each Word card, the element
  whose id is its Word location, starts, ends or takes out a span on a tap,
  and says to a screen reader "in a Supplication span" while in one, or "a
  Supplication span starts here" while it is a span's pending start. The
  list's entry of a marked Supplication says "Marked"; "Not yet marked" is a
  checkbox.

  Background:
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub

  # ---------------------------------------------------------------- marking, and what readers see

  Scenario: An Admin marks a span across two Ayahs, one inside an Ayah and one of one Word, saves, and the Supplications page draws them
    Given no Supplication has spans
    When I open the editor of the Supplication at 3:191–194
    And I tap the Word cards at 3:191:12
    Then a screen reader hears the Word card at 3:191:12 as "a Supplication span starts here", and no other card as in a span or starting one
    And the editor draws no Word card on the Supplication span tint
    When I tap the Word cards at 3:192:5, 3:193:3, 3:193:6, 3:194:2, 3:194:2
    Then the editor draws the Word cards of the spans "3:191:12–3:192:5, 3:193:3–3:193:6, 3:194:2–3:194:2" on the Supplication span tint, and no other card tinted
    And a screen reader hears the Word cards of the spans "3:191:12–3:192:5, 3:193:3–3:193:6, 3:194:2–3:194:2" as "in a Supplication span", and no other card as in a span or starting one
    And I save a screenshot "supplication-editor-marking-3-191-194"
    When I press the editor's "Save"
    Then the editor says "Saved"
    And the Supplication at 3:191–194 in the database has the spans "3:191:12–3:192:5, 3:193:3–3:193:6, 3:194:2–3:194:2"
    When I reload the page
    Then the editor draws the Word cards of the spans "3:191:12–3:192:5, 3:193:3–3:193:6, 3:194:2–3:194:2" on the Supplication span tint, and no other card tinted
    When I open "/en/supplications"
    Then the entry at 3:191–194 draws these pieces as groups named "Supplication", each exactly its Words' Arabic, and nothing else:
      | from     | to         |
      | 3:191:12 | 3:191:last |
      | 3:192:1  | 3:192:5    |
      | 3:193:3  | 3:193:6    |
      | 3:194:2  | 3:194:2    |
    And I save a screenshot of that entry "supplication-editor-spans-3-191-194"

  # ---------------------------------------------------------------- taking a span out

  Scenario: A tap on a Word inside a span takes that span out, and the save keeps the rest
    Given only these Supplications have spans:
      | Supplication | spans                             |
      | 3:191–194    | 3:191:12–3:192:5, 3:193:3–3:193:6 |
    When I open the editor of the Supplication at 3:191–194
    Then the editor draws the Word cards of the spans "3:191:12–3:192:5, 3:193:3–3:193:6" on the Supplication span tint, and no other card tinted
    When I tap the Word cards at 3:192:2
    Then the editor draws the Word cards of the spans "3:193:3–3:193:6" on the Supplication span tint, and no other card tinted
    And a screen reader hears the Word cards of the spans "3:193:3–3:193:6" as "in a Supplication span", and no other card as in a span or starting one
    When I press the editor's "Save"
    Then the editor says "Saved"
    And the Supplication at 3:191–194 in the database has the spans "3:193:3–3:193:6"

  # ---------------------------------------------------------------- a refused save, and one against an older version

  Scenario: A change of run that would leave a span outside it is refused with the reason, and the span is kept
    Given no Supplication has spans
    When I open the editor of the Supplication at 3:191–194
    And I tap the Word cards at 3:194:2, 3:194:4
    And I set the editor's run to First Ayah 191 and Last Ayah 193
    And I press the editor's "Save"
    Then the editor shows the alert "The Supplication span from 3:194:2 to 3:194:4 lies outside the run 3:191–193."
    And the editor draws the Word cards of the spans "3:194:2–3:194:4" on the Supplication span tint, and no other card tinted
    And the Supplication at 3:191–194 in the database is as it was when its editor opened
    And the Supplication at 3:191–194 in the database has the spans ""

  Scenario: A save made after another save is refused, showing the latest spans, and Save then saves the spans as marked
    Given only these Supplications have spans:
      | Supplication | spans         |
      | 7:23         | 7:23:1–7:23:2 |
    When I open the editor of the Supplication at 7:23 in two tabs
    And the Supplication at 7:23 has the spans "7:23:5–7:23:9", saved through the API
    And in the second tab I tap the Word cards at 7:23:4, 7:23:4 and press "Save"
    Then the editor in the second tab shows the alert "This Supplication has been saved since you opened it. The latest is shown beside your choices."
    And the editor in the second tab shows the latest save with the spans "7:23:5–7:23:9"
    And the Supplication at 7:23 in the database has the spans "7:23:5–7:23:9"
    When in the second tab I press "Save"
    Then the editor in the second tab says "Saved"
    And the Supplication at 7:23 in the database has the spans "7:23:1–7:23:2, 7:23:4–7:23:4"

  # ---------------------------------------------------------------- the list

  Scenario: The list says which Supplications are marked, and "Not yet marked" leaves them out
    Given only these Supplications have spans:
      | Supplication | spans             |
      | 3:191–194    | 3:193:3–3:193:6   |
      | 2:201        | 2:201:4–2:201:9   |
    When I open "/admin/supplications"
    Then the list's entries of these Supplications say "Marked", and no other entry does:
      | Supplication |
      | 2:201        |
      | 3:191–194    |
    When I turn the list's "Not yet marked" filter on
    Then the list shows every entry it showed before but these:
      | Supplication |
      | 2:201        |
      | 3:191–194    |
    When I turn the list's "Not yet marked" filter off
    Then the list shows every entry it showed before

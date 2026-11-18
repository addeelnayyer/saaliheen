@issue-270
Feature: Supplication spans on the Supplications page
  A Supplication's spans (#270, ADR 0063) are the stretches of its Ayahs'
  Words that its Speaker says to Allah. On the Supplications page each span is
  drawn on one pale tint, the Supplication span tint, apart from the Iltifat
  tints and the Allah gold: as one element for each Ayah it touches, so a span
  across two Ayahs is two elements, the spaces between its Words tinted with
  them. A screen reader hears each as a group named "Supplication" in the
  reader's Language, holding exactly its Words' Arabic. The Ayah translation is
  never marked, and the Words outside a span are drawn as before, never dimmed.
  A Supplication with no span is shown as it was. Spans are drawn under every
  filter, the Other words to Allah included. Study and Flowing draw no spans.

  The spans are arranged through the API as the Admin saves them (PUT
  /api/v1/supplications/{id}, features/api/supplication-spans.feature), each
  scenario saying which Supplications have spans and leaving every other with
  none. These scenarios run after the Supplication editor's, one at a time
  (playwright.config.ts). The expected Arabic is read from the sources.

  The page's shape these steps expect: each entry is an <article> in <main>,
  its heading linking to its first Ayah (`/{lang}/{s}#{s}:{a}`); each span's
  piece is an element with role "group" inside the entry's Arabic (an element
  with lang="ar"), in each Script the page holds, the one shown being the
  reader's Script.

  Background:
    Given a browser with no saved reader settings

  Scenario: The spans of the Supplication at 3:191–194, one across two Ayahs and one inside an Ayah, are drawn as one tinted group per Ayah piece
    Given only these Supplications have spans:
      | Supplication | spans                             |
      | 3:191–194    | 3:191:12–3:192:5, 3:193:3–3:193:6 |
    When I open "/en/supplications"
    Then the entry at 3:191–194 draws these pieces as groups named "Supplication", each exactly its Words' Arabic, and nothing else:
      | from     | to         |
      | 3:191:12 | 3:191:last |
      | 3:192:1  | 3:192:5    |
      | 3:193:3  | 3:193:6    |
    And each piece of that entry is drawn on one opaque tint, the spaces between its Words included
    And that tint is not the page's paper, an Iltifat tint or the Allah gold
    And the Arabic of each piece contrasts with its tint by at least 4.5 to 1
    And no Ayah translation of that entry is marked, and no Word outside a piece is tinted or dimmed
    And no other entry on the page draws a group named "Supplication"

  Scenario: In Urdu a screen reader names each span "دعا"
    Given only these Supplications have spans:
      | Supplication | spans             |
      | 2:201        | 2:201:4–2:201:9   |
    When I open "/ur/supplications"
    Then the entry at 2:201 draws these pieces as groups named "دعا", each exactly its Words' Arabic, and nothing else:
      | from    | to      |
      | 2:201:4 | 2:201:9 |

  Scenario: A whole Ayah in a span is one group, its Ayah end kept outside it
    Given only these Supplications have spans:
      | Supplication | spans               |
      | 2:286        | 2:286:1–2:286:last  |
    When I open "/en/supplications"
    Then the entry at 2:286 draws these pieces as groups named "Supplication", each exactly its Words' Arabic, and nothing else:
      | from    | to         |
      | 2:286:1 | 2:286:last |

  Scenario: The Other words to Allah at 2:200 show their span once they join the list
    Given only these Supplications have spans:
      | Supplication | spans             |
      | 2:200        | 2:200:12–2:200:16 |
    When I open "/en/supplications?others=1"
    Then the entry at 2:200 draws these pieces as groups named "Supplication", each exactly its Words' Arabic, and nothing else:
      | from     | to       |
      | 2:200:12 | 2:200:16 |
    When I open "/en/supplications?opening=rabbana&others=1"
    Then the entry at 2:200 draws these pieces as groups named "Supplication", each exactly its Words' Arabic, and nothing else:
      | from     | to       |
      | 2:200:12 | 2:200:16 |

  Scenario Outline: The span at 2:201 in <Script>, <Language>, on the <Theme> paper
    Given only these Supplications have spans:
      | Supplication | spans           |
      | 2:201        | 2:201:4–2:201:9 |
    And on an earlier visit to "/<lang>/21" I chose, in order:
      | <Script> |
      | <Theme>  |
    When I open "/<lang>/supplications" in a fresh browser with an empty cache that keeps those choices
    Then the entry at 2:201 draws these pieces as groups named "<label>", each exactly its Words' Arabic, and nothing else:
      | from    | to      |
      | 2:201:4 | 2:201:9 |
    And each piece of that entry is drawn on one opaque tint, the spaces between its Words included
    And that tint is not the page's paper, an Iltifat tint or the Allah gold
    And the Arabic of each piece contrasts with its tint by at least 4.5 to 1
    And I save a screenshot of that entry "supplication-span-<script>-<lang>-<theme>"

    Examples:
      | Script   | script  | lang | Language | Theme | theme | label        |
      | Uthmani  | uthmani | en   | English  | Light | light | Supplication |
      | Uthmani  | uthmani | ur   | Urdu     | Dark  | dark  | دعا          |
      | Indo-Pak | indopak | en   | English  | Dark  | dark  | Supplication |
      | Indo-Pak | indopak | ur   | Urdu     | Light | light | دعا          |

  Scenario: A Supplication with no span is shown as before
    Given no Supplication has spans
    When I open "/en/supplications"
    Then no entry on the page draws a group named "Supplication"
    And no Word on the Supplications page is tinted

  Scenario: Study and Flowing draw no spans, though the Supplication at 3:191–194 has them
    Given only these Supplications have spans:
      | Supplication | spans                            |
      | 3:191–194    | 3:191:12–3:192:5, 3:193:3–3:193:6 |
    When I open Surah 3 in English
    Then the page draws no group named "Supplication"
    When I switch the Ayah layout to Flowing
    Then the page draws no group named "Supplication"

@issue-140
Feature: Iltifat chips in Study
  An Ayah in Study where an Iltifat is cited shows one chip for it at its foot,
  after its Ayah translation (or where it would be), in the footer that holds
  its Theme chips (#129). The chip names the Iltifat direction ("Iltifat · He
  → We"), says Disputed when the Iltifat is Disputed, and is outlined where a
  Theme chip is filled. It is a link to the Iltifat's entry on its direction
  page (#138), /{lang}/iltifat/{direction}#iltifat-{id}; following it is a
  look-up, so the Reading places stay as they were. The other Ayahs of the
  Iltifat's run show no chip. Flowing, the Share page and the Passage editor
  show none.

  The Iltifat are read from the run's own Postgres, which db:migrate loaded
  from the catalogue before the build (features/site/steps/iltifat.ts); the
  harness's one edit, giving the We → He Iltifat cited at 35:31 and 35:32 the
  run 35:31–32 (features/site/arrange-iltifat.ts), makes two Iltifat of one
  run. Direction names, Ayah locations and "Disputed" are the issue's words;
  which Iltifat are cited where, and which are Disputed, are the database's.
  The interface is English in both Languages, as on the Iltifat pages.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: where a chip stands

  @AC-1 @AC-7
  Scenario Outline: Ayah <ayah>'s <direction> chip follows its Ayah translation, in the footer of its Theme chips, in <Language>
    Given I open "/<lang>/<surah>"
    When I turn the Ayah translation switch on
    Then Ayah <ayah> shows the Iltifat chips "<direction>"
    And Ayah <ayah>'s Iltifat chips come after its last Word card and its Ayah translation
    And Ayah <ayah>'s Iltifat chips are in the same footer as its Theme chips
    And Ayah <ayah>'s Iltifat chips are outlined and its Theme chips are filled

    Examples:
      | ayah  | surah | lang | Language | direction |
      | 1:5   | 1     | en   | English  | He → You  |
      | 1:5   | 1     | ur   | Urdu     | He → You  |
      | 2:54  | 2     | en   | English  | You → He  |
      | 35:31 | 35    | ur   | Urdu     | We → He   |

  @AC-1
  Scenario: With the Ayah translation off, the chip comes right after the Ayah's Word cards
    Given I open "/en/1"
    Then Ayah 1:5 shows the Iltifat chips "He → You"
    And Ayah 1:5's Iltifat chips come after its last Word card and before Ayah 1:6

  @AC-1 @AC-7
  Scenario: Only the cited Ayah of an Iltifat shows its chip, not the rest of its run
    Given I open "/en/1"
    Then Ayah 1:5 shows the Iltifat chips "He → You"
    And no other Ayah of the run of the He → You Iltifat at 1:2–5 shows a chip for it
    And Ayah 1:1 shows no Iltifat chip

  @AC-1
  Scenario: Two Iltifat sharing one run are each shown at their own cited Ayah, and the run's other Ayahs show none
    Given I open "/en/35"
    Then Ayah 35:31 shows the Iltifat chips "We → He"
    And Ayah 35:32 shows the Iltifat chips "We → He"
    And Ayah 35:30 shows no Iltifat chip
    And Ayah 35:33 shows no Iltifat chip

  @AC-1
  Scenario: A Surah opened from the index shows its chips once its parts have arrived
    Given I open "/en"
    When I follow the index card of Surah 17
    Then every Ayah of Surah 17 is shown
    And Ayah 17:1 shows the Iltifat chips "He → We, We → He"
    And Ayah 17:21 shows the Iltifat chips "He → We"
    And Ayah 17:2 shows no Iltifat chip

  @AC-1
  Scenario Outline: Every Ayah of the Quran, served in <Language>, carries the chip of each Iltifat cited at it, and no other
    Then every one of the 114 Surahs served in <Language> carries, at each Ayah, the chips of exactly the Iltifat the database cites there, each linking to its entry

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-2: 17:1, Disputed

  @AC-2 @AC-7
  Scenario Outline: Ayah 17:1 shows two chips, one for each of its Iltifat, in <Language>
    Given I open "/<lang>/17"
    Then Ayah 17:1 shows the Iltifat chips "He → We, We → He"
    And neither of Ayah 17:1's Iltifat chips says Disputed

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  @AC-2 @AC-7
  Scenario Outline: Ayah <ayah>'s Disputed <direction> chip says Disputed, in <Language>
    Given I open "/<lang>/<surah>"
    Then Ayah <ayah> shows the Iltifat chips "<direction>"
    And Ayah <ayah>'s Iltifat chip "<direction>" says Disputed

    Examples:
      | ayah  | surah | lang | Language | direction |
      | 2:21  | 2     | en   | English  | He → You  |
      | 2:54  | 2     | ur   | Urdu     | You → He  |
      | 87:16 | 87    | en   | English  | He → You  |

  @AC-2
  Scenario: The chip of an Iltifat that is not Disputed does not say Disputed
    Given I open "/en/1"
    Then Ayah 1:5's Iltifat chip "He → You" does not say Disputed

  # ---------------------------------------------------------------- AC-3: the chip opens the Iltifat

  @AC-3 @AC-7
  Scenario Outline: Ayah <ayah>'s <direction> chip links to its Iltifat's entry on the direction page, and following it opens the entry, in <Language>
    Given I open "/<lang>/<surah>"
    Then each of Ayah <ayah>'s Iltifat chips is a link to its Iltifat's entry on its direction page
    When I follow Ayah <ayah>'s Iltifat chip "<direction>"
    Then I am on the <direction> page "/<lang>/iltifat/<page>" at the fragment of the Iltifat cited at <ayah>
    And the entry of the <direction> Iltifat cited at <ayah> is at the top of the screen

    Examples:
      | ayah  | surah | lang | Language | direction | page      |
      | 1:5   | 1     | en   | English  | He → You  | he-to-you |
      | 17:1  | 17    | ur   | Urdu     | He → We   | he-to-we  |
      | 17:1  | 17    | en   | English  | We → He   | we-to-he  |
      | 35:32 | 35    | en   | English  | We → He   | we-to-he  |

  @AC-3 @AC-7
  Scenario: Following a chip leaves the Reading place where it was
    Given I open "/en/17"
    When I scroll until Ayah 17:21 is at the top of the screen
    And I follow Ayah 17:21's Iltifat chip "He → We"
    Then I am on the He → We page "/en/iltifat/he-to-we" at the fragment of the Iltifat cited at 17:21
    When I scroll to the bottom of the Iltifat page
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 17. Al-Isra · Ayah 21 | /en/17 |

  # ---------------------------------------------------------------- AC-4: no chips elsewhere

  @AC-4 @AC-7
  Scenario Outline: In Flowing in <Language>, Surah <surah> shows no Iltifat chip
    Given I open "/<lang>/<surah>"
    When I switch the Ayah layout to Flowing
    Then no Iltifat chip of Surah <surah> is shown

    Examples:
      | Language | lang | surah |
      | Urdu     | ur   | 1     |
      | English  | en   | 17    |

  @AC-4
  Scenario Outline: The Share page shows no Iltifat chip, <Layout>
    Given I open the Share page of 1:2–5 in English and Uthmani
    When I choose the <Layout> Share layout
    Then the page has no link to an Iltifat page and no Iltifat chip

    Examples:
      | Layout       |
      | Ayah by Ayah |
      | Flowing      |

  @AC-4
  Scenario Outline: The Passage editor shows no Iltifat chip, <Layout>
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    When I open the Passage editor for Surah 1
    And I choose the <Layout> Ayah layout
    Then the page has no link to an Iltifat page and no Iltifat chip

    Examples:
      | Layout       |
      | Ayah by Ayah |
      | Flowing      |

  # ---------------------------------------------------------------- AC-5: keyboard and screen reader

  @AC-5
  Scenario Outline: Ayah <ayah>'s <direction> chip is a link announced with its direction, and Disputed where it is, in <Language>
    Given I open "/<lang>/<surah>"
    Then Ayah <ayah>'s Iltifat chip "<direction>" is a link announced as "<announced>"
    And Ayah <ayah>'s Iltifat chip "<direction>" is English and runs left to right

    Examples:
      | ayah  | surah | lang | Language | direction | announced                                     |
      | 1:5   | 1     | en   | English  | He → You  | Iltifat, turns from He to You                 |
      | 1:5   | 1     | ur   | Urdu     | He → You  | Iltifat, turns from He to You                 |
      | 87:16 | 87    | en   | English  | He → You  | Iltifat, turns from He to You, disputed       |

  @AC-5
  Scenario: A chip is reached and followed with the keyboard
    Given I open "/en/1"
    When I press Tab from "Listen from Ayah 1:5" until Ayah 1:5's Iltifat chip "He → You" has the focus
    And I press Enter
    Then I am on the He → You page "/en/iltifat/he-to-you" at the fragment of the Iltifat cited at 1:5

  @AC-5
  Scenario: A focused chip shows a focus ring
    Given I open "/en/1"
    When I press Tab from "Listen from Ayah 1:5" until Ayah 1:5's Iltifat chip "He → You" has the focus
    Then Ayah 1:5's Iltifat chip "He → You" shows a focus ring

  # ---------------------------------------------------------------- AC-6: colour themes and phone width

  @AC-6
  Scenario Outline: Ayah <ayah>'s chips read clearly on the <Theme> paper on a desktop, in <Language>
    Given on an earlier visit to "/<lang>/<surah>" I chose, in order:
      | <Theme> |
    When I open "/<lang>/<surah>#<ayah>" in a fresh browser with an empty cache that keeps those choices
    Then the page is drawn on the <Theme> paper
    And Ayah <ayah>'s Iltifat chips read clearly against what is behind them, their text and their outline
    And the page does not scroll sideways
    And I save a screenshot of Ayah <ayah>'s Iltifat chips "AC-6-iltifat-chips-<file>-<lang>-<theme>-desktop"

    Examples:
      | ayah | surah | file | lang | Language | Theme | theme |
      | 17:1 | 17    | 17-1 | en   | English  | Light | light |
      | 17:1 | 17    | 17-1 | ur   | Urdu     | Dark  | dark  |

  @AC-6
  Scenario Outline: Ayah <ayah>'s chips read clearly on the <Theme> paper and fit a phone, in <Language>
    Given on an earlier visit to "/<lang>/<surah>" I chose, in order:
      | <Theme> |
    When I open "/<lang>/<surah>#<ayah>" in a fresh browser with an empty cache that keeps those choices
    And I view the page on a 390×844 phone
    Then the page is drawn on the <Theme> paper
    And Ayah <ayah>'s Iltifat chips all lie within the screen's width
    And Ayah <ayah>'s Iltifat chips read clearly against what is behind them, their text and their outline
    And the page does not scroll sideways
    And I save a screenshot of Ayah <ayah>'s Iltifat chips "AC-6-iltifat-chips-<file>-<lang>-<theme>-phone"

    Examples:
      | ayah  | surah | file  | lang | Language | Theme | theme |
      | 17:1  | 17    | 17-1  | en   | English  | Dark  | dark  |
      | 17:1  | 17    | 17-1  | ur   | Urdu     | Light | light |
      | 87:16 | 87    | 87-16 | ur   | Urdu     | Dark  | dark  |
      | 87:16 | 87    | 87-16 | en   | English  | Light | light |

@issue-290
Feature: The Roots list
  The Roots list, /{lang}/roots, reached from Explore (CONTEXT.md: Roots
  list), shows every Root under its first letter, the letters and the Roots
  under each in Arabic alphabetical order, a hamza filed under ا. Each row
  gives the Root's letters, transliteration and count of occurrences, a tick
  when it is a Known Root, and leads to its Root page. Typing narrows it by
  letters, spaces and vowel marks aside, or by transliteration, in any case,
  accents and hyphens aside, the way the Surah index search narrows Surahs.
  Particles are not Roots, so none is listed, and the list has no Memorized?
  choice: marking is left to the Root page, the Root dialog and the Known
  words page.

  The Roots and their counts are read from QUL's word root database
  (./steps/roots), never typed; ر ح م's transliteration and count are the
  Root page's (./root-page.feature). The page reads Neon on request, so it
  is the error page with Retry when Neon cannot answer
  (features/no-database/surah-pages-without-neon.feature).

  The page's shape these steps expect: each letter a <section> of <main>
  headed by an <h2> of that letter; under it a list whose every item is one
  Root's link to its Root page, the link's first Arabic text the Root's
  letters; a Known Root's tick an element marked `data-known-root` that a
  screen reader hears as "Known Root".

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1, AC-5: every Root, grouped and ordered

  @AC-1 @AC-5
  Scenario Outline: The Roots list in <Language> lists every Root under its first letter, in Arabic alphabetical order, and no particle
    Given I open "/<lang>/roots"
    Then the page's heading reads "Roots"
    And the Roots list holds every Root of QUL's word root database, each once, and nothing else
    And the Roots list's letter headings are its Roots' first letters, each once, in Arabic alphabetical order
    And under each letter heading are the Roots beginning with that letter, in Arabic alphabetical order
    And the Roots list has no Memorized? choice
    And I save a screenshot "roots-list-<lang>-light-desktop"

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  # ---------------------------------------------------------------- AC-2: each row and its link

  @AC-2
  Scenario Outline: Every row of the Roots list in <Language> shows its count of occurrences and leads to its Root page
    Given I open "/<lang>/roots"
    Then every row of the Roots list shows its Root's count of occurrences and links to its Root page in <Language>
    And the Roots list's row for "ر ح م" shows "r-ḥ-m" and 339 occurrences

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-2
  Scenario: Following the row for ر ح م opens its Root page
    Given I open "/en/roots"
    When I follow the Roots list's row for "ر ح م"
    Then the Root page's heading is "ر ح م", with "r-ḥ-m", 339 occurrences and 47 unique Words

  # ---------------------------------------------------------------- AC-3: ticks

  @AC-3
  Scenario: A Root marked on its Root page is ticked on the Roots list, and unticked once unmarked there
    Given I open "/en/roots"
    Then no row of the Roots list is ticked
    When I open "/en/roots/رحم"
    And I switch the Root page's Memorized?
    And I open "/en/roots"
    Then the Roots list ticks "ر ح م", which a screen reader hears as a Known Root, and no other Root
    When I open "/en/roots/رحم"
    And I switch the Root page's Memorized?
    And I open "/en/roots"
    Then no row of the Roots list is ticked

  @AC-3
  Scenario: Roots marked in the Root dialog and on the Known words page are ticked on the Roots list
    Given I open "/en/1"
    When I open the Root tag on the Word card at 1:1:3
    And I switch the Root dialog's Memorized?
    And I open the Known words page in English
    And I switch Memorized? for "ك ت ب" on the Known words page
    And I open "/en/roots"
    Then the Roots list ticks "ر ح م" and "ك ت ب", and no other Root
    And I save a screenshot of the Roots list's row for "ر ح م" "roots-list-ticked-en-light-desktop"

  @AC-3
  Scenario: A Root marked in another tab is ticked on the Roots list already open, without a reload
    Given I open "/en/roots"
    When I open "/en/roots/حيض" in a new tab
    And I switch the Root page's Memorized?
    And I turn back to the first tab
    Then the Roots list ticks "ح ي ض", and no other Root

  # ---------------------------------------------------------------- AC-4: search

  @AC-4
  Scenario Outline: Searching the Roots list for <search> narrows it to the Roots whose <what> holds it
    Given I open "/en/roots"
    When I search the Roots list for "<search>"
    Then the Roots list lists "ر ح م", and only Roots whose <what> holds "<search>"
    When I clear the Roots list's search
    Then the Roots list holds every Root of QUL's word root database, each once, and nothing else

    Examples:
      | search | what            |
      | ر ح م  | letters         |
      | رحم    | letters         |
      | r-ḥ-m  | transliteration |
      | R-Ḥ-M  | transliteration |
      | RHM    | transliteration |

  @AC-4
  Scenario: Letters typed on an Urdu keyboard narrow the Roots list in Urdu
    Given I open "/ur/roots"
    When I search the Roots list for "کتب"
    Then the Roots list lists "ك ت ب", and only Roots whose letters holds "کتب"

  @AC-4
  Scenario: A search no Root matches says so
    Given I open "/en/roots"
    When I search the Roots list for "xyz"
    Then the Roots list lists no Root and says no Root matches "xyz"

  # ---------------------------------------------------------------- AC-8: phone width

  @AC-8
  Scenario Outline: The Roots list in <Language> fits a phone's width, with the Tab bar
    Given I open "/<lang>/roots"
    When I view the page on a 390×844 phone
    Then the page does not scroll sideways
    And the destinations are a tab bar along the bottom of the screen: Read, Explore and Me, in order
    And Explore is marked as the current destination, and no other
    And I save a screenshot "roots-list-<lang>-light-phone"

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

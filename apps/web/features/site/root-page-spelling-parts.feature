@issue-288
Feature: A large Root's Spellings start closed and load fifty Ayahs at a time
  A large Root's page stays small and quick (#288). On a Root of more than
  fifty occurrences each Spelling starts closed, showing its count, and the
  page sends none of its Ayahs. Opening a Spelling, or choosing its Lemma in
  the Lemma row, shows its first fifty Ayahs, and "Show more" at the end brings
  the next fifty, until the last part, which has none. Each part is fetched
  when it is wanted; one that cannot be read shows a Retry in its place, the
  rest of the page untouched. A Root of fifty occurrences or fewer opens with
  every Spelling open, as #287 made it.

  ا ل ه is the issue's ء ل ه, written as QUL writes it: its most frequent
  Spelling is in many parts, and others in two. Lemmas, Spellings and their
  Ayahs are read from QUL's word root and word lemma databases and the sources
  (./steps/roots), never typed.

  The page's shape these steps expect, beside the Root page's own
  (./root-page.feature): each Spelling's <h3> holds a button whose
  aria-expanded says whether it is open and whose aria-controls names the
  element holding its Ayahs and its "Show more".

  Background:
    Given a browser with no saved reader settings

  @AC-1 @AC-4
  Scenario: On ا ل ه every Spelling starts closed with its count, and none of their Ayahs is sent
    Given the browser's requests for parts are watched
    When I open "/en/roots/اله"
    Then every Spelling of "ا ل ه" is closed, showing its count, and a screen reader hears it collapsed
    And the Root page lists no Ayah, and no part has been requested

  @AC-2 @AC-4
  Scenario: Opening ا ل ه's most frequent Spelling shows its first fifty Ayahs, and "Show more" the next fifty
    Given I open "/en/roots/اله"
    When I open the most frequent Spelling of "ا ل ه"
    Then a screen reader hears that Spelling expanded
    And that Spelling lists its first 50 Ayahs in Quran order, its own Words tinted in each
    And that Spelling offers "Show more"
    When I choose "Show more" under that Spelling
    Then that Spelling lists its first 100 Ayahs in Quran order, its own Words tinted in each
    And that Spelling offers "Show more"

  @AC-2
  Scenario: A Spelling of ا ل ه in two parts has no "Show more" after its last
    Given I open "/en/roots/اله"
    When I open a Spelling of "ا ل ه" whose Ayahs are in two parts
    Then that Spelling lists its first 50 Ayahs in Quran order, its own Words tinted in each
    When I choose "Show more" under that Spelling
    Then that Spelling lists all its Ayahs in Quran order, its own Words tinted in each
    And that Spelling offers no "Show more"

  @AC-4
  Scenario: Closing an open Spelling hides its Ayahs, and a screen reader hears it collapsed
    Given I open "/en/roots/اله"
    When I open the most frequent Spelling of "ا ل ه"
    Then that Spelling lists its first 50 Ayahs in Quran order, its own Words tinted in each
    When I close that Spelling
    Then a screen reader hears that Spelling collapsed
    And none of that Spelling's Ayahs is on screen

  @AC-3
  Scenario: Choosing a Lemma of ا ل ه in the Lemma row brings its section into view and opens it
    Given I open "/en/roots/اله"
    When I follow the Root page's Lemma row to its last Lemma
    Then the address leads to the last Lemma's section of "ا ل ه", which is on screen
    And every Spelling of the last Lemma of "ا ل ه" is open, listing its first Ayahs, and every other Spelling is closed

  @AC-6
  Scenario: A Spelling part that cannot be read shows a Retry in its place, the rest of the page untouched
    Given I open "/en/roots/اله"
    And the browser's requests for parts fail
    When I open the most frequent Spelling of "ا ل ه"
    Then in place of that Spelling's Ayahs is a message with a Retry
    And the Root page's heading is "ا ل ه", and every other Spelling of it is closed, showing its count
    When the browser's requests for parts are served again
    And I choose Retry under that Spelling
    Then that Spelling lists its first 50 Ayahs in Quran order, its own Words tinted in each

  @AC-5
  Scenario Outline: The small Root <letters> opens with every Spelling open and no "Show more"
    Given the browser's requests for parts are watched
    When I open "/en/roots/<address>"
    Then every Spelling of "<letters>" is open, and a screen reader hears it expanded
    And each Spelling of "<letters>" shows its meaning in English and its count, then the Ayahs it occurs in, in Quran order, each once
    And the Root page offers no "Show more", and no part has been requested

    Examples:
      | letters | address |
      | ح ي ض   | حيض     |
      | ز ب د   | زبد     |

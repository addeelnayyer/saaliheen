@issue-200
Feature: Filtering the Supplications page
  A reader narrows the Supplications page from the top of the page (#200,
  #195): by Opening, with the chips All · رَبَّنَا Rabbana · رَبِّ Rabbi ·
  Other, each showing how many entries it would give; to Prophet's
  supplications, with "Prophets only"; and, with "Show other words to Allah",
  off by default, the Other words to Allah join the list in Quran order, each
  labelled with its kind. The chips and the switches work together, and the
  chip counts follow the switches.

  Filtering happens at once in the browser, without reloading. The choices
  live in the link (`?opening=rabbana|rabbi|other`, `?prophets=1`,
  `?others=1`), so a filtered view can be shared or bookmarked, and the
  page's own Language switch keeps them. When the choices leave nothing, the
  page says so plainly.

  The expected entries, counts and labels are read from the curated file
  (data/supplications/supplications.json), which db:migrate loaded into the
  run's own Postgres before the build; the runs and the kind's label named
  here are #195's.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- Opening chips

  Scenario Outline: The "<chip>" Opening chip in <Language> shows its count and narrows the list, at once
    Given I open "/<lang>/supplications"
    Then the Supplications page's Opening chips are All, Rabbana, Rabbi and Other, and "All" is chosen
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    When I choose the "<chip>" Opening chip on the Supplications page
    Then the Supplications page's link is "/<lang>/supplications<query>"
    And the "<chip>" Opening chip is chosen, and no other
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    And the Supplications page did not reload

    Examples:
      | lang | Language | chip    | query             |
      | en   | English  | Rabbana | ?opening=rabbana  |
      | ur   | Urdu     | Rabbi   | ?opening=rabbi    |
      | en   | English  | Other   | ?opening=other    |
      | en   | English  | All     |                   |

  Scenario: A Supplication with both Openings appears under both Rabbana and Rabbi
    Given I open "/en/supplications"
    When I choose the "Rabbana" Opening chip on the Supplications page
    Then the Supplications page lists the Supplication at 14:35–41
    When I choose the "Rabbi" Opening chip on the Supplications page
    Then the Supplications page lists the Supplication at 14:35–41

  # ---------------------------------------------------------------- Prophets only

  Scenario: "Prophets only" keeps the Prophet's supplications, the mixed groups and the commanded "Say:" ones among them, and the counts follow it
    Given I open "/en/supplications"
    Then the Supplications page's "Prophets only" switch is off
    When I turn on the Supplications page's "Prophets only" switch
    Then the Supplications page's link is "/en/supplications?prophets=1"
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And every entry on the Supplications page is said by a Speaker who includes a Prophet
    And the Supplications page lists the Supplication at 7:89
    And the Supplications page lists the Supplication at 20:114
    And the Supplications page does not list the Supplication at 3:35–36
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    And the Supplications page did not reload

  Scenario: "Prophets only" and the Rabbana chip together
    Given I open "/en/supplications"
    When I turn on the Supplications page's "Prophets only" switch
    And I choose the "Rabbana" Opening chip on the Supplications page
    Then the Supplications page's link is "/en/supplications?opening=rabbana&prophets=1"
    And the "Rabbana" Opening chip is chosen, and no other
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    When I turn off the Supplications page's "Prophets only" switch
    Then the Supplications page's link is "/en/supplications?opening=rabbana"
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link

  # ---------------------------------------------------------------- Show other words to Allah

  Scenario: The Other words to Allah are off by default, and when shown they join the list in Quran order, each labelled with its kind
    Given I open "/en/supplications"
    Then the Supplications page's "Show other words to Allah" switch is off
    And the page lists none of the curated file's Other words to Allah
    When I turn on the Supplications page's "Show other words to Allah" switch
    Then the Supplications page's link is "/en/supplications?others=1"
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each of the Other words to Allah on the Supplications page is labelled with its kind, and no Supplication is
    And the entry at 23:106–107 is labelled "Plea at the Judgment"
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    When I turn on the Supplications page's "Prophets only" switch
    Then the Supplications page's link is "/en/supplications?prophets=1&others=1"
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link
    And the Supplications page did not reload

  # ---------------------------------------------------------------- Links

  Scenario Outline: A link with choices in it, <query>, opens the Supplications page in <Language> with them on
    When I open "/<lang>/supplications<query>"
    Then the "<chip>" Opening chip is chosen, and no other
    And the Supplications page's "Prophets only" switch is <prophets>
    And the Supplications page's "Show other words to Allah" switch is <others>
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each Opening chip counts the entries it would give, as the curated file has them for the choices in the link

    Examples:
      | lang | Language | query                               | chip    | prophets | others |
      | en   | English  | ?opening=rabbana&prophets=1         | Rabbana | on       | off    |
      | ur   | Urdu     | ?opening=rabbana&prophets=1         | Rabbana | on       | off    |
      | en   | English  | ?opening=rabbi&others=1             | Rabbi   | off      | on     |
      | ur   | Urdu     | ?opening=other&prophets=1&others=1  | Other   | on       | on     |

  Scenario Outline: Switching the Supplications page from <Language> to <Other> keeps the choices
    Given I open "/<lang>/supplications"
    When I choose the "Rabbi" Opening chip on the Supplications page
    And I turn on the Supplications page's "Prophets only" switch
    And I turn on the Supplications page's "Show other words to Allah" switch
    And I choose <Other> on the Supplications page's Language switch
    Then the Supplications page's link is "/<other>/supplications?opening=rabbi&prophets=1&others=1"
    And the "Rabbi" Opening chip is chosen, and no other
    And the Supplications page's "Prophets only" switch is on
    And the Supplications page's "Show other words to Allah" switch is on
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And each entry on the Supplications page names its Speaker in <Other>

    Examples:
      | lang | Language | other | Other   |
      | en   | English  | ur    | Urdu    |
      | ur   | Urdu     | en    | English |

  # ---------------------------------------------------------------- Empty

  Scenario Outline: A link whose choices leave nothing, in <Language>, shows a clear empty message
    When I open "/<lang>/supplications?opening=allahumma&prophets=1"
    Then the Supplications page lists no entries
    And the Supplications page says "Nothing matches these choices. Choose another Opening, or turn a switch off."
    And no Opening chip is chosen
    When I choose the "All" Opening chip on the Supplications page
    Then the Supplications page's link is "/<lang>/supplications?prophets=1"
    And the Supplications page lists the curated file's entries for the choices in the link, in Quran order
    And the Supplications page does not say "Nothing matches these choices. Choose another Opening, or turn a switch off."

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

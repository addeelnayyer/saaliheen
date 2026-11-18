@issue-131
Feature: Opening a large Theme page instantly, then in parts
  A Theme page opened from inside the app (a Theme chip, the Themes list, Back
  or Forward) shows its header and first Passage groups
  at once, with a shimmering skeleton for the rest, then fills in the rest
  from its Theme parts, static JSON files in the page's Language. It shares
  the Surah parts' mechanism (ADR 0005). A Theme page loaded directly,
  reloaded or crawled still carries every Ayah in its HTML.

  Disbelief, with 947 Ayahs, is the largest Theme. Its Ayahs, Passage groups
  and names are read from the Themes file and the Passages file, never typed.
  The server's parts are held back by intercepting the browser's requests for
  anything under /parts/, as a reader on a slow connection would see them.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1, AC-7: in-app, by parts

  @AC-1 @AC-7
  Scenario: A Theme chip opens Disbelief with its header and first Passage group at once, then fills in by parts
    Given I open "/en/2"
    And the server holds back every part of a Theme
    When I follow Ayah 2:6's Theme chip "Disbelief"
    Then I am on the Theme page "/en/themes/disbelief"
    And the Theme page's heading is the name of "Disbelief" in English
    And the Theme page shows the Theme category of "Disbelief" in English, and its count of Ayahs, before its first Passage group
    And the Theme page shows the first Passage group of "Disbelief" from the Themes file, with its Ayahs
    And the Theme's loading skeleton is shown
    And the Theme page does not yet list every Ayah of "Disbelief"
    When the held-back parts arrive
    Then the Theme page has finished loading
    And the Theme page shows the Passage groups of "Disbelief" from the Themes file, in order, each Ayah under its own group
    And the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"
    And the Theme page filled in from more than one part

  @AC-1
  Scenario Outline: The Themes list opens Disbelief at once in <Language>, then fills it in by parts
    Given I open "/<lang>/themes"
    And the server holds back every part of a Theme
    When I follow the Themes list's link to "Disbelief"
    Then I am on the Theme page "/<lang>/themes/disbelief"
    And the Theme page's heading is the name of "Disbelief" in <Language>
    And the Theme page shows the first Passage group of "Disbelief" from the Themes file, with its Ayahs
    And the Theme's loading skeleton is shown
    When the held-back parts arrive
    Then the Theme page has finished loading
    And the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-1 @AC-2
  Scenario Outline: After switching Language to <Language> on Me, Disbelief opens afresh in parts holding <Language> only
    Given I open "/<from>/themes"
    When I follow the Themes list's link to "Disbelief"
    Then the Theme page has finished loading
    When I follow the destination "Me"
    And I choose <Language> on Me's Language switch
    Then I am on Me in <Language>
    When I follow the destination "Explore"
    And I follow Explore's "Themes" card
    And the server holds back every part of a Theme
    And I follow the Themes list's link to "Disbelief"
    Then I am on "/<lang>/themes/disbelief" with nothing added to the URL
    And the Theme page's heading is the name of "Disbelief" in <Language>
    And the Theme page shows the first Passage group of "Disbelief" from the Themes file, with its Ayahs
    And the Theme's loading skeleton is shown
    When the held-back parts arrive
    Then the Theme page has finished loading
    And the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"
    And each Theme part the page fetched is a static JSON file holding Ayah translations of "Disbelief" in <Language> only

    Examples:
      | from | lang | Language |
      | en   | ur   | Urdu     |
      | ur   | en   | English  |

  # ---------------------------------------------------------------- AC-3, AC-7: direct load, reload, crawl

  @AC-3 @AC-7
  Scenario Outline: Disbelief loaded directly or crawled carries every Ayah in its HTML, in <Language>
    Then the page "/<lang>/themes/disbelief" as loaded directly carries every Ayah of "Disbelief"
    And the page "/<lang>/themes/disbelief" as a search engine crawls it carries every Ayah of "Disbelief"

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  @AC-3 @AC-7
  Scenario: Disbelief opened directly is whole at once, with no part to wait for
    Given the server holds back every part of a Theme
    When I open "/en/themes/disbelief"
    Then the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"
    And no loading skeleton is shown

  @AC-3
  Scenario: Reloading Disbelief opened in parts gets every Ayah in the HTML
    Given I open "/en/2"
    And the server holds back every part of a Theme
    When I follow Ayah 2:6's Theme chip "Disbelief"
    Then the Theme's loading skeleton is shown
    When I reload the Theme page
    Then the HTML the reload got carries every Ayah of "Disbelief"
    And the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"
    And no loading skeleton is shown

  # ---------------------------------------------------------------- AC-4: Back and Forward

  @AC-4
  Scenario: Back to Disbelief, whose parts must load again, lands where the visit was left
    Given I open "/en/themes"
    When I follow the Themes list's link to "Disbelief"
    And I scroll until the Theme page's Ayah 37:168 is at the top of the screen
    And I follow the destination "Me" from the keyboard
    Then I am on Me in English
    When the server holds back every part of a Theme
    And I go back
    Then I am on the Theme page "/en/themes/disbelief"
    And the Theme's loading skeleton is shown
    When the held-back parts arrive
    Then the Theme page's Ayah 37:168 is at the top of the screen

  @AC-4
  Scenario: Forward to Disbelief, whose parts must load again, lands where the visit was left
    Given I open "/en/themes"
    When I follow the Themes list's link to "Disbelief"
    And I scroll until the Theme page's Ayah 80:40 is at the top of the screen
    And I go back
    Then I am on the Themes list in English
    When the server holds back every part of a Theme
    And I go forward
    Then I am on the Theme page "/en/themes/disbelief"
    And the Theme's loading skeleton is shown
    When the held-back parts arrive
    Then the Theme page's Ayah 80:40 is at the top of the screen

  # ---------------------------------------------------------------- AC-5: one mechanism

  @AC-5
  Scenario: After a Theme page opens in parts, a Surah still opens in parts
    Given I open "/en/themes"
    And the server holds back every part of a Theme
    When I follow the Themes list's link to "Disbelief"
    Then the Theme's loading skeleton is shown
    When the held-back parts arrive
    Then the Theme page has finished loading
    And the Theme page lists 947 Ayahs, the same Ayahs as the Themes file gives "Disbelief"
    When the server holds back every part of a Surah
    And I follow the top bar's link to the Surah index
    And I follow the index card of Surah 2
    Then the page's main heading is Surah 2's Arabic name from the Surah metadata
    And the Surah's loading skeleton is shown
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown

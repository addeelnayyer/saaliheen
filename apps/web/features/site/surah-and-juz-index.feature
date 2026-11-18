@issue-193
Feature: The Surah index's Surahs and Juz tabs
  Read, /{lang}, shows from the top the Reading places, the Surahs | Juz tabs
  (Surahs first), one search box for both tabs, and a single-column list in
  each tab. The tabs are an ARIA tablist; tapping a tab, swiping the list (a
  horizontal scroll-snap track) or the arrow keys switch them, and each tab
  keeps its own scroll. The address follows the tab, /{lang} ⇄ /{lang}/juz,
  replacing the history entry rather than adding one. The last tab used is
  remembered in the browser but applied only on arrivals from inside the app,
  never to a link opened directly.

  The Juz follow the reader's Script (CONTEXT.md: Juz, ADR 0021): Uthmani
  Juz are QUL's Madinah Juz; Indo-Pak Juz start where those do but for Juz 4,
  7, 11, 14, 20, 21 and 23. Where each Juz runs is worked out from the
  sources and those seven starts (steps/juz.ts); each Juz's name is Arabic, so
  it is read from the Juz list the build serves, or quoted from the issue
  (وَمَا لِيَ). Interface text is English in both Languages, as the index's
  cards are.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: what Read shows

  @AC-1
  Scenario Outline: Read in <Language> shows the Reading places, then the Surahs and Juz tabs, then one search box, then the list
    Given I open Surah 2 in <Language>
    And I scroll until Ayah 2:255 is at the top of the screen
    When I open the Surah index in <Language>
    Then the Surah index shows, from the top, the Reading places, the Surahs and Juz tabs, the search box and the selected tab's list
    And the tabs are "Surahs" then "Juz", and "Surahs" is selected
    And the page has exactly one search box
    And the Surahs tab lists all 114 Surahs in one column
    And the Surah index shows no stats line and no link to the Themes list or the Iltifat overview

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-1
  Scenario Outline: The Juz tab in <Language> lists the 30 Uthmani Juz in one column, each with its number, its name and where it runs
    Given I open "/<lang>/juz"
    Then the "Juz" tab is selected
    And the Juz tab lists all 30 Juz in one column
    And every Juz row shows its number, its Uthmani name from the served Juz list and where it runs

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-1
  Scenario: The Makki/Madani filter shows only on the Surahs tab
    Given I open the Surah index in English
    Then the "Meccan" filter is visible
    When I choose the "Juz" tab
    Then no Makki or Madani filter is visible
    When I choose the "Surahs" tab
    Then the "Meccan" filter is visible

  # ---------------------------------------------------------------- AC-2, AC-10: switching tabs and the address

  @AC-2 @AC-10
  Scenario Outline: In <Language>, tapping the Juz tab and then the Surahs tab switches the list, and the address follows by replacing it
    Given I open "/<lang>/1"
    And I follow the destination "Read"
    Then the "Surahs" tab is selected
    And the address is "/<lang>"
    And I note how long the browser's history is
    When I choose the "Juz" tab
    Then the "Juz" tab is selected
    And the Juz list is on screen and the Surah list is not
    And the address is "/<lang>/juz"
    When I choose the "Surahs" tab
    Then the "Surahs" tab is selected
    And the Surah list is on screen and the Juz list is not
    And the address is "/<lang>"
    And the browser's history is as long as noted
    When I choose the "Juz" tab
    And I go back
    Then the address is "/<lang>/1"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-2 @AC-9 @AC-10
  Scenario: The arrow keys move between the tabs as a tablist's do, and only the selected tab is in the Tab order
    Given I open the Surah index in English
    When I move keyboard focus to the "Surahs" tab
    Then the tabs are a tablist whose selected tab names and controls the list on screen
    When I press the arrow key toward the next tab
    Then the "Juz" tab is selected and has the focus
    And the address is "/en/juz"
    And the tabs are a tablist whose selected tab names and controls the list on screen
    When I press the arrow key toward the previous tab
    Then the "Surahs" tab is selected and has the focus
    And the address is "/en"

  @AC-2 @AC-10
  Scenario Outline: On a <viewport>, swiping the list scrolls a snapping track to the Juz list, which selects the Juz tab
    Given the browser is a <viewport>
    And I open the Surah index in English
    Then the lists lie side by side on a track that scrolls sideways and snaps to one list
    When I swipe the list to the Juz list
    Then the "Juz" tab is selected
    And the address is "/en/juz"
    When I swipe the list to the Surah list
    Then the "Surahs" tab is selected
    And the address is "/en"

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-2
  Scenario Outline: On a <viewport>, a link opened directly to the <tab> tab in <Language> puts the tab underline under that tab, every time
    Given the browser is a <viewport>
    Then on each of 10 fresh loads of "<address>" the "<tab>" tab is selected and the tab underline sits under it

    Examples:
      | viewport | Language | address | tab    |
      | desktop  | English  | /en/juz | Juz    |
      | phone    | Urdu     | /ur/juz | Juz    |
      | phone    | English  | /en     | Surahs |

  @AC-2
  Scenario Outline: On a <viewport>, each tab keeps its own scroll
    Given the browser is a <viewport>
    And I open the Surah index in English
    When I scroll the Surah list until Surah 60's row is at its top
    And I note where Surah 60's row is
    And I choose the "Juz" tab
    And I scroll the Juz list until Juz 20's row is at its top
    And I note where Juz 20's row is
    And I choose the "Surahs" tab
    Then Surah 60's row is where it was noted
    When I choose the "Juz" tab
    Then Juz 20's row is where it was noted

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  # ---------------------------------------------------------------- AC-3: the remembered tab

  @AC-3
  Scenario: The last tab used is applied on arriving at Read from inside the app, never on a link opened directly
    Given I open the Surah index in English
    Then the "Surahs" tab is selected
    When I choose the "Juz" tab
    And I follow the Juz row of Juz 1
    And I follow the destination "Read"
    Then the "Juz" tab is selected
    And the address is "/en/juz"
    When I open "/en"
    Then the "Surahs" tab is selected
    And the address is "/en"
    When I open "/en/1"
    And I follow the destination "Read"
    Then the "Juz" tab is selected
    And the address is "/en/juz"
    When I choose the "Surahs" tab
    And I open "/en/juz"
    Then the "Juz" tab is selected
    And the address is "/en/juz"
    When I open "/en/1"
    And I follow the destination "Read"
    Then the "Surahs" tab is selected
    And the address is "/en"

  # ---------------------------------------------------------------- AC-4, AC-10: search

  @AC-4 @AC-10
  Scenario Outline: In <Language>, "Yasin" finds Surah 36 on the Surahs tab and, on the Juz tab, every <Script> Juz holding part of it
    Given I open "/<lang>/1"
    And I choose the <Script> Script
    And I follow the destination "Read"
    When I search for "Yasin"
    Then the index shows only Surah 36
    When I choose the "Juz" tab
    Then the search box still holds "Yasin"
    And the Juz tab shows exactly the <Script> Juz holding an Ayah of Surah 36
    And the page is captured as the evidence screen "AC-4-juz-search-yasin-<lang>-<script>-light-desktop"

    Examples:
      | Language | lang | Script   | script   |
      | English  | en   | Uthmani  | uthmani  |
      | Urdu     | ur   | Indo-Pak | indopak  |

  @AC-4 @AC-10
  Scenario Outline: In <Language>, Surah 36's Arabic name finds Surah 36 and the Juz holding part of it
    Given I open the Surah index in <Language>
    When I search for Surah 36's Arabic name
    Then the index shows only Surah 36
    When I choose the "Juz" tab
    Then the Juz tab shows exactly the Uthmani Juz holding an Ayah of Surah 36

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4 @AC-10
  Scenario Outline: A number, "<query>", finds Surah <query> on the Surahs tab and Juz <query> on the Juz tab
    Given I open the Surah index in English
    When I search for "<query>"
    Then the index shows only Surah <query>
    When I choose the "Juz" tab
    Then the Juz tab shows only Juz <query>

    Examples:
      | query |
      | 23    |
      | 30    |
      | 1     |

  @AC-4 @AC-10
  Scenario: A number above 30 finds its Surah and no Juz, and the Juz tab says what to search by
    Given I open the Surah index in English
    When I search for "36"
    Then the index shows only Surah 36
    When I choose the "Juz" tab
    Then the Juz tab shows no Juz rows
    And the Juz tab says "No Juz matches “36”. Try a number from 1 to 30 or a Surah name."

  @AC-4 @AC-10
  Scenario Outline: In <Language>, a search nothing matches says, on each tab, what to search by
    Given I open the Surah index in <Language>
    When I search for "zzzz"
    Then the index shows no Surah cards
    And the Surahs tab says "No Surah matches “zzzz”. Try a number from 1 to 114."
    When I choose the "Juz" tab
    Then the Juz tab shows no Juz rows
    And the Juz tab says "No Juz matches “zzzz”. Try a number from 1 to 30 or a Surah name."

    Examples:
      | Language |
      | Urdu     |
      | English  |

  # ---------------------------------------------------------------- AC-6, AC-10: opening a Juz

  @AC-6 @AC-10
  Scenario Outline: Opening Juz 23 in <Script>, in <Language>, lands at <first>
    Given I open "/<lang>/1"
    And I choose the <Script> Script
    And I follow the destination "Read"
    When I choose the "Juz" tab
    Then Juz 23's row shows its <Script> name from the served Juz list and runs "<runs>"
    When I follow the Juz row of Juz 23
    Then I am on Surah 36's page in <Language>
    And Ayah <first> is at the top of the screen

    Examples:
      | Language | lang | Script   | first | runs                     |
      | English  | en   | Uthmani  | 36:28 | Ya-Sin 28 → Az-Zumar 31  |
      | Urdu     | ur   | Uthmani  | 36:28 | Ya-Sin 28 → Az-Zumar 31  |
      | English  | en   | Indo-Pak | 36:22 | Ya-Sin 22 → Az-Zumar 31  |
      | Urdu     | ur   | Indo-Pak | 36:22 | Ya-Sin 22 → Az-Zumar 31  |

  @AC-6
  Scenario: Opening a Juz is reading, not a look-up, so its first Ayah becomes its Surah's Reading place
    Given I open "/en/juz"
    When I follow the Juz row of Juz 23
    Then I am on Surah 36's page in English
    And Ayah 36:28 is at the top of the screen
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                | link   |
      | 36. Ya-Sin · Ayah 28 | /en/36 |

  @AC-6 @AC-10
  Scenario Outline: In Indo-Pak, in <Language>, Juz 23 is named "وَمَا لِيَ"
    Given I open "/<lang>/1"
    And I choose the Indo-Pak Script
    And I open "/<lang>/juz"
    Then Juz 23's row shows "وَمَا لِيَ"
    And every Juz row shows its number, its Indo-Pak name from the served Juz list and where it runs
    And the page is captured as the evidence screen "AC-6-juz-list-<lang>-indopak-light-desktop"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-6
  Scenario Outline: Opening Juz <juz> in <Script> lands at its first Ayah, <first>
    Given I open "/en/1"
    And I choose the <Script> Script
    And I open "/en/juz"
    When I follow the Juz row of Juz <juz>
    Then I am on Surah <surah>'s page in English
    And Ayah <first> is at the top of the screen

    Examples:
      | Script   | juz | surah | first |
      | Uthmani  | 4   | 3     | 3:93  |
      | Indo-Pak | 4   | 3     | 3:92  |
      | Indo-Pak | 14  | 15    | 15:2  |
      | Uthmani  | 2   | 2     | 2:142 |
      | Uthmani  | 30  | 78    | 78:1  |

  @AC-6
  Scenario Outline: In <Script>, the Juz holding the latest Reading place, 36:25, is marked, and no other
    Given Ayah 36:25 is in Juz <juz> of the <Script> Script
    And Ayah 18:40 is in Juz 15 of the <Script> Script
    And I open "/en/1"
    And I choose the <Script> Script
    And I open "/en/18"
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open "/en/36"
    And I scroll until Ayah 36:25 is at the top of the screen
    When I open "/en/juz"
    Then only Juz <juz>'s row is marked as holding the latest Reading place
    And the page is captured as the evidence screen "AC-6-juz-latest-reading-place-<script>-light-desktop"

    # 36:25 is in Juz 22 in Uthmani and in Juz 23 in Indo-Pak; 18:40, read earlier, is in Juz 15 in both.
    # Ayah 36:25 and 18:40's Juz are checked against the sources first, so the scenario never marks a stale Juz.
    Examples:
      | Script   | script  | juz |
      | Uthmani  | uthmani | 22  |
      | Indo-Pak | indopak | 23  |

  # ---------------------------------------------------------------- AC-9: colour themes, phone, reduced motion

  @AC-1 @AC-9
  Scenario Outline: The <tab> tab at <address> in <scheme> on a <viewport>, with a Reading place, fits the screen's width
    Given the system colour scheme is <scheme>
    And the browser is a <viewport>
    And I open "/<lang>/36"
    And I scroll until Ayah 36:25 is at the top of the screen
    When I open "<address>"
    Then the "<tab>" tab is selected
    And the Surah index lists these Reading places, newest first:
      | place                | link       |
      | 36. Ya-Sin · Ayah 25 | /<lang>/36 |
    And the page does not scroll horizontally
    And the page is captured as the evidence screen "AC-9-index-<what>-<lang>-<scheme>-<viewport>"

    Examples:
      | tab    | lang | address | what   | scheme | viewport |
      | Surahs | en   | /en     | surahs | light  | desktop  |
      | Surahs | en   | /en     | surahs | dark   | desktop  |
      | Surahs | ur   | /ur     | surahs | light  | phone    |
      | Surahs | ur   | /ur     | surahs | dark   | phone    |
      | Surahs | en   | /en     | surahs | light  | phone    |
      | Juz    | en   | /en/juz | juz    | light  | desktop  |
      | Juz    | en   | /en/juz | juz    | dark   | desktop  |
      | Juz    | ur   | /ur/juz | juz    | light  | phone    |
      | Juz    | ur   | /ur/juz | juz    | dark   | phone    |
      | Juz    | en   | /en/juz | juz    | light  | phone    |

  @AC-9
  Scenario: With reduced motion, tapping a tab moves the track to its list at once
    Given my system prefers reduced motion
    And I open the Surah index in English
    When I choose the "Juz" tab
    Then the Juz list is wholly on screen within two frames
    When I choose the "Surahs" tab
    Then the Surah list is wholly on screen within two frames

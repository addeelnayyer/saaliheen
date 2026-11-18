@issue-279
Feature: Getting around Quran Grammar
  Quran Grammar is reached from Explore, where its card says what it is and
  leads to Al-Fatihah's Grammar page (CONTEXT.md: Quran Grammar, Grammar page).
  A Grammar page opens any other Surah's Grammar page from the Surah picker at
  its head, and names the previous and next Surahs at its foot. A link to a
  Word location opens it at that Word, marked. Its Language switch keeps the
  Surah, and the Word location. It carries the site's default Link preview.
  Visiting it is studying, not reading: it leaves the Reading place and the
  Reading places as they were, never finishes a Surah, and offers no
  Recitation. Surah names come from QUL's Surah metadata, Word meanings from
  QUL's sources; no Urdu is typed here.

  # ---------------------------------------------------------------- AC-1: Explore

  @AC-1
  Scenario Outline: Explore in <Language> lists Quran Grammar with a line in <Language>, leading to Al-Fatihah's Grammar page
    Given I open Explore in <Language>
    Then Explore's cards are, in order, "Themes", "Roots", "Iltifat", "Supplications", "Quran Chat" and "Quran Grammar"
    And the "Quran Grammar" card says what it is for in one line written in <Language>
    When I follow Explore's "Quran Grammar" card
    Then I am on the page "/<lang>/grammar/1"
    And the Grammar page is of Surah 1
    And Explore is marked as the current destination, and no other
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  # ---------------------------------------------------------------- AC-2: the Surah picker and the foot

  @AC-2
  Scenario: The Surah picker at the head of a Grammar page opens another Surah's Grammar page
    When I open the Grammar page of Surah 1 in English
    And I open the Grammar page's Surah picker
    Then the Grammar page's Surah picker lists all 114 Surahs, each leading to its Grammar page in English
    When I search the Grammar page's Surah picker for "kahf"
    Then the Grammar page's Surah picker lists only Surah 18
    When I choose Surah 18 in the Grammar page's Surah picker
    Then I am on the page "/en/grammar/18"
    And the Grammar page is of Surah 18

  # #307: it is a modal dialog as every other dialog on the site is.
  @AC-2
  Scenario: The Grammar page's Surah picker keeps the focus while open and closes by its button, Escape or a click outside
    When I open the Grammar page of Surah 1 in English
    And I open the Grammar page's Surah picker
    Then the Grammar page's Surah picker is a modal dialog holding the focus
    When I press Tab 6 times
    Then focus stayed inside the Grammar page's Surah picker after every press
    When I press Shift+Tab 6 times
    Then focus stayed inside the Grammar page's Surah picker after every press
    When I close the Grammar page's Surah picker with its close button
    Then the Grammar page's Surah picker is closed and its button has the focus
    When I open the Grammar page's Surah picker
    And I close the Grammar page's Surah picker with Escape
    Then the Grammar page's Surah picker is closed and its button has the focus
    When I open the Grammar page's Surah picker
    And I close the Grammar page's Surah picker with a click outside it
    Then the Grammar page's Surah picker is closed

  @AC-2
  Scenario Outline: The foot of the Grammar page of Surah <surah> in <Language> names Surahs <prev> and <next>, leading to their Grammar pages
    When I open the Grammar page of Surah <surah> in <Language>
    Then the Grammar page's foot leads to the Grammar pages of Surah <prev> and Surah <next> in <Language>, each named by its Latin name from the Surah metadata
    When I follow the next Surah link
    Then I am on the page "/<lang>/grammar/<next>"
    And the Grammar page is of Surah <next>
    When I follow the previous Surah link
    Then I am on the page "/<lang>/grammar/<surah>"

    Examples:
      | surah | Language | lang | prev | next |
      | 2     | English  | en   | 1    | 3    |
      | 18    | Urdu     | ur   | 17   | 19   |

  @AC-2
  Scenario: There is no Surah before Al-Fatihah's Grammar page, nor after An-Nas's
    When I open the Grammar page of Surah 1 in English
    Then there is no previous Surah link
    And a next Surah link is visible
    When I open the Grammar page of Surah 114 in English
    Then there is no next Surah link
    And a previous Surah link is visible

  # ---------------------------------------------------------------- AC-3: a Word location link

  @AC-3
  Scenario Outline: Opening <address> scrolls the Grammar page to the Word at <target> and marks it
    Given I open "<address>"
    And the Grammar page has all its Ayahs
    Then the Word at <target> is in the viewport
    And the Word at <target> is marked
    And the Word at <neighbour> is not marked

    Examples:
      | address                | target  | neighbour |
      | /en/grammar/2#2:255:3  | 2:255:3 | 2:255:2   |
      | /ur/grammar/18#18:45:2 | 18:45:2 | 18:45:1   |

  # ---------------------------------------------------------------- AC-4: the Language switch

  @AC-4
  Scenario Outline: Switching Language on the Grammar page of Surah <surah> in <from> keeps the Surah
    When I open the Grammar page of Surah <surah> in <from>
    And I switch Language to <to>
    Then I am on "/<lang>/grammar/<surah>" with nothing added to the URL
    And Word <word> shows its Uthmani text and its <to> Word meaning from QUL

    Examples:
      | surah | from    | to      | lang | word   |
      | 18    | Urdu    | English | en   | 18:1:1 |
      | 2     | English | Urdu    | ur   | 2:1:1  |

  @AC-4
  Scenario: Switching Language on a Word location link of a Grammar page stays on that Word
    Given I open "/ur/grammar/18#18:45:2"
    And the Word at 18:45:2 is in the viewport
    When I scroll back up to the Grammar page's head
    And I switch Language to English
    Then the address, with its Word location, is "/en/grammar/18#18:45:2"
    And the Word at 18:45:2 is in the viewport
    And the Word at 18:45:2 is marked

  # ---------------------------------------------------------------- AC-5: the Link preview

  @AC-5
  Scenario Outline: The Grammar page of Surah 1 in <Language> carries the site's default Link preview
    When WhatsApp fetches the Grammar page of Surah 1 in <Language>
    Then the page's head carries no Link preview picture
    And its Link preview tags are those of the Surah index in <Language>

    Examples:
      | Language |
      | English  |
      | Urdu     |

  # ---------------------------------------------------------------- AC-6, AC-7: studying, not reading

  @AC-6
  Scenario: Reading Grammar pages to their end leaves the Reading place and the Reading places as they were
    Given I open "/en/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/en/19"
    And I open the Grammar page of Surah 18 in English
    And I scroll to the bottom of the page
    And I open the Grammar page of Surah 19 in English
    And I scroll to the bottom of the page
    And I open the Grammar page of Surah 114 in English
    And I scroll to the bottom of the page
    And I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /en/19 |
      | 18. Al-Kahf · Ayah 45 | /en/18 |

  @AC-7
  Scenario: A Grammar page has no Recitation control
    When I open the Grammar page of Surah 1 in English
    Then the page is found
    And the Grammar page has no Recitation control

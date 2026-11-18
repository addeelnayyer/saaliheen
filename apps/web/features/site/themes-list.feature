@issue-130
Feature: The Themes list
  The Themes list, /{lang}/themes, shows every Theme under its Theme category:
  the 13 Theme categories, each listing its Themes with how many Ayahs each
  has, every name in the reader's Language. Each Theme links to its Theme page.
  Explore links to it (#193). Its interface is English, like the Theme page's.

  A Theme here is something an Ayah speaks of (#128), not the light or dark
  colour theme of theme.feature. Theme names in English are typed from the
  issue; Urdu names, Theme categories, which Theme is in which category and
  every Ayah count are read from the Themes file (data/themes.json), never
  typed.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: static pages

  @AC-1
  Scenario: The Themes list in both Languages is a static page whose HTML already links to every Theme page
    Then the Themes list in Urdu and in English is served as a static page from Next's cache, setting no cookie
    And the served HTML of the Themes list in each Language links to the Theme page of every Theme in the Themes file

  # ---------------------------------------------------------------- AC-2, AC-7: reached from Explore
  # The Surah index's link to the Themes list went in #193: Explore leads there now (#192).

  @AC-2 @AC-7
  Scenario Outline: Explore in <Language> links to the Themes list in <Language>
    Given I open Explore in <Language>
    When I follow Explore's "Themes" card
    Then I am on the Themes list in <Language>
    And I am on the page "/<lang>/themes"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- AC-3: categories, Themes and counts

  @AC-3
  Scenario Outline: The Themes list in <Language> shows the 13 Theme categories, each with its Themes and their Ayah counts
    Given I open "/<lang>/themes"
    Then the Themes list's heading is "Themes"
    And the Themes list shows the 13 Theme categories of the Themes file, in its order, each named in <Language>
    And under each Theme category the Themes list lists exactly that category's Themes from the Themes file, each named in <Language>
    And each Theme on the Themes list shows its count of Ayahs from the Themes file

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- AC-4, AC-7: each Theme opens its Theme page

  @AC-4
  Scenario Outline: Every Theme on the Themes list in <Language> is a link to its Theme page in <Language>
    Given I open "/<lang>/themes"
    Then every Theme of the Themes file has one link on the Themes list, to "/<lang>/themes/" and its slug, named with its name in <Language>

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-4 @AC-7
  Scenario Outline: From Explore in <Language>, the Themes list opens the Theme page of <Theme>
    Given I open Explore in <Language>
    When I follow Explore's "Themes" card
    And I follow the Themes list's link to "<Theme>"
    Then I am on the Theme page "/<lang>/themes/<slug>"
    And the Theme page's heading is the name of "<Theme>" in <Language>

    Examples:
      | Language | lang | Theme        | slug         |
      | Urdu     | ur   | Hypocrisy    | hypocrisy    |
      | English  | en   | Extravagance | extravagance |

  # ---------------------------------------------------------------- AC-5: keyboard, both Languages, both colour themes, phone width

  @AC-5 @AC-7
  Scenario: The Themes list is reached from Explore, and a Theme opened from it, with the keyboard alone
    Given I open Explore in English
    When I press Tab until the link to "/en/themes" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on the Themes list in English
    When I press Tab until the link to "/en/themes/extravagance" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on the Theme page "/en/themes/extravagance"

  @AC-5
  Scenario Outline: The Themes list in <Language>, on the <Theme> paper, on a <viewport>
    Given on an earlier visit to "/<lang>/21" I chose, in order:
      | <Theme> |
    When I open "/<lang>/themes" in a fresh browser with an empty cache that keeps those choices
    And I view the Themes list on a <viewport>
    Then the Themes list shows the 13 Theme categories of the Themes file, in its order, each named in <Language>
    And every Theme name on the Themes list lies within the screen's width
    And the page does not scroll sideways
    And the Themes list is drawn on the <theme> paper
    And I save a screenshot "AC-5-themes-list-<lang>-<theme>-<viewport>"

    Examples:
      | lang | Language | Theme | theme | viewport |
      | en   | English  | Light | light | desktop  |
      | en   | English  | Light | light | phone    |
      | en   | English  | Dark  | dark  | desktop  |
      | en   | English  | Dark  | dark  | phone    |
      | ur   | Urdu     | Light | light | desktop  |
      | ur   | Urdu     | Light | light | phone    |
      | ur   | Urdu     | Dark  | dark  | desktop  |
      | ur   | Urdu     | Dark  | dark  | phone    |

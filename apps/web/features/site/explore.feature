@issue-192
Feature: Explore
  Explore, /<lang>/explore, lists every way to look into the Quran other than
  reading it in order (CONTEXT.md: Explore): one card per way, in a fixed
  order, Themes, Roots (#290), Iltifat, Supplications (#199), Quran Chat (#78),
  then Quran Grammar (#279, ./grammar-navigation.feature). Each card has its
  name and one line in the reader's Language saying what it is for, and, but
  for Quran Chat (./quran-chat.feature) and Quran Grammar, a live count: the
  Theme categories, read from the Themes file, the Roots, read from QUL's word
  root database, the Iltifat directions, of which there are four, and the
  Supplications, read from Neon as /api/v1/supplications serves them. The
  Themes list, the Roots list, Theme pages, Iltifat pages and the
  Supplications page each lead back to Explore from their own
  content. Expected names and counts come from the sources;
  no Urdu is typed here.

  # ---------------------------------------------------------------- AC-3: the cards

  @AC-3 @issue-199 @AC-15 @issue-78 @issue-290 @AC-6 @issue-279
  Scenario Outline: Explore in <Language> lists Themes, Roots, Iltifat, Supplications, Quran Chat, then Quran Grammar, each with a line in <Language>
    Given I open Explore in <Language>
    Then the page's heading reads "Explore"
    And Explore's cards are, in order, "Themes", "Roots", "Iltifat", "Supplications", "Quran Chat" and "Quran Grammar"
    And the "Themes" card says what it is for in one line written in <Language>
    And the "Roots" card says what it is for in one line written in <Language>
    And the "Iltifat" card says what it is for in one line written in <Language>
    And the "Supplications" card says what it is for in one line written in <Language>
    And the "Quran Chat" card says what it is for in one line written in <Language>
    And the "Quran Grammar" card says what it is for in one line written in <Language>
    And the "Themes" card counts the Theme categories in the Themes file
    And the "Roots" card counts every Root of QUL's word root database
    And the "Iltifat" card counts the 4 Iltifat directions
    And the "Supplications" card counts 73 Supplications, as the API serves them and the Supplications page shows them
    And I save a screenshot "AC-3-explore-<lang>-light-desktop"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- AC-3: out and back

  @AC-3 @AC-12
  Scenario Outline: Explore's <card> card in <Language> opens <what>, which leads back to Explore
    Given I open Explore in <Language>
    When I follow Explore's "<card>" card
    Then I am on the page "<address>"
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | Language | card    | what                  | address     |
      | English  | Themes  | the Themes list       | /en/themes  |
      | Urdu     | Themes  | the Themes list       | /ur/themes  |
      | English  | Roots   | the Roots list        | /en/roots   |
      | Urdu     | Roots   | the Roots list        | /ur/roots   |
      | English  | Iltifat | the Iltifat overview  | /en/iltifat |
      | Urdu     | Iltifat | the Iltifat overview  | /ur/iltifat |

  @AC-3 @AC-12
  Scenario Outline: <page> in <Language> leads back to Explore from its own content
    Given I open "<address>"
    Then the page's own content has a link back to Explore in <Language>
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | page                    | address                 | Language |
      | The Themes list         | /en/themes              | English  |
      | The Roots list          | /ur/roots               | Urdu     |
      | A Theme page            | /en/themes/extravagance | English  |
      | A Theme page            | /ur/themes/extravagance | Urdu     |
      | The Iltifat overview    | /ur/iltifat             | Urdu     |
      | An Iltifat direction    | /en/iltifat/he-to-you   | English  |
      | An Iltifat direction    | /ur/iltifat/you-to-he   | Urdu     |

  @AC-3 @AC-11
  Scenario: Explore's cards are reached and followed with the keyboard alone
    Given I open Explore in English
    When I press Tab until the link to "/en/iltifat" has the focus
    Then the focused link shows a focus ring
    When I press Enter
    Then I am on the page "/en/iltifat"

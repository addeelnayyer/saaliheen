@issue-280
Feature: The Grammar guide
  The Grammar guide, /<lang>/grammar/guide, is the one page that explains how
  to read a Grammar page for a reader who does not know Arabic grammar yet
  (CONTEXT.md: Grammar guide): the three Part of speech colours, the three
  Cases, the Verb forms with their patterns, and what each label a Grammar
  line can show means, each label in English with its Arabic term, in either
  Language. Its labels are the grammar terms module's
  (@saaliheen/dataset/grammar), the same the Grammar line and the Word grammar
  dialog name, so the three never disagree. Every Grammar page links to it,
  and so does Quran Grammar's entry on Explore. It carries the site's default
  Link preview. No Urdu is typed here, and the guide has none.

  # ---------------------------------------------------------------- AC-1: what it shows

  @AC-1
  Scenario Outline: The Grammar guide in <Language> shows the three colours, the three Cases, every Verb form and every Grammar line label
    When I open the Grammar guide in <Language>
    Then the page is found
    And the page is titled "Grammar guide · Saaliheen"
    And the page's heading reads "Grammar guide"
    And the Grammar guide shows "Ism · اِسْم", "Fi'l · فِعْل" and "Harf · حَرْف", each drawn in its own Part of speech colour
    And the Grammar guide shows the three Cases "Nominative · مَرْفُوع", "Accusative · مَنْصُوب" and "Genitive · مَجْرُور"
    And the Grammar guide shows every Verb form from Form I to Form XII, each with its pattern
    And the Grammar guide shows every label a Grammar line can show, each in English with its Arabic term and what it means
    And the Grammar guide is written in English

    Examples:
      | Language |
      | English  |
      | Urdu     |

  # ---------------------------------------------------------------- AC-2: the links to it

  @AC-2
  Scenario Outline: The Grammar page of Surah <surah> in <Language> links to the Grammar guide
    When I open the Grammar page of Surah <surah> in <Language>
    And I follow the Grammar page's link to the Grammar guide
    Then I am on the page "/<lang>/grammar/guide"
    When I follow the page's way back to Explore
    Then I am on Explore in <Language>

    Examples:
      | surah | Language | lang |
      | 1     | English  | en   |
      | 114   | Urdu     | ur   |

  @AC-2
  Scenario Outline: Quran Grammar's entry on Explore in <Language> links to the Grammar guide
    Given I open Explore in <Language>
    When I follow the link to the Grammar guide in Explore's "Quran Grammar" entry
    Then I am on the page "/<lang>/grammar/guide"
    And Explore is marked as the current destination, and no other

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  # ---------------------------------------------------------------- AC-3: light, dark and phone width

  @AC-3
  Scenario Outline: The Grammar guide reads correctly in the <theme> theme on a <device>
    Given the system colour scheme is <theme>
    And the browser is a <device>
    When I open the Grammar guide in English
    Then the Ism, Fi'l and Harf colours are three, each keeping 4.5:1 on the <theme> paper
    And every piece of the Grammar guide's text keeps 4.5:1 on what it is drawn on
    And the page does not scroll horizontally
    And the page is captured as the evidence screen "issue-280-grammar-guide-en-<theme>-<device>"

    Examples:
      | theme | device  |
      | light | desktop |
      | dark  | desktop |
      | light | phone   |
      | dark  | phone   |

  # ---------------------------------------------------------------- the Link preview

  @AC-1
  Scenario Outline: The Grammar guide in <Language> carries the site's default Link preview
    When WhatsApp fetches the Grammar guide in <Language>
    Then the page's head carries no Link preview picture
    And its Link preview tags are those of the Surah index in <Language>

    Examples:
      | Language |
      | English  |
      | Urdu     |

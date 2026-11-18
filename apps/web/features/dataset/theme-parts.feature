@issue-131
Feature: Each Theme page split into parts for opening it in the app
  A Theme page opened from inside the app shows its header and first Passage
  groups at once and fills in the rest from its Theme parts (#131), the way a
  Surah fills in from its Surah parts (ADR 0005). A Theme part is a run of
  whole, consecutive Passage groups of the Theme page: a part ends only where a
  Passage group ends, so no group is ever split between two parts. A small
  Theme is a single part; the largest, Disbelief with 947 Ayahs, starts with a
  small part and loads in many. Each Theme's Passage groups are made from the
  Themes the Theme load puts into Neon (ADR 0041) and the committed Passages
  (#170).

  Background:
    Given the dataset is built from the committed sources

  @AC-2
  Scenario: Every Theme's parts hold its Passage groups once each, whole and in order
    Then each of the 258 Themes' parts, one after another, hold exactly its Passage groups, each whole, in order
    And every Theme part holds at least one Passage group

  @AC-2
  Scenario Outline: A small Theme, <theme>, is a single part
    Then the Theme "<theme>" is a single part holding all of its <count> Ayahs

    Examples:
      | theme        | count |
      | Elisha       | 2     |
      | Dhul-Kifl    | 3     |
      | Extravagance | 8     |

  @AC-1 @AC-2
  Scenario: Disbelief opens with a small first part and loads in many parts
    Then the Theme "Disbelief" has more than 5 parts
    And the first part of the Theme "Disbelief" holds fewer than 50 of its 947 Ayahs

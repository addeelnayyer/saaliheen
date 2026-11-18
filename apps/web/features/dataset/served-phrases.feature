Feature: Phrases in a served Surah file
  Phrases live in Neon (#171, ADR 0046), beside the Passages; the dataset
  build holds none. Each Surah file /data/v1 serves carries its Phrases, in
  Quran order, as first and last Word locations (ADR 0009). A Phrase may run
  past the end of an Ayah but never across a Passage's edge, Phrases never
  overlap, and a Phrase can be a single Word. A Surah served with Phrases that
  break a rule is refused, naming the Phrase as `<first>–<last>` and what is
  wrong.

  A Passage is covered when every one of its Words is in a Phrase; each Word
  of a covered Passage carries its Phrase colour, "a" or "b", alternating
  Phrase by Phrase from "a" at the Passage's first Phrase and carrying through
  Ayah ends. Words of a Passage that is not covered carry no Phrase colour.
  The served Surah's parts carry the Words as it holds them, so each Surah
  page knows which Words take which Phrase colour.

  Each scenario serves a Surah of the dataset built from the committed
  sources with its Passages as last committed before they moved into Neon. In
  a scenario, a Phrase is written `<first>–<last>` with an en dash, and a list
  of Phrases is comma-separated.

  @AC-5
  Scenario: A served Surah carries the Phrases it is served with, in Quran order
    When Surah 112 is served with these Phrases: 112:3:1–112:4:2, 112:1:1–112:1:4, 112:2:1–112:2:2, 112:4:3–112:4:5
    Then Surah 112 carries the Phrases 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5

  @AC-5
  Scenario: A covered Passage's Words alternate Phrase colours a and b, Phrase by Phrase, carrying through Ayah ends
    When Surah 112 is served with these Phrases: 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5
    Then the Words of Surah 112 carry these Phrase colours:
      | words           | colour |
      | 112:1:1–112:1:4 | a      |
      | 112:2:1–112:2:2 | b      |
      | 112:3:1–112:4:2 | a      |
      | 112:4:3–112:4:5 | b      |
    And each part of Surah 112, in Urdu and in English, carries the same Phrase colour on each Word

  @AC-5
  Scenario: Each covered Passage starts on Phrase colour a
    When Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4, 1:6:1–1:7:9
    Then the Words of Surah 1 carry these Phrase colours:
      | words       | colour |
      | 1:1:1–1:1:4 | a      |
      | 1:2:1–1:2:4 | b      |
      | 1:3:1–1:4:3 | a      |
      | 1:5:1–1:5:4 | a      |
      | 1:6:1–1:7:9 | b      |

  @AC-5
  Scenario: A single-Word Phrase takes its own Phrase colour
    When Surah 112 is served with these Phrases: 112:1:1–112:1:1, 112:1:2–112:1:4, 112:2:1–112:4:5
    Then the Words of Surah 112 carry these Phrase colours:
      | words           | colour |
      | 112:1:1–112:1:1 | a      |
      | 112:1:2–112:1:4 | b      |
      | 112:2:1–112:4:5 | a      |

  @AC-5
  Scenario: A partly covered Passage carries no Phrase colours, while a covered Passage of the same Surah does
    When Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4
    Then Surah 1 carries the Phrases 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4
    And the Words of Surah 1 carry these Phrase colours:
      | words       | colour |
      | 1:1:1–1:1:4 | a      |
      | 1:2:1–1:2:4 | b      |
      | 1:3:1–1:4:3 | a      |
    And no Word of Surah 1's Passage 5–7 carries a Phrase colour

  @AC-5
  Scenario: A Surah served with no Phrases carries no Phrase colours
    When Surah 1 is served with no Phrases
    Then Surah 1 carries no Phrases
    And no Word of Surah 1 carries a Phrase colour

  @AC-3
  Scenario Outline: Serving a Surah refuses <problem>, naming the Phrase and the problem
    When Surah <surah> is served with <problem>: <phrases>
    Then serving it fails naming "<phrase>" and "<problem words>"

    Examples:
      | problem                                         | surah | phrases                          | phrase          | problem words         |
      | overlapping Phrases                             | 112   | 112:1:1–112:1:4, 112:1:4–112:2:2 | 112:1:4–112:2:2 | overlap               |
      | a Phrase inside another                         | 112   | 112:1:1–112:2:2, 112:1:2–112:1:3 | 112:1:2–112:1:3 | overlap               |
      | a Phrase crossing a Passage's edge              | 1     | 1:4:1–1:5:2                      | 1:4:1–1:5:2     | Passage               |
      | a Phrase crossing into the next Surah           | 1     | 1:7:9–2:1:1                      | 2:1:1           | unknown Word location |
      | a Phrase whose last Word comes before its first | 112   | 112:2:2–112:2:1                  | 112:2:2–112:2:1 | before                |
      | a Phrase ending at an unknown Word location     | 112   | 112:4:1–112:4:9                  | 112:4:9         | unknown Word location |
      | a Phrase starting in an Ayah the Surah lacks    | 112   | 112:5:1–112:5:2                  | 112:5:1         | unknown Word location |
      | a Phrase ending on an Ayah-end marker           | 112   | 112:1:1–112:1:5                  | 112:1:5         | unknown Word location |

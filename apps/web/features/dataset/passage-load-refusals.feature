@issue-171
Feature: The Passage load refuses Passages and Phrases that break their rules
  The content migration 0013 loads every Passage and Phrase into Neon from the
  input it carries (scripts/content/0013-load-passages-and-phrases-files.json,
  the Passages and Phrases files as last committed). Before it writes a row it
  checks them as the dataset build once did: each Surah's Passages keep the
  Passages module's rules, and each Phrase is in a Surah of the Quran and keeps
  the Phrase rules. A refusal names the Surah and its Ayahs, or the Phrase, and,
  thrown inside the migration's transaction, writes nothing.

  The Passages module's problems() gives each reason, naming the Ayahs:
  `Ayah 3: in no Passage`, `Ayahs 7–9: past the Surah's end (it has 6 Ayahs)`.
  A Publish refused for a broken Passage rule answers with the same reason.

  These scenarios check the load's input at the dataset seam (checkedLoad in
  scripts/content/passages.ts), on the carried input with one change, against
  the dataset built from the committed sources. Surah 109 has 6 Ayahs. A list of
  Passages is written `1–2, 4–6`, each with an English and an Urdu Passage
  title unless written `untitled in English` or `untitled in Urdu`.

  Background:
    Given the load's input as it carries it

  @AC-1
  Scenario: The carried input passes the load's checks
    When the load checks its input
    Then it passes, serving 114 Surahs with 1618 Passages and 88 Phrases

  @AC-1
  Scenario Outline: The load refuses <problem>, naming the Surah and its Ayahs
    Given <problem>: Surah <surah>'s Passages in the input are <passages>
    When the load checks its input
    Then the load is refused, saying "<reason>"

    Examples:
      | problem                          | surah | passages                 | reason                                                          |
      | a gap                            | 109   | 1–2, 4–6                 | Surah 109, Ayah 3: in no Passage                                |
      | an overlap                       | 109   | 1–3, 3–6                 | Surah 109, Ayah 3: in more than one Passage                     |
      | a Passage past the Surah's end   | 109   | 1–3, 4–7                 | Surah 109, Ayah 7: past the Surah's end (it has 6 Ayahs)        |
      | a missing English Passage title  | 109   | 1–3, 4–6 untitled in English | Surah 109, Ayahs 4–6: no English Passage title              |
      | a missing Urdu Passage title     | 109   | 1–3 untitled in Urdu, 4–6 | Surah 109, Ayahs 1–3: no Urdu Passage title                    |
      | Passages in Surah 115            | 115   | 1–3                      | Passages for Surah 115, which is not a Surah                    |

  @AC-1
  Scenario: The load names a Passage starting past the Surah's end once, by its Ayahs
    Given Surah 109's Passages in the input are 1–6, 8–9
    When the load checks its input
    Then the load is refused, saying "Surah 109, Ayahs 7–9: past the Surah's end (it has 6 Ayahs)"
    And the refusal does not say "in no Passage"

  @AC-1
  Scenario Outline: The load refuses <problem>, naming the Phrase
    Given <problem>: the Phrase <phrase> is added to the input
    When the load checks its input
    Then the load is refused, saying "<reason>"
    And the refusal says "<also>"

    Examples:
      | problem                             | phrase          | reason          | also         |
      | a Phrase in no Surah                | 115:1:1–115:1:2 | Phrase 115:1:1–115:1:2 is in no Surah | Passage load |
      | a Phrase crossing a Passage's edge  | 1:4:1–1:5:2     | 1:4:1–1:5:2     | Passage      |
      | a Phrase overlapping another        | 1:1:3–1:2:2     | 1:1:3–1:2:2     | overlap      |

  @AC-1 @AC-3
  Scenario Outline: The Passages module names what is wrong with Surah 109's Passages <passages>
    When the Passages module checks Surah 109's Passages <passages>
    Then it names exactly "<problems>"

    Examples:
      | passages                     | problems                                                                     |
      | 1–3, 4–6                     |                                                                              |
      | 1–2, 4–6                     | Ayah 3: in no Passage                                                        |
      | 1–4                          | Ayahs 5–6: in no Passage                                                     |
      | 1–3, 3–6                     | Ayah 3: in more than one Passage                                             |
      | 1–4, 2–6                     | Ayahs 2–4: in more than one Passage                                          |
      | 1–3, 4–7                     | Ayah 7: past the Surah's end (it has 6 Ayahs)                                |
      | 1–6, 8–9                     | Ayahs 7–9: past the Surah's end (it has 6 Ayahs)                             |
      | 1–3 untitled in English, 4–6 untitled in Urdu | Ayahs 1–3: no English Passage title; Ayahs 4–6: no Urdu Passage title |
      | 1–2, 4–7                     | Ayah 3: in no Passage; Ayah 7: past the Surah's end (it has 6 Ayahs)         |

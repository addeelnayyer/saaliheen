@issue-275
Feature: Word grammar imported into Postgres from the Quranic Arabic Corpus
  The import loads, beside the Quran text, every Word's grammar, Segment by
  Segment, from the Quranic Arabic Corpus as committed (ADR 0064): each
  Segment's text, Part of speech, finer kind and features, keyed by its Word's
  location and its position in the Word. The Corpus's own Roots and Lemmas are
  not imported: Roots are QUL's (ADR 0003). The source joins the sources hash,
  so a change to it imports again, and each import names the Words the Corpus
  divides differently, which have no Segments. These scenarios read the Segments back
  through the site's own read of Neon and hold them to the source's lines:
  expected values are read from the source, never typed.

  Background:
    Given a Postgres holding the import of the committed sources

  @AC-1
  Scenario Outline: A sampled Word's Segments are the source's lines for it
    Then the source gives Word <location> <what>
    And Word <location>'s Segments read back from the database are the source's lines for it, in order, with every tag but its Root and Lemma

    Examples:
      | location | what                                                |
      | 1:2:3    | one Segment, an Ism                                 |
      | 1:5:4    | a Fi'l of a derived Verb form                       |
      | 2:3:3    | three Segments                                      |
      | 1:6:1    | a Fi'l with a pronoun suffix                        |

  @AC-1 @issue-276 @AC-2
  Scenario: Every Segment of the source is imported, but for the Words it divides differently
    Then every Segment line of the source is read back from the database at its Word, with every tag but its Root and Lemma, except at the 3 Corpus Words that join 2 of ours
    And the 6 Words of ours those join, "2:181:3", "2:181:4", "8:6:4", "8:6:5", "13:37:8" and "13:37:9", have no Segments, and every other Word has

  @AC-1
  Scenario: Ayah-end markers have no Segments
    Then no Segment is stored at a QPC Hafs Ayah-end marker's location

  @AC-1
  Scenario: The Corpus's Roots and Lemmas are written nowhere
    Then no column of the Segments' table names a Root or a Lemma
    And no value the Segments' table stores, but a Segment's own text, is one of the source's Roots or Lemmas

  @AC-2 @issue-276 @AC-1
  Scenario: A changed Word grammar source loads again
    Given a copy of the sources whose Word grammar line for Segment 1:2:3:1 reads "ACC" for "GEN"
    When the import runs on that copy
    Then it exits 0
    And Word 1:2:3's Segment read back from the database has the Case "ACC"
    And the stored sources hash differs from the committed sources'
    And its output names the 6 Words the Corpus divides differently, "2:181:3", "2:181:4", "8:6:4", "8:6:5", "13:37:8" and "13:37:9", in Word location order, on the line after the Root disagreements

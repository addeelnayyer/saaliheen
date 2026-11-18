Feature: Root analysis in the dataset
  The dataset builder gives each Word the Root QUL's word root database (#76)
  gives its Word location, and builds each Root with its single-spaced letters,
  its transliteration, QUL's counts and its Lemmas from QUL's word lemma
  database (#75), each holding its Spellings (ADR 0003). Particles and pronouns,
  such as إِيَّاكَ at 1:5:1 and the particle with its pronoun at 1:7:4, have no
  Root. Expected Roots, Lemmas and counts are read from the QUL databases.

  Background:
    Given the dataset is built from the committed sources

  @AC-5-1
  Scenario Outline: The particle or pronoun at <location> has no Root
    When I look up the Word at "<location>"
    Then QUL's word root database gives that Word location no Root
    And the Word has no Root
    And no Root lists that Word location

    Examples:
      | location |
      | 1:5:1    |
      | 1:7:4    |

  @AC-5-1
  Scenario: Every Word carries exactly the Root QUL gives its Word location
    Then 50298 Words have a Root and 27134 Words have none
    And every Word's Root tag is the id and single-spaced letters of the Root QUL gives its Word location
    And every Root lists each Word location QUL gives it exactly once

  @AC-5-2
  Scenario: ر ح م has its transliteration and QUL's counts
    When I open the Root "ر ح م"
    Then its transliteration is "r-ḥ-m"
    And it has 339 occurrences and 47 unique Words, as QUL's word root database counts them
    And its Word locations are the 339 Word locations QUL gives it

  @AC-5-2 @AC-5-6
  Scenario: ر ح م's Spellings are grouped under its QUL Lemmas, most frequent first
    When I open the Root "ر ح م"
    Then its Lemmas are these QUL Lemmas, in this order, each with QUL's Lemma text
      | lemma | occurrences |
      | 1951  | 116         |
      | 1209  | 114         |
      | 1472  | 57          |
      | 1087  | 28          |
      | 3259  | 12          |
      | 47    | 6           |
      | 3414  | 4           |
      | 4460  | 1           |
      | 2994  | 1           |
    And each Lemma's Word locations are the ones QUL's word lemma database gives that Lemma within the Root
    And each Lemma's occurrences are its Spellings' Word locations counted
    And the Root has 84 Spellings

  @AC-5-2
  Scenario: A Spelling is one exact text within its Lemma
    When I open the Root "ر ح م"
    Then within each Lemma, a Spelling's Word locations share one Uthmani text once pause marks are set aside, and no two Spellings share one
    And each Spelling's Uthmani and Indo-Pak text is the Script texts' text at its first Word location
    And each Spelling's Word locations are in Quran order

  @AC-5-2
  Scenario: A Root's Word locations with no QUL Lemma are held under one Lemma with no text
    Then 158 Roots hold 1669 Word locations that QUL's word lemma database gives no Lemma
    And each such Root holds them under one Lemma whose id and text are empty
    And every other Lemma's id and text are QUL's

  @AC-5-2
  Scenario Outline: The Root <letters> is transliterated as <transliteration>
    When I open the Root "<letters>"
    Then its transliteration is "<transliteration>"

    Examples:
      | letters | transliteration |
      | ا م ن   | ʾ-m-n           |
      | ع ل م   | ʿ-l-m           |
      | ث و ب   | th-w-b          |
      | خ ل ق   | kh-l-q          |
      | ذ ك ر   | dh-k-r          |
      | ش ك ر   | sh-k-r          |
      | غ ف ر   | gh-f-r          |
      | ح م د   | ḥ-m-d           |
      | ص ل و   | ṣ-l-w           |
      | ض ر ب   | ḍ-r-b           |
      | ط ه ر   | ṭ-h-r           |
      | ظ ل م   | ẓ-l-m           |

  @AC-5-2
  Scenario: Every Root's transliteration has one part per letter
    Then every Root's transliteration is its QUL Buckwalter letters, one hyphen-joined part per Root letter

  @AC-5-6
  Scenario Outline: In every Root, <items> are sorted by occurrence count, highest first
    Then in every Root the <items> are sorted by occurrence count, highest first, and by first Word location when counts tie

    Examples:
      | items                       |
      | Lemmas                      |
      | Spellings within each Lemma |

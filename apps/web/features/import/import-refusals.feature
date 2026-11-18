@issue-172
Feature: A failing source writes nothing
  The import keeps every check the dataset builder makes (ADR 0049): it stops,
  naming what is wrong, when a source is missing or malformed, when the two
  Scripts' Word locations differ, when an Ayah's end is wrong, when the
  Recitation timings do not fit the text, or when an Ayah translation source
  is broken. Then it exits non-zero and writes nothing: the database keeps the
  rows and the sources hash of its last good import, so a deploy never serves
  a partial Quran. These are the dataset seam's refusal cases (its
  builder-failures and ayah-translation features), each run as the import.

  Background:
    Given a Postgres holding the import of the committed sources

  @AC-1 @AC-8
  Scenario: A complete copy of the sources elsewhere is the same sources, and writes nothing
    Given a copy of the sources with nothing left out
    When the import runs on that copy
    Then it exits 0
    And nothing was written to any table

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming the file, when a source is missing
    Given a copy of the sources without "<source>"
    When the import runs on that copy
    Then it exits non-zero, naming "<source>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    Examples:
      | source                                |
      | qpc-hafs-word-by-word.json            |
      | digital-khatt-indopak.json            |
      | urud-wbw.json                         |
      | english-wbw-translation.json          |
      | quran-metadata-surah-name.json        |
      | yasser-ad-dussary-surah-by-surah.json |

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming the file, when a source is malformed
    Given a copy of the sources where "<source>" is cut off mid-JSON
    When the import runs on that copy
    Then it exits non-zero, naming "<source>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    Examples:
      | source                                |
      | qpc-hafs-word-by-word.json            |
      | digital-khatt-indopak.json            |
      | urud-wbw.json                         |
      | english-wbw-translation.json          |
      | quran-metadata-surah-name.json        |
      | yasser-ad-dussary-surah-by-surah.json |

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming the file, when a source is not a JSON object
    Given a copy of the sources where "<source>" is a JSON list
    When the import runs on that copy
    Then it exits non-zero, naming "<source>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    Examples:
      | source                                |
      | qpc-hafs-word-by-word.json            |
      | digital-khatt-indopak.json            |
      | urud-wbw.json                         |
      | english-wbw-translation.json          |
      | quran-metadata-surah-name.json        |
      | yasser-ad-dussary-surah-by-surah.json |

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming the file, when a source has no entries
    Given a copy of the sources where "<source>" is an empty JSON object
    When the import runs on that copy
    Then it exits non-zero, naming "<source>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    Examples:
      | source                                |
      | qpc-hafs-word-by-word.json            |
      | digital-khatt-indopak.json            |
      | urud-wbw.json                         |
      | english-wbw-translation.json          |
      | quran-metadata-surah-name.json        |
      | yasser-ad-dussary-surah-by-surah.json |

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming "<named>", when the sources do not fit together
    Given a copy of the sources whose <copy>
    When the import runs on that copy
    Then it exits non-zero, naming "<named>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    # The Scripts' Word locations differ; a Word location is skipped within an
    # Ayah; an Ayah has no Ayah-end marker; its Ayah-end marker is another
    # Ayah's number; the Recitation has no timings for an Ayah; the Recitation
    # times a Word its Ayah does not have.
    Examples:
      | copy                                                               | named      |
      | Digital Khatt Indopak text lacks Word 2:255:3                      | 2:255:3    |
      | QPC Hafs and Digital Khatt Indopak texts both lack Word 2:255:3    | Ayah 2:255 |
      | QPC Hafs and Digital Khatt Indopak texts both lack Word 2:255:51   | Ayah 2:255 |
      | QPC Hafs Ayah-end marker 2:255:51 reads 254 in Arabic-Indic digits | Ayah 2:255 |
      | Recitation timings lack Ayah 2:255                                 | 2:255      |
      | Recitation timings of Ayah 2:255 time a Word 51                    | 2:255      |

  @AC-1 @AC-8
  Scenario Outline: The import fails, naming the file, when an Ayah translation source is broken
    Given the committed sources with <file> <defect>
    When the import runs on that copy
    Then it exits non-zero, naming "<file>"
    And nothing was written to any table
    And the stored sources hash is the committed sources'

    Examples:
      | file                                         | defect                                 |
      | ur-fatah-muhammad-jalandhari-simple.json     | removed                                |
      | en-sahih-international-inline-footnotes.json | removed                                |
      | ur-fatah-muhammad-jalandhari-simple.json     | cut off mid-JSON                       |
      | en-sahih-international-inline-footnotes.json | cut off mid-JSON                       |
      | ur-fatah-muhammad-jalandhari-simple.json     | holding an entry for 1:1 with no text  |
      | en-sahih-international-inline-footnotes.json | holding an entry for 1:1 with no text  |
      | ur-fatah-muhammad-jalandhari-simple.json     | holding no entries                     |
      | en-sahih-international-inline-footnotes.json | holding no entries                     |
      | ur-fatah-muhammad-jalandhari-simple.json     | holding an empty text for 1:1          |
      | en-sahih-international-inline-footnotes.json | holding an empty text for 1:1          |
      | en-sahih-international-inline-footnotes.json | holding only a footnote for 1:1        |
      | ur-fatah-muhammad-jalandhari-simple.json     | lacking its entry for 1:1              |
      | en-sahih-international-inline-footnotes.json | lacking its entry for 1:1              |
      | ur-fatah-muhammad-jalandhari-simple.json     | holding an extra entry for 115:1       |
      | en-sahih-international-inline-footnotes.json | holding an extra entry for 115:1       |

Feature: Passage headings
  Readers see a Passage heading above the first Ayah of every Passage: its
  Passage title in the page's Language (Urdu right to left in Dubai, English
  left to right) and its Ayah range, "83–88", or one number for a
  one-Ayah Passage. It is a real heading, ranked above the Ayah headings, and
  links to its first Ayah's anchor. The Passages and their titles are read from
  the Passages file as last committed before Passages moved into Neon.

  Everything is behind a release switch, the build-time environment setting
  NEXT_PUBLIC_PASSAGE_HEADINGS. Scenarios tagged passage-headings-on run
  against a build made with it set to "on"; those tagged passage-headings-off,
  with the rest of the site tests, against a build made without it
  (playwright.config.ts; `pnpm test:e2e` runs both).

  Background:
    Given a browser with no saved reader settings

  # ------------------------------------------------------------ switch on

  @passage-headings-on @AC-5 @AC-12
  Scenario Outline: Every Surah page in <Language>, as a crawler gets it, has a Passage heading above the first Ayah of each of its Passages
    Then every Surah page in <Language>, fetched without scripts, shows a <Language> Passage heading for each of the Surah's Passages in the run's database, above its first Ayah, and no other

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @passage-headings-on @AC-5 @AC-12
  Scenario Outline: On /<lang>/18 the Passage heading above Ayah 18:83 shows its <Language> Passage title, running <dir> in <typeface>, and its Ayah range
    Given I note every font the browser downloads
    And I open Surah 18 in <Language>
    Then the Passage heading above Ayah 18:83 shows the <Language> Passage title of 18:83 from the Passages file and the Ayah range "83–88"
    And the Passage title above Ayah 18:83 is marked lang "<lang>", runs "<dir>" and is set in the loaded font "<typeface>"
    And the browser downloaded the committed font file "Dubai-Regular.woff2"
    And I save a screenshot of the Passage heading above Ayah 18:83 "AC-5-passage-heading-18-83-<lang>-light-desktop"
    When I view the page on a 390×844 phone
    Then I save a screenshot of the Passage heading above Ayah 18:83 "AC-5-passage-heading-18-83-<lang>-light-phone"

    Examples:
      | Language | lang | dir | typeface      |
      | Urdu     | ur   | rtl | Dubai         |
      | English  | en   | ltr | IBM Plex Sans |

  @passage-headings-on @AC-5 @AC-12
  Scenario Outline: A directly loaded Surah <Surah> in <Language> shows the Passages file's Passage headings, and again after a reload
    Given I open Surah <Surah> in <Language>
    Then the Passage headings shown are the Passages file's for Surah <Surah> in <Language>, each above its first Ayah
    When I reload the page
    Then the Passage headings shown are the Passages file's for Surah <Surah> in <Language>, each above its first Ayah

    Examples:
      | Surah | Language |
      | 1     | Urdu     |
      | 18    | English  |

  @passage-headings-on @AC-6 @AC-12
  Scenario Outline: Surah <Surah> opened from the <Language> index shows the same Passage headings, at the same Ayahs, as its directly loaded page
    Given I open "/<lang>"
    When I follow the index card of Surah <Surah>
    Then every Ayah of Surah <Surah> is shown
    And the Passage headings shown are the Passages file's for Surah <Surah> in <Language>, each above its first Ayah
    And I note the Passage headings shown and the Ayahs they are above
    When I reload the page
    Then the Passage headings shown are the noted ones, above the same Ayahs

    Examples:
      | Surah | Language | lang |
      | 2     | Urdu     | ur   |
      | 2     | English  | en   |
      | 18    | Urdu     | ur   |
      | 18    | English  | en   |

  @passage-headings-on @AC-6 @AC-12
  Scenario: A Passage heading arrives with the Surah part its first Ayah arrives in
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    And the Passage heading above Ayah 2:1 shows the Urdu Passage title of 2:1 from the Passages file and the Ayah range "1–5"
    And the Passage heading of Surah 2's last Passage is not shown yet
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    And the Passage headings shown are the Passages file's for Surah 2 in Urdu, each above its first Ayah

  @passage-headings-on @AC-7 @AC-12
  Scenario Outline: The single-Passage Surah 112 in <Language> has its one Passage heading, loaded directly and opened from the index
    Given I open "/<lang>"
    When I follow the index card of Surah 112
    Then every Ayah of Surah 112 is shown
    And there is exactly one Passage heading, above Ayah 112:1, with the <Language> Passage title of 112:1 from the Passages file and the Ayah range "1–4"
    When I reload the page
    Then there is exactly one Passage heading, above Ayah 112:1, with the <Language> Passage title of 112:1 from the Passages file and the Ayah range "1–4"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @passage-headings-on @AC-8 @AC-12
  Scenario Outline: On /<lang>/18 every Passage heading is a heading ranked above the Ayah headings
    Given I open Surah 18 in <Language>
    Then every Passage heading is a heading of a higher rank than every Ayah heading

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @passage-headings-on @AC-8 @AC-12
  Scenario: A Passage heading follows the theme
    Given I open "/en/18"
    When I choose the Light theme
    Then the Passage heading above Ayah 18:83 is drawn in one of the light theme's colour tokens, which I note
    When I choose the Dark theme
    Then the Passage heading above Ayah 18:83 is drawn in the dark theme's value of the noted colour token
    And I save a screenshot of the Passage heading above Ayah 18:83 "AC-8-passage-heading-18-83-en-dark-desktop"

  @passage-headings-on @AC-8 @AC-12
  Scenario Outline: A Passage title in <Language> follows Meaning size
    Given I open Surah 112 in <Language>
    When I note the size of the Passage title above Ayah 112:1
    And I set Meaning size to 130%
    Then the Passage title above Ayah 112:1 is 130% of its noted size
    When I set Meaning size to 85%
    Then the Passage title above Ayah 112:1 is 85% of its noted size

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @passage-headings-on @AC-9 @AC-12
  Scenario: A Passage heading links to its first Ayah's anchor, and following it leaves the Reading place where it was
    Given I open "/ur/18"
    Then the Passage heading above Ayah 18:89 links to Ayah 18:89's anchor "#18:89"
    When I scroll until Ayah 18:88 is at the top of the screen
    And I follow the Passage heading above Ayah 18:89
    Then Ayah 18:89 is at the top of the screen
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 88", linking to "/ur/18"

  @passage-headings-on @AC-9 @AC-12
  Scenario: In a Surah opened from the index, a Passage heading links to its first Ayah's anchor
    Given I open "/en"
    When I follow the index card of Surah 18
    Then every Ayah of Surah 18 is shown
    And the Passage heading above Ayah 18:89 links to Ayah 18:89's anchor "#18:89"

  @passage-headings-on @AC-10 @AC-12
  Scenario Outline: Switching Language from <Language> to <Other> switches the Passage headings' titles
    Given I open Surah 18 in <Language>
    Then the Passage heading above Ayah 18:83 shows the <Language> Passage title of 18:83 from the Passages file and the Ayah range "83–88"
    When I switch Language to <Other>
    Then I am on "/<other>/18" with nothing added to the URL
    And every Ayah of Surah 18 is shown
    And the Passage headings shown are the Passages file's for Surah 18 in <Other>, each above its first Ayah
    And no <Language> Passage title of Surah 18 is shown

    Examples:
      | Language | Other   | other |
      | Urdu     | English | en    |
      | English  | Urdu    | ur    |

  # ------------------------------------------------------------ switch off

  @passage-headings-off @AC-11 @AC-12
  Scenario Outline: With the release switch off, every Surah page in <Language>, as a crawler gets it, has no Passage heading
    Then every Surah page in <Language>, fetched without scripts, shows no Passage heading and none of the Surah's Passage titles

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @passage-headings-off @AC-11 @AC-12
  Scenario Outline: With the release switch off, Surah 18 in <Language> has no Passage heading, loaded directly or opened from the index
    Given I open "/<lang>"
    When I follow the index card of Surah 18
    Then every Ayah of Surah 18 is shown
    And no Passage heading is shown and no Passage title of Surah 18 is shown
    When I reload the page
    Then no Passage heading is shown and no Passage title of Surah 18 is shown

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

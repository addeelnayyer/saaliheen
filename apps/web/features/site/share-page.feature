@AC-10 @issue-55
Feature: Share page for visitors
  A visitor who opens a Share page address sees the Shared Ayahs inside frame
  B ("Mushaf"), in the Language and Script the address names. On top, a
  cartouche holds the Surah's Arabic name, its English name and the Ayah
  range (e.g. "Al-Kahf · 18:83–88"), and the Passage title while the Shared Ayahs
  are exactly one Passage. The Ayahs follow, set out Ayah by Ayah or Flowing.
  After them, a colophon: the translator, "Read this in Quran Analysis" and the
  Saaliheen name. Below the frame: the visitor's Share layout toggle (none for
  a single Ayah) and a quiet "Share your own" link.

  The address carries the Language, the Surah, the from and to Ayahs, the
  sharer's Script and the Share layout, and nothing per-viewer:
  /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>], e.g.
  /en/share/18/83-88/uthmani/flowing; a run with no layout named is Ayah by
  Ayah. The steps build it from the Shared Ayahs, so the scenarios name only
  what the address carries.

  Expected Arabic, Ayah translations, Surah names and Passage titles are read
  from the committed sources (data/qul/, and the Passages file as last committed), never typed.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: the Shared Ayahs in frame B

  @AC-1
  Scenario Outline: <what> <ayahs> in <Language> shows its Arabic and Ayah translations in frame B, names on top, colophon below
    Given I open the Share page of <ayahs> in <Language> and Uthmani
    Then the Share page shows <ayahs> Ayah by Ayah in Uthmani and <Language>
    And the frame's head shows the Surah's Arabic and English names and the Ayah range, above the first Shared Ayah
    And the colophon shows the translator, a "Read this in Quran Analysis" link to the first Shared Ayah and the Saaliheen name, below the last Shared Ayah
    And below the frame there is a "Share your own" link to a Share page in <Language>
    And I save a screenshot of the Share page "AC-1-<shot>-<lang>-light-desktop"
    When I view the page on a 390×844 phone
    Then I save a screenshot of the Share page "AC-1-<shot>-<lang>-light-phone"

    Examples:
      | what         | ayahs      | Language | lang | shot    |
      | A single Ayah | 2:255     | English  | en   | single  |
      | A run        | 112:1–4    | English  | en   | run     |
      | A Passage    | 18:83–88   | English  | en   | passage |
      | A single Ayah | 2:255     | Urdu     | ur   | single  |
      | A run        | 112:1–4    | Urdu     | ur   | run     |
      | A Passage    | 18:83–88   | Urdu     | ur   | passage |

  @AC-1
  Scenario: On a desktop, each Ayah's end stays on the line of its last Word, as a printed mushaf keeps it
    Given I open the Share page of 18:83–88 in English and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And each Shared Ayah's end is on the same line as its last Word

  # ---------------------------------------------------------------- AC-2: Share layouts and the visitor's toggle

  @AC-2
  Scenario: A run with no layout in its address starts Ayah by Ayah, each Ayah's Arabic followed by its Ayah translation
    Given I open the Share page of 18:83–88 in English and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And the Share layout toggle shows Ayah by Ayah chosen

  @AC-2
  Scenario Outline: A run in <Language> whose address says <layout> starts <layout>
    Given I open the Share page of 112:1–4 in <Language> and Uthmani, <layout>
    Then the Share page shows 112:1–4 <layout> in Uthmani and <Language>
    And the Share layout toggle shows <layout> chosen
    And I save a screenshot of the Share page "AC-2-<shot>-<lang>-light-desktop"

    Examples:
      | layout       | Language | lang | shot         |
      | Ayah by Ayah | English  | en   | ayah-by-ayah |
      | Flowing      | English  | en   | flowing      |
      | Flowing      | Urdu     | ur   | flowing      |

  @AC-2
  Scenario: Flowing runs all the Arabic on, then one translation paragraph marking each Ayah's number as a small superscript
    Given I open the Share page of 18:83–88 in English and Indo-Pak, Flowing
    Then the Share page shows 18:83–88 Flowing in Indo-Pak and English
    And in the translation paragraph each Ayah's number is a small superscript before its Ayah translation

  @AC-2
  Scenario Outline: On a <width> phone, Flowing Indo-Pak keeps each Ayah's end on the line of its last Word
    Given I view the page on a <width> phone
    And I open the Share page of 112:1–4 in Urdu and Indo-Pak, Flowing
    Then the Share page shows 112:1–4 Flowing in Indo-Pak and Urdu
    And each Shared Ayah's end is on the same line as its last Word

    Examples:
      | width      |
      | 375px-wide |
      | 390×844    |

  @AC-2
  Scenario: The visitor's toggle switches between the layouts, and only for that visitor
    Given I open the Share page of 18:83–88 in English and Uthmani
    When I choose the Flowing Share layout
    Then the Share page shows 18:83–88 Flowing in Uthmani and English
    And the Share layout toggle shows Flowing chosen
    And the address is still the one I opened
    When I choose the Ayah by Ayah Share layout
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And the Share layout toggle shows Ayah by Ayah chosen
    When I choose the Flowing Share layout
    And I reload the page
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And the Share layout toggle shows Ayah by Ayah chosen

  @AC-2
  Scenario Outline: A single Ayah in <Language> has no Share layout and no toggle
    Given I open the Share page of 2:255 in <Language> and Uthmani
    Then the Share page shows 2:255 Ayah by Ayah in Uthmani and <Language>
    And there is no Share layout toggle

    Examples:
      | Language |
      | English  |
      | Urdu     |

  # ---------------------------------------------------------------- AC-3: the Passage title on an exact match

  # Passage titles are held back by the Passage headings release switch (#41)
  # until a Scholar has checked them, so the Share page shows one only in a
  # build with NEXT_PUBLIC_PASSAGE_HEADINGS=on (PROPOSED in the stage report).
  @AC-3 @passage-headings-on
  Scenario Outline: In <Language>, the Passage title shows for 18:83–88, exactly a Passage, and not for 18:83–87
    Given I open the Share page of 18:83–88 in <Language> and Uthmani
    Then the frame's head shows the Passage title of 18:83–88 in <Language>, above the first Shared Ayah
    And I save a screenshot of the Share page "AC-3-passage-title-<lang>-light-desktop"
    Given I open the Share page of 18:83–87 in <Language> and Uthmani
    Then the Share page shows 18:83–87 Ayah by Ayah in Uthmani and <Language>
    And the frame's head shows no Passage title of Surah 18

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  @AC-3 @passage-headings-off
  Scenario: With Passage headings held back, no Passage title shows even for exactly a Passage
    Given I open the Share page of 18:83–88 in English and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And the frame's head shows no Passage title of Surah 18

  # ---------------------------------------------------------------- AC-4: Language and Script from the address

  @AC-4
  Scenario: An Urdu address shows the Urdu Ayah translation right to left in Dubai
    Given I note every font the browser downloads
    And I open the Share page of 2:255 in Urdu and Uthmani
    Then the Share page shows 2:255 Ayah by Ayah in Uthmani and Urdu
    And the Urdu Ayah translation of 2:255 is marked lang "ur", runs "rtl" and is set in the loaded font "Dubai"
    And the browser downloaded the committed font file "Dubai-Regular.woff2"
    And the English Ayah translation of 2:255 is not shown

  @AC-4
  Scenario: An English address shows the English Ayah translation left to right in IBM Plex Sans
    Given I open the Share page of 2:255 in English and Uthmani
    Then the English Ayah translation of 2:255 is marked lang "en", runs "ltr" and is set in the loaded font "IBM Plex Sans"
    And the Urdu Ayah translation of 2:255 is not shown

  @AC-4
  Scenario Outline: A <script> address shows <script> even when the browser's saved Script is <saved>
    Given on an earlier visit to "/en/1" I chose, in order:
      | <script> |
      | <saved>  |
    When I open the Share page of 112:1–4 in English and <script> in a fresh browser that keeps those choices
    Then the Share page shows 112:1–4 Ayah by Ayah in <script> and English
    And the Shared Ayahs' Arabic is set in a font face that has loaded
    And the <script> Arabic font file is downloaded
    When I choose the Flowing Share layout
    Then the Share page shows 112:1–4 Flowing in <script> and English
    And I save a screenshot of the Share page "AC-4-<shot>-en-light-desktop"

    Examples:
      | script   | saved    | shot              |
      | Indo-Pak | Uthmani  | indopak-address   |
      | Uthmani  | Indo-Pak | uthmani-address   |

  # ---------------------------------------------------------------- AC-6: sizing

  @AC-6
  Scenario Outline: On a <device> in <Language>, 2:282 shows whole and the page scrolls, with the colophon after it
    Given the browser is a <device>
    And I open the Share page of 2:282 in <Language> and Uthmani
    Then the Share page shows 2:282 Ayah by Ayah in Uthmani and <Language>
    And every Shared Ayah is shown whole, nothing cut off
    And the page is taller than one screen
    And the colophon is below the last Shared Ayah
    When I scroll to the bottom of the page
    Then I save a screenshot of the Share page as it is on screen "AC-6-long-ayah-<lang>-light-<device>"

    Examples:
      | device  | Language | lang |
      | desktop | English  | en   |
      | phone   | English  | en   |
      | phone   | Urdu     | ur   |

  @AC-6
  Scenario Outline: On a <device>, a single short Ayah fills the screen with the colophon at its foot
    Given the browser is a <device>
    And I open the Share page of 112:1 in English and Uthmani
    Then the Share page shows 112:1 Ayah by Ayah in Uthmani and English
    And the page is at least one screen tall
    And the colophon sits at the foot of the first screen
    And I save a screenshot of the Share page "AC-6-short-ayah-en-light-<device>"

    Examples:
      | device  |
      | desktop |
      | phone   |

  @AC-6
  Scenario Outline: At 375px wide, the Share page of <ayahs> in <Language>, <layout>, does not scroll sideways
    Given I view the page on a 375px-wide phone
    And I open the Share page of <ayahs> in <Language> and <script>, <layout>
    Then the Share page shows <ayahs> <layout> in <script> and <Language>
    And the page does not scroll horizontally
    And every Shared Ayah fits within the screen's width

    Examples:
      | ayahs    | Language | script   | layout       |
      | 18:83–88 | English  | Uthmani  | Ayah by Ayah |
      | 18:83–88 | Urdu     | Indo-Pak | Flowing      |
      | 20:24–36 | Urdu     | Uthmani  | Ayah by Ayah |

  @AC-6
  Scenario Outline: At 375px wide, the single Ayah <ayahs> in <Language> does not scroll sideways
    Given I view the page on a 375px-wide phone
    And I open the Share page of <ayahs> in <Language> and Uthmani
    Then the Share page shows <ayahs> Ayah by Ayah in Uthmani and <Language>
    And the page does not scroll horizontally
    And every Shared Ayah fits within the screen's width

    Examples:
      | ayahs | Language |
      | 2:282 | English  |
      | 2:255 | Urdu     |

  # ---------------------------------------------------------------- AC-7: light and dark follow the device

  @AC-7
  Scenario Outline: On a device in <device> mode the Share page has its <device> look, whatever theme the browser saved
    Given on an earlier visit to "/en/1" I chose, in order:
      | <saved> |
    And my system prefers a <device> colour scheme
    When I open the Share page of 18:83–88 in English and Uthmani in a fresh browser that keeps those choices
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And the Share page is drawn in its <device> look
    And I save a screenshot of the Share page "AC-7-passage-en-<device>-desktop"
    When I view the page on a 390×844 phone
    Then I save a screenshot of the Share page "AC-7-passage-en-<device>-phone"

    Examples:
      | device | saved |
      | light  | Dark  |
      | dark   | Light |

  # ---------------------------------------------------------------- AC-8: the Reading place

  @AC-8
  Scenario: Opening a Share page leaves the Reading place where it was
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open the Share page of 2:255 in Urdu and Uthmani
    Then the Share page shows 2:255 Ayah by Ayah in Uthmani and Urdu
    When I scroll to the bottom of the page
    And I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

  @AC-8
  Scenario: A browser that has read nothing has still read nothing after opening a Share page
    Given I open the Share page of 18:83–88 in English and Uthmani
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    When I scroll to the bottom of the page
    And I open "/en"
    Then the Surah index offers no Continue reading

  # ---------------------------------------------------------------- AC-9: assistive technology

  @AC-9
  Scenario Outline: In <Language>, <layout>, the Arabic is marked Arabic, the translations carry their Language and direction, and the artwork is hidden
    Given I open the Share page of 18:83–88 in <Language> and <script>, <layout>
    Then the Share page shows 18:83–88 <layout> in <script> and <Language>
    And the Shared Ayahs' Arabic and the Surah's Arabic name are marked lang "ar" and run "rtl"
    And the Ayah translations are marked lang "<lang>" and run "<dir>"
    And the frame's artwork is hidden from assistive technology

    Examples:
      | Language | lang | dir | script   | layout       |
      | English  | en   | ltr | Uthmani  | Ayah by Ayah |
      | Urdu     | ur   | rtl | Indo-Pak | Flowing      |

  @AC-9
  Scenario: A single Ayah's artwork is hidden from assistive technology
    Given I open the Share page of 2:255 in English and Uthmani
    Then the Share page shows 2:255 Ayah by Ayah in Uthmani and English
    And the Shared Ayahs' Arabic and the Surah's Arabic name are marked lang "ar" and run "rtl"
    And the Ayah translations are marked lang "en" and run "ltr"
    And the frame's artwork is hidden from assistive technology

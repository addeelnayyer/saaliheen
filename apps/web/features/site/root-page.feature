@issue-287
Feature: A Root page, every Spelling open
  A Root page, /{lang}/roots/{letters} with the letters written without their
  spaces (ADR 0065), shows one Root whole. Its header gives the Root's
  letters, transliteration, occurrence and unique-Word counts, a Memorized?
  choice, and a row of its Lemmas, each with its count and leading to its
  section. A section per Lemma follows, in the Root dialog's order, the Words
  with no Lemma in a section of their own where the dialog puts them. In each,
  every Spelling is a part with its meaning in the Language and its count, and
  under it the Ayahs it occurs in, in Quran order, each whole in the reader's
  Script and Arabic size, with its Ayah translation while that is on. Every
  Word of that Spelling is drawn on a pale tint and said as marked; the Ayah
  translation never is. Each Ayah links to its Surah at its marked Word.

  The page is a look-up: no Word cards, Word meanings, Recitation, Phrase
  colours or Known words colour, and it leaves the Reading places where they
  were. The small Roots here open with every Spelling open; a large Root's,
  such as ر ح م's, start closed (#288, ./root-page-spelling-parts.feature).

  The small Roots here were chosen for what they hold: ح ي ض a Spelling twice
  in one Ayah and two Spellings in another, ز ب د Words with no Lemma, و ط ر
  one Spelling twice in one Ayah. Lemmas, Spellings, meanings, counts and
  Ayahs are read from QUL's word root and word lemma databases and the
  sources (./steps/roots), as the Root dialog's features read them, never
  typed; ر ح م's letters, transliteration and counts are the issue's.

  The page's shape these steps expect: the Root's letters in the <h1>; the
  Lemma row a navigation named "Lemmas" holding one link per Lemma to its
  section; each Lemma section a <section> headed by an <h2>; each Spelling
  part headed by an <h3>, its Ayahs a list after it, each Ayah an item whose
  link is named by its `s:a`; each marked Word an element whose
  `data-location` is its Word location.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- the header

  Scenario Outline: The Root page of ر ح م in <Language> says what it is, then a row of its 9 Lemmas, each leading to its section
    Given I open "/<lang>/roots/رحم"
    Then the Root page's heading is "ر ح م", with "r-ḥ-m", 339 occurrences and 47 unique Words
    And the Root page's Lemma row lists the 9 Lemmas of "ر ح م" in the Root dialog's order, each with its count
    When I follow the Root page's Lemma row to its last Lemma
    Then the address leads to the last Lemma's section of "ر ح م", which is on screen

    Examples:
      | lang | Language |
      | en   | English  |
      | ur   | Urdu     |

  Scenario: Marking ر ح م on its Root page makes it a Known Root, as its Root dialog shows
    Given I open "/en/roots/رحم"
    Then the Root page's Memorized? is off
    When I switch the Root page's Memorized?
    Then the Root page's Memorized? is on
    When I open "/en/1"
    And I open the Root tag on the Word card at 1:1:3
    Then the Root dialog's Memorized? is on

  # ---------------------------------------------------------------- Lemma sections and Spellings

  Scenario Outline: The Root page of <letters> in <Language> has a section per Lemma, each Spelling with its meaning, count and Ayahs
    Given I open "/<lang>/roots/<address>"
    Then the Root page has a section for each Lemma of "<letters>", in the Root dialog's order, the Words with no Lemma in a section of their own
    And each Spelling of "<letters>" shows its meaning in <Language> and its count, then the Ayahs it occurs in, in Quran order, each once

    Examples:
      | letters | address | lang | Language |
      | ح ي ض   | حيض     | en   | English  |
      | ح ي ض   | حيض     | ur   | Urdu     |
      | ز ب د   | زبد     | en   | English  |
      | ز ب د   | زبد     | ur   | Urdu     |
      | و ط ر   | وطر     | en   | English  |

  # ---------------------------------------------------------------- marking

  Scenario: Under each Spelling of ح ي ض only its own Words are tinted and said as marked
    Given on an earlier visit to "/en/2" I chose, in order:
      | Ayah translation |
    When I open "/en/roots/حيض" in a fresh browser with an empty cache that keeps those choices
    Then under each Spelling of "ح ي ض" exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked
    And the Ayah holding a Spelling of "ح ي ض" twice is listed once under it, with both its Words tinted
    And the Ayah holding two Spellings of "ح ي ض" is listed under each, tinted for that Spelling's Word only
    And no Ayah translation on the Root page is tinted

  Scenario: The Ayah holding و ط ر's one Spelling twice is listed once, with both its Words tinted
    Given I open "/en/roots/وطر"
    Then under each Spelling of "و ط ر" exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked
    And the Ayah holding a Spelling of "و ط ر" twice is listed once under it, with both its Words tinted

  Scenario: Knowing ح ي ض leaves its Root page's tint as it was, in no Known words colour
    Given I open "/en/roots/حيض"
    And I note the tint of the Root page's marked Words
    When I switch the Root page's Memorized?
    And I reload the page
    Then the Root page's Memorized? is on
    And under each Spelling of "ح ي ض" exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked
    And the Root page's marked Words are drawn in the tint noted

  # ---------------------------------------------------------------- each Ayah as the reader sets it

  Scenario Outline: The Ayahs of ز ب د are in <Script>, with the Ayah translation <switch>, in <Language>
    Given on an earlier visit to "/<lang>/13" I chose, in order:
      | <Script>            |
      | <translation>       |
      | Arabic size larger  |
      | Arabic size larger  |
      | Meaning size larger |
    When I open "/<lang>/roots/زبد" in a fresh browser with an empty cache that keeps those choices
    Then each Ayah under each Spelling of "ز ب د" shows its Arabic in <Script>, with its end-of-Ayah marker, and not in the other Script
    And each Ayah under each Spelling of "ز ب د" shows its Ayah translation in <Language>: <switch>
    And the Root page's Arabic is 130% and its Ayah translations 115% of a fresh browser's
    And the Root page has no Word card, no Phrase colour and no Recitation control

    Examples:
      | lang | Language | Script   | translation      | switch |
      | en   | English  | Uthmani  | Ayah translation | on     |
      | ur   | Urdu     | Indo-Pak | Ayah translation | on     |
      | ur   | Urdu     | Uthmani  | Uthmani          | off    |

  Scenario Outline: <layout> changes nothing on the Root page
    Given I open "/en/13"
    When I switch the Ayah layout to <layout>
    And I open "/en/roots/زبد"
    Then each Ayah under each Spelling of "ز ب د" shows its Arabic in Uthmani, with its end-of-Ayah marker, and not in the other Script
    And under each Spelling of "ز ب د" exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked
    And the Root page has no Word card, no Phrase colour and no Recitation control

    Examples:
      | layout  |
      | Flowing |
      | Study   |

  # ---------------------------------------------------------------- the Ayah link, and the Reading places

  Scenario: An Ayah's link opens its Surah at its marked Word, with that Word marked
    Given I open "/en/roots/وطر"
    When I follow the Root page's link of Ayah 33:37
    Then I am on Surah 33 in English at the first Word of "و ط ر" in Ayah 33:37
    And the Word at that location is drawn marked, unlike once the link no longer points at it

  # Finishing a Surah takes its Reading place away, so both still listed is no
  # Surah finished too.
  Scenario: Visiting a Root page leaves the Reading places as they were and finishes no Surah
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/19"
    And I open "/ur/roots/رحم"
    And I scroll to the bottom of the Root page
    And I open "/ur"
    Then the Surah index lists these Reading places, newest first:
      | place                 | link   |
      | 19. Maryam · Ayah 1   | /ur/19 |
      | 18. Al-Kahf · Ayah 45 | /ur/18 |

  # ---------------------------------------------------------------- not found, and the Link preview

  Scenario: Letters naming no Root are not found
    Then these addresses are not found:
      | /en/roots/ققق     |
      | /ur/roots/abc     |
      | /fr/roots/رحم     |
      | /en/roots/ر%20ح%20م |

  Scenario Outline: <app> fetching the Root page of ر ح م in <Language> gets the site's default Link preview
    When <app> fetches the Root page of "ر ح م" in <Language>
    Then the page's head carries no Link preview picture
    And its Link preview tags are those of the Surah index in <Language>

    Examples:
      | app      | Language |
      | WhatsApp | English  |
      | X        | Urdu     |

  # ---------------------------------------------------------------- both Scripts, both colour themes, phone width

  Scenario Outline: The Root page of ح ي ض in <Script>, <Language>, on the <Theme> paper, on a <viewport>
    Given on an earlier visit to "/<lang>/2" I chose, in order:
      | <Script>         |
      | <Theme>          |
      | Ayah translation |
    When I open "/<lang>/roots/حيض" in a fresh browser with an empty cache that keeps those choices
    And I view the Root page on a <viewport>
    Then under each Spelling of "ح ي ض" exactly the Words of that Spelling are tinted, all in one tint, and a screen reader hears each as marked
    And the Arabic of each of the Root page's marked Words contrasts with its tint by at least 4.5 to 1
    And the page does not scroll sideways
    And the page is drawn on the <theme> paper
    And I save a screenshot "root-page-<script>-<lang>-<theme>-<viewport>"

    Examples:
      | Script   | script  | lang | Language | Theme | theme | viewport |
      | Uthmani  | uthmani | en   | English  | Light | light | desktop  |
      | Uthmani  | uthmani | ur   | Urdu     | Dark  | dark  | phone    |
      | Indo-Pak | indopak | en   | English  | Dark  | dark  | phone    |
      | Indo-Pak | indopak | ur   | Urdu     | Light | light | desktop  |

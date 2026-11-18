@AC-2-15
Feature: The interface is English in every Language; the Language sets the Word meanings
  The interface is English, left to right in IBM Plex Sans, on Urdu and English
  pages alike. The Language sets only the Word meanings and Ayah translations:
  Urdu ones run right to left in Dubai, English ones left to right in IBM Plex
  Sans. The site serves Dubai itself; an English page downloads it too, for
  the Translation language switch's اردو (#339). The Uthmani Script is set in
  the committed QPC Hafs font (ADR 0002) and the Indo-Pak Script's Digital
  Khatt Indopak font is not downloaded while that Script is unused.

  @AC-2-11
  Scenario Outline: Surah 1 in <Language> has an English interface, left to right in IBM Plex Sans, and Word meanings that run <dir> in <typeface>
    Given I note every font the browser downloads
    And I open Surah 1 in <Language>
    Then the page's lang is "en" and its dir is "ltr"
    And the Word meaning on the Word card at 1:1:1 is marked lang "<lang>", runs "<dir>" and is set in the loaded font "<typeface>"
    And the next Surah link is set in the loaded font "IBM Plex Sans"
    And Read, the next Surah link and the Ayah 1 marker are visible in English
    And no interface text on the page is written in Urdu or Arabic letters
    And the Uthmani text on the Word card at 1:1:1 is set in a loaded font
    And the browser downloaded the committed font file "UthmanicHafs_V22.woff2"
    And the browser did not download the committed font file "DigitalKhattIndoPak.otf"
    And the browser downloaded the committed font file "Dubai-Regular.woff2"
    And the page is captured as the evidence screen "AC-11-surah-1-<lang>-light-desktop"
    When I turn the Ayah translation switch on
    Then the <Language> Ayah translation of 1:1 is marked lang "<lang>", runs "<dir>" and is set in the loaded font "<typeface>"

    Examples:
      | Language | lang | dir | typeface      |
      | Urdu     | ur   | rtl | Dubai         |
      | English  | en   | ltr | IBM Plex Sans |

  # Replaces judge item U-2's Urdu header check: the header is English in every
  # Language, so its Ayah count is in Western digits beside a "·" in both.
  @AC-2-11
  Scenario Outline: The Surah header of Surah <Surah> in <Language> shows its Latin name, Meccan or Medinan and its Ayah count in English
    Given I open Surah <Surah> in <Language>
    Then the Surah header reads the Surah's Latin name, Meccan or Medinan and "<count> ayahs", as the Surah metadata and the QPC Hafs text say
    And the Surah header's main heading is the Surah's Arabic name

    Examples:
      | Language | Surah | count |
      | Urdu     | 1     | 7     |
      | Urdu     | 2     | 286   |
      | Urdu     | 114   | 6     |
      | English  | 1     | 7     |
      | English  | 2     | 286   |
      | English  | 114   | 6     |

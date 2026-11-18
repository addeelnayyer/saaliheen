@AC-4-9
Feature: Arabic font per Script
  Only the Arabic font of the Script in use is downloaded: QPC Hafs
  (UthmanicHafs_V22.woff2) for Uthmani, Digital Khatt Indopak
  (DigitalKhattIndoPak.otf) for Indo-Pak. Downloads are recognised by the
  sha256 of the committed font files.

  @AC-4-3
  Scenario Outline: With <script> chosen, a fresh load of /en/1 downloads only the <script> Arabic font
    Given on an earlier visit to "/en/1" I chose, in order:
      | <other script> |
      | <script>       |
    When I open "/en/1" in a fresh browser with an empty cache that keeps those choices
    Then the Word card at 1:1:1 shows its <script> text
    And the <script> Arabic font file is downloaded
    And the <other script> Arabic font file is not downloaded
    And the <script> text of the Word at 1:1:1 is set in a font face that has loaded

    Examples:
      | script   | other script |
      | Uthmani  | Indo-Pak     |
      | Indo-Pak | Uthmani      |

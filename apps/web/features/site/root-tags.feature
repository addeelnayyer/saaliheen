Feature: Root tags on Word cards
  A Word card shows its Word's Root as a Root tag — the Root's spaced letters
  with ↗ — that opens the Root dialog. A particle or pronoun, to which QUL's
  word root database gives no Root, shows no Root tag: its one tag is its
  Particle tag (particle-tags.feature). Which Word has which Root is read from
  QUL's word root database.

  @AC-5-8
  Scenario Outline: Every Al-Fatihah Word card in <Language> shows a Root tag exactly when QUL gives its Word a Root
    Given I open Surah 1 in <Language>
    Then every Word card whose Word QUL gives a Root shows one Root tag with that Root's letters and ↗
    And every other Word card shows no Root tag
    And the Word card at 1:5:1 shows no Root tag
    And the Word card at 1:7:4 shows no Root tag
    And the Word card at 1:1:3 shows a Root tag for "ر ح م"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-5-8
  Scenario Outline: Ayah 2:255's Word cards in <Language> show a Root tag exactly when QUL gives their Word a Root
    Given I open Surah 2 in <Language>
    When I scroll to the Word card at 2:255:1
    Then every Word card in Ayah 2:255 whose Word QUL gives a Root shows one Root tag with that Root's letters and ↗
    And every other Word card in Ayah 2:255 shows no Root tag

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-5-8
  Scenario: The Root tag reads the same in either Script
    Given a browser with no saved reader settings
    And I open "/ur/1"
    When I choose the Indo-Pak Script
    Then every Word card whose Word QUL gives a Root shows one Root tag with that Root's letters and ↗
    And every other Word card shows no Root tag

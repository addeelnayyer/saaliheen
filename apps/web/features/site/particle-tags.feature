@issue-249
Feature: Particle tags on Word cards
  A Word card whose Word QUL's word root database gives no Root shows a
  Particle tag where a Root tag would be: its particle's text in the reader's
  Script, with ↗, that opens the Particle dialog. A Word card with a Root shows
  its Root tag and no Particle tag. A Word's particle is the Lemma QUL's word
  lemma database gives it, else its Spelling (CONTEXT.md); a Lemma particle
  reads alike in either Script, a Spelling particle in Indo-Pak reads as its
  first Word location's Indo-Pak text. In Flowing, as no Root tag, no Particle
  tag shows. Expected particles are read from the QUL databases and the Script
  sources.

  Background:
    Given a browser with no saved reader settings

  @AC-4
  Scenario Outline: Every Al-Fatihah Word card in <Language> with no Root shows its Particle tag
    Given I open Surah 1 in <Language>
    Then every Word card whose Word QUL gives no Root shows one Particle tag with its particle's text in Uthmani and ↗
    And no Word card whose Word QUL gives a Root shows a Particle tag
    And the Word card at 1:5:1 shows a Particle tag for "إِيَّا"
    And the Word card at 1:7:4 shows a Particle tag for "عَلَىٰ"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4
  Scenario Outline: With the <Script> Script, Surah 109's Particle tags show their particles in <Script>
    Given I open "/en/109"
    When I choose the <Script> Script
    Then every Word card whose Word QUL gives no Root shows one Particle tag with its particle's text in <Script> and ↗
    And no Word card whose Word QUL gives a Root shows a Particle tag
    And the Word card at 109:6:1 shows a Particle tag for "<text>"

    Examples:
      | Script   | text   |
      | Uthmani  | لَكُمۡ  |
      | Indo-Pak | لَكُمْ  |

  @AC-4
  Scenario: In Flowing no Word shows its Particle tag
    Given I open "/en/1"
    When I switch the Ayah layout to Flowing
    Then no Particle tag is drawn on any Word of Surah 1

@issue-255
Feature: Known particles in the app, kept on the phone
  As on the website (#251), a reader marks a particle as a Known particle with
  Memorized? in the app's Particle dialog, or on the Known words page's
  Particles tab, after Roots, which lists every particle most frequent first
  in the reader's Script with its first meanings, a search by its Arabic or
  its meanings, and a Memorized? choice on every row. The page's head counts
  the Known Roots and the Known particles together. A Known particle is kept
  by its kind, Lemma or Spelling, and its text (ADR 0057), under
  "qwt-known-words" with the Known Roots, and sent nowhere. With Known words
  colour on, every Word card of a Known particle is green, as a Known Root's
  are; the app's Surah screen is Study only. The particle list is
  /data/v1/particles.json, kept on the phone once downloaded.

  How the Particles tab, its rows and the dialog's Memorized? look are checked
  by hand on the simulators, as the screens are.

  Background:
    Given the app is launched on a new device

  @AC-3
  Scenario: Memorized? in the Particle dialog marks its particle, kept by its kind and text, and unmarks it
    When I open the Particle dialog of the Particle tag at 1:5:1
    Then its Memorized? is off
    When I choose Memorized? in the Particle dialog
    Then the device keeps the Lemma particle "إِيَّا" as a Known particle
    When I close the app and open it again on the same device
    And I open the Particle dialog of the Particle tag at 1:5:3
    Then its Memorized? is on
    When I choose Memorized? in the Particle dialog again
    Then its Memorized? is off again
    And the device keeps no Known particle

  @AC-3
  Scenario: Marking a particle sends nothing anywhere
    Given I open the Particle dialog of the Particle tag at 109:6:1
    And every request the app makes is recorded
    When I choose Memorized? in the Particle dialog
    Then the app made no request
    And the device keeps the Spelling particle "لَكُمۡ" as a Known particle

  @AC-3
  Scenario Outline: The Particles tab in <Language> lists every particle most frequent first, in the <Script> Script
    When I open Known words in <Language> with the <Script> Script
    Then its head reads "0 of 1,642 Roots · 0 of 352 particles"
    And its Particles tab lists every particle of the particle list, most frequent first, each in its <Script> text with its first three meanings in <Language>, joined by " · "
    And no row of the Particles tab is memorized

    Examples:
      | Language | Script   |
      | English  | Uthmani  |
      | Urdu     | Indo-Pak |

  @AC-3
  Scenario Outline: The Particles tab finds particles by their Arabic, "<search>"
    When I open Known words in English with the Uthmani Script
    And I search the Particles tab for "<search>"
    Then the Particles tab lists "<found>"
    And the Particles tab does not list "<other>"

    Examples:
      | search | found  | other  |
      | إيا    | إِيَّا  | عَلَىٰ  |
      | على    | عَلَىٰ  | إِيَّا  |

  @AC-3
  Scenario: The Particles tab finds particles by their meanings
    When I open Known words in English with the Uthmani Script
    And I search the Particles tab for "UPON"
    Then the Particles tab lists "عَلَىٰ"
    And the Particles tab does not list "إِيَّا"

  @AC-3
  Scenario: A search no particle matches says so
    When I open Known words in English with the Uthmani Script
    And I search the Particles tab for "zzzz"
    Then the Particles tab lists no particle and says "No particle matches this search."

  @AC-3
  Scenario: Memorized? on rows marks particles, counts them in the head and shows in the Particle dialog
    Given I open Known words in English with the Uthmani Script
    When I choose Memorized? on the Particles tab's row of "إِيَّا"
    And I choose Memorized? on the Particles tab's row of "عَلَىٰ"
    Then its head reads "0 of 1,642 Roots · 2 of 352 particles"
    And the Particles tab's row of "إِيَّا" is memorized
    When I choose Memorized? again on the Particles tab's row of "عَلَىٰ"
    Then its head reads "0 of 1,642 Roots · 1 of 352 particles"
    When I open the Particle dialog of the Particle tag at 1:5:1
    Then its Memorized? is on

  @AC-3
  Scenario: With no connection, the Particles tab opens from the kept particle list and a particle is marked
    Given I open Known words in English with the Uthmani Script
    And the device goes offline
    When I close the app and open it again on the same device
    And I open the Known words page again, in English with the Uthmani Script
    And I choose Memorized? on the Particles tab's row of "إِيَّا"
    Then its head reads "0 of 1,642 Roots · 1 of 352 particles"

  @AC-4
  Scenario: With Known words colour on, the Word cards of a Known Lemma particle are tinted, at once, and no other
    Given I switch Known words colour on
    And I open Surah 1 in the Uthmani Script and English
    When I open the Particle dialog of the Particle tag at 1:5:1
    And I choose Memorized? in the Particle dialog
    Then the Word cards tinted are those whose particle is the Lemma "إِيَّا"

  @AC-4
  Scenario: With Known words colour on, the Word cards of a Known Spelling particle are tinted, and no other
    Given I open the Particle dialog of the Particle tag at 109:6:1
    And I choose Memorized? in the Particle dialog
    And I switch Known words colour on
    When I open Surah 109 in the Uthmani Script and English
    Then the Word cards tinted are those whose particle is the Spelling "لَكُمۡ"

  @AC-4
  Scenario: With Known words colour off, a Known particle's Word cards are not tinted
    Given I open the Particle dialog of the Particle tag at 1:5:1
    And I choose Memorized? in the Particle dialog
    When I open Surah 1 in the Uthmani Script and English
    Then no Word card of Surah 1 is tinted

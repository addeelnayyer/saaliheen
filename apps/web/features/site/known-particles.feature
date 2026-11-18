@issue-251
Feature: Known particles
  A reader marks the particles they have memorised (CONTEXT.md: Known words,
  Known particle) as they do Roots: with Memorized? in the Particle dialog's
  head, or on the Known words page's Particles tab, after Roots, which lists
  every particle most frequent first, searchable by its Arabic or its
  meanings, with a Memorized? choice on every row. The page's head counts the
  Known Roots and the Known particles together. A Known particle is kept by
  its kind, Lemma or Spelling, and its text (ADR 0057), so marking a Lemma
  particle covers every Word written with it. With Known words colour on,
  every Word of a Known particle is green, in Study and in Flowing, as the
  Words of a Known Root are, and a mark tints the open page at once.

  Each Word's particle, and every particle, is read from QUL's word root and
  word lemma databases and the Script sources, never typed. A Word card's
  tint is read as Known words colour's scenarios read it
  (known-words-colour.feature).

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- the Particle dialog

  @AC-1
  Scenario: Memorized? in the Particle dialog marks and unmarks its particle, and either survives a reload
    Given I open "/en/1"
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog for "إِيَّا" is open
    And the Particle dialog's Memorized? is off
    When I switch the Particle dialog's Memorized?
    Then the Particle dialog's Memorized? is on
    When I reload the page
    And I open the Particle tag on the Word card at 1:5:3
    Then the Particle dialog's Memorized? is on
    When I switch the Particle dialog's Memorized?
    And I reload the page
    And I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog's Memorized? is off

  @AC-1
  Scenario: Memorized? sits in the Particle dialog's head and keeps focus inside the dialog
    Given I open "/en/1"
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog's Memorized? is in its head, beside its particle
    When I press Tab 30 times
    Then focus stayed inside the Particle dialog after every press

  @AC-2
  Scenario: A Known particle is kept by its kind and text, and reaches the Account so
    Given I sign in to the Account as "known-particles@saaliheen.test" on the English test sign-in page
    And I open "/en/109"
    When I open the Particle tag on the Word card at 109:6:1
    And I switch the Particle dialog's Memorized?
    And I close the Particle dialog with Escape
    And I open "/en/1"
    And I open the Particle tag on the Word card at 1:5:1
    And I switch the Particle dialog's Memorized?
    Then the Account "known-particles@saaliheen.test" has these Known words, as the API answers:
      | kind     | text   | known |
      | spelling | لَكُمۡ  | true  |
      | lemma    | إِيَّا  | true  |

  # ---------------------------------------------------------------- the Known words page

  @AC-3
  Scenario Outline: The Known words page in <Language> has a Particles tab after Roots, listing every particle most frequent first
    Given I open the Known words page in <Language>
    Then the Known words page's "Roots" tab is selected
    And the Known words page's head reads "0 of 1,642 Roots · 0 of 352 particles"
    When I choose the Known words page's "Particles" tab
    Then the Known words page lists every particle, most frequent first, each with a Memorized? choice that is off
    And the Known words page's head reads "0 of 1,642 Roots · 0 of 352 particles"

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3
  Scenario Outline: The Particles tab finds particles by their Arabic, "<search>"
    Given I open the Known words page in English
    When I choose the Known words page's "Particles" tab
    And I search the Known words page for "<search>"
    Then the Known words page lists "<found>"
    And the Known words page does not list "<other>"

    Examples:
      | search | found  | other  |
      | إيا    | إِيَّا  | عَلَىٰ  |
      | على    | عَلَىٰ  | إِيَّا  |

  @AC-3
  Scenario: The Particles tab finds particles by their meanings
    Given I open the Known words page in English
    When I choose the Known words page's "Particles" tab
    And I search the Known words page for "upon"
    Then the Known words page lists "عَلَىٰ"
    And the Known words page does not list "إِيَّا"

  @AC-3 @AC-1
  Scenario: Marking particles on the Particles tab counts them, survives a reload and shows in the Particle dialog
    Given I open the Known words page in English
    When I choose the Known words page's "Particles" tab
    And I switch Memorized? for "إِيَّا" on the Known words page
    And I switch Memorized? for "عَلَىٰ" on the Known words page
    Then the Known words page's head reads "0 of 1,642 Roots · 2 of 352 particles"
    When I reload the page
    And I choose the Known words page's "Particles" tab
    Then the Known words page's head reads "0 of 1,642 Roots · 2 of 352 particles"
    And Memorized? for "إِيَّا" on the Known words page is on
    When I switch Memorized? for "عَلَىٰ" on the Known words page
    Then the Known words page's head reads "0 of 1,642 Roots · 1 of 352 particles"
    When I open "/en/1"
    And I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog's Memorized? is on

  # ---------------------------------------------------------------- Known words colour

  @AC-4
  Scenario: Marking a particle in the Particle dialog tints all its Words green at once, without drawing any Word again, and unmarking it takes the green away
    Given I open Surah 1 in English
    When I turn Known words colour on
    Then no Word card of Surah 1 is tinted
    When I watch Surah 1's Word cards for being drawn again
    And I open the Particle tag on the Word card at 1:5:1
    And I switch the Particle dialog's Memorized?
    And I close the Particle dialog with Escape
    Then the Word cards of Surah 1 whose particle is the Lemma "إِيَّا" are green, and no other Word card is tinted
    And no Word card was drawn again
    When I open the Particle tag on the Word card at 1:5:3
    And I switch the Particle dialog's Memorized?
    And I close the Particle dialog with Escape
    Then no Word card of Surah 1 is tinted

  @AC-4
  Scenario Outline: In Flowing, in <Language>, the Words of a Known particle are green and no other Word is tinted
    Given this browser knows the Lemma particle "عَلَىٰ"
    And I open Surah 1 in <Language>
    And I turn Known words colour on
    When I switch the Ayah layout to Flowing
    Then the Word cards of Surah 1 whose particle is the Lemma "عَلَىٰ" are green, and no other Word card is tinted

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4
  Scenario: The Words of a Known Spelling particle are green, and no other Word is tinted
    Given this browser knows the Spelling particle "لَكُمۡ"
    And I open Surah 109 in English
    When I turn Known words colour on
    Then the Word cards of Surah 109 whose particle is the Spelling "لَكُمۡ" are green, and no other Word card is tinted

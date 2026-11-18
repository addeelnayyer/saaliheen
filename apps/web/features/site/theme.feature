@AC-2-15
Feature: Light and dark themes follow the system setting
  With no theme chosen, a Surah page uses the design's light or dark colour
  tokens (src/app/globals.css `:root`: the clean, quranwbw.com-like redesign
  that replaced the Option B mockup's palette), as the system's colour scheme
  says.

  @AC-2-12
  Scenario: With the system set to light, a Surah page uses the design's light tokens
    Given the system colour scheme is light
    When I open Surah 1 in English
    Then the page's colour tokens are the design's:
      | token     | colour  |
      | paper     | #FFFFFF |
      | surface   | #FFFFFF |
      | ink       | #1C211E |
      | muted     | #6A726D |
      | line      | #ECEFEA |
      | accent    | #2F6A55 |
      | on-accent | #FFFFFF |
      | hi        | #E3EFE8 |
      | chip      | #EDF3EF |
      | madani    | #8A5A1C |
      | madani-bg | #F7EFE2 |
    And the page has the paper colour behind it and the ink colour for its text
    And I turn Phrase colours off
    And the Word card at 1:1:1 has the surface colour
    And Surah 1 in each Language is captured as "light" evidence on a desktop and a phone

  @AC-2-12
  Scenario: With the system set to dark, a Surah page uses the design's dark tokens
    Given the system colour scheme is dark
    When I open Surah 1 in English
    Then the page's colour tokens are the design's:
      | token     | colour  |
      | paper     | #111412 |
      | surface   | #111412 |
      | ink       | #E6EAE7 |
      | muted     | #9AA39E |
      | line      | #232926 |
      | accent    | #85C5A8 |
      | on-accent | #111412 |
      | hi        | #1E2F27 |
      | chip      | #1C2622 |
      | madani    | #DFB878 |
      | madani-bg | #2A2318 |
    And the page has the paper colour behind it and the ink colour for its text
    And I turn Phrase colours off
    And the Word card at 1:1:1 has the surface colour
    And Surah 1 in each Language is captured as "dark" evidence on a desktop and a phone

@AC-4-9
Feature: Saved reader settings apply before first paint
  Script, Ayah translation, theme, Arabic size and Meaning size are set on
  <html> as data attributes before the browser first paints, so nothing
  flashes and no text is drawn at the wrong size. They are already there at
  the moment the first content enters <body> and in the first animation frame.
  The Settings drawer draws the saved choices from the first frame it is
  opened in, its Ayah translation knob never sliding.

  @AC-4-8 @AC-17-34 @AC-17-37
  Scenario: Saved Indo-Pak, Dark, Ayah translation on and sizes apply before first paint, under a light system
    Given on an earlier visit to "/en/1" I chose, in order:
      | Indo-Pak             |
      | Dark                 |
      | Ayah translation     |
      | Arabic size larger   |
      | Meaning size smaller |
    And my system prefers a light colour scheme
    When I open "/ur/1" in a fresh browser with an empty cache that keeps those choices
    Then when the first content entered the page, <html> had data-script "indopak", data-theme "dark" and data-translation "on"
    And in the first animation frame, <html> had data-script "indopak", data-theme "dark" and data-translation "on"
    And when the first content entered the page, <html> had data-arabic-size "115" and data-meaning-size "85"
    And in the first animation frame, <html> had data-arabic-size "115" and data-meaning-size "85"
    And the Word card at 1:1:1 shows its Indo-Pak text
    And the Urdu Ayah translation of 1:1 is shown
    And the page is drawn on the dark paper
    And I save a screenshot "AC-8-surah-1-ur-saved-settings-dark-desktop"
    And when I open the Settings drawer, from the first frame it is drawn in it shows Indo-Pak and Dark selected, the Ayah translation knob on without sliding, Arabic size 115% and Meaning size 85%

  @AC-4-8 @AC-17-34 @AC-17-37
  Scenario: Saved Uthmani, Light, Ayah translation off and default sizes apply before first paint, under a dark system
    Given on an earlier visit to "/en/1" I chose, in order:
      | Indo-Pak            |
      | Uthmani             |
      | Dark                |
      | Light               |
      | Ayah translation    |
      | Ayah translation    |
      | Arabic size larger  |
      | Arabic size smaller |
    And my system prefers a dark colour scheme
    When I open "/en/1" in a fresh browser with an empty cache that keeps those choices
    Then when the first content entered the page, <html> had data-script "uthmani", data-theme "light" and data-translation "off" or none
    And in the first animation frame, <html> had data-script "uthmani", data-theme "light" and data-translation "off" or none
    And when the first content entered the page, <html> had data-arabic-size "100" and data-meaning-size "100"
    And in the first animation frame, <html> had data-arabic-size "100" and data-meaning-size "100"
    And the Word card at 1:1:1 shows its Uthmani text
    And the English Ayah translation of 1:1 is not shown
    And the page is drawn on the light paper
    And when I open the Settings drawer, from the first frame it is drawn in it shows Uthmani and Light selected, the Ayah translation knob off without sliding, Arabic size 100% and Meaning size 100%

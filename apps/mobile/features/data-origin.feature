Feature: The app reads only /data/v1 and /api/v1
  The app has no private back channel (#60 § Step 5): everything it reads
  comes from its origin's versioned dataset under /data/v1, or its API under
  /api/v1. Every request the app makes, to any host, is recorded while a
  reader goes through Quran Analysis.

  @AC-5
  Scenario: Reading the Surah index, Surahs in both Scripts and Languages and a Root dialog asks only /data/v1 and /api/v1
    Given the app is launched on a new device
    And every request the app makes is recorded
    When I open the Surah index
    And I open Surah 18 in each Script and Language with the Ayah translation on
    And I open Surah 1 in the Uthmani Script and Urdu
    And I open the Root tag on the Word card at 1:1:3
    And I set Arabic size to 130% and Meaning size to 115%
    Then every request the app made went to its origin, under /data/v1/ or /api/v1/
    And its origin received the requests for /data/v1/surahs.json, /data/v1/surahs/18.json, /data/v1/surahs/1.json and /data/v1/roots/1356.json

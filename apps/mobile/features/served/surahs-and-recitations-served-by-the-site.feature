@issue-172
Feature: The app reads its Surahs and Recitations from the site, served from Neon
  The Quran text, Word meanings, Ayah translations, the Surah index and
  Recitation timings live in Neon (#172), and the website serves /data/v1
  from it: /data/v1/surahs.json, /data/v1/surahs/<n>.json,
  /data/v1/recitations/<n>.json and /data/v1/manifest.json. The app is
  launched with the site as its data origin, as a build is given
  EXPO_PUBLIC_DATA_ORIGIN: the website's production build, served on PORT
  against the run's own Postgres with the Quran imported into it. What the app
  shows is what the committed dataset showed before the move: expected names,
  Words, Word meanings, Ayah translations and timings are read from git, from
  apps/web/data/generated/ as committed at 5298a72, never typed.

  Background:
    Given the app is launched on a new device, with the site as its data origin

  @issue-172 @AC-9
  Scenario: The Surah index lists all 114 Surahs as the committed Surah index did
    When I open the Surah index
    Then it lists Surahs 1 to 114 in order, each with its Arabic name, Latin name, where it was revealed and its Ayah count as the committed Surah index gave them

  @issue-172 @AC-9
  Scenario Outline: Surah <Surah> opens in the <Script> Script and <Language> as its committed Surah file showed it
    When I open Surah <Surah> in the <Script> Script and <Language> with the Ayah translation on
    Then it shows its Ayahs from 1 to its Ayah count in the committed Surah index, in order
    And each Ayah shows a Word card for each of its Words, in order, with the Word's <Script> text and its <Language> Word meaning, as the committed Surah file gave them
    And each Ayah shows its <Language> Ayah translation as the committed Surah file gave it

    Examples:
      | Surah | Script   | Language |
      | 1     | Uthmani  | Urdu     |
      | 1     | Uthmani  | English  |
      | 1     | Indo-Pak | Urdu     |
      | 1     | Indo-Pak | English  |
      | 2     | Uthmani  | Urdu     |
      | 2     | Uthmani  | English  |
      | 2     | Indo-Pak | Urdu     |
      | 2     | Indo-Pak | English  |

  @issue-172 @AC-9
  Scenario Outline: The Word card at 2:255:3 shows its <Script> text and its <Language> Word meaning as the committed Surah file did
    When I open Surah 2 in the <Script> Script and <Language> with the Ayah translation on
    Then the Word card at 2:255:3 shows the Word's <Script> text and its <Language> Word meaning, as the committed Surah file gave them

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

  @issue-172 @AC-9
  Scenario: Surah 1, opened once, is kept by the hash the site's manifest gives it and opens again in airplane mode
    When I open Surah 1 in the Uthmani Script and English with the Ayah translation on
    Then the device keeps Surah 1 with the hash that /data/v1/manifest.json gives Surah 1
    When the app is closed and launched again on the same device, online
    Then the app read /data/v1/manifest.json and downloaded no Surah file again
    When the device goes into airplane mode
    Then Surah 1 opens in the Uthmani Script and English with the Ayah translation on just as it showed online

  @issue-172 @AC-9
  Scenario: The Recitation of Al-Fatihah plays with the committed Recitation file's timings
    Given every request the app makes is recorded
    And I open Surah 1 in the Uthmani Script and English with the Ayah translation on
    When I press the play control with Ayah 1:1 at the top of the screen
    Then the app read Surah 1's Recitation from the site's /data/v1/recitations/1.json
    And the audio playing is the Surah's audio at the address the committed Recitation file gives, from the start of Ayah 1:1
    And as the Recitation reaches the start of each of Surah 1's timings in turn, Ayah by Ayah, that timing's Word is the Recited Word and its Ayah is marked faintly

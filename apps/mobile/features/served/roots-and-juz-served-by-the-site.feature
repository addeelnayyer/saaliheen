@issue-173
Feature: The app reads its Roots and Juz lists from the site, served from Neon
  The Roots, with their Lemmas and Spellings, and each Script's Juz list live
  in Neon (#173), and the website serves /data/v1/roots/<id>.json and
  /data/v1/juz.json from it. The app is launched with the site as its data
  origin: the website's production build, served on PORT against the run's
  own Postgres with the Quran imported into it. What the app shows is what
  the committed dataset showed before the move: expected Roots, Lemmas,
  Spellings, meanings and Juz are read from git, from apps/web/data/generated/
  as committed at 59abfe6, never typed.

  Background:
    Given the app is launched on a new device, with the site as its data origin

  @AC-4
  Scenario Outline: The Root dialog for ر ح م in <Language> with the <Script> Script is its committed Root file
    Given every request the app makes is recorded
    And I open Surah 1 in the <Script> Script and <Language>
    When I open the Root tag on the Word card at 1:1:3
    Then the app read the Root from the site's /data/v1/roots/1356.json
    And the Root dialog shows "ر ح م", its transliteration, its counts and its Lemmas, each with its count and its <Language> meaning, as the committed Root file gave them
    And each Lemma lists its Spellings in their <Script> text, with their <Language> meanings and Word locations, as the committed Root file gave them

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Indo-Pak | English  |

  @AC-4
  Scenario: Each Root tag of Surah 1 opens the Root dialog its committed Root file gave
    Given I open Surah 1 in the Uthmani Script and English
    When I open the Root tag on every Word card of Surah 1 that has one
    Then each Root dialog shows the letters, transliteration, counts and Lemmas its committed Root file gave

  @AC-4
  Scenario Outline: The Juz tab lists the <Script> Juz as the committed Juz file did
    When I open the Juz tab in the <Script> Script
    Then it lists Juz 1 to 30 in order, each with its <Script> name, first Ayah and last Ayah as the committed Juz file gave them

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

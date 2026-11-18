@issue-255
Feature: Particles in the app, offline
  As on the website (#249), a Word card with no Root carries a Particle tag in
  the reader's Script, and tapping it opens the Particle dialog: the particle,
  its occurrence count and its Spellings, most frequent first, each in the
  reader's Script only, with its meaning in the Language and its Word
  locations in Quran order. The dialog is read from
  /data/v1/particles/<number>.json. It opens on the tapped Word (#326),
  marking the Spelling that holds its Word location and that Word location.

  Offline, as Surahs are (ADR 0025): when the app keeps a Surah, the first
  time it is opened or when a deploy changes its hash, it keeps the particle
  file of every particle its Words name beside it, so each of its Particle tags
  opens with no connection. A Surah kept before this release keeps opening as
  it did; at the next update check the app keeps the particle files it lacks,
  and a Surah kept before its file carried particles gets them as soon as the
  deploy that adds them changes its hash. Airplane mode is a device on which
  every request fails. Expected values are read from the particle files the
  dataset builder makes of the committed sources, never typed. How the tag and
  the dialog look is checked by hand on the simulators, as the screens are.

  Background:
    Given the app is launched on a new device

  @AC-2
  Scenario Outline: The Particle dialog for إِيَّا in <Language> with the <Script> Script
    Given I open Surah 1 in the <Script> Script and <Language>
    Then the Word card at 1:5:1 has a Particle tag showing its particle in <Script>
    When I open the Particle tag on the Word card at 1:5:1
    Then the Particle dialog for "إِيَّا" is open
    And it shows the particle in <Script> and its 24 occurrences
    And it lists its 9 Spellings, most frequent first, each in its <Script> text only, with its meaning in <Language> and its Word locations in Quran order

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

  @AC-2 @issue-326
  Scenario: A Spelling particle's dialog lists its one Spelling
    Given I open Surah 109 in the Uthmani Script and English
    When I open the Particle tag on the Word card at 109:6:1
    Then the Particle dialog for "لَكُمۡ" is open
    And it shows the particle in Uthmani and its 163 occurrences
    And it lists its 1 Spellings, most frequent first, each in its Uthmani text only, with its meaning in English and its Word locations in Quran order
    And it marks the Spelling "لَكُمۡ", which holds 109:6:1, and the Word location 109:6:1

  @issue-326
  Scenario: The Particle dialog opens on the tapped Word's Spelling, مِن at 2:22:9
    Given I open Surah 2 in the Uthmani Script and English
    When I open the Particle tag on the Word card at 2:22:9
    Then the Particle dialog for "مِن" is open
    And it marks the Spelling "مِنَ", which holds 2:22:9, and the Word location 2:22:9

  @issue-326
  Scenario: With no Word, the Particle dialog marks nothing
    Given I open Surah 2 in the Uthmani Script and English
    When I open the Particle dialog of the Particle tag on the Word card at 2:22:9 without naming its Word
    Then the Particle dialog for "مِن" is open
    And it marks nothing

  @AC-2
  Scenario: Every Word card of Surah 2 with no Root has its particle's Particle tag, and no other Word card has one
    Given I open Surah 2 in the Uthmani Script and English
    Then every Word card with no Root has a Particle tag naming the particle its Surah file gives it
    And no Word card with a Root has a Particle tag

  @AC-1
  Scenario: Surah 1, opened once, opens every Particle dialog of its Word cards in airplane mode
    Given I open Surah 1 in the Uthmani Script and English
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    And I open Surah 1 again in the Uthmani Script and English
    Then each Particle tag of Surah 1 opens its Particle dialog just as /data/v1 gives it
    And no request reached the origin since the device went into airplane mode

  @AC-1
  Scenario: Surah 1 opened once keeps its particle files and no other
    When I open Surah 1 in the Uthmani Script and English
    Then the device keeps the particle file of each particle Surah 1's Words name, and no other particle file

  @AC-1
  Scenario: The Particle dialog of a Surah never opened says, in airplane mode, that it cannot be read
    Given I open Surah 1 in the Uthmani Script and English
    When the device goes into airplane mode
    Then the Particle dialog of the particle at 109:6:1 cannot be read

  @AC-5
  Scenario: A Surah kept before its file carried particles opens as before, and gets them with the deploy that adds them
    Given /data/v1 is as it was deployed before Surah files carried particles
    And I open Surah 1 in the Uthmani Script and English
    Then no Word card of Surah 1 has a Particle tag
    When the deploy that adds particles to Surah files changes Surah 1's hash in /data/v1/manifest.json
    And the app is closed and launched again on the same device, online
    And the device goes into airplane mode
    And I open Surah 1 again in the Uthmani Script and English
    Then each Particle tag of Surah 1 opens its Particle dialog just as /data/v1 gives it

  @AC-5
  Scenario: A Surah kept with particles by an app before this release gets its particle files at the next update check
    Given the device keeps Surah 1's file, as /data/v1 serves it, with no particle file, as the app before this release kept it
    When the app is closed and launched again on the same device, online
    Then the app read /data/v1/manifest.json and did not download /data/v1/surahs/1.json again
    When the device goes into airplane mode
    And I open Surah 1 in the Uthmani Script and English
    Then each Particle tag of Surah 1 opens its Particle dialog just as /data/v1 gives it

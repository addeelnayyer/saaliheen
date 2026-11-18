@issue-238
Feature: A downloaded Surah keeps its Tafsir offline
  A Surah downloaded in the app keeps its Tafsir in the reader's Language
  (ADR 0055): opening a Surah online, the app keeps the Tafsir that
  /api/v1/tafsir/{surah}?lang= answers as a file beside the Surah, one for
  each Language it was opened in, and with no connection shows the kept one.
  Online, the app's update check asks again for each Tafsir it keeps, so a
  reloaded Tafsir reaches a kept Surah the reader has not opened since. A
  Language whose Tafsir is not kept, and a kept Tafsir file that is missing
  or cut short, leave the Surah opening without Tafsir. The origin answers the
  Tafsir as in tafsir.feature (features/support.ts), and the release switch
  is on unless a scenario says otherwise. Airplane mode is a device on which
  every request fails; the app's launch checks the manifest.

  @AC-1
  Scenario Outline: Surah 108, opened once in <Language>, shows its Tafsir in <Language> in airplane mode
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and <Language>
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    And I open Surah 108 in the Uthmani Script and <Language> again
    Then directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in <Language> as /api/v1/tafsir/108 answers it, with its credit line
    And no request reached the origin since the device went into airplane mode

    Examples:
      | Language |
      | English  |
      | Urdu     |

  @AC-2
  Scenario: Switching Language online keeps the new Language's Tafsir too
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When I switch Language to Urdu, online
    Then the app asked /api/v1/tafsir/108 for Surah 108's Tafsir in "en" and then in "ur"
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    And I open Surah 108 in the Uthmani Script and Urdu
    Then directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in Urdu as /api/v1/tafsir/108 answers it, with its credit line
    When I switch Language to English
    Then directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in English as /api/v1/tafsir/108 answers it, with its credit line

  @AC-3
  Scenario: Switching, in airplane mode, to a Language whose Tafsir is not kept shows Surah 108 without Tafsir
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When the device goes into airplane mode
    And I switch Language to Urdu
    Then it shows every Ayah of Surah 108 from its /data/v1 Surah file
    And the Surah shows no Tafsir at all

  @AC-4
  Scenario Outline: A kept Tafsir file that is <Damage> still opens Surah 108, and the next online opening keeps it again
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    And the device's kept Tafsir file of Surah 108 in English is <Damage>
    When the device goes into airplane mode
    And I open Surah 108 in the Uthmani Script and English again
    Then it shows every Ayah of Surah 108 from its /data/v1 Surah file
    And the Surah shows no Tafsir at all
    When the device comes out of airplane mode
    And I open Surah 108 in the Uthmani Script and English, online
    And the device goes back into airplane mode
    And I open Surah 108 in the Uthmani Script and English once more
    Then directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in English as /api/v1/tafsir/108 answers it, with its credit line

    Examples:
      | Damage       |
      | missing      |
      | cut short    |
      | no Tafsir    |

  @AC-4
  Scenario: When the endpoint cannot read the Tafsir, a kept Surah 108 shows the Tafsir it kept, and keeps it
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    And /api/v1/tafsir answers 503
    When I open Surah 108 in the Uthmani Script and English again
    Then directly after Ayah 108:3 the Surah shows Surah 108's Tafsir in English as /api/v1/tafsir/108 answers it, with its credit line
    When the device goes into airplane mode
    And I open Surah 108 in the Uthmani Script and English once more
    Then the Surah still shows, directly after Ayah 108:3, the English Tafsir it kept before the 503

  @AC-5
  Scenario: A reloaded Tafsir reaches the kept Surahs at the next update check, asking only for the Tafsir kept
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    And I open Surah 108 in the Uthmani Script and English, then in Urdu
    And the Tafsir is reloaded with new text for Surah 2's entry 2:3–4 in English and Surah 108's entry 108:2–3 in Urdu
    When the app is closed and launched again on the same device, online
    Then the update check asked /api/v1/tafsir/2 in "en" and /api/v1/tafsir/108 in "en" and in "ur", and for no other Tafsir
    When the device goes into airplane mode
    And I open Surah 2 in the Uthmani Script and English again
    Then directly after Ayah 2:5 the Surah shows the reloaded English Tafsir of Surah 2, with its credit line
    When I open Surah 108 in the Uthmani Script and Urdu
    Then directly after Ayah 108:3 the Surah shows the reloaded Urdu Tafsir of Surah 108, with its credit line

  @AC-5
  Scenario: A launch with the Tafsir held back checks the manifest and never asks for the Tafsir it keeps
    Given the app is launched on a new device
    And I open Surah 108 in the Uthmani Script and English
    When the app is closed and launched again on the same device, online, with the Tafsir switch as app.json sets it
    Then the app read /data/v1/manifest.json and never asked /api/v1/tafsir

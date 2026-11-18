@issue-73
Feature: Offline Surahs
  A Surah downloads the first time a reader opens it and then opens with no
  connection, from the device. A skeleton of its Ayahs shows while it
  downloads. When online, the app reads /data/v1/manifest.json and downloads
  again only the Surahs whose hash changed, so an Admin's Passage edit reaches
  offline readers. Opening a Surah not yet downloaded with no connection says
  why it is not there, and an app below the manifest's minAppVersion asks to
  be updated. Airplane mode is a device on which every request fails; the
  app's launch checks the manifest. Root dialogs and Recitations offline are
  not part of this. How the screens look is checked by hand on a simulator.

  @AC-1
  Scenario Outline: Surah 18, opened once, opens again in airplane mode in the <Script> Script and <Language>
    Given the app is launched on a new device
    And I open the Surah index
    And I open Surah 18 in the Uthmani Script and Urdu
    And Surah 18 in the <Script> Script and <Language> with the Ayah translation on is noted as it shows online
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    Then the Surah index lists all 114 Surahs as /data/v1/surahs.json gives them
    And Surah 18 opens in the <Script> Script and <Language> with the Ayah translation on just as it shows online
    And no request reached the origin since the device went into airplane mode

    Examples:
      | Script   | Language |
      | Uthmani  | Urdu     |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |
      | Indo-Pak | English  |

  @AC-2
  Scenario: A deploy that changes Surah 18's hash refreshes Surah 18, and only Surah 18, once the app is online
    Given the app is launched on a new device
    And I open Surah 1 and Surah 18 in the Uthmani Script and English
    And a deploy revises the English title of Surah 18's first Passage, which changes Surah 18's hash in /data/v1/manifest.json and no other Surah's
    When the app is closed and launched again on the same device, online
    Then the app read /data/v1/manifest.json and downloaded /data/v1/surahs/18.json again, and not /data/v1/surahs/1.json
    When the device goes into airplane mode
    And I open Surah 18 in the Uthmani Script and English
    Then the Passage heading above Ayah 1 shows the revised English title
    And Surah 1 opens in the Uthmani Script and English as it did before the deploy

  @AC-2
  Scenario: Surahs whose hash did not change are not downloaded again
    Given the app is launched on a new device
    And I open Surah 1 and Surah 18 in the Uthmani Script and English
    When the app is closed and launched again on the same device, online
    And I open Surah 1 and Surah 18 again in the Uthmani Script and English
    Then the app read /data/v1/manifest.json and downloaded no Surah file again

  @AC-3
  Scenario Outline: Opening Surah 18 in airplane mode before it was ever downloaded says why it is not there, in <Language>
    Given the app is launched on a new device
    And I open the Surah index
    And I open Surah 1 in the Uthmani Script and English
    When the device goes into airplane mode
    And I open Surah 18 in the Uthmani Script and <Language>
    Then the Surah screen shows no Ayahs and says, in <Language>, that Surah 18 is not downloaded yet and needs a connection

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-4
  Scenario Outline: An app at version <App version>, with the manifest's minAppVersion at <Minimum>, <Prompt> the update prompt
    Given /data/v1/manifest.json gives minAppVersion <Minimum>
    When the app at version <App version> is launched on a new device, online
    Then the app <Prompt> the update prompt

    Examples:
      | App version | Minimum | Prompt        |
      | 0.1.0       | 1.0.0   | shows         |
      | 0.9.9       | 1.0.0   | shows         |
      | 1.9.0       | 1.10.0  | shows         |
      | 1.0.0       | 1.0.0   | does not show |
      | 1.10.0      | 1.9.0   | does not show |
      | 2.0.0       | 1.0.0   | does not show |

  @AC-4
  Scenario: The app at the version app.json ships is supported by the dataset as it is published
    Given /data/v1/manifest.json gives minAppVersion as the published dataset sets it
    When the app at the version app.json ships is launched on a new device, online
    Then the app does not show the update prompt

  @AC-6
  Scenario: A skeleton of Surah 18's Ayahs shows while Surah 18 downloads
    Given the app is launched on a new device
    And I open the Surah index
    And the origin holds back its answer to /data/v1/surahs/18.json
    When I open Surah 18 in the Uthmani Script and English
    Then while it downloads, its screen shows Surah 18's Arabic and Latin names over a skeleton of Ayahs 1 to 110, as /data/v1/surahs.json gives them
    When its download finishes
    Then Surah 18 shows its Ayahs from 1 to 110 in place of the skeleton

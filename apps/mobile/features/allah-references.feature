@issue-151
Feature: Allah references in the app
  The app marks the same Allah references as the website (#137): opening a
  Surah, its data layer reads that Surah's Allah references from
  GET /api/v1/allah-references/{surah} (ADR 0028), which answers
  { surah, version, locations }, and marks the Word cards at those Word
  locations; the Word card screen draws a marked Word's Arabic in Allah
  reference colour. The app keeps a Surah's Allah references with the Surah
  for offline reading (ADR 0025) and takes a new answer when the endpoint's
  version differs from the one it kept: the manifest is built at deploy time,
  so it does not move when an Admin corrects a Surah's Allah references. An
  endpoint that cannot read them answers 503, which is never "none": the app
  keeps what it had. The Allah reference colour switch is on on a new device,
  kept on the device, and never sent anywhere.

  The origin (features/support.ts) answers /api/v1/allah-references/{surah} as
  the website does after the owner's seed: each Surah's Word locations from
  the owner's list (apps/web/data/allah-references.json) in Quran order, at
  version 1. A scenario can write an Admin's Allah reference revision, which
  moves that Surah one version on, or make the endpoint answer 503. How the
  gold and the switch look on screen is checked by hand.

  # ---------------------------------------------------------------- AC-1: the data layer gets a Surah's Allah references and marks those Words

  @AC-1 @AC-7
  Scenario Outline: Opening Surah <Surah> in the <Script> Script and <Language> marks exactly the Words /api/v1/allah-references/<Surah> answers
    Given the app is launched on a new device
    When I open Surah <Surah> in the <Script> Script and <Language>
    Then the app asked /api/v1/allah-references/<Surah> for Surah <Surah>'s Allah references
    And the Word cards at the Word locations /api/v1/allah-references/<Surah> answers are marked as Allah references, and no other Word card is
    And every Word card shows its <Script> text, its <Language> Word meaning and its Root tag as /data/v1/surahs/<Surah>.json gives them

    Examples:
      | Surah | Script   | Language |
      | 1     | Uthmani  | English  |
      | 1     | Indo-Pak | Urdu     |
      | 112   | Uthmani  | Urdu     |
      | 2     | Indo-Pak | English  |

  @AC-1
  Scenario: The marks follow the endpoint's answer, not the owner's list
    Given the app is launched on a new device
    And an Admin's Allah reference revision of Surah 1 has added 1:2:1 and removed 1:1:2, moving it to version 2
    When I open Surah 1 in the Uthmani Script and English
    Then the Word card at 1:2:1 is marked as an Allah reference and the Word card at 1:1:2 is not

  @AC-1
  Scenario: When the endpoint cannot read the Allah references, Surah 1 still opens, unmarked, and the next opening marks them
    Given the app is launched on a new device
    And /api/v1/allah-references answers 503
    When I open Surah 1 in the Uthmani Script and English
    Then Surah 1 shows all its Ayahs as /data/v1/surahs/1.json gives them, and no Word card is marked as an Allah reference
    When /api/v1/allah-references answers again
    And I open Surah 1 in the Uthmani Script and English again
    Then the Word cards at the Word locations /api/v1/allah-references/1 answers are marked as Allah references, and no other Word card is

  # ---------------------------------------------------------------- AC-3: the gold stays on the Recited Word

  @AC-3
  Scenario: The Recited Word keeps its mark when it is an Allah reference
    Given the app is launched on a new device
    When I open Surah 1 in the Uthmani Script and English
    And I press the play control with Ayah 1:1 at the top of the screen
    And the Recitation reaches the start of the first Allah reference the Reciter says in Ayah 1:1
    Then the Recited Word is that Allah reference
    And its Word card is marked as an Allah reference

  # ---------------------------------------------------------------- AC-4: kept for offline reading

  @AC-4
  Scenario Outline: Surah 1, opened once, shows its Allah references in airplane mode in the <Script> Script and <Language>
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    And I open Surah 1 in the <Script> Script and <Language>
    Then the Word cards at the Word locations /api/v1/allah-references/1 answers are marked as Allah references, and no other Word card is
    And no request reached the origin since the device went into airplane mode

    Examples:
      | Script   | Language |
      | Uthmani  | English  |
      | Indo-Pak | Urdu     |

  @AC-4
  Scenario: A kept Surah keeps its Allah references while the endpoint cannot read them
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    And /api/v1/allah-references answers 503
    When the app is closed and launched again on the same device, online
    And I open Surah 1 in the Uthmani Script and English again
    Then the Word cards at the Word locations /api/v1/allah-references/1 answered before are marked as Allah references, and no other Word card is

  # ---------------------------------------------------------------- AC-5: a newer version reaches a kept Surah

  @AC-5 @AC-7
  Scenario: A new version of a kept Surah's Allah references reaches the app, which keeps it for offline reading
    Given the app is launched on a new device
    And I open Surah 1 in the Uthmani Script and English
    And an Admin's Allah reference revision of Surah 1 has added 1:2:1 and removed 1:1:2, moving it to version 2
    When the app is closed and launched again on the same device, online
    And I open Surah 1 in the Uthmani Script and English again
    Then the Word card at 1:2:1 is marked as an Allah reference and the Word card at 1:1:2 is not
    And the app did not download /data/v1/surahs/1.json again
    When the device goes into airplane mode
    And the app is closed and launched again on the same device
    And I open Surah 1 in the Uthmani Script and English in airplane mode
    Then the Word card at 1:2:1 is still marked as an Allah reference and the Word card at 1:1:2 still is not

  # ---------------------------------------------------------------- AC-6: the Allah reference colour switch, kept on the device

  @AC-6 @AC-7
  Scenario: A new device has the Allah reference colour switch on
    Given the app is launched on a new device
    Then the Allah reference colour switch is on

  @AC-6 @AC-7
  Scenario: Switched off, the switch stays off after the app is closed and opened again
    Given the app is launched on a new device
    When I switch the Allah reference colour off
    And I close the app and open it again on the same device
    Then the Allah reference colour switch is off

  @AC-6 @AC-7
  Scenario: Switched off and on again, the switch stays on after the app is closed and opened again
    Given the app is launched on a new device
    And I switch the Allah reference colour off
    And I switch the Allah reference colour on
    When I close the app and open it again on the same device
    Then the Allah reference colour switch is on

  @AC-6
  Scenario: Each device keeps its own switch
    Given the app is launched on a new device
    When I switch the Allah reference colour off
    And the app is launched on a second, new device
    Then on the second device the Allah reference colour switch is on
    When I close the app and open it again on the first device
    Then the Allah reference colour switch is off

  @AC-6
  Scenario Outline: A saved switch of "<value>" reads as on
    Given the app is launched on a new device
    And I switch the Allah reference colour off
    And every value the app saved on this device was since changed to "<value>"
    When I close the app and open it again on the same device
    Then the Allah reference colour switch is on

    Examples:
      | value |
      |       |
      | on    |
      | OFF   |
      | false |

  @AC-6
  Scenario: Switching the Allah reference colour sends nothing anywhere
    Given the app is launched on a new device
    And every request the app makes is recorded
    When I switch the Allah reference colour off
    And I switch the Allah reference colour on
    Then the app made no request

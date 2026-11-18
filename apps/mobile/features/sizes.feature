Feature: Arabic size and Meaning size
  As on the website, Arabic size scales the Quranic text of Words and Meaning
  size the Word meanings and Ayah translations, each over five steps from 85%
  to 150%, starting at 100%, with Reset sizes setting both back to 100%. Both
  are kept per device: they survive the app being closed and opened again,
  another device keeps its own, and they are never sent anywhere. What each
  size scales on screen is checked by hand on iOS and Android simulators.

  Background:
    Given the app is launched on a new device

  @AC-3 @AC-10
  Scenario: A new device starts at 100% for both sizes
    Then Arabic size shows 100% and Meaning size shows 100%

  @AC-3 @AC-10
  Scenario Outline: <Size> steps from 85% to 150% and stops at both ends, leaving <Other> alone
    When I press <Size>'s Larger button until it is disabled
    Then <Size> went through 115%, 130% and 150%, and shows 150%
    And <Size>'s Larger button is disabled and its Smaller button is not
    When I press <Size>'s Smaller button until it is disabled
    Then <Size> went through 130%, 115%, 100% and 85%, and shows 85%
    And <Size>'s Smaller button is disabled and its Larger button is not
    And <Other> shows 100%

    Examples:
      | Size         | Other        |
      | Arabic size  | Meaning size |
      | Meaning size | Arabic size  |

  @AC-3 @AC-10
  Scenario: Reset sizes sets both sizes back to 100%
    When I set Arabic size to 150% and Meaning size to 85%
    And I reset the sizes
    Then Arabic size shows 100% and Meaning size shows 100%

  @AC-4
  Scenario: Sizes are kept on the device after the app is closed and opened again
    When I set Arabic size to 130% and Meaning size to 115%
    And I close the app and open it again on the same device
    Then Arabic size shows 130% and Meaning size shows 115%

  @AC-4
  Scenario: Each device keeps its own sizes
    When I set Arabic size to 150% and Meaning size to 85%
    And the app is launched on a second, new device
    Then on the second device Arabic size shows 100% and Meaning size shows 100%
    When on the second device I set Meaning size to 130%
    And I close the app and open it again on the first device
    Then Arabic size shows 150% and Meaning size shows 85%

  @AC-4
  Scenario Outline: A saved size of "<value>" reads as 100%
    Given I set Arabic size to 130% and Meaning size to 115%
    And every value the app saved on this device was since changed to "<value>"
    When I close the app and open it again on the same device
    Then Arabic size shows 100% and Meaning size shows 100%

    Examples:
      | value |
      |       |
      | huge  |
      | 120   |
      | 1000  |

  @AC-4 @AC-5
  Scenario: Choosing sizes sends nothing anywhere
    Given every request the app makes is recorded
    When I set Arabic size to 130% and Meaning size to 115%
    And I reset the sizes
    Then the app made no request

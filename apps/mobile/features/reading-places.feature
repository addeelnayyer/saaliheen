@issue-74
Feature: Reading places in the app
  The app keeps the same Reading places as the website, on the device, by the
  shared Reading places rules (@saaliheen/reading-places): one per Surah, the
  ten newest, newest first. Opening a Surah from the Surah index, or
  continuing its Reading place, opens it at that Reading place and brings it
  to the top; scrolling moves it to the Ayah at the top of the screen; reading
  in an eleventh Surah drops the Reading place read longest ago. A look-up
  (following a Word location from a Root dialog) is not reading: it leaves the
  Reading places, and their order, as they were. Reading places stay on the
  device and are never sent anywhere. How the Surah index shows them is
  checked by hand on a simulator.

  Background:
    Given the app is launched on a new device

  # ---------------------------------------------------------------- AC-1: the website's rules

  @AC-1
  Scenario: Reading 18:1–40 then 2:255 offers Surah 2 at Ayah 255 above Surah 18 at Ayah 40
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:255 is at the top of the screen
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 255  |
      | 18    | 40   |

  @AC-1
  Scenario: Returning to Surah 18 opens it at 18:40, and reading to 18:60 moves its Reading place there and to the top, without a duplicate
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open Surah 18 from the Surah index
    Then the Surah 18 screen opens with Ayah 18:40 at the top
    When I scroll until Ayah 18:60 is at the top of the screen
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 60   |
      | 2     | 255  |

  @AC-1
  Scenario: Reading another Surah leaves the first Surah's Reading place where it was
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:45 is at the top of the screen
    And I open Surah 19 from the Surah index
    Then the Surah 19 screen opens with Ayah 19:1 at the top
    When I open Surah 18 from the Surah index again
    Then the Surah 18 screen opens with Ayah 18:45 at the top
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 45   |
      | 19    | 1    |

  @AC-1
  Scenario: Reading in an eleventh Surah drops the oldest Reading place
    When I open Surahs 105, 106, 107, 108, 109, 110, 111, 112, 113 and 114 from the Surah index, in that order
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 114   | 1    |
      | 113   | 1    |
      | 112   | 1    |
      | 111   | 1    |
      | 110   | 1    |
      | 109   | 1    |
      | 108   | 1    |
      | 107   | 1    |
      | 106   | 1    |
      | 105   | 1    |
    When I open Surah 1 from the Surah index
    Then the Surah index now offers these Reading places, newest first:
      | Surah | Ayah |
      | 1     | 1    |
      | 114   | 1    |
      | 113   | 1    |
      | 112   | 1    |
      | 111   | 1    |
      | 110   | 1    |
      | 109   | 1    |
      | 108   | 1    |
      | 107   | 1    |
      | 106   | 1    |

  @AC-1
  Scenario: The Reading place dropped is the one read longest ago, not the one listed first
    When I open Surahs 105, 106, 107, 108, 109, 110, 111, 112, 113 and 114 from the Surah index, in that order
    And I open Surah 105 from the Surah index
    And I open Surah 1 from the Surah index
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 1     | 1    |
      | 105   | 1    |
      | 114   | 1    |
      | 113   | 1    |
      | 112   | 1    |
      | 111   | 1    |
      | 110   | 1    |
      | 109   | 1    |
      | 108   | 1    |
      | 107   | 1    |

  @AC-1
  Scenario: A look-up in another Surah leaves the Reading places, and their order, unchanged
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:45 is at the top of the screen
    And I open Surah 19 from the Surah index
    And I follow the Word location 18:10:3 in a Root dialog
    Then the Surah 18 screen opens with Ayah 18:10 at the top
    When I follow the Word location 2:30:1 in a Root dialog
    Then the Surah 2 screen opens with Ayah 2:30 at the top
    When I scroll until Ayah 2:40 is at the top of the screen
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 19    | 1    |
      | 18    | 45   |

  @AC-1
  Scenario: A look-up inside the open Surah leaves its Reading place where it was
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:45 is at the top of the screen
    And I open Surah 19 from the Surah index
    And I open Surah 18 from the Surah index
    And I follow the Word location 18:10:3 in a Root dialog
    And I scroll until Ayah 18:12 is at the top of the screen
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 45   |
      | 19    | 1    |
    When I open Surah 18 from the Surah index again
    Then the Surah 18 screen opens with Ayah 18:45 at the top

  @AC-1
  Scenario: Reading places are kept on the device after the app is closed and opened again
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:255 is at the top of the screen
    And I close the app and open it again on the same device
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 255  |
      | 18    | 40   |

  @AC-1
  Scenario: Each device keeps its own Reading places
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And the app is launched on a second, new device
    Then the Surah index offers no Reading places
    When I open Surah 2 from the Surah index
    And I close the app and open it again on the first device
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 40   |

  @AC-1
  Scenario Outline: Saved Reading places changed to "<value>" read as none, and reading starts a new list
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And every value the app saved on this device was since changed to "<value>"
    And I close the app and open it again on the same device
    Then the Surah index offers no Reading places
    When I open Surah 2 from the Surah index
    Then the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 2     | 1    |

    Examples:
      | value                |
      |                      |
      | not a list           |
      | [{"surah":"eighteen"}] |

  @AC-1
  Scenario: Reading and continuing Reading places sends nothing anywhere
    Given every request the app makes is recorded
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I follow the Word location 2:30:1 in a Root dialog
    And I continue reading at Surah 18's Reading place from the Surah index
    Then the app made no request

  # ---------------------------------------------------------------- AC-2: continuing from the Surah index

  @AC-2
  Scenario: Any Reading place on the Surah index can be continued, not only the newest
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I scroll until Ayah 2:255 is at the top of the screen
    And I continue reading at Surah 18's Reading place from the Surah index
    Then the Surah 18 screen opens with Ayah 18:40 at the top
    And the Surah 18 screen is not a look-up
    And the Surah index offers these Reading places, newest first:
      | Surah | Ayah |
      | 18    | 40   |
      | 2     | 255  |

  @AC-2
  Scenario: Each of ten Reading places on the Surah index opens its Surah at its Ayah
    When I read Surahs 105 to 114, each until its Ayah 3 is at the top of the screen
    Then the Surah index offers ten Reading places, Surahs 114 down to 105, each at Ayah 3
    And continuing each of them from the Surah index, newest first, opens its Surah with its Ayah 3 at the top
    And the Surah index offers ten Reading places, Surahs 105 up to 114, each at Ayah 3

  @AC-2
  Scenario: Continuing a Reading place and scrolling on moves it
    When I open Surah 18 from the Surah index
    And I scroll until Ayah 18:40 is at the top of the screen
    And I open Surah 2 from the Surah index
    And I continue reading at Surah 18's Reading place from the Surah index
    And I scroll until Ayah 18:50 is at the top of the screen
    And I close the app and open it again on the same device
    And I continue reading at Surah 18's Reading place from the Surah index again
    Then the Surah 18 screen opens with Ayah 18:50 at the top

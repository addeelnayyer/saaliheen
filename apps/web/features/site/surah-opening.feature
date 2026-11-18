@surah-opening @issue-24
Feature: Opening a Surah instantly, then in parts
  A Surah opened from inside the app (an index card, Continue reading, the
  previous and next Surah links at a Surah's foot, the Language switch, Back) shows its
  header and a shimmering skeleton of its Ayahs at once, then fills in its
  Ayahs part by part as they arrive. A Surah opened to a particular Ayah keeps
  its skeleton until that Ayah's part has arrived, then lands on it, and the
  Reading place does not move while the skeleton shows. A Surah page loaded
  directly still carries every Word.

  Background:
    Given a browser with no saved reader settings

  @AC-24-1
  Scenario: An index card shows the Surah's header and its skeleton before any Ayah arrives
    Given I open "/ur"
    And the server holds back every part of a Surah
    When I follow the index card of Surah 2
    Then the page's main heading is Surah 2's Arabic name from the Surah metadata
    And the Surah's loading skeleton is shown
    And no Ayah is shown yet
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    And no loading skeleton is shown

  @AC-24-2
  Scenario: The first Ayahs are shown long before the whole Surah has arrived
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    And the Surah's loading skeleton is shown
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown

  @AC-24-3
  Scenario: The next Surah link at the foot of a long Surah shows the next Surah's skeleton at once
    Given I open "/ur/2"
    And the server holds back every part of a Surah
    When I follow the next Surah link at the foot of the Surah
    Then I am on Surah 3 in Urdu
    And the page's main heading is Surah 3's Arabic name from the Surah metadata
    And the Surah's loading skeleton is shown
    When the held-back parts arrive
    Then every Ayah of Surah 3 is shown

  @AC-24-3
  Scenario: The next Surah link at the foot of a Surah shows the next Surah's skeleton at once
    Given I open "/ur/1"
    And the server holds back every part of a Surah
    When I follow the next Surah link at the foot of the Surah
    Then I am on Surah 2 in Urdu
    And the page's main heading is Surah 2's Arabic name from the Surah metadata
    And the Surah's loading skeleton is shown
    And no Ayah is shown yet
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown

  @AC-24-4
  Scenario: A Surah page loaded directly carries every Word
    Then the page "/ur/2" as loaded directly carries every Word card of Surah 2
    And the page "/en/114" as loaded directly carries every Word card of Surah 114

  @AC-24-3 @AC-24-5
  Scenario: Continue reading keeps the skeleton until the Reading place's part arrives, then lands on it
    Given I open "/ur/2"
    When I scroll until Ayah 2:200 is at the top of the screen
    And I open "/ur"
    And the server holds back every part of a Surah but the first
    And I follow Continue reading
    Then the Surah's loading skeleton is shown
    And no Ayah is shown yet
    When the held-back parts arrive
    Then Ayah 2:200 is at the top of the screen

  @AC-24-5
  Scenario: Leaving a Surah while its skeleton shows keeps the Reading place
    Given I open "/ur/2"
    When I scroll until Ayah 2:200 is at the top of the screen
    And I open "/ur"
    And the server holds back every part of a Surah but the first
    And I follow Continue reading
    Then the Surah's loading skeleton is shown
    When I follow the destination "Read"
    Then the Surah index offers Continue reading only at "2. Al-Baqarah · Ayah 200", linking to "/ur/2"

  @AC-24-5 @AC-24-7
  Scenario: Continue reading gives way to Retry when the Reading place's part does not arrive within 10 seconds
    Given I open "/ur/2"
    When I scroll until Ayah 2:200 is at the top of the screen
    And I open "/ur"
    And the server holds back every part of a Surah but the first
    And I follow Continue reading
    Then the Surah's loading skeleton is shown
    And no Ayah is shown yet
    And within 12 seconds the page says the rest of the Surah could not be loaded, with a Retry button
    And no Ayah is shown yet
    When the held-back parts arrive
    And I press Retry
    Then Ayah 2:200 is at the top of the screen

  @AC-24-6
  Scenario: Back to a Surah whose parts must load again lands where the reader left it
    Given I open "/ur"
    When I follow the index card of Surah 18
    And I scroll until Ayah 18:45 is at the top of the screen
    And I follow the destination "Read" from the keyboard
    Then I am on the Surah index in Urdu
    When I follow the index card of Surah 19
    Then I am on Surah 19 in Urdu
    When I follow the destination "Read"
    Then I am on the Surah index in Urdu
    When I follow the index card of Surah 20
    Then I am on Surah 20 in Urdu
    When I follow the destination "Read"
    Then I am on the Surah index in Urdu
    When I follow the index card of Surah 21
    Then I am on Surah 21 in Urdu
    And every Ayah of Surah 21 is shown
    When the server holds back every part of a Surah
    And I go back 6 pages
    Then I am on Surah 18 in Urdu
    And the Surah's loading skeleton is shown
    When the held-back parts arrive
    Then Ayah 18:45 is at the top of the screen

  @AC-24-7
  Scenario: A part that fails gives way to a message and Retry, keeping the Ayahs already shown
    Given I open "/ur"
    And the server fails every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown
    And the page says the rest of the Surah could not be loaded, with a Retry button
    And no loading skeleton is shown
    When the server serves every part again
    And I press Retry
    Then every Ayah of Surah 2 is shown
    And the page no longer says the rest of the Surah could not be loaded

  @AC-24-7
  Scenario: With no part arriving within 10 seconds, the skeleton gives way to Retry
    Given I open "/ur"
    And the server holds back every part of a Surah
    When I follow the index card of Surah 2
    Then within 12 seconds the page says the rest of the Surah could not be loaded, with a Retry button
    When the held-back parts arrive
    And I press Retry
    Then every Ayah of Surah 2 is shown

  @AC-24-8
  Scenario: With reduced motion the skeleton does not shimmer
    Given my system prefers reduced motion
    And I open "/ur"
    And the server holds back every part of a Surah
    When I follow the index card of Surah 2
    Then the Surah's loading skeleton is shown
    And the loading skeleton is still

  @AC-24-8
  Scenario: The skeleton shimmers otherwise
    Given I open "/ur"
    And the server holds back every part of a Surah
    When I follow the index card of Surah 2
    Then the loading skeleton shimmers

  @AC-24-9
  Scenario: The reader's controls work while the Surah loads, and switching Language starts it again
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    When I choose the Indo-Pak Script
    Then the Word card at 2:2:1 shows its Indo-Pak text
    When I turn the Ayah translation switch on
    Then the Urdu Ayah translation of 2:2 is shown
    When I open the Root tag on the Word card at 2:2:2
    Then the Root dialog for the Root QUL gives 2:2:2 is open
    When I close the Root dialog with Escape
    Then no Root dialog is open
    When I switch Language to English
    Then I am on "/en/2" with nothing added to the URL
    And the Word card at 2:2:1 shows its English Word meaning
    And the English Ayah translation of 2:2 is shown
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown

  @AC-24-9
  Scenario: Ayahs that arrive after a Script or Ayah translation switch follow the new setting
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    When I choose the Indo-Pak Script
    And I turn the Ayah translation switch on
    And the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    When I scroll until Ayah 2:200 is at the top of the screen
    Then the Word card at 2:200:1 shows its Indo-Pak text
    And the Urdu Ayah translation of 2:200 is shown

  @AC-24-9
  Scenario: Switching Language while the Surah loads opens it afresh in the new Language
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    When the server holds back every part of a Surah
    And I switch Language to English
    Then I am on "/en/2" with nothing added to the URL
    And the Surah's loading skeleton is shown
    And no Ayah is shown yet
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    And the Word card at 2:1:1 shows its English Word meaning

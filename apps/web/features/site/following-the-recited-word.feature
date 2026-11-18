@issue-109
Feature: Following the Recited Word
  While the Recitation plays, the page scrolls to keep the Recited Word's card
  on screen, clear of the Surah bar and the Recitation bar, so a reader never
  has to chase it. Scrolling by hand stops the page following it: the page
  stays where the reader put it, and a button to go back to the Recited Word
  appears. Pressing it brings the Recited Word back on screen and the page
  follows it again, and the button goes. While the Settings drawer is open
  the page beneath it holds still: it does not follow the Recited Word.

  The audio is stubbed as silence and the times are read from the committed
  Recitation source, as in recitation.feature, whose steps these reuse.
  "The Recitation reaches" a time when the audio is moved there, as a reader
  dragging a slider would; Al-Baqarah's Ayahs up to 2:20 lie within
  the stub's first 5 minutes.

  Background:
    Given the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes

  @AC-3
  Scenario: On a desktop, the page follows the Recited Word down Al-Baqarah
    Given I open Surah 2 in English
    When I press the Surah bar's play button
    Then the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    And there is no button to go back to the Recited Word
    When the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word is a Word of Ayah 2:9
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    And the Recited Word's card stays on screen as the Recitation plays on through 2 more Words

  @AC-3
  Scenario: On a phone, the page follows the Recited Word down Al-Baqarah
    Given I open Surah 2 in English
    When I view the page on a 390×844 phone
    And I press the Surah bar's play button
    And the Recitation reaches the start of 2:5's timing 1
    Then the Recited Word is a Word of Ayah 2:5
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:10's timing 1
    Then the Recited Word is a Word of Ayah 2:10
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar

  @AC-4
  Scenario: Scrolling by hand stops the following, and the button back to the Recited Word starts it again
    Given I open Surah 2 in English
    When I press the Surah bar's play button
    And the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    When I scroll up by hand by 1500 pixels with the mouse wheel
    Then the Recitation is playing
    And a button to go back to the Recited Word is on screen
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the page stays where I scrolled it by hand
    And the Recited Word's card is not on screen
    And a button to go back to the Recited Word is on screen
    When I press the button to go back to the Recited Word
    Then the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar
    And there is no button to go back to the Recited Word
    When the Recitation reaches the start of 2:20's timing 1
    Then the Recited Word is a Word of Ayah 2:20
    And the Recited Word's card is on screen, clear of the Surah bar and the Recitation bar

  @issue-305
  Scenario: The page beneath the Settings drawer does not follow the Recited Word
    Given I open Surah 2 in English
    When I press the Surah bar's play button
    And the Recitation reaches the start of 2:9's timing 1
    And I open the Settings drawer
    And I note how far down the page is scrolled
    And the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the page has not scrolled since I noted it

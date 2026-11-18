@issue-114
Feature: Following the Recited Word in the app
  The mobile counterpart of the website's (#109): while the Recitation plays,
  the Surah screen scrolls to keep the Recited Word's card on screen, clear of
  the Surah bar above and the Recitation bar below, so a reader never has to
  chase it. Scrolling by hand stops the screen following it: the screen stays
  where the reader put it, and a button back to the Recited Word appears.
  Pressing it brings the Recited Word back, the screen follows it again, the
  button goes.

  The device's audio is the fake of "Listening to a Surah" (recitation.feature).
  Where the screen lays out a Word card is given in px from the top of a
  phone's window 874 px tall, as the screen measures it. Times and Word numbers
  are read from the committed Recitation files, never typed.

  @AC-3
  Scenario: The screen follows the Recited Word down Al-Baqarah
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    When I press the play control with Ayah 2:1 at the top of the screen
    Then there is no button back to the Recited Word
    When the Recitation reaches the start of 2:9's timing 1
    Then the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:9
    When the Recitation reaches the start of 2:17's timing 1
    Then the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:17
    And there is still no button back to the Recited Word

  @AC-3
  Scenario Outline: Following the Recited Word, the screen brings its card clear of the Surah bar and the Recitation bar when <Where>
    Given a Surah bar 120 px tall and a Recitation bar whose top is 790 px down the window
    When the Recited Word's card is laid out from <Top> px to <Bottom> px down the window, so that <Where>
    Then the screen scrolls the card clear of the Surah bar and the Recitation bar, <Moving>

    Examples:
      | Where                          | Top  | Bottom | Moving                      |
      | it is already clear of both    | 400  | 470    | not scrolling at all        |
      | it is under the Recitation bar | 780  | 850    | scrolling down the Surah    |
      | it is below the window         | 1400 | 1470   | scrolling down the Surah    |
      | it is behind the Surah bar     | 80   | 150    | scrolling back up the Surah |
      | it is above the window         | -900 | -830   | scrolling back up the Surah |

  @AC-3
  Scenario: Scrolling by hand stops the following, and the button back to the Recited Word starts it again
    Given the app is launched on a new device
    And I open Surah 2 in the Uthmani Script and English
    When I press the play control with Ayah 2:1 at the top of the screen
    And the Recitation reaches the start of 2:9's timing 1
    Then the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:9
    When I scroll the screen by hand
    Then the audio is still playing
    And the screen follows no Word, staying where I scrolled it
    And a button back to the Recited Word is on screen
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is the first Word the Reciter says in Ayah 2:17
    And the screen still follows no Word, staying where I scrolled it
    And the button back to the Recited Word is still on screen
    When I press the button back to the Recited Word
    Then the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:17
    And there is no button back to the Recited Word
    When the Recitation reaches the start of 2:20's timing 1
    Then the screen follows the Recited Word, the first Word the Reciter says in Ayah 2:20

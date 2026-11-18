@issue-126 @AC-11
Feature: Listening to a Recitation in Flowing
  A reader in Flowing (#125) listens to the Recitation (ADR 0010) and follows
  it in the running text. Flowing has no Ayah headings, so tapping any Word
  plays from where the Reciter first says it, even when nothing is playing,
  and a Word can be tapped by keyboard too; while it plays, a tap carries it
  on from that Word, as in Study. The Surah bar's play button starts it as in
  Study. The Recited Word is marked where it sits in the Arabic, and the mark
  goes back with the Reciter when he repeats Words. While the Recitation bar is
  on screen, playing or paused, the Arabic and Ayah ends of every Ayah but the
  one being recited are dimmed, so it stands out; the Phrase colours and the
  Ayah translation paragraph are not. Stopping the Recitation removes the
  dimming. The page follows the Recited Word, switching layout keeps it in view
  and leaves the Reading place where it was, and listening moves the Reading
  place, all as in Study. Study keeps its own marks and dims nothing.

  The audio is stubbed as silence and the times are read from the committed
  Recitation source, as in recitation.feature, whose steps these reuse; "the
  Recitation reaches" a time when the audio is moved there. A Word is found by
  its Word location (the id a Word location link targets). How a thing is
  drawn is read from what the browser paints: its text's colour, through the
  opacity of everything holding it, over what is drawn behind it. Dimmed means
  its text contrasts with what is behind it by at most 80% of the contrast it
  had before the Recitation played; drawn as noted, by at least 90% of it (the
  faint mark on Study's recited Ayah is drawn as noted). A Word's Phrase
  colour is its own background, through the same opacity. An Allah
  reference's gold (#147) dims with its Ayah (#149), and so is not held to
  3 to 1 while dimmed: the light theme's gold is under 3.75 to 1 over the
  Phrase colours, so no dimmed gold could keep it. Which Words are Allah
  references is read from the seeded list, never typed. "I scroll until
  Ayah ... is at the top of the screen" in Flowing names an Ayah that starts
  its Passage, and so starts a line of its own.

  Background:
    Given a browser with no saved reader settings
    And the Surah audio is served as silence as long as each Surah's Recitation, or its first 5 minutes

  # ---------------------------------------------------------------- tapping a Word

  @AC-1
  Scenario Outline: In Flowing in <Language>, with nothing playing, tapping the Word at <Location> starts the Recitation where the Reciter first says it
    Given I open "/<lang>/<surah>"
    And I switch the Ayah layout to Flowing
    When I tap the Word at <Location>
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays on from where the Reciter first says the Word at <Location>
    And the first Recited Word is the Word at <Location>
    And no Root dialog is open

    # 1:1:1 opens the Surah, 1:7:9 ends it, and the Reciter says 2:9:7 twice.
    Examples:
      | Language | lang | surah | Location |
      | English  | en   | 1     | 1:1:1    |
      | Urdu     | ur   | 1     | 1:5:2    |
      | English  | en   | 1     | 1:7:9    |
      | Urdu     | ur   | 2     | 2:9:7    |

  @AC-1
  Scenario: In Flowing, with the Recitation paused, tapping a Word plays it on from that Word
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    And the Recitation is playing
    And I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    When I tap the Word at 1:6:1
    Then the Recitation plays on from where the Reciter first says the Word at 1:6:1
    And the Recited Word is the Word at 1:6:1

  @AC-1
  Scenario Outline: While the Recitation plays in Flowing, in <Ayah>, tapping the Word at <Location> carries it on from that Word
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    And the Recitation is playing
    And the Recitation reaches the start of <Ayah>'s timing 1
    And I tap the Word at <Location>
    Then the Recitation plays on from where the Reciter first says the Word at <Location>
    And the Recited Word is the Word at <Location>
    And no Root dialog is open

    Examples:
      | Ayah | Location |
      | 1:1  | 1:5:2    |
      | 1:7  | 1:2:1    |

  @AC-1
  Scenario Outline: In Flowing, the Word at 1:5:2 can be tapped by keyboard, with <Key>
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    When I move keyboard focus to the Word at 1:5:2 with Tab
    And I press <Key>
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays on from where the Reciter first says the Word at 1:5:2
    And the first Recited Word is the Word at 1:5:2

    Examples:
      | Key   |
      | Enter |
      | Space |

  # ---------------------------------------------------------------- the Surah bar's play button

  @AC-2
  Scenario Outline: In Flowing in <Language> with the <Script> Script, the Surah bar's play button plays Al-Kawthar from its first Ayah to its end
    Given I open "/<lang>/108"
    And I choose the <Script> Script
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    Then the Recitation bar is on screen, offering to pause
    And the Recitation plays from the start of Ayah 108:1
    And the first Recited Word is the first Word the Reciter says in Ayah 108:1
    And the Bismillah line is not marked
    When the Recitation reaches 1 second before the end of Ayah 108:3, the last of the Surah
    Then the Recitation stops at the end of the Surah
    And the Recitation bar is not on screen
    And no Word and no Ayah is marked

    Examples:
      | Language | lang | Script   |
      | Urdu     | ur   | Uthmani  |
      | English  | en   | Indo-Pak |

  @AC-2 @AC-3
  Scenario: In Flowing, started from Ayah 2:8 at the top of the screen, the mark goes back in the running text as the Reciter repeats Words in Ayah 2:9
    Given I open "/en/2"
    And I switch the Ayah layout to Flowing
    And I note how every Word of Ayah 2:9 is drawn
    When I scroll until Ayah 2:8 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 2:8
    And the first Recited Word is the first Word the Reciter says in Ayah 2:8
    When the Recitation reaches the start of 2:9's timing 9
    Then the Recited Word moves through 2:9's timings 9 to 11 in turn
    And the Recited Word is drawn marked in the running text, unlike before the Recitation played, and the other Words of its Ayah are drawn as noted

  # ---------------------------------------------------------------- the mark

  @AC-3
  Scenario: In Flowing, the Recited Word moves on through Al-Fatihah's first Ayah, marked in the running text, and stays marked when paused
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    And I note how every Word of Ayah 1:1 is drawn
    And I note how every Word of Ayah 1:7 is drawn
    When I press the Surah bar's play button
    Then the Recited Word is drawn marked in the running text, unlike before the Recitation played, and the other Words of its Ayah are drawn as noted
    And the Recited Word moves through every timing of Ayah 1:1 in turn
    When the Recitation reaches the start of 1:7's timing 4
    And I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Recited Word is drawn marked in the running text, unlike before the Recitation played, and the other Words of its Ayah are drawn as noted

  # ---------------------------------------------------------------- the dimming

  @AC-4
  Scenario: In Flowing, playing and paused, every Ayah of Al-Fatihah but the one recited is dimmed, its Phrase colours and Ayah translations not
    Given I open "/en/1"
    And I turn the Ayah translation switch on
    And I switch the Ayah layout to Flowing
    And I note how every Ayah of Surah 1 is drawn, with its Ayah translation paragraph
    When I press the Surah bar's play button
    And the Recitation reaches the start of 1:5's timing 1
    Then the Recited Word is in Ayah 1:5
    And the Arabic and the Ayah end of every Ayah of Surah 1 but Ayah 1:5 are dimmed
    And the Arabic and the Ayah end of Ayah 1:5 are drawn as noted
    And every Word of Surah 1 but the Recited Word keeps its noted Phrase colour
    And the Ayah translation paragraphs of Surah 1 are drawn as noted
    When the Recitation reaches the start of 1:7's timing 1
    Then the Recited Word is in Ayah 1:7
    And the Arabic and the Ayah end of every Ayah of Surah 1 but Ayah 1:7 are dimmed
    And the Arabic and the Ayah end of Ayah 1:7 are drawn as noted
    When I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Arabic and the Ayah end of every Ayah of Surah 1 but Ayah 1:7 are dimmed
    And the Arabic and the Ayah end of Ayah 1:7 are drawn as noted
    And every Word of Surah 1 but the Recited Word keeps its noted Phrase colour
    And the Ayah translation paragraphs of Surah 1 are drawn as noted

  # ---------------------------------------------------------------- stopping

  @AC-5
  Scenario: In Flowing, stopping the Recitation with the Recitation bar's stop button removes the dimming
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    And I note how every Ayah of Surah 1 is drawn
    When I press the Surah bar's play button
    And the Recitation reaches the start of 1:7's timing 1
    Then the Recited Word is in Ayah 1:7
    And the Arabic and the Ayah end of every Ayah of Surah 1 but Ayah 1:7 are dimmed
    When I press the Recitation bar's stop button
    Then the Recitation bar is not on screen
    And the Arabic and the Ayah end of every Ayah of Surah 1 are drawn as noted

  @AC-5
  Scenario: In Flowing, Al-Kawthar's Recitation stopping at the end of the Surah removes the dimming
    Given I open "/en/108"
    And I switch the Ayah layout to Flowing
    And I note how every Ayah of Surah 108 is drawn
    When I press the Surah bar's play button
    And the Recitation reaches the start of 108:3's timing 1
    Then the Recited Word is in Ayah 108:3
    And the Arabic and the Ayah end of every Ayah of Surah 108 but Ayah 108:3 are dimmed
    When the Recitation reaches 1 second before the end of Ayah 108:3, the last of the Surah
    Then the Recitation stops at the end of the Surah
    And the Recitation bar is not on screen
    And the Arabic and the Ayah end of every Ayah of Surah 108 are drawn as noted

  # ---------------------------------------------------------------- following the Recited Word

  @AC-6
  Scenario Outline: In Flowing on a <viewport>, the page follows the Recited Word down Al-Baqarah
    Given the browser is a <viewport>
    And I open "/en/2"
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    Then the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    And there is no button to go back to the Recited Word
    When the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word is a Word of Ayah 2:9
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:20's timing 1
    Then the Recited Word is a Word of Ayah 2:20
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-6
  Scenario: In Flowing, scrolling by hand stops the following, and the button back to the Recited Word starts it again
    Given I open "/en/2"
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    Then the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When I scroll down by hand by 3000 pixels with the mouse wheel
    Then the Recitation is playing
    And a button to go back to the Recited Word is on screen
    When the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word is a Word of Ayah 2:9
    And the page stays where I scrolled it by hand
    And the Recited Word is not on screen
    And a button to go back to the Recited Word is on screen
    When I press the button to go back to the Recited Word
    Then the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    And there is no button to go back to the Recited Word
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar

  # ---------------------------------------------------------------- switching layout while listening

  @AC-7
  Scenario Outline: On a <viewport>, switching layout with the Recitation paused keeps the Recited Word in view and leaves the Reading place at its Ayah
    Given the browser is a <viewport>
    And I open "/en/18"
    When I scroll until Ayah 18:10 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:10
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I press the Recitation bar's pause button
    And the page settles where it landed
    And I switch the Ayah layout to Flowing
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Recited Word is in Ayah 18:17
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When I switch the Ayah layout to Study
    Then the Recited Word is in Ayah 18:17
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When I switch the Ayah layout to Flowing
    Then the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When I open "/en"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 17", linking to "/en/18"

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-7
  Scenario: Switching layout while the Recitation plays keeps the Recited Word in view as it plays on
    Given I open "/en/2"
    When I press the Surah bar's play button
    And the Recitation reaches the start of 2:9's timing 1
    Then the Recited Word is a Word of Ayah 2:9
    When the page settles where it landed
    And I switch the Ayah layout to Flowing
    Then the Recitation is playing
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When the Recitation reaches the start of 2:17's timing 1
    Then the Recited Word is a Word of Ayah 2:17
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar
    When the page settles where it landed
    And I switch the Ayah layout to Study
    Then the Recitation is playing
    And the Recited Word is on screen, clear of the Surah bar and the Recitation bar

  # ---------------------------------------------------------------- the Reading place

  @AC-8
  Scenario Outline: In Flowing in <Language>, listening from Ayah 18:13 on to Ayah 18:17 moves the Reading place to 18:17, where Al-Kahf opens again in Flowing
    Given I open "/<lang>/18"
    And I switch the Ayah layout to Flowing
    When I scroll until Ayah 18:13 is at the top of the screen
    And I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:13
    When the Recitation reaches the start of 18:17's timing 1
    Then the Recited Word is in Ayah 18:17
    When I open "/<lang>"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 17", linking to "/<lang>/18"
    When I open "/<lang>/18"
    Then Surah 18 is shown Flowing
    And Ayah 18:17 is at the top of the screen

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-8
  Scenario: Listening in Flowing in Al-Kahf after reading Al-Baqarah brings Al-Kahf back to the top of the Reading places
    Given I open "/en/2"
    And I scroll until Ayah 2:255 is at the top of the screen
    And I open "/en/18"
    And I switch the Ayah layout to Flowing
    When I press the Surah bar's play button
    Then the Recitation plays from the start of Ayah 18:1
    And the Recited Word is in Ayah 18:2
    When I open "/en"
    Then the Surah index lists these Reading places, newest first:
      | place                    | link   |
      | 18. Al-Kahf · Ayah 2     | /en/18 |
      | 2. Al-Baqarah · Ayah 255 | /en/2  |

  # ---------------------------------------------------------------- Study as it was

  @AC-9
  Scenario: In Study, the Recited Word's card is marked and its Ayah faintly, and nothing is dimmed
    Given I open "/en/1"
    And I turn the Ayah translation switch on
    And I note the background and border of every Word card
    And I note how every Ayah of Surah 1 is drawn
    When I press the Surah bar's play button
    And the Recitation reaches the start of 1:7's timing 1
    Then the Recited Word is in Ayah 1:7
    And only the Recited Word's card and its Ayah are marked
    And the Recited Word's card keeps the background it had before, and its border is the mark's
    And the Recited Word's Ayah is drawn faintly marked, unlike before the Recitation played
    And the Arabic and the Ayah end of every Ayah of Surah 1 are drawn as noted
    When I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Arabic and the Ayah end of every Ayah of Surah 1 are drawn as noted

  @AC-9
  Scenario: In Study, with nothing playing, tapping a Word card does not start the Recitation
    Given I open "/en/1"
    When I tap the Word card at 1:5:2, away from its Root tag
    Then the Recitation bar is not on screen
    And the Recitation has stopped
    And no Root dialog is open

  @AC-9
  Scenario: In Study, with the Recitation paused, tapping a Word card leaves it paused where it was
    Given I open "/en/1"
    When I press the Surah bar's play button
    And the Recitation is playing
    And I press the Recitation bar's pause button
    Then the Recitation is paused, and the Recitation bar offers to play
    When I note where the Recitation's audio is
    And I tap the Word card at 1:5:2, away from its Root tag
    Then the Recitation is paused, and the Recitation bar offers to play
    And the Recitation's audio is where I noted it
    And no Root dialog is open

  # ---------------------------------------------------------------- reading well

  @AC-10
  Scenario Outline: In Flowing on a <viewport>, the mark and the dimming read well in <Language>, <Script> and the <theme> theme
    Given the browser is a <viewport>
    And I open "/<lang>/1"
    And I choose the <Script> Script
    And I choose the <Theme> theme
    And I turn the Ayah translation switch on
    And I switch the Ayah layout to Flowing
    And I note how every Ayah of Surah 1 is drawn, with its Ayah translation paragraph
    When I press the Surah bar's play button
    And the Recitation reaches the start of 1:7's timing 4
    Then the Recited Word is in Ayah 1:7
    When I press the Recitation bar's pause button
    Then the Recited Word is drawn marked in the running text, unlike before the Recitation played, and the other Words of its Ayah are drawn as noted
    And the Arabic and the Ayah end of every Ayah of Surah 1 but Ayah 1:7 are dimmed
    And the Arabic of every Word but the Allah references, and the Ayah end, of every Ayah of Surah 1 contrast with what is drawn behind them by at least 3 to 1
    And the Arabic of Ayah 1:7 contrasts with what is drawn behind it by at least 4.5 to 1
    And the Ayah translation paragraphs of Surah 1 are drawn as noted
    And the page does not scroll horizontally
    And I save a screenshot of the page as it is "AC-10-flowing-recitation-<lang>-<script>-<theme>-<viewport>"

    Examples:
      | viewport | Language | lang | Script   | script  | Theme | theme |
      | desktop  | Urdu     | ur   | Uthmani  | uthmani | Light | light |
      | desktop  | English  | en   | Indo-Pak | indopak | Dark  | dark  |
      | phone    | English  | en   | Uthmani  | uthmani | Dark  | dark  |
      | phone    | Urdu     | ur   | Indo-Pak | indopak | Light | light |

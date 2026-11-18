Feature: The Surah bar
  On a Surah page the top bar and a slim row under it (the Reading settings
  button, the Surah's number and names and the play button; the previous and
  next Surahs are at the Surah's foot since #192) stay at the top
  of the screen at every width, as the Surah bar. Reading down shrinks it to its
  mini form, only the slim row; scrolling up shows its full form again at once.
  It changes form by sliding, never by changing height, so the Words never move.

  With the Passage headings release switch on (#41, #43), the slim row also
  shows, under the Surah's number and names, the Passage title of the Passage
  being read: the one holding the Ayah at the top of the screen, or the
  Surah's first Passage before its first Ayah. The Passages and their titles
  are read from the Passages file as last committed. Scenarios tagged
  passage-headings-on run against a build made with the switch on; the rest,
  against a build made without it (playwright.config.ts).

  Scenario: Near the top of a Surah the Surah bar is full
    Given I open Surah 2 in English
    Then the Surah bar is in its full form
    When I scroll down by 40 pixels
    Then the Surah bar is in its full form

  # The page settles after the jump before reading on: the browser's own shift
  # as the Ayahs there lay out can still show the full bar (#37).
  Scenario: Reading down shrinks the Surah bar to its mini form, still at the top of the screen
    Given I open Surah 2 in English
    When I scroll down by 3000 pixels
    And the page settles where it landed
    And I scroll down by 200 pixels
    Then the Surah bar is in its mini form
    And the Surah bar's slim row is at the top of the screen

  Scenario: Scrolling up from deep in a Surah shows the full Surah bar at once
    Given I open Surah 2 in English
    When I scroll down by 30000 pixels
    Then the Surah bar is in its mini form
    When I scroll up by 4 pixels
    Then the Surah bar is in its mini form
    When I scroll up by 60 pixels
    Then the Surah bar is in its full form
    And the Surah bar is at the top of the screen

  Scenario: On a phone the Surah bar stays at the top of the screen in both forms
    Given the browser is a phone
    And I open Surah 2 in Urdu
    When I scroll down by 3000 pixels
    Then the Surah bar is in its mini form
    And the Surah bar's slim row is at the top of the screen
    When I scroll up by 60 pixels
    Then the Surah bar is in its full form
    And the Surah bar is at the top of the screen
    And the page does not scroll horizontally

  Scenario Outline: On a <viewport>, a deep link to <target> lands with the mini Surah bar and the Word card clear below it
    Given the browser is a <viewport>
    And I open "<address>"
    Then the Surah bar is in its mini form
    And the Word card at <target> is fully on screen below the Surah bar

    Examples:
      | viewport | address        | target  |
      | desktop  | /en/2#2:255:1  | 2:255:1 |
      | phone    | /ur/2#2:255:1  | 2:255:1 |

  Scenario: Tapping empty space on the mini Surah bar shows the full bar without moving the Words
    Given I open "/en/2#2:255:1"
    Then the Surah bar is in its mini form
    When I tap the Surah's name on the Surah bar
    Then the Surah bar is in its full form
    And the Word card at 2:255:1 has not moved

  Scenario: Keyboard focus moving into the hidden part of the mini Surah bar shows the full bar
    Given I open "/en/2#2:255:1"
    Then the Surah bar is in its mini form
    When I move keyboard focus to the Reading settings button
    Then the Surah bar is in its mini form
    When I press Shift+Tab
    Then the focused control is on the Surah bar and on screen
    And the Surah bar is in its full form
    And the Word card at 2:255:1 has not moved

  # ------------------------------------------------- the current Passage's title (#43)
  # Reading down to the mini bar, the page settles after the jump before reading
  # on, as in the scenarios above (#37).

  @passage-headings-on @AC-1 @AC-9
  Scenario Outline: In <Language>, the slim row shows the current Passage's title under the Surah's names, in the full and the mini Surah bar
    Given I open Surah 18 in <Language>
    Then the Surah bar is in its full form
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:1, under the Surah's names
    And I save a screenshot of the Surah bar "AC-1-surah-bar-passage-title-full-<lang>-light-desktop"
    When I scroll until Ayah 18:44 is at the top of the screen
    And the page settles where it landed
    And I scroll until Ayah 18:45 is at the top of the screen
    Then the Surah bar is in its mini form
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:45, under the Surah's names
    And I save a screenshot of the Surah bar "AC-1-surah-bar-passage-title-mini-<lang>-light-desktop"
    When I scroll up by 60 pixels
    Then the Surah bar is in its full form
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding the Ayah at the top of the screen, under the Surah's names

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @passage-headings-on @AC-1 @AC-9
  Scenario: On a phone, the slim row shows the current Passage's title in the full and the mini Surah bar
    Given the browser is a phone
    And I open Surah 18 in Urdu
    Then the Surah bar is in its full form
    And the Surah bar's slim row shows the Urdu Passage title of the Passage holding Ayah 18:1, under the Surah's names
    When I scroll until Ayah 18:44 is at the top of the screen
    And the page settles where it landed
    And I scroll until Ayah 18:45 is at the top of the screen
    Then the Surah bar is in its mini form
    And the Surah bar's slim row shows the Urdu Passage title of the Passage holding Ayah 18:45, under the Surah's names
    And I save a screenshot of the Surah bar "AC-1-surah-bar-passage-title-mini-ur-light-phone"
    And the page does not scroll horizontally

  @passage-headings-on @AC-2 @AC-9
  Scenario Outline: In <Language>, scrolling from one Passage into the next changes the title, and back again
    Given I open Surah 18 in <Language>
    When I scroll until Ayah 18:5 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:5
    When I scroll until Ayah 18:6 is at the top of the screen
    Then the Passage holding Ayah 18:6 is not the one holding Ayah 18:5
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:6
    When I scroll until Ayah 18:45 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:45
    When I scroll until Ayah 18:5 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:5

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @passage-headings-on @AC-3 @AC-9
  Scenario Outline: At the top of Surah <Surah> in <Language>, before its first Ayah, the title is the first Passage's
    Given I open Surah <Surah> in <Language>
    Then the page is at the top of the Surah, above its first Ayah
    And the Surah bar's slim row shows the <Language> Passage title of Surah <Surah>'s first Passage
    When I scroll until Ayah <later> is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah <later>
    When I scroll to the top of the page
    Then the page is at the top of the Surah, above its first Ayah
    And the Surah bar's slim row shows the <Language> Passage title of Surah <Surah>'s first Passage

    Examples:
      | Surah | Language | later |
      | 18    | Urdu     | 18:45 |
      | 2     | English  | 2:30  |

  @passage-headings-on @AC-4 @AC-9
  Scenario Outline: On a <viewport>, a deep link to <address> shows the title of the Passage holding Ayah <ayah>
    Given the browser is a <viewport>
    And I open "<address>"
    Then Ayah <ayah> is at the top of the screen
    And the Surah bar is in its mini form
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah <ayah>, under the Surah's names

    Examples:
      | viewport | address        | ayah  | Language |
      | desktop  | /en/18#18:45   | 18:45 | English  |
      | phone    | /ur/18#18:84   | 18:84 | Urdu     |

  @passage-headings-on @AC-4 @AC-2 @AC-9
  Scenario Outline: On a <viewport>, a deep link to the Word location <target> shows the title of the Passage holding its Ayah, and scrolling on changes it
    Given the browser is a <viewport>
    And I open "<address>"
    Then the Surah bar is in its mini form
    And the Word card at <target> is fully on screen below the Surah bar
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah <ayah>, under the Surah's names
    When I scroll until Ayah <later> is at the top of the screen
    Then the Passage holding Ayah <later> is not the one holding Ayah <ayah>
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah <later>

    Examples:
      | viewport | address        | target  | ayah  | Language | later |
      | desktop  | /en/2#2:255:1  | 2:255:1 | 2:255 | English  | 2:258 |
      | phone    | /ur/2#2:255:1  | 2:255:1 | 2:255 | Urdu     | 2:258 |
      | desktop  | /ur/18#18:84:2 | 18:84:2 | 18:84 | Urdu     | 18:89 |

  @passage-headings-on @AC-5 @AC-9
  Scenario Outline: On a narrow phone, the longest <Language> Passage title is cut short with "…" and the Surah bar keeps its height
    Given the browser window is 320 pixels wide
    And I open "/<lang>/2#2:255"
    And I note the Surah bar's height
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 2:255
    When I open the second Ayah of the Passage whose <Language> Passage title is the longest on the Surah bar
    Then the Surah bar's slim row shows that Passage's <Language> Passage title, under the Surah's names
    And the Passage title on the Surah bar is cut short with "…" on one line
    And the Surah bar is as tall as noted
    And I save a screenshot of the Surah bar "AC-5-surah-bar-long-passage-title-<lang>-light-phone"
    When I scroll up by 60 pixels
    Then the Surah bar is in its full form
    And the Passage title on the Surah bar is cut short with "…" on one line
    And the Surah bar is as tall as noted
    And the page does not scroll horizontally

    # The Passage is found among all of the Passages file's, by its title's width as the Surah bar
    # sets it, so a retitle never leaves the scenario on a shorter title. Its second Ayah is opened,
    # so scrolling up from it stays in the Passage (its first Ayah is above).
    # The phone is a narrow one, 320px wide (the iPhone SE's first width): since the slim row lost the index
    # link and the Prev/Next arrows (#192), the longest Urdu title fits a 390px phone whole.
    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @passage-headings-on @AC-6 @AC-9
  Scenario Outline: Switching Language from <Language> to <Other> on a Surah page switches the title
    Given I open Surah 18 in <Language>
    When I scroll until Ayah 18:45 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:45
    When I switch Language to <Other>
    Then I am on "/<other>/18" with nothing added to the URL
    And Ayah 18:45 is at the top of the screen
    And the Surah bar's slim row shows the <Other> Passage title of the Passage holding Ayah 18:45, under the Surah's names
    And the Surah bar's slim row shows no <Language> Passage title of Surah 18

    Examples:
      | Language | Other   | other |
      | Urdu     | English | en    |
      | English  | Urdu    | ur    |

  @passage-headings-on @AC-6 @AC-4 @AC-9
  Scenario Outline: Switching Language from <Language> to <Other> on a Word location link switches the title and keeps the Passage
    Given I open "/<lang>/18#18:84:2"
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 18:84
    When I switch Language to <Other>
    Then I am on "/<other>/18#18:84:2"
    And the Surah bar's slim row shows the <Other> Passage title of the Passage holding Ayah 18:84, under the Surah's names
    And the Surah bar's slim row shows no <Language> Passage title of Surah 18

    Examples:
      | Language | lang | Other   | other |
      | Urdu     | ur   | English | en    |
      | English  | en   | Urdu    | ur    |

  @passage-headings-on @AC-7 @AC-9
  Scenario Outline: Surah 2 opened in parts from the <Language> index shows the first Passage's title, and the current one as the reader scrolls
    Given I open "/<lang>"
    When I follow the index card of Surah 2
    Then the Surah bar's slim row shows the <Language> Passage title of Surah 2's first Passage, under the Surah's names
    And every Ayah of Surah 2 is shown
    When I scroll until Ayah 2:30 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 2:30
    When I scroll until Ayah 2:255 is at the top of the screen
    Then the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 2:255
    When I reload the page
    Then Ayah 2:255 is at the top of the screen
    And the Surah bar's slim row shows the <Language> Passage title of the Passage holding Ayah 2:255

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @passage-headings-on @AC-7 @AC-9
  Scenario: While a Surah opened in parts is still loading, the slim row shows its first Passage's title
    Given I open "/ur"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 2
    Then Ayah 2:1 is shown while the Surah is still loading
    And the Surah bar's slim row shows the Urdu Passage title of Surah 2's first Passage, under the Surah's names
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    When I scroll until Ayah 2:258 is at the top of the screen
    Then the Surah bar's slim row shows the Urdu Passage title of the Passage holding Ayah 2:258

  @passage-headings-on @AC-7 @AC-9
  Scenario: Following the next Surah link at the foot of Surah 1 shows Surah 2's first Passage's title
    Given I open Surah 1 in English
    When I scroll until Ayah 1:5 is at the top of the screen
    Then the Surah bar's slim row shows the English Passage title of the Passage holding Ayah 1:5
    When I follow the next Surah link at the foot of the Surah
    Then Ayah 2:1 is shown
    And the Surah bar's slim row shows the English Passage title of Surah 2's first Passage, under the Surah's names
    And the Surah bar's slim row shows no English Passage title of Surah 1

  @passage-headings-off @AC-8 @AC-9
  Scenario Outline: With the release switch off, the Surah bar in <Language> shows only what it shows today, in both forms, opened in parts, loaded directly and on a deep link
    Given I open "/<lang>"
    When I follow the index card of Surah 18
    Then every Ayah of Surah 18 is shown
    And the Surah bar is in its full form
    And the Surah bar's slim row shows only the Reading settings button, the play button and Surah 18's number and names
    When I scroll until Ayah 18:44 is at the top of the screen
    And the page settles where it landed
    And I scroll until Ayah 18:45 is at the top of the screen
    Then the Surah bar is in its mini form
    And the Surah bar's slim row shows only the Reading settings button, the play button and Surah 18's number and names
    When I reload the page
    Then Ayah 18:45 is at the top of the screen
    And the Surah bar's slim row shows only the Reading settings button, the play button and Surah 18's number and names
    When I open "/<lang>/2#2:255:1"
    Then the Surah bar is in its mini form
    And the Surah bar's slim row shows only the Reading settings button, the play button and Surah 2's number and names

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

@issue-125
Feature: Reading a Surah Flowing in Quran Analysis
  A reader of Quran Analysis switches a Surah page between its two Ayah
  layouts, Study (the Word cards, where every reader starts) and Flowing, from
  the Surah bar's full form. In Flowing each Passage's Arabic runs on together
  under its Passage heading, a new Passage starting on its own, each Ayah ending
  with its end marker kept on one line with its last Word. There are no Word
  meanings, Root tags or Ayah headings; the Phrase colours stay behind the
  Words, and with the Ayah translation switch on, each Passage's Ayah
  translations follow its Arabic as one paragraph, each after its Ayah's number.

  The page keeps one set of Ayahs and Words, so each Passage's Ayahs are grouped
  on it, whether the Surah is served whole or opened in parts. The choice is
  kept per device, applied before the first paint, and never in the URL.
  Switching keeps the Ayah at the top of the screen at the top and never moves
  the Reading place.

  Words run on when an Ayah's first Word shares a line with the end of the Ayah
  before it, or starts the next line only because the line the Ayah before it
  ended on had no room left for it. In Flowing, the Ayah at the top of the
  screen is the first Ayah whose first Word is on the first line on screen,
  else the Ayah running through that line. Passages, Arabic, Ayah end markers
  and Ayah translations are read from the committed sources, never typed.
  An Allah reference's Arabic is in Allah reference colour (#147), a colour
  that issue fixes, so it is held to WCAG's 3 to 1 for large text rather than
  4.5 to 1; the Allah references are the seeded list
  (features/site/allah-references.json).

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- the switch

  @AC-1
  Scenario: A new reader starts in Study, with the Ayah layout switch on the Surah bar's full form
    Given I open "/en/1"
    Then the Surah bar is in its full form
    And the Surah bar's full form has the Ayah layout switch, offering Study and Flowing
    And the Surah bar's Ayah layout switch shows Study chosen
    And Surah 1 is shown in Study

  @AC-1
  Scenario: The Ayah layout switch is usable by keyboard alone
    Given I open "/ur/1"
    When I switch the Ayah layout to Flowing with the keyboard
    Then the Surah bar's Ayah layout switch shows Flowing chosen
    And Surah 1 is shown Flowing
    When I switch the Ayah layout to Study with the keyboard
    Then the Surah bar's Ayah layout switch shows Study chosen
    And Surah 1 is shown in Study

  # ---------------------------------------------------------------- one page, its Passages grouped

  @AC-2
  Scenario Outline: Surah <surah> served whole in <Language> has each Passage's Ayahs grouped together
    Given I open "/<lang>/<surah>"
    Then each Passage of Surah <surah> has its Ayahs in one group on the page, holding no other Passage's Ayahs
    And every Ayah of Surah <surah> is shown

    Examples:
      | surah | Language | lang |
      | 1     | Urdu     | ur   |
      | 18    | English  | en   |

  @AC-2
  Scenario: Surah 3 opened in parts keeps a Passage split across its parts as one group
    Given I open "/en"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 3
    Then Ayah 3:1 is shown while the Surah is still loading
    And the last Ayah shown while the Surah is still loading is inside a Passage that runs on past it
    When the held-back parts arrive
    Then every Ayah of Surah 3 is shown
    And each Passage of Surah 3 has its Ayahs in one group on the page, holding no other Passage's Ayahs

  # ---------------------------------------------------------------- running text

  @AC-3 @passage-headings-on
  Scenario Outline: In Flowing in <Language>, each of Surah 18's Passages runs on under its Passage heading, and a new Passage starts on its own
    Given I open "/<lang>/18"
    When I switch the Ayah layout to Flowing
    Then the Ayahs of each Passage of Surah 18 run on together
    And each Passage of Surah 18 starts on its own, below the Passage before it
    And each Passage of Surah 18 starts under its <Language> Passage heading

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-3 @passage-headings-off
  Scenario: Where Passage headings are held back, Flowing still sets out each Passage of Surah 18 on its own
    Given I open "/en/18"
    When I switch the Ayah layout to Flowing
    Then no Passage heading is shown
    And the Ayahs of each Passage of Surah 18 run on together
    And each Passage of Surah 18 starts on its own, below the Passage before it

  @AC-4
  Scenario Outline: In Flowing on a <viewport> in <Script>, every Ayah of Surah 18 ends with its end marker, on one line with its last Word
    Given the browser is a <viewport>
    And I open "/en/18"
    And I choose the <Script> Script
    When I switch the Ayah layout to Flowing
    Then every Ayah of Surah 18 ends with its end marker showing its number, on the same line as its last Word and after it

    Examples:
      | viewport | Script   |
      | desktop  | Uthmani  |
      | desktop  | Indo-Pak |
      | phone    | Uthmani  |
      | phone    | Indo-Pak |

  # ---------------------------------------------------------------- what Flowing leaves out, and keeps

  @AC-5
  Scenario Outline: In Flowing in <Language>, Surah 2 shows only the Words' Arabic, with no Ayah headings or Theme chips, and the Bismillah as in Study
    Given I open "/<lang>/2"
    And I note how the Bismillah is drawn
    When I switch the Ayah layout to Flowing
    Then no Word of Surah 2 shows anything but its Arabic: no Word meaning and no Root tag
    And no Ayah heading of Surah 2 is shown
    And no Theme chip of Surah 2 is shown
    And the Bismillah is drawn as noted

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-5 @passage-headings-on
  Scenario: In Flowing the Passage heading keeps its share button
    Given I open "/en/18"
    When I switch the Ayah layout to Flowing
    Then each Passage heading of Surah 18 has a share button on it, named for its Passage in the run's database
    When I tap the share button of the Passage 18:45–46
    Then I am on the Share page of 18:45–46 in English and Uthmani, with the edit strip

  @AC-6
  Scenario Outline: In Flowing in <Language>, Al-Fatihah's Phrase colours sit behind its Words and follow the Phrase colours switch
    Given I open "/<lang>/1"
    When I switch the Ayah layout to Flowing
    Then Surah 1 is shown Flowing
    And Al-Fatihah's Words alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    When I turn Phrase colours off
    Then no Word of Surah 1 is tinted
    When I turn Phrase colours on
    Then Al-Fatihah's Words alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  # ---------------------------------------------------------------- the Ayah translation paragraph

  @AC-7
  Scenario Outline: In Flowing in <Language>, each Passage's Ayah translations follow its Arabic as one paragraph, and none with the switch off
    Given I open "/<lang>/18"
    And I turn the Ayah translation switch on
    When I switch the Ayah layout to Flowing
    Then each Passage of Surah 18 from Ayah 37 to Ayah 49 is followed by its <Language> Ayah translations as one paragraph, each after its Ayah's number
    And each <Language> Ayah translation of Surah 18 from Ayah 37 to Ayah 49 is shown once, in its Passage's paragraph
    When I turn the Ayah translation switch off
    Then no Ayah translation of Surah 18 from Ayah 37 to Ayah 49 is shown

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-7 @AC-8
  Scenario: In Flowing the Ayah translation paragraph follows Meaning size, and the Arabic follows Arabic size
    Given I open "/en/1"
    And I turn the Ayah translation switch on
    When I switch the Ayah layout to Flowing
    And I note the text sizes of:
      | the Ayah translation paragraph of 1:1–4 |
      | the Arabic of the Word at 1:2:1         |
    And I set Meaning size to 130%
    Then these texts are 130% of their noted size:
      | the Ayah translation paragraph of 1:1–4 |
    And these texts keep their noted size:
      | the Arabic of the Word at 1:2:1 |
    When I set Arabic size to 150%
    Then these texts are 150% of their noted size:
      | the Arabic of the Word at 1:2:1 |
    And these texts are 130% of their noted size:
      | the Ayah translation paragraph of 1:1–4 |

  # ---------------------------------------------------------------- the Arabic

  @AC-8
  Scenario Outline: In Flowing the Arabic is in the chosen <Script> Script and cannot be selected
    Given I open "/ur/1"
    And I choose the <Script> Script
    When I switch the Ayah layout to Flowing
    Then every Word of Surah 1 shows only its <Script> text
    When I triple-click the Arabic of the Word at 1:2:2
    Then no text on the page is selected
    When I press Select All
    Then no text on the page is selected

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  # ---------------------------------------------------------------- kept per device

  @AC-9
  Scenario: Flowing survives a reload without a flash, another Surah and a Language switch, and never enters the URL
    Given I open "/ur/1"
    When I switch the Ayah layout to Flowing
    Then I am on "/ur/1" with nothing added to the URL
    When I reload the page, watching the first frame its Words are drawn in
    Then Surah 1 is shown Flowing
    And the Words of Surah 1 were already drawn Flowing in the first frame the page was drawn in
    And the Surah bar's Ayah layout switch shows Flowing chosen
    And I am on "/ur/1" with nothing added to the URL
    When I switch Language to English
    Then I am on "/en/1" with nothing added to the URL
    And Surah 1 is shown Flowing
    When I follow the next Surah link at the foot of the Surah
    Then I am on Surah 2 in English
    And Surah 2 is shown Flowing
    When I open "/ur/112"
    Then Surah 112 is shown Flowing
    And I am on "/ur/112" with nothing added to the URL

  @AC-9
  Scenario: Study chosen again survives a reload without a flash
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    When I switch the Ayah layout to Study
    And I reload the page, watching the first frame its Words are drawn in
    Then Surah 1 is shown in Study
    And the Words of Surah 1 were drawn in Study in the first frame the page was drawn in
    And the Surah bar's Ayah layout switch shows Study chosen

  @AC-9
  Scenario: With the browser's storage unavailable, the page starts in Study and still switches to Flowing
    Given a browser whose storage is unavailable
    When I open "/en/1"
    Then Surah 1 is shown in Study
    And the Surah bar's Ayah layout switch shows Study chosen
    When I switch the Ayah layout to Flowing
    Then Surah 1 is shown Flowing
    And the Surah bar's Ayah layout switch shows Flowing chosen

  # ---------------------------------------------------------------- opened in parts

  @AC-10
  Scenario: Surah 3 opened in parts in Flowing shows a skeleton of running-text lines, and later Ayahs join their Passage's running text
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    And I open "/en"
    And the server holds back every part of a Surah but the first
    When I follow the index card of Surah 3
    Then Ayah 3:1 is shown while the Surah is still loading
    And the Surah's loading skeleton is shown
    And the Surah's loading skeleton is drawn as lines of running text, not as Word cards
    And the last Ayah shown while the Surah is still loading is inside a Passage that runs on past it
    When the held-back parts arrive
    Then every Ayah of Surah 3 is shown
    And the Ayahs of that Passage run on together
    And the Ayahs of each Passage of Surah 3 run on together
    And each Passage of Surah 3 has its Ayahs in one group on the page, holding no other Passage's Ayahs

  @AC-10
  Scenario: Surah 2 opened in parts in Flowing shows its skeleton as lines of running text before any Ayah arrives
    Given I open "/ur/1"
    And I switch the Ayah layout to Flowing
    And I open "/ur"
    And the server holds back every part of a Surah
    When I follow the index card of Surah 2
    Then the Surah's loading skeleton is shown
    And the Surah's loading skeleton is drawn as lines of running text, not as Word cards
    When the held-back parts arrive
    Then every Ayah of Surah 2 is shown
    And Surah 2 is shown Flowing

  # ---------------------------------------------------------------- keeping the place

  # Read down, the Surah bar is mini; the switch is on its full form, so the
  # reader taps the bar's Surah name to show it, and the bar keeps that form as
  # the layout switches. The Ayah kept at the top is seated below the bar's
  # full form, never behind it.
  @AC-11
  Scenario Outline: Switching layout on a <viewport> keeps the Ayah at the top of the screen at the top, below the Surah bar, and leaves the Reading place there
    Given the browser is a <viewport>
    And I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I switch the Ayah layout to Flowing
    Then the Surah bar is in its full form
    And Ayah 18:45 is at the top of the screen
    And the first Word of Ayah 18:45 is in view, below the Surah bar
    When I switch the Ayah layout to Study
    Then the Surah bar is in its full form
    And Ayah 18:45 is at the top of the screen
    And the first Word of Ayah 18:45 is in view, below the Surah bar
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-11
  Scenario Outline: Switching layout in Flowing on a <viewport>, from an Ayah at the top of the screen, keeps it there below the Surah bar
    Given the browser is a <viewport>
    And I open "/en/18"
    And I switch the Ayah layout to Flowing
    When I scroll until Ayah 18:60 is at the top of the screen
    And I switch the Ayah layout to Study
    Then the Surah bar is in its full form
    And Ayah 18:60 is at the top of the screen
    And the first Word of Ayah 18:60 is in view, below the Surah bar
    When I switch the Ayah layout to Flowing
    Then the Surah bar is in its full form
    And Ayah 18:60 is at the top of the screen
    And the first Word of Ayah 18:60 is in view, below the Surah bar

    Examples:
      | viewport |
      | desktop  |
      | phone    |

  @AC-11 @AC-13
  Scenario: Switching layout during a look-up never moves the Reading place
    Given I open "/ur/18"
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/2#2:30:1"
    And I switch the Ayah layout to Flowing
    And I switch the Ayah layout to Study
    And I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"

  @AC-12
  Scenario: In Flowing the Reading place moves as the reader reads, and Continue reading lands at it
    Given I open "/ur/18"
    And I switch the Ayah layout to Flowing
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"
    When I follow Continue reading
    Then I am on "/ur/18" with nothing added to the URL
    And Surah 18 is shown Flowing
    And Ayah 18:45 is at the top of the screen
    When I reload the page
    Then Ayah 18:45 is at the top of the screen

  # ---------------------------------------------------------------- a look-up

  @AC-13
  Scenario: A Word location link opens in Flowing at that Word, and leaves the Reading place and the layout choice where they were
    Given I open "/ur/18"
    And I switch the Ayah layout to Flowing
    When I scroll until Ayah 18:45 is at the top of the screen
    And I open "/ur/2#2:30:1"
    Then Surah 2 is shown Flowing
    And the Word at 2:30:1 is in the viewport
    And the Surah bar's Ayah layout switch shows Flowing chosen
    When I open "/ur"
    Then the Surah index offers Continue reading only at "18. Al-Kahf · Ayah 45", linking to "/ur/18"
    When I open "/ur/3"
    Then Surah 3 is shown Flowing

  @AC-13
  Scenario: A Word location link in Flowing marks its Word
    Given I open "/en/1"
    And I switch the Ayah layout to Flowing
    When I open "/en/2#2:30:1"
    Then the Word at 2:30:1 is in the viewport
    And the Word at 2:30:1 is drawn marked, unlike once the link no longer points at it

  # ---------------------------------------------------------------- both Scripts, Languages, themes, a phone

  @AC-14
  Scenario Outline: Flowing reads well on a <viewport> in <Language>, <Script> and the <theme> theme
    Given the browser is a <viewport>
    And I open "/<lang>/1"
    And I choose the <Script> Script
    And I choose the <Theme> theme
    And I turn the Ayah translation switch on
    When I switch the Ayah layout to Flowing
    Then Surah 1 is shown Flowing
    And every Word of Surah 1 shows only its <Script> text
    And Al-Fatihah's Words alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A
    And every Word of Surah 1 fits within the screen's width, its Arabic contrasting with what is drawn behind it by at least 4.5 to 1
    And each Passage of Surah 1 from Ayah 1 to Ayah 7 is followed by its <Language> Ayah translations as one paragraph, each after its Ayah's number
    And the page does not scroll horizontally
    And I save a screenshot "AC-14-flowing-surah-1-<lang>-<script>-<theme>-<viewport>"
    When I open "/<lang>/2"
    Then Surah 2 is shown Flowing
    And the page does not scroll horizontally
    When I scroll to the bottom of the page
    Then the page does not scroll horizontally

    Examples:
      | viewport | Language | lang | Script   | script  | Theme | theme |
      | desktop  | Urdu     | ur   | Uthmani  | uthmani | Light | light |
      | desktop  | English  | en   | Indo-Pak | indopak | Dark  | dark  |
      | phone    | English  | en   | Uthmani  | uthmani | Dark  | dark  |
      | phone    | Urdu     | ur   | Indo-Pak | indopak | Light | light |

  # The Share page's Flowing (#55) is the yardstick: its Words sit a word space
  # apart, as in a printed mushaf, and a line breaks only where the next Word
  # (held with its end marker when it ends its Ayah) no longer fits.
  @AC-14
  Scenario Outline: In Flowing on a <viewport>, Surah <surah>'s Words run as text, a word space apart, and no line ends early
    Given the browser is a <viewport>
    And I open "/en/<surah>"
    When I switch the Ayah layout to Flowing
    Then the neighbouring Words of Surah <surah> from Ayah 1 to Ayah <till> sit apart on their lines by no more than half their Arabic's size, and never touch
    And no line of Surah <surah> from Ayah 1 to Ayah <till> ends with room left for the Word that starts the next line of its Passage, held with its end marker when it ends its Ayah

    Examples:
      | viewport | surah | till |
      | desktop  | 2     | 20   |
      | phone    | 2     | 20   |
      | desktop  | 18    | 16   |
      | phone    | 18    | 16   |

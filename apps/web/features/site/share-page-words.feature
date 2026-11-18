@issue-146
Feature: A Share page carries its Words
  A Share page draws each Shared Ayah's Arabic Word by Word, not as one string
  per Ayah: every Word is its own piece of the Arabic, marked with its Word
  location (data-location="s:a:w", as the Surah page's #s:a:w link names a
  Word) and holding that Word's text in the address's Script. That gives a
  later issue (#149) a place to mark Allah references on Share pages.

  Nothing a visitor sees, copies or gets in a Link preview changes. The
  Arabic is measured against its plain text laid out beside it with the same
  styles: every Word and Ayah end on the same line, at the same place, in the
  same colour and typeface, and the paragraph, so the frame, the same size;
  but for the Words the seeded list names as Allah references, which #149
  draws in gold and which are expected so.
  One sub-pixel reflow is tolerated, as the user ruled: a line's last Word
  may go to the next line only where that plain line had less than 1/64px
  spare per Word (the browser rounds each Word's width up to 1/64px); the
  plain text is then broken there too and the rest held to it as strictly.
  Copy text and the Link preview are checked against the committed sources as
  the Share page features (#55, #56, #57) check them; those features run
  unchanged.

  Expected Words and Ayah ends are read from the committed sources
  (data/qul/), never typed.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: every Word on its own, with its Word location

  @AC-1
  Scenario Outline: <ayahs> in <Script>, <layout>, draws every Shared Ayah's Arabic Word by Word, each Word with its Word location
    Given I open the Share page of <ayahs> in <Language> and <Script>, <layout>
    Then the Share page shows <ayahs> <layout> in <Script> and <Language>
    And every Word of <ayahs> is drawn on its own in the Arabic, in order, marked with its Word location and showing its <Script> text

    Examples:
      | ayahs    | Language | Script   | layout       |
      | 18:83–88 | English  | Uthmani  | Ayah by Ayah |
      | 18:83–88 | Urdu     | Indo-Pak | Ayah by Ayah |
      | 112:1–4  | English  | Uthmani  | Flowing      |
      | 112:1–4  | Urdu     | Indo-Pak | Flowing      |

  @AC-1
  Scenario Outline: The single Ayah 2:255 in <Script> is drawn Word by Word, each Word with its Word location
    Given I open the Share page of 2:255 in English and <Script>
    Then the Share page shows 2:255 Ayah by Ayah in <Script> and English
    And every Word of 2:255 is drawn on its own in the Arabic, in order, marked with its Word location and showing its <Script> text

    Examples:
      | Script   |
      | Uthmani  |
      | Indo-Pak |

  @AC-1
  Scenario: The visitor's Share layout toggle keeps every Word on its own in both layouts
    Given I open the Share page of 18:83–88 in English and Uthmani
    When I choose the Flowing Share layout
    Then the Share page shows 18:83–88 Flowing in Uthmani and English
    And every Word of 18:83–88 is drawn on its own in the Arabic, in order, marked with its Word location and showing its Uthmani text
    When I choose the Ayah by Ayah Share layout
    Then the Share page shows 18:83–88 Ayah by Ayah in Uthmani and English
    And every Word of 18:83–88 is drawn on its own in the Arabic, in order, marked with its Word location and showing its Uthmani text

  @AC-1
  Scenario Outline: Its sharer, with the edit strip, sees <address> drawn Word by Word too
    Given I open the Share page "<address>" as its sharer
    Then every Word of <ayahs> is drawn on its own in the Arabic, in order, marked with its Word location and showing its <Script> text

    Examples:
      | address                         | ayahs   | Script   |
      | /ur/share/112/1-4/indopak/flowing | 112:1–4 | Indo-Pak |
      | /en/share/2/255-257/uthmani     | 2:255–257 | Uthmani  |

  # ---------------------------------------------------------------- AC-2: it looks as it did

  @AC-2
  Scenario Outline: On a <device>, <ayahs> in <Script>, <layout>, looks as its plain text did
    Given the browser is a <device>
    And I open the Share page of <ayahs> in <Language> and <Script>, <layout>
    Then the Share page shows <ayahs> <layout> in <Script> and <Language>
    And the Arabic of <ayahs> in <Script> is laid out exactly as its plain text: every Word and Ayah end on the same line, at the same place, in the same colour and typeface, and the same size overall
    And each Shared Ayah's end is on the same line as its last Word
    And I save a screenshot of the Share page "AC-2-<shot>-light-<device>"

    Examples:
      | device  | ayahs     | Language | Script   | layout       | shot                       |
      | desktop | 18:83–88  | English  | Uthmani  | Ayah by Ayah | passage-uthmani-ayah-by-ayah |
      | desktop | 18:83–88  | English  | Indo-Pak | Flowing      | passage-indopak-flowing    |
      | phone   | 112:1–4   | Urdu     | Indo-Pak | Flowing      | run-indopak-flowing        |
      | phone   | 20:24–36  | Urdu     | Uthmani  | Ayah by Ayah | long-run-uthmani           |
      | phone   | 2:282–283 | English  | Uthmani  | Flowing      | long-ayah-uthmani-flowing  |

  @AC-2
  Scenario Outline: On a <device>, the single long Ayah 2:282 in <Script> looks as its plain text did
    Given the browser is a <device>
    And I open the Share page of 2:282 in English and <Script>
    Then the Share page shows 2:282 Ayah by Ayah in <Script> and English
    And the Arabic of 2:282 in <Script> is laid out exactly as its plain text: every Word and Ayah end on the same line, at the same place, in the same colour and typeface, and the same size overall
    And each Shared Ayah's end is on the same line as its last Word

    Examples:
      | device  | Script   |
      | desktop | Indo-Pak |
      | phone   | Uthmani  |

  @AC-2
  Scenario: In its dark look, 18:83–88 in Uthmani, Flowing, looks as its plain text did
    Given my system prefers a dark colour scheme
    And I open the Share page of 18:83–88 in English and Uthmani, Flowing
    Then the Share page shows 18:83–88 Flowing in Uthmani and English
    And the Share page is drawn in its dark look
    And the Arabic of 18:83–88 in Uthmani is laid out exactly as its plain text: every Word and Ayah end on the same line, at the same place, in the same colour and typeface, and the same size overall
    And I save a screenshot of the Share page "AC-2-passage-uthmani-flowing-dark-desktop"

  # ---------------------------------------------------------------- AC-3: Copy text is the plain Arabic

  @AC-3
  Scenario Outline: Copy text of <address> still hands over each Shared Ayah's Arabic as one plain string
    Given my browser has no native share sheet
    And I open the Share page "<address>" as its sharer
    When I tap the Share page's "Copy text" button
    Then the clipboard holds the Copy text of "<address>"
    And the copy message "Copied" is shown

    Examples:
      | address                            |
      | /en/share/2/255/uthmani            |
      | /ur/share/2/255/indopak            |
      | /en/share/18/83-88/uthmani         |
      | /ur/share/18/83-88/indopak/flowing |
      | /en/share/112/1-4/uthmani/flowing  |

  # ---------------------------------------------------------------- AC-4: the Link preview is as it was

  @AC-4
  Scenario Outline: The Link preview of <shared> is as before: its tags made for it, and a picture with no Quranic Arabic
    When WhatsApp fetches the Share page of <shared>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, names the Surah's English name and the Ayah range
    And the Link preview has a description, in both
    And the Link preview's picture address, in both, is on "https://saaliheen.com" and names these Shared Ayahs
    And the Link preview picture's alt text holds none of the Shared Ayahs' Arabic in either Script, nor the Surah's Arabic name
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-4-link-preview-<shot>-light-desktop"

    Examples:
      | shared                                   | shot              |
      | 18:83–88 in English and Uthmani          | passage-uthmani-en |
      | 112:1–4 in Urdu and Indo-Pak, Flowing    | run-indopak-ur    |

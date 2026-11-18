@issue-56
Feature: Sending a Share page: Share and Copy text
  Someone who arrives at a Share page from inside the app is its sharer, and
  besides the edit strip gets two buttons: "Share" and "Copy text".

  Share hands over only the reference and the link, as text alone with no
  title, so the message stays short and the Link preview does the talking.
  The reference is the Surah's English name and the Shared Ayahs as the
  headpiece writes them ("Al-Kahf 18:83–88", "Al-Fatihah 1:5"); the link is
  the Share page's address on https://saaliheen.com, wherever the page is
  served; a blank line separates them. With a native share sheet, Share opens
  it and copies nothing; a cancelled sheet does nothing. Without one, Share
  copies the same text and briefly shows "Copied" (or "Couldn't copy").

  Copy text copies what an Ayah's share button sent before, for every Shared
  Ayah, whatever the Share layout: each Shared Ayah's Arabic in the page's
  Script, ending as a printed mushaf ends it with the end-of-Ayah sign, its
  number and any marks on it, then its Ayah translation in the page's
  Language; then the translator's name, the reference and the link; blank
  lines between every part. It never opens the share sheet, and shows
  "Copied" or "Couldn't copy". Expected text is read from the committed
  sources.

  The scenarios open the Share page's address as its sharer (see the step);
  how the page knows its sharer arrived from inside the app is the edit
  strip's business, not this feature's.

  Background:
    Given a browser with no saved reader settings

  @AC-6
  Scenario Outline: With a native share sheet, Share hands over the reference and the link of <address> as text alone, nothing copied
    Given my browser has a native share sheet
    And I open the Share page "<address>" as its sharer
    When I tap the Share page's "Share" button
    Then the share sheet opened once, with the reference and the production link of "<address>" as text alone, no title
    And nothing was copied to the clipboard
    And no copy message is shown

    Examples:
      | address                           |
      | /en/share/1/5/uthmani             |
      | /ur/share/2/255-257/indopak       |
      | /en/share/18/83-88/uthmani/flowing |

  @AC-6
  Scenario: Cancelling the share sheet that Share opened does nothing
    Given my browser has a native share sheet that I cancel
    And I open the Share page "/en/share/18/83-88/uthmani" as its sharer
    When I tap the Share page's "Share" button
    Then the share sheet opened once
    And nothing was copied to the clipboard
    And no copy message is shown

  @AC-6
  Scenario Outline: Without a share sheet, Share copies the reference and the link of <address> and briefly shows "Copied"
    Given my browser has no native share sheet
    And I open the Share page "<address>" as its sharer
    When I tap the Share page's "Share" button
    Then the clipboard holds the reference and the production link of "<address>"
    And the copy message "Copied" is shown
    And I save a screenshot of the Share page as it is on screen "<screenshot>"
    And the copy message soon goes away

    Examples:
      | address                     | screenshot                          |
      | /en/share/1/5/uthmani       | AC-6-share-copied-light-desktop     |
      | /ur/share/2/255-257/indopak | AC-6-share-copied-run-light-desktop |

  @AC-6
  Scenario: Without a share sheet, when copying fails, Share shows "Couldn't copy"
    Given my browser has no native share sheet and copying fails
    And I open the Share page "/en/share/18/83-88/uthmani" as its sharer
    When I tap the Share page's "Share" button
    Then the copy message "Couldn't copy" is shown

  @AC-7
  Scenario Outline: Copy text copies <address>: every Shared Ayah in <Script> and <Language>, the translator, the reference and the link
    Given my browser has no native share sheet
    And I open the Share page "<address>" as its sharer
    When I tap the Share page's "Copy text" button
    Then the clipboard holds the Copy text of "<address>"
    And the copy message "Copied" is shown

    Examples:
      | address                            | Script   | Language |
      | /en/share/1/5/uthmani              | Uthmani  | English  |
      | /ur/share/1/5/uthmani              | Uthmani  | Urdu     |
      | /en/share/1/2/indopak              | Indo-Pak | English  |
      | /ur/share/1/2/indopak              | Indo-Pak | Urdu     |
      | /en/share/2/255-257/uthmani        | Uthmani  | English  |
      | /ur/share/2/255-257/indopak        | Indo-Pak | Urdu     |
      | /en/share/18/83-88/indopak/flowing | Indo-Pak | English  |
      | /ur/share/18/83-88/uthmani/flowing | Uthmani  | Urdu     |

  @AC-7
  Scenario: Copy text of a run ending on a sajdah Ayah keeps the sajdah sign in Indo-Pak
    Given my browser has no native share sheet
    And I open the Share page "/en/share/7/204-206/indopak" as its sharer
    When I tap the Share page's "Copy text" button
    Then the clipboard holds the Copy text of "/en/share/7/204-206/indopak"
    And the copied Arabic of Ayah 7:206 carries the sajdah sign U+08DB

  @AC-7
  Scenario: With a native share sheet, Copy text still copies and does not open the sheet
    Given my browser has a native share sheet
    And I open the Share page "/en/share/2/255-257/uthmani" as its sharer
    When I tap the Share page's "Copy text" button
    Then the clipboard holds the Copy text of "/en/share/2/255-257/uthmani"
    And the share sheet did not open
    And the copy message "Copied" is shown

  @AC-7
  Scenario: When copying fails, Copy text shows "Couldn't copy"
    Given my browser has no native share sheet and copying fails
    And I open the Share page "/en/share/2/255-257/uthmani" as its sharer
    When I tap the Share page's "Copy text" button
    Then the copy message "Couldn't copy" is shown

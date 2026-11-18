@issue-132
Feature: Link preview for each Theme page
  A Theme page link pasted into WhatsApp, X or another app shows a Link
  preview made for its Theme: a title naming the Theme in the page's
  Language, a description giving how many Ayahs it has, and a picture drawn
  with next/og in Saaliheen's frame (frame B's look, as each Share page's
  Link preview has, #57) naming the Theme and its number of Ayahs.

  The preview never shows Quranic Arabic (ADR 0007). next/og cannot draw
  the site's Urdu typeface, Dubai, so the picture is in English on both
  Languages' Theme pages, as a Share page's picture is: the Theme's English
  name and its number of Ayahs. The preview tags of an Urdu Theme page name
  the Theme in Urdu, which is not Quranic Arabic. The Themes list has no
  preview of its own: it carries the site's default preview, the same Link
  preview tags as the Surah index, and no picture.

  The steps fetch each page as a link-preview app does, without running
  scripts, and read its preview tags from <head>; the picture's words are read
  from its alt text, its look from its pixels, and the pictures are saved to
  DELIVERY/screens for the reviewer's eye. English Theme names are typed as
  the Themes file holds them; Urdu names, Ayahs and their counts are read from
  the Themes file (data/themes.json), never typed.

  # ---------------------------------------------------------------- AC-1, AC-4: the preview tags, in both Languages

  @AC-1 @AC-4
  Scenario Outline: <app> fetching the Theme page of "<theme>" in <Language> gets Open Graph and Twitter card tags made for it
    When <app> fetches the Theme page of "<theme>" in <Language>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, names the Theme in <Language>
    And the Link preview's description, in both, gives the Theme's number of Ayahs
    And the Link preview's page address is this Theme page's address on "https://saaliheen.com"
    And the Link preview's picture address, in both, is on "https://saaliheen.com" and names this Theme
    And no Link preview tag points anywhere but "https://saaliheen.com"

    Examples:
      | app      | theme                              | Language |
      | WhatsApp | Hypocrisy                          | English  |
      | WhatsApp | Hypocrisy                          | Urdu     |
      | X        | Hypocrisy                          | Urdu     |
      | X        | Elisha                             | English  |
      | WhatsApp | Disbelief                          | Urdu     |
      | WhatsApp | Enjoining Good and Forbidding Evil | English  |

  @AC-1 @AC-4
  Scenario: Each Theme page's Link preview picture has an address of its own
    When WhatsApp fetches the Theme pages of:
      | Hypocrisy in English |
      | Hypocrisy in Urdu    |
      | Lying in English     |
      | Lying in Urdu        |
    Then each Theme page's Link preview picture address differs from every other's

  # ---------------------------------------------------------------- AC-1, AC-4: the picture, in both Languages

  @AC-1 @AC-4
  Scenario Outline: The Link preview picture of the Theme page of "<theme>" in <Language> is a 1200×630 PNG in Saaliheen's frame
    When WhatsApp fetches the Theme page of "<theme>" in <Language>
    Then the Link preview picture's alt text names the Theme's English name and its number of Ayahs
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And the picture has frame B's light look: a dark band along each edge around a light paper sheet
    And I save the Link preview picture as "AC-1-theme-link-preview-<shot>-light-desktop"

    Examples:
      | theme                              | Language | shot          |
      | Hypocrisy                          | English  | hypocrisy-en  |
      | Hypocrisy                          | Urdu     | hypocrisy-ur  |
      | Disbelief                          | English  | disbelief-en  |
      | Enjoining Good and Forbidding Evil | Urdu     | long-name-ur  |

  # ---------------------------------------------------------------- AC-2: no Arabic

  @AC-2
  Scenario Outline: The Link preview of the Theme page of "<theme>" in <Language> holds no Quranic Arabic
    When WhatsApp fetches the Theme page of "<theme>" in <Language>
    Then the Link preview picture's alt text holds no Arabic-script letter at all
    And no Link preview tag holds a Word of the Theme's Ayahs in either Script
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-2-theme-link-preview-<shot>-light-desktop"

    Examples:
      | theme     | Language | shot         |
      | Hypocrisy | English  | hypocrisy-en |
      | Hypocrisy | Urdu     | hypocrisy-ur |
      | Elisha    | Urdu     | elisha-ur    |

  # ---------------------------------------------------------------- AC-3: the Themes list

  @AC-3
  Scenario Outline: The Themes list in <Language> carries the site's default preview
    When WhatsApp fetches the Themes list in <Language>
    Then the page's head carries no Link preview picture
    And its Link preview tags are those of the Surah index in <Language>

    Examples:
      | Language |
      | English  |
      | Urdu     |

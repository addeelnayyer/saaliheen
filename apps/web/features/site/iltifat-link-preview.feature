@issue-144
Feature: Link previews for the Iltifat pages
  A link to an Iltifat page pasted into WhatsApp, X or another app shows a
  Link preview made for that page, built like a Theme page's (#132) and a
  Share page's (#57): Open Graph and Twitter card tags for a large picture,
  and a picture drawn with next/og in Saaliheen's frame (frame B's light
  look). An Iltifat direction page's preview names its Iltifat direction and
  how many Iltifat it has, in its title and in its picture; the Iltifat
  overview's names Iltifat and the total, "310 Iltifat". Disputed Iltifat are
  left out of every count, as the Iltifat pages leave them out.

  The interface of the Iltifat pages is English in both Languages, so both
  Languages' pages carry the same words. No preview holds any Arabic (ADR
  0007): there is no Urdu in them either, so no tag and no alt text holds an
  Arabic-script letter at all.

  The counts are read from Neon on request (ADR 0016), as the pages' own are:
  the build may run without a database. The counts here are the issue's (and
  #138's) words; a step checks each against the run's own Postgres, leaving
  out Disputed Iltifat. The steps fetch each page as a link-preview app does,
  without running scripts, and read its preview tags from <head>; the
  picture's words are read from its alt text, its look from its pixels, and
  the pictures are saved to DELIVERY/screens for the reviewer's eye.

  # ---------------------------------------------------------------- AC-1, AC-4: a direction page's preview tags

  @AC-1 @AC-4
  Scenario Outline: <app> fetching the <direction> page in <Language> gets a Link preview naming the direction and its <count> Iltifat
    When <app> fetches the Iltifat direction page of "<direction>" in <Language>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, holds "<direction>"
    And the Link preview's title, in both, holds "<count> Iltifat"
    And the Link preview has a description, in both
    And <count> is the number of <direction> Iltifat in the run's database that are not Disputed
    And no Link preview tag gives the number of <direction> Iltifat counting the Disputed ones
    And the Link preview's page address is this page's address on "https://saaliheen.com"
    And the Link preview's picture address, in both, is on "https://saaliheen.com", under this page's address
    And no Link preview tag points anywhere but "https://saaliheen.com"

    Examples:
      | app      | direction | count | Language |
      | WhatsApp | He → We   | 144   | English  |
      | X        | He → We   | 144   | Urdu     |
      | WhatsApp | We → He   | 95    | Urdu     |
      | X        | We → He   | 95    | English  |
      | WhatsApp | He → You  | 51    | English  |
      | WhatsApp | He → You  | 51    | Urdu     |
      | X        | You → He  | 20    | English  |
      | WhatsApp | You → He  | 20    | Urdu     |

  # ---------------------------------------------------------------- AC-1, AC-4: a direction page's picture

  @AC-1 @AC-4
  Scenario Outline: The Link preview picture of the <direction> page in <Language> names the direction and its <count> Iltifat
    When WhatsApp fetches the Iltifat direction page of "<direction>" in <Language>
    Then the Link preview picture's alt text holds "<direction>"
    And the Link preview picture's alt text holds "<count> Iltifat"
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-1-iltifat-link-preview-<shot>-light-desktop"

    Examples:
      | direction | count | Language | shot         |
      | He → We   | 144   | English  | he-to-we-en  |
      | We → He   | 95    | English  | we-to-he-en  |
      | He → You  | 51    | Urdu     | he-to-you-ur |
      | You → He  | 20    | English  | you-to-he-en |

  @AC-1 @AC-2 @AC-4
  Scenario: Each Iltifat page's Link preview picture has an address of its own
    When WhatsApp fetches the Iltifat pages of:
      | the overview in English |
      | He → We in English      |
      | We → He in English      |
      | He → You in English     |
      | You → He in English     |
      | the overview in Urdu    |
      | He → We in Urdu         |
    Then each Iltifat page's Link preview picture address differs from every other's

  # ---------------------------------------------------------------- AC-2, AC-4: the overview

  @AC-2 @AC-4
  Scenario Outline: <app> fetching the Iltifat overview in <Language> gets a Link preview naming Iltifat and "310 Iltifat"
    When <app> fetches the Iltifat overview in <Language>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, holds "Iltifat"
    And the Link preview's description, in both, holds "310 Iltifat"
    And 310 is the number of Iltifat in the run's database that are not Disputed
    And no Link preview tag gives the number of Iltifat counting the Disputed ones
    And the Link preview's page address is this page's address on "https://saaliheen.com"
    And the Link preview's picture address, in both, is on "https://saaliheen.com", under this page's address
    And no Link preview tag points anywhere but "https://saaliheen.com"

    Examples:
      | app      | Language |
      | WhatsApp | English  |
      | X        | Urdu     |

  @AC-2 @AC-4
  Scenario Outline: The Link preview picture of the Iltifat overview in <Language> names Iltifat and "310 Iltifat"
    When WhatsApp fetches the Iltifat overview in <Language>
    Then the Link preview picture's alt text holds "Iltifat"
    And the Link preview picture's alt text holds "310 Iltifat"
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-2-iltifat-link-preview-overview-<shot>-light-desktop"

    Examples:
      | Language | shot |
      | English  | en   |
      | Urdu     | ur   |

  # ---------------------------------------------------------------- AC-3: no Arabic, and the existing previews' design

  @AC-3
  Scenario Outline: The Link preview of <page> in <Language> holds no Arabic and is drawn in Saaliheen's frame
    When WhatsApp fetches the Iltifat pages of:
      | <page> in <Language> |
    Then no Link preview tag holds an Arabic-script letter
    And the Link preview picture's alt text holds no Arabic-script letter at all
    And the Link preview names the site "Saaliheen" and is an article, as a Theme page's and a Share page's do
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And the picture has frame B's light look: a dark band along each edge around a light paper sheet
    And I save the Link preview picture as "AC-3-iltifat-link-preview-<shot>-light-desktop"

    Examples:
      | page         | Language | shot         |
      | the overview | English  | overview-en  |
      | the overview | Urdu     | overview-ur  |
      | He → We      | English  | he-to-we-en  |
      | We → He      | Urdu     | we-to-he-ur  |
      | He → You     | English  | he-to-you-en |
      | You → He     | Urdu     | you-to-he-ur |

@issue-57
Feature: Link preview for each Share page
  A Share page link pasted into WhatsApp, X or another app shows a Link
  preview made for its Shared Ayahs: a title naming the Surah and the Ayah
  range, a description, and a picture drawn with next/og in frame B's look
  (the star-pattern band, the paper sheet, the dome and cartouche) with the
  Surah's English name, the Ayah range, the Passage title when the Shared
  Ayahs are exactly one Passage, and the start of the Ayah translation.

  The picture never shows Quranic Arabic (ADR 0007). next/og cannot draw the
  site's Urdu typeface: given Dubai it throws "lookupType: 7 - substFormat: 1
  is not yet supported", as it did given the Urdu typeface before it (stage 1
  probe, DELIVERY/urdu-probe.md; #339). So an Urdu Share page's picture leaves
  out the Ayah translation and shows only the English name, the range and the
  Passage title in English.

  The preview tags and the picture's address use the production site address,
  https://saaliheen.com, wherever the page is served, so these scenarios,
  served from 127.0.0.1, request the picture at the same path on this server.

  Link-preview apps read the page as served, without running scripts, and get
  its preview tags in <head>; the steps fetch it as such an app does. The
  picture's alt text says what the picture shows, so the scenarios read the
  words drawn in it from there; the pictures are saved to DELIVERY/screens
  for the reviewer's eye. Surah names, Passage titles and Ayah translations
  are read from the committed sources, never typed.

  # ---------------------------------------------------------------- AC-1, AC-6: the preview tags

  @AC-1 @AC-6
  Scenario Outline: <app> fetching the Share page of <shared> gets Open Graph and Twitter card tags made for it
    When <app> fetches the Share page of <shared>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, names the Surah's English name and the Ayah range
    And the Link preview has a description, in both
    And the Link preview's page address is this Share page's address on "https://saaliheen.com"
    And the Link preview's picture address, in both, is on "https://saaliheen.com" and names these Shared Ayahs
    And no Link preview tag points anywhere but "https://saaliheen.com"

    Examples:
      | app      | shared                                    |
      | WhatsApp | 18:83–88 in English and Uthmani           |
      | X        | 18:83–88 in English and Uthmani           |
      | WhatsApp | 18:83–88 in Urdu and Indo-Pak, Flowing    |
      | WhatsApp | 2:255 in Urdu and Uthmani                 |
      | X        | 112:1–4 in English and Indo-Pak, Flowing  |

  @AC-1 @AC-6
  Scenario: Each Share page's Link preview picture has an address of its own
    When WhatsApp fetches the Share pages of:
      | 18:83–88 in English and Uthmani |
      | 18:83–87 in English and Uthmani |
      | 18:83–88 in Urdu and Uthmani    |
      | 2:255 in English and Uthmani    |
      | 2:255 in Urdu and Uthmani       |
    Then each Share page's Link preview picture address differs from every other's

  # ---------------------------------------------------------------- AC-2, AC-6: the picture

  @AC-2 @AC-6
  Scenario Outline: The Link preview picture of <shared> is a 1200×630 PNG in frame B's look
    When WhatsApp fetches the Share page of <shared>
    And I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And the picture has frame B's light look: a dark band along each edge around a light paper sheet
    And I save the Link preview picture as "AC-2-link-preview-<shot>-light-desktop"

    Examples:
      | shared                                   | shot          |
      | 18:83–88 in English and Uthmani          | passage-en    |
      | 2:255 in English and Uthmani             | single-en     |
      | 2:282 in English and Uthmani             | long-ayah-en  |
      | 112:1–4 in Urdu and Indo-Pak, Flowing    | run-ur        |

  @AC-2 @AC-5
  Scenario Outline: An English Share page's Link preview picture shows the start of the English Ayah translation
    When WhatsApp fetches the Share page of <shared>
    Then the Link preview picture's alt text names the Surah's English name and the Ayah range
    And the Link preview picture's alt text holds the start of the first Shared Ayah's English Ayah translation

    Examples:
      | shared                                    |
      | 2:255 in English and Uthmani              |
      | 112:1–4 in English and Indo-Pak, Flowing  |

  # ---------------------------------------------------------------- AC-3: the Passage title

  # Passage titles are held back by the Passage headings release switch (#41),
  # as on the Share page itself (#55): the picture shows one only in a build
  # with NEXT_PUBLIC_PASSAGE_HEADINGS=on.
  @AC-3 @passage-headings-on
  Scenario Outline: In <Language>, the Link preview picture shows the Passage title for 18:83–88, exactly a Passage, and not for 18:83–87
    When WhatsApp fetches the Share page of 18:83–88 in <Language> and Uthmani
    Then the Link preview picture's alt text names the Surah's English name and the Ayah range
    And the Link preview picture's alt text names the English Passage title of 18:83–88
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-3-link-preview-passage-title-<lang>-light-desktop"
    When WhatsApp fetches the Share page of 18:83–87 in <Language> and Uthmani
    Then the Link preview picture's alt text names the Surah's English name and the Ayah range
    And the Link preview picture's alt text names no Passage title of Surah 18
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-3-link-preview-no-passage-title-<lang>-light-desktop"

    Examples:
      | Language | lang |
      | English  | en   |
      | Urdu     | ur   |

  @AC-3 @passage-headings-off
  Scenario: With Passage headings held back, the Link preview picture shows no Passage title even for exactly a Passage
    When WhatsApp fetches the Share page of 18:83–88 in English and Uthmani
    Then the Link preview picture's alt text names the Surah's English name and the Ayah range
    And the Link preview picture's alt text names no Passage title of Surah 18

  # ---------------------------------------------------------------- AC-4: no Quranic Arabic

  @AC-4
  Scenario Outline: The Link preview picture of <shared> holds no Quranic Arabic
    When WhatsApp fetches the Share page of <shared>
    Then the Link preview picture's alt text holds none of the Shared Ayahs' Arabic in either Script, nor the Surah's Arabic name
    And the Link preview picture's alt text holds no Arabic-script letter at all
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-4-link-preview-<shot>-light-desktop"

    Examples:
      | shared                                    | shot              |
      | 112:1–4 in English and Uthmani            | uthmani-en        |
      | 112:1–4 in English and Indo-Pak, Flowing  | indopak-en        |
      | 2:255 in Urdu and Indo-Pak                | indopak-ur        |

  # ---------------------------------------------------------------- AC-5: Urdu

  @AC-5
  Scenario Outline: An Urdu Share page's Link preview picture of <shared> is in English, without the Urdu Ayah translation
    When WhatsApp fetches the Share page of <shared>
    Then the Link preview picture's alt text names the Surah's English name and the Ayah range
    And the Link preview picture's alt text holds no Arabic-script letter at all, so not the Urdu Ayah translation
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-5-link-preview-urdu-<shot>-light-desktop"

    Examples:
      | shared                                  | shot    |
      | 2:255 in Urdu and Uthmani               | single  |
      | 18:83–88 in Urdu and Uthmani            | passage |
      | 112:1–4 in Urdu and Indo-Pak, Flowing   | run     |

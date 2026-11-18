@issue-149
Feature: Allah references in gold on Share pages
  On a Share page, the Arabic letters of every Allah reference among the
  Shared Ayahs are drawn in Allah reference colour, the site's --allah gold,
  not the frame's own --gold: #A87A0A in frame B's light look, #E3B84F in its
  dark look. The frame's looks follow the device's colour scheme alone (#55),
  so the gold does too, whatever theme the reader saved. Only the Arabic
  letters of an Allah reference turn gold: no other Word, no Ayah end and no
  translation does. A person who shares Ayahs sees them as they look in
  Quran Analysis (#147).

  A Share page has no Recitation bar and so dims no Ayah of its own. The gold
  is the colour of the Word's letters, so it dims with any Ayah that is
  dimmed: the scenarios dim an Ayah's Words and its end as a dimmed Ayah is
  drawn, and expect the gold of its Allah references to dim with it while the
  other Ayahs' gold stays as it was.

  Copy text and the Link preview are checked against the committed sources
  as the Share page features (#55, #56, #57) check them. A reader who has
  switched Allah reference colour off on this device (#148) sees no gold on
  a Share page either, from the first frame.

  Which Words are Allah references is read from the seeded list
  (features/site/allah-references.json, #147), never typed; a Word's Arabic is
  gold when every letter of it is drawn in the gold of the frame's look. The
  Words' Arabic and the Ayah ends are read from the QUL sources.

  Background:
    Given a browser with no saved reader settings

  # ---------------------------------------------------------------- AC-1: both layouts, both Scripts, both themes

  @AC-1
  Scenario Outline: In the <scheme> colour scheme, <ayahs> in <Language> and <Script>, <layout>, shows every Allah reference's Arabic in gold and no other letter
    Given my system prefers a <scheme> colour scheme
    And I open the Share page of <ayahs> in <Language> and <Script>, <layout>
    Then the Share page shows <ayahs> <layout> in <Script> and <Language>
    And the Share page is drawn in its <scheme> look
    And the Arabic of every Allah reference of <ayahs> in the seeded list is gold on the Share page
    And no other letter of the Arabic of <ayahs> on the Share page is gold
    And I save a screenshot of the Share page "AC-1-<shot>-<scheme>-desktop"

    Examples:
      | ayahs   | Language | Script   | layout       | scheme | shot                        |
      | 1:1–7   | English  | Uthmani  | Ayah by Ayah | light  | fatihah-uthmani-ayah-by-ayah |
      | 1:1–7   | Urdu     | Indo-Pak | Ayah by Ayah | light  | fatihah-indopak-ayah-by-ayah |
      | 1:1–7   | English  | Indo-Pak | Ayah by Ayah | dark   | fatihah-indopak-ayah-by-ayah |
      | 1:1–7   | Urdu     | Uthmani  | Ayah by Ayah | dark   | fatihah-uthmani-ayah-by-ayah |
      | 112:1–4 | English  | Uthmani  | Flowing      | light  | ikhlas-uthmani-flowing      |
      | 112:1–4 | Urdu     | Indo-Pak | Flowing      | light  | ikhlas-indopak-flowing      |
      | 112:1–4 | English  | Indo-Pak | Flowing      | dark   | ikhlas-indopak-flowing      |
      | 112:1–4 | Urdu     | Uthmani  | Flowing      | dark   | ikhlas-uthmani-flowing      |

  @AC-1
  Scenario Outline: In the <scheme> colour scheme, the single Ayah 12:40 in <Script> shows both its Allah references in gold
    Given my system prefers a <scheme> colour scheme
    And I open the Share page of 12:40 in English and <Script>
    Then the Share page shows 12:40 Ayah by Ayah in <Script> and English
    And the Share page is drawn in its <scheme> look
    And the Arabic of every Allah reference of 12:40 in the seeded list is gold on the Share page
    And no other letter of the Arabic of 12:40 on the Share page is gold
    And I save a screenshot of the Share page "AC-1-single-ayah-<script>-<scheme>-desktop"

    Examples:
      | Script   | script  | scheme |
      | Uthmani  | uthmani | light  |
      | Indo-Pak | indopak | light  |
      | Uthmani  | uthmani | dark   |
      | Indo-Pak | indopak | dark   |

  @AC-1
  Scenario: Switching the visitor's Share layout keeps every Allah reference gold in both layouts
    Given I open the Share page of 112:1–4 in English and Uthmani
    When I choose the Flowing Share layout
    Then the Share page shows 112:1–4 Flowing in Uthmani and English
    And the Arabic of every Allah reference of 112:1–4 in the seeded list is gold on the Share page
    When I choose the Ayah by Ayah Share layout
    Then the Share page shows 112:1–4 Ayah by Ayah in Uthmani and English
    And the Arabic of every Allah reference of 112:1–4 in the seeded list is gold on the Share page
    And no other letter of the Arabic of 112:1–4 on the Share page is gold

  @AC-1
  Scenario Outline: Its sharer, with the edit strip, sees <ayahs> in gold too
    Given I open the Share page "<address>" as its sharer
    Then the Arabic of every Allah reference of <ayahs> in the seeded list is gold on the Share page
    And no other letter of the Arabic of <ayahs> on the Share page is gold

    Examples:
      | address                            | ayahs   |
      | /ur/share/112/1-4/indopak/flowing  | 112:1–4 |
      | /en/share/1/1-7/uthmani            | 1:1–7   |
      | /en/share/12/40/uthmani            | 12:40   |

  @AC-1
  Scenario Outline: On a phone, <ayahs> in <Script>, <layout>, shows its Allah references in gold in the <scheme> look
    Given the browser is a phone
    And my system prefers a <scheme> colour scheme
    And I open the Share page of <ayahs> in <Language> and <Script>, <layout>
    Then the Share page shows <ayahs> <layout> in <Script> and <Language>
    And the Arabic of every Allah reference of <ayahs> in the seeded list is gold on the Share page
    And no other letter of the Arabic of <ayahs> on the Share page is gold
    And I save a screenshot of the Share page "AC-1-<shot>-<scheme>-phone"

    Examples:
      | ayahs   | Language | Script   | layout       | scheme | shot                         |
      | 1:1–7   | Urdu     | Indo-Pak | Ayah by Ayah | light  | fatihah-indopak-ayah-by-ayah |
      | 112:1–4 | English  | Uthmani  | Flowing      | dark   | ikhlas-uthmani-flowing       |

  # ---------------------------------------------------------------- AC-2: the --allah token, not the frame's --gold

  @AC-2
  Scenario Outline: In the <scheme> colour scheme, the gold of <ayahs> is the site's --allah token, which is #<hex>, and is not the frame's --gold
    Given my system prefers a <scheme> colour scheme
    And I open the Share page of <ayahs> in English and Uthmani, <layout>
    Then the gold of every Allah reference of <ayahs> on the Share page is the --allah token and not the frame's --gold
    And the Arabic of every Allah reference of <ayahs> in the seeded list is drawn in #<hex> on the Share page

    Examples:
      | ayahs   | layout       | scheme | hex    |
      | 1:1–7   | Ayah by Ayah | light  | A87A0A |
      | 112:1–4 | Flowing      | light  | A87A0A |
      | 1:1–7   | Ayah by Ayah | dark   | E3B84F |
      | 112:1–4 | Flowing      | dark   | E3B84F |

  @AC-2
  Scenario Outline: A saved <Theme> theme does not move the gold of a Share page in the <scheme> colour scheme, as the frame's look follows the device alone
    Given my system prefers a <scheme> colour scheme
    And I open Surah 1 in English
    And I choose the <Theme> theme
    When I open the Share page of 112:1–4 in English and Uthmani
    Then the Share page is drawn in its <scheme> look
    And the Arabic of every Allah reference of 112:1–4 in the seeded list is drawn in #<hex> on the Share page
    And the gold of every Allah reference of 112:1–4 on the Share page is the --allah token and not the frame's --gold

    Examples:
      | scheme | Theme | hex    |
      | light  | Dark  | A87A0A |
      | dark   | Light | E3B84F |

  # ---------------------------------------------------------------- AC-3: the gold dims with a dimmed Ayah

  @AC-3
  Scenario Outline: In Flowing in the <scheme> colour scheme and <Script>, the gold of an Allah reference dims with its Ayah, and the other Ayahs' gold does not
    Given my system prefers a <scheme> colour scheme
    And I open the Share page of 112:1–4 in English and <Script>, Flowing
    And the Arabic of every Allah reference of 112:1–4 in the seeded list is gold on the Share page
    And I note how the Arabic of every Allah reference of 112:1–4 on the Share page is drawn
    When Ayah 112:1 is dimmed on the Share page as an Ayah dimmed in Flowing is
    Then the Arabic of every Allah reference of Ayah 112:1 on the Share page is dimmed
    And the Arabic of every Allah reference of Ayah 112:2 on the Share page is drawn as noted

    Examples:
      | scheme | Script   |
      | light  | Uthmani  |
      | dark   | Uthmani  |
      | light  | Indo-Pak |
      | dark   | Indo-Pak |

  # ---------------------------------------------------------------- AC-4: Copy text is plain Arabic

  @AC-4
  Scenario Outline: Copy text of <address>, which holds Allah references, hands over each Shared Ayah's Arabic as plain text, with no markup or colour
    Given my browser has no native share sheet
    And I open the Share page "<address>" as its sharer
    When I tap the Share page's "Copy text" button
    Then the clipboard holds the Copy text of "<address>"
    And the copied text holds no markup and no colour
    And the copy message "Copied" is shown

    Examples:
      | address                            |
      | /en/share/1/1-7/uthmani            |
      | /ur/share/1/1-7/indopak            |
      | /en/share/12/40/uthmani            |
      | /ur/share/112/1-4/indopak/flowing  |
      | /en/share/112/1-4/uthmani/flowing  |

  # ---------------------------------------------------------------- AC-5: the Link preview is as it was

  @AC-5
  Scenario Outline: The Link preview of <shared>, which holds Allah references, is as before: its tags made for it, and a picture with no Quranic Arabic
    When WhatsApp fetches the Share page of <shared>
    Then the page's head carries Open Graph and Twitter card tags for a Link preview with a large picture
    And the Link preview's title, in both, names the Surah's English name and the Ayah range
    And the Link preview has a description, in both
    And the Link preview's picture address, in both, is on "https://saaliheen.com" and names these Shared Ayahs
    And the Link preview picture's alt text holds none of the Shared Ayahs' Arabic in either Script, nor the Surah's Arabic name
    When I request its Link preview picture address from this server
    Then both its Open Graph and its Twitter card picture address answer with a PNG picture 1200×630
    And I save the Link preview picture as "AC-5-link-preview-<shot>-light-desktop"

    Examples:
      | shared                                | shot            |
      | 1:1–7 in English and Uthmani          | fatihah-uthmani |
      | 112:1–4 in Urdu and Indo-Pak, Flowing | ikhlas-indopak  |
      | 12:40 in English and Indo-Pak         | single-indopak  |

  # ---------------------------------------------------------------- AC-6: the reader's switch

  @AC-6
  Scenario Outline: With Allah reference colour switched off on this device, <ayahs> in <Language> and <Script>, <layout>, shows no gold
    Given I open Surah 1 in English
    And I turn Allah reference colour off
    When I open the Share page of <ayahs> in <Language> and <Script>, <layout>
    Then the Share page shows <ayahs> <layout> in <Script> and <Language>
    And no letter of the Arabic of <ayahs> on the Share page is gold
    And I save a screenshot of the Share page "AC-6-<shot>-light-desktop"

    Examples:
      | ayahs   | Language | Script   | layout       | shot                         |
      | 1:1–7   | English  | Uthmani  | Ayah by Ayah | fatihah-uthmani-ayah-by-ayah |
      | 112:1–4 | Urdu     | Indo-Pak | Flowing      | ikhlas-indopak-flowing       |

  @AC-6
  Scenario: With Allah reference colour switched off, a Share page never draws an Allah reference in gold, even in its first frame, and it is back when the switch is on again
    Given I open Surah 1 in English
    And I turn Allah reference colour off
    When I open the Share page of 112:1–4 in Urdu and Uthmani, Flowing, watching the first frame each Word is drawn in
    Then no Allah reference of 112:1–4 in the seeded list was gold in the first frame it was drawn in on the Share page
    And no letter of the Arabic of 112:1–4 on the Share page is gold
    When I open Surah 112 in English
    And I turn Allah reference colour on
    And I open the Share page of 112:1–4 in English and Uthmani, Flowing
    Then the Arabic of every Allah reference of 112:1–4 in the seeded list is gold on the Share page

  @AC-6
  Scenario: The reader's switch applies to the Share page's sharer view and to a dark colour scheme alike
    Given my system prefers a dark colour scheme
    And I open Surah 1 in English
    And I turn Allah reference colour off
    When I open the Share page "/en/share/1/1-7/uthmani" as its sharer
    Then no letter of the Arabic of 1:1–7 on the Share page is gold

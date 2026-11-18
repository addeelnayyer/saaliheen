@issue-192
Feature: The Share page's brand bar
  A Share page is a dead end for a visitor, so it gets a slim brand bar: the
  brand, linking to the Surah index in the page's Language, and the Language
  switch. It has no tab bar and no Read, Explore or Me. Switching the Language
  keeps the Shared Ayahs, their Script and their Share layout: only the
  Language in the address changes. A sharer who arrived from inside the app
  keeps the edit strip in the other Language; a visitor still gets none.
  Ayah translations are read from the sources.

  @AC-7 @AC-11 @AC-12
  Scenario Outline: On a <viewport> in the <theme> colour theme, the Share page of 1:1–7 shows the brand bar and no destinations
    Given my system prefers a <theme> colour scheme
    And the browser is a <viewport>
    When I open the Share page of 1:1–7 in English and Uthmani
    Then the page's bar holds only the brand and the Language switch
    And the brand bar's brand leads to the Surah index in English
    And no destinations are shown, neither a tab bar nor a top bar
    And the brand bar is drawn in the <theme> colour theme, every word on it readable against its background
    And I save a screenshot of the Share page "AC-7-share-brand-bar-<theme>-<viewport>"

    Examples:
      | viewport | theme |
      | phone    | light |
      | phone    | dark  |
      | desktop  | light |
      | desktop  | dark  |

  @AC-7 @AC-12
  Scenario Outline: The brand bar's Language switch moves <ayahs> from <Language> to <Other>, keeping the Shared Ayahs
    Given I open "<from>"
    When I choose <Other> on the brand bar's Language switch
    Then the address is "<to>"
    And the Share page shows the <Other> Ayah translation of each of <ayahs>
    And the brand bar's brand leads to the Surah index in <Other>

    Examples:
      | ayahs  | Language | Other   | from                            | to                              |
      | 2:1–5  | English  | Urdu    | /en/share/2/1-5/indopak/flowing | /ur/share/2/1-5/indopak/flowing |
      | 1:1–7  | Urdu     | English | /ur/share/1/1-7/uthmani         | /en/share/1/1-7/uthmani         |
      | 2:255  | English  | Urdu    | /en/share/2/255/uthmani         | /ur/share/2/255/uthmani         |

  @AC-7 @AC-12
  Scenario Outline: A sharer who switches the Language from <Language> to <Other> keeps the edit strip and <ayahs>
    Given I open "<from>?edit"
    And the edit strip shows Surah <surah>, from Ayah <first> to Ayah <last>
    When I choose <Other> on the brand bar's Language switch
    Then the address is "<to>"
    And the edit strip shows Surah <surah>, from Ayah <first> to Ayah <last>
    And the Share page shows the <Other> Ayah translation of each of <ayahs>

    Examples:
      | ayahs | Language | Other   | surah | first | last | from                            | to                              |
      | 2:1–5 | English  | Urdu    | 2     | 1     | 5    | /en/share/2/1-5/indopak/flowing | /ur/share/2/1-5/indopak/flowing |
      | 1:1–7 | Urdu     | English | 1     | 1     | 7    | /ur/share/1/1-7/uthmani         | /en/share/1/1-7/uthmani         |

  @AC-7 @AC-12
  Scenario: A visitor who switches the Language still gets no edit strip
    Given I open "/en/share/2/255/uthmani"
    When I choose Urdu on the brand bar's Language switch
    Then the address is "/ur/share/2/255/uthmani"
    And the Share page shows the Urdu Ayah translation of each of 2:255
    And there is no edit strip

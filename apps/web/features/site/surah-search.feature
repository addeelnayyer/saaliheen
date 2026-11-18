@AC-3-8
Feature: Searching the Surah index by name or number
  Typing a Surah's name, part of it, or its number into the Surah index's
  search box narrows the list to the Surahs that match, the same way in both
  Languages: a search in Arabic letters matches the Arabic names, any other
  the Latin names. Arabic names are found as an Urdu keyboard types them and
  without their article; Latin names without their hyphens. Numbers are found
  in Western or Urdu digits.

  @AC-3-4
  Scenario Outline: On the <Language> index, a Latin name or part of one narrows the list to the matching Surahs
    Given I open the Surah index in <Language>
    When I search for Surah 2's Latin name
    Then the index shows exactly the Surahs whose Latin name contains the search, among them Surah 2
    When I search for the last part of Surah 18's Latin name, in lower case
    Then the index shows exactly the Surahs whose Latin name contains the search, among them Surah 18
    When I clear the search
    Then the index cards are all 114 Surahs in order

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-4
  Scenario Outline: On the <Language> index, an Arabic name narrows the list to the matching Surahs
    Given I open the Surah index in <Language>
    When I search for Surah 2's Arabic name
    Then the index shows exactly the Surahs whose Arabic name contains the search, among them Surah 2
    When I clear the search
    Then the index cards are all 114 Surahs in order

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-4
  Scenario Outline: On the <Language> index, Surah <Surah>'s name typed on an Urdu keyboard, with or without its article, finds that Surah
    Given I open the Surah index in <Language>
    When I search for Surah <Surah>'s Arabic name as an Urdu keyboard types it
    Then the index shows only Surah <Surah>
    When I search for Surah <Surah>'s Arabic name as an Urdu keyboard types it, without its article
    Then the index shows only Surah <Surah>
    When I clear the search
    Then the index cards are all 114 Surahs in order

    Examples:
      | Language | Surah |
      | Urdu     | 36    |
      | Urdu     | 2     |
      | Urdu     | 18    |
      | Urdu     | 1     |
      | English  | 36    |
      | English  | 18    |

  @AC-3-4
  Scenario Outline: On the <Language> index, Surah <Surah>'s Latin name typed without its hyphens finds that Surah
    Given I open the Surah index in <Language>
    When I search for Surah <Surah>'s Latin name in lower case, with its hyphens removed
    Then the index shows only Surah <Surah>
    When I search for Surah <Surah>'s Latin name in lower case, with its hyphens spaced
    Then the index shows only Surah <Surah>

    Examples:
      | Language | Surah |
      | English  | 36    |
      | English  | 18    |
      | Urdu     | 36    |

  @AC-3-4
  Scenario Outline: On the <Language> index, a search nothing matches shows no Surah cards
    Given I open the Surah index in <Language>
    When I search for "zzzz"
    Then the index shows no Surah cards

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-4
  Scenario Outline: On the <Language> index, a Surah number narrows the list to that Surah
    Given I open the Surah index in <Language>
    When I search for "36"
    Then the index shows only Surah 36
    When I search for "114"
    Then the index shows only Surah 114

    Examples:
      | Language |
      | Urdu     |
      | English  |

  @AC-3-4
  Scenario Outline: On the <Language> index, a Surah number typed in Urdu digits narrows the list to that Surah
    Given I open the Surah index in <Language>
    When I search for Surah 36's number in Urdu digits
    Then the index shows only Surah 36

    Examples:
      | Language |
      | Urdu     |
      | English  |

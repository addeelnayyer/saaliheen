@issue-192
Feature: Privacy, Terms and Credits keep the reader's Language
  A reader reaches Credits, Privacy and Terms from Me. Every link on those
  pages that leads into the site keeps the reader's Language in its address,
  so following any of them never switches the reader from Urdu to English or
  back: no bare "/", no hard-coded /ur/credits.

  @AC-8 @AC-12
  Scenario Outline: Reached from Me in <Language>, <document> keeps <Language> in every link into the site
    Given I open Me in <Language>
    When I follow Me's "<document>"
    Then the page's heading reads "<heading>"
    And every link on the page into this site keeps <Language> in its address
    When I follow the page's brand
    Then I am on the Surah index in <Language>

    Examples:
      | Language | document | heading          |
      | Urdu     | Privacy  | Privacy policy   |
      | English  | Privacy  | Privacy policy   |
      | Urdu     | Terms    | Terms of service |
      | English  | Terms    | Terms of service |
      | Urdu     | Credits  | Credits          |
      | English  | Credits  | Credits          |

  @AC-8
  Scenario Outline: From Terms in <Language>, the link to Credits opens Credits in <Language>
    Given I open Me in <Language>
    When I follow Me's "Terms"
    And I follow the page's link "Credits"
    Then I am on the credits page in <Language>

    Examples:
      | Language |
      | Urdu     |
      | English  |

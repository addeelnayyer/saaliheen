Feature: Privacy policy and terms of service
  The site has a privacy policy at /privacy and terms of service at /terms,
  the links Google's sign-in setup asks for (#50). They have no Language: one
  English page each, framed by the brand alone. In a Language they are also at
  /<lang>/privacy and /<lang>/terms (#192), and each Surah index links to its
  own Language's from a footer line, so following them keeps the Language.

  @AC-50-1 @AC-50-2
  Scenario: The privacy policy names who runs the site, how to reach them and what it handles
    Given I open the site document "/privacy"
    Then the page is found
    And the page's lang is "en" and its dir is "ltr"
    And the page's heading reads "Privacy policy"
    And the page names "Last updated"
    And the page names each of these sources:
      | Adeel Nayyer Sheikh   |
      | contact@saaliheen.com |
      | no cookies            |
      | Vercel                |
      | email address         |
    And the brand links to "/"
    And the page is captured as the evidence screen "AC-50-1-privacy-light-desktop"

  @AC-50-1 @AC-50-2
  Scenario: The terms of service name the sources, the warranty and the governing law
    Given I open the site document "/terms"
    Then the page is found
    And the page's lang is "en" and its dir is "ltr"
    And the page's heading reads "Terms of service"
    And the page names "Last updated"
    And the page names each of these sources:
      | Adeel Nayyer Sheikh   |
      | contact@saaliheen.com |
      | QUL                   |
      | without any warranty  |
      | invitation            |
      | laws of Pakistan      |
    And the brand links to "/"
    And the page is captured as the evidence screen "AC-50-1-terms-light-desktop"

  @AC-50-3
  Scenario Outline: The <Language> Surah index links to the privacy policy and the terms in <Language>
    Given I open the Surah index in <Language>
    When I follow the footer link "Privacy"
    Then I am on the site document "/<lang>/privacy"
    And the page's heading reads "Privacy policy"
    When I open the Surah index in <Language>
    And I follow the footer link "Terms"
    Then I am on the site document "/<lang>/terms"
    And the page's heading reads "Terms of service"

    Examples:
      | Language | lang |
      | Urdu     | ur   |
      | English  | en   |

  @AC-50-4
  Scenario Outline: The <document> reads well on a phone
    Given I open the site document "<document>"
    When I view the page on a 390×844 phone
    Then the page does not scroll horizontally
    And the page is captured as the evidence screen "AC-50-4-<name>-light-phone"

    Examples:
      | document | name    |
      | /privacy | privacy |
      | /terms   | terms   |

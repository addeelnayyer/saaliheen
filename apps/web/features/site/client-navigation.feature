@issue-192
Feature: In-app links navigate inside the app
  Links from one in-app page to another navigate inside the app, without the
  browser loading a new page, so Surahs and Theme pages open in parts
  (ADR 0005, ADR 0014): the Iltifat overview's cards, an Iltifat page's link
  to all Iltifat and its entry headings, a Theme page's Passage group headings
  and Ayah links, the Share page's "Read this in Quran Analysis", and the Root
  dialog's Word locations. Each scenario notes the page it starts on, and
  checks the browser is still on that same page load once it has arrived.

  @AC-9 @AC-12
  Scenario: The Iltifat overview's card opens its Iltifat direction page without loading a new page
    Given I open "/en/iltifat"
    And I note the page as it is loaded now
    When I follow the Iltifat overview's card for "He → You"
    Then I am on the Iltifat page "/en/iltifat/he-to-you"
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: An Iltifat direction page's link to all Iltifat opens the overview without loading a new page
    Given I open "/ur/iltifat/we-to-he"
    And I note the page as it is loaded now
    When I follow the Iltifat page's link to all Iltifat
    Then I am on the Iltifat overview in Urdu
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: An Iltifat entry's heading opens its Surah without loading a new page
    Given I open "/en/iltifat/he-to-you"
    And I note the page as it is loaded now
    When I follow the heading of the He → You Iltifat at 2:23–25
    Then I am on "/en/2" at Ayah 2:25
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: A Theme page's Passage group heading opens its Surah without loading a new page
    Given I open "/en/themes/extravagance"
    And I note the page as it is loaded now
    When I follow the heading of the Passage group 17:26–30
    Then I am on "/en/17" at Ayah 17:26
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: A Theme page's Ayah link opens its Surah without loading a new page
    Given I open "/en/themes/extravagance"
    And I note the page as it is loaded now
    When I follow the link of Ayah 17:29
    Then I am on "/en/17" at Ayah 17:29
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: The Share page's "Read this in Quran Analysis" opens the Surah without loading a new page
    Given I open the Share page of 1:1–7 in English and Uthmani
    And I note the page as it is loaded now
    When I follow the page's link "Read this in Quran Analysis"
    Then I am on "/en/1" at Ayah 1:1
    And the browser did not load a new page

  @AC-9 @AC-12
  Scenario: A Root dialog's Word location in another Surah opens it without loading a new page
    Given I open "/en/1"
    And I note the page as it is loaded now
    When I open the Root tag on the Word card at 1:1:3
    And I choose the Word location 2:163:8 in the Root dialog
    Then I am on "/en/2#2:163:8"
    And the browser did not load a new page

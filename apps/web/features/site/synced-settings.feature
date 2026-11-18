@AC-6 @issue-70
Feature: Script and Language follow an Account between browsers
  A signed-in person's Script and Language follow them to every browser and
  phone signed in to the same Account; Arabic size and Meaning size stay on
  each device and are never synced. The Account keeps them through the
  versioned API's settings resource (/api/v1/settings). Each page a signed-in
  browser opens shows the Account's Script, and the Account's Language: a page
  opened in the other Language moves to the Account's, at the same place, as
  the Language switch does, keeping a look-up's Word location or a shared
  Ayah. Choosing a Script or switching Language in a signed-in browser saves
  it to the Account, and the next page another signed-in browser opens, or
  reloads, shows it. Signing in brings the Account's Script and Language to
  the device; an Account that has none yet takes the device's.

  "Two browsers" are two separate browser contexts, as a phone and a computer
  are, each signed in to the Account through the Account test-only sign-in
  (features/site/account-settings.ts), each starting with no saved reader
  settings. "Turning to" a browser waits for the other's saves to the API to
  finish, as a person picking up their other device does.

  @AC-1
  Scenario: Choosing a Script in one signed-in browser applies in the other
    Given two browsers with no saved reader settings, both signed in to an Account as "script-sync@saaliheen.test"
    When I turn to the first browser
    And I open "/en/1"
    And I choose the Indo-Pak Script
    And I turn to the second browser
    And I open "/en/1"
    Then the Indo-Pak Script is selected and Uthmani is not
    And every Al-Fatihah Word card shows its Word meaning and only its Indo-Pak text
    When I reload the page
    Then the Indo-Pak Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Indo-Pak text
    When I turn to the first browser
    And I choose the Uthmani Script
    And I turn to the second browser
    And I reload the page
    Then the Uthmani Script is selected and Indo-Pak is not
    And every Al-Fatihah Word card shows its Word meaning and only its Uthmani text

  @AC-1
  Scenario Outline: Switching Language in one signed-in browser brings the other from <opened> to <landed>
    Given two browsers with no saved reader settings, both signed in to an Account as "<email>"
    When I turn to the first browser
    And I open "/en/1"
    And I switch Language to Urdu
    Then I am on "/ur/1" with nothing added to the URL
    When I turn to the second browser
    And I open "<opened>"
    Then this browser is on "<landed>"
    And the Word card at <word> shows its Urdu Word meaning
    When I reload the page
    Then this browser is on "<landed>"

    Examples:
      | email                          | opened       | landed       | word    |
      | language-surah@saaliheen.test  | /en/2        | /ur/2        | 2:1:1   |
      | language-lookup@saaliheen.test | /en/18#18:10:3 | /ur/18#18:10:3 | 18:10:3 |

  @AC-1
  Scenario Outline: Switching Language back in one signed-in browser brings the other back on its next page, from the <page>
    Given two browsers with no saved reader settings, both signed in to an Account as "<email>"
    When I turn to the first browser
    And I open "/en/1"
    And I switch Language to Urdu
    And I turn to the second browser
    And I open "<urdu>"
    Then this browser is on "<urdu>"
    When I turn to the first browser
    And I switch Language to English
    And I turn to the second browser
    And I reload the page
    Then this browser is on "<english>"

    Examples:
      | email                          | page          | urdu  | english |
      | language-back-1@saaliheen.test | Surah page    | /ur/2 | /en/2   |
      | language-back-2@saaliheen.test | Surah index   | /ur   | /en     |

  @AC-2
  Scenario Outline: Signing in brings the Account's <Script> Script and <Language> Language to a device that had <device script> in <device language>
    Given the Account "<email>" has the Script <Script> and the Language <Language>
    And a browser with no saved reader settings
    And I open "/<device lang>/1"
    And I choose the <device script> Script
    When I sign in to the Account as "<email>" on the <device language> test sign-in page
    Then the Sign-in page I land on is in <Language>
    When I open "/<device lang>/1"
    Then this browser is on "/<lang>/1"
    And the <Script> Script is selected and <device script> is not
    And every Al-Fatihah Word card shows its Word meaning and only its <Script> text
    When I reload the page
    Then this browser is on "/<lang>/1"
    And the <Script> Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its <Script> text

    Examples:
      | email                        | Script   | Language | lang | device script | device language | device lang |
      | sign-in-indopak@saaliheen.test | Indo-Pak | Urdu     | ur   | Uthmani       | English         | en          |
      | sign-in-uthmani@saaliheen.test | Uthmani  | English  | en   | Indo-Pak      | Urdu            | ur          |

  @AC-2
  Scenario: Signing in for the first time gives a new Account the device's Script and Language, which then follow it to another browser
    Given a browser with no saved reader settings
    And I open "/ur/1"
    And I choose the Indo-Pak Script
    When I sign in to the Account as "first-sign-in@saaliheen.test" on the Urdu test sign-in page
    Then the Sign-in page I land on is in Urdu
    And the Account "first-sign-in@saaliheen.test" has the Script Indo-Pak and the Language Urdu, as the API answers
    When a second browser with no saved reader settings signs in to the Account as "first-sign-in@saaliheen.test"
    And I open "/en/1"
    Then this browser is on "/ur/1"
    And the Indo-Pak Script is selected
    And every Al-Fatihah Word card shows its Word meaning and only its Indo-Pak text

  @AC-3
  Scenario: Arabic size and Meaning size chosen in one signed-in browser stay in that browser
    Given two browsers with no saved reader settings, both signed in to an Account as "sizes-sync@saaliheen.test"
    When I turn to the first browser
    And I open "/en/1"
    And I set Arabic size to 130%
    And I set Meaning size to 115%
    And I choose the Indo-Pak Script
    And I turn to the second browser
    And I open "/en/1"
    Then the Indo-Pak Script is selected
    And Arabic size shows 100% and Meaning size shows 100%
    And the page's root element carries data-arabic-size "100" and data-meaning-size "100"
    When I set Arabic size to 150%
    And I set Meaning size to 85%
    And I turn to the first browser
    And I reload the page
    Then Arabic size shows 130% and Meaning size shows 115%
    And the page's root element carries data-arabic-size "130" and data-meaning-size "115"

  @AC-2 @AC-3
  Scenario: Signing in keeps the device's own Arabic size and Meaning size
    Given the Account "sign-in-sizes@saaliheen.test" has the Script Indo-Pak and the Language English
    And a browser with no saved reader settings
    And I open "/en/1"
    And I set Arabic size to 150%
    And I set Meaning size to 85%
    When I sign in to the Account as "sign-in-sizes@saaliheen.test" on the English test sign-in page
    And I open "/en/1"
    Then the Indo-Pak Script is selected
    And Arabic size shows 150% and Meaning size shows 85%
    And the page's root element carries data-arabic-size "150" and data-meaning-size "85"

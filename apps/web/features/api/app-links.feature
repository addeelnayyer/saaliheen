@issue-76
Feature: The website tells phones that the app opens Share page links
  A Share page link on https://saaliheen.com opens in the app on a phone that
  has it, and in the browser on one that has not. A phone trusts the app with
  the website's links only when the website says so: iOS fetches
  /.well-known/apple-app-site-association, which names the app by its Apple
  team and its bundle ID and claims the paths it opens; Android fetches
  /.well-known/assetlinks.json, which names the app by its package and the
  fingerprint of the certificate it is signed with. The website builds both
  from its settings APPLE_TEAM_ID and ANDROID_SHA256, and claims for the app
  only Share page links, so every other page still opens in the browser.

  These scenarios fetch both files over HTTP from the production build served
  against the run's own Postgres (features/api/serve-api.ts), with the test
  team and certificate of features/site/app-link-settings.ts.

  @AC-5
  Scenario: The Apple app site association names the app and claims only Share page links
    When a phone fetches /.well-known/apple-app-site-association
    Then it answers 200 with JSON, without a redirect
    And its app links name only the app com.saaliheen.app of the configured Apple team
    And those app links claim these addresses on saaliheen.com, and no others of them:
      | address                           | claimed |
      | /en/share/2/255/uthmani           | yes     |
      | /ur/share/18/83-88/indopak        | yes     |
      | /en/share/2/255-257/uthmani/flowing | yes   |
      | /en/2                             | no      |
      | /ur                               | no      |
      | /en/themes                        | no      |
      | /en/explore                       | no      |
      | /privacy                          | no      |
      | /data/v1/surahs.json              | no      |
      | /data/v1/manifest.json            | no      |

  @AC-5
  Scenario: The Android asset links name the app and the configured signing certificate
    When a phone fetches /.well-known/assetlinks.json
    Then it answers 200 with JSON, without a redirect
    And it lets only the app com.saaliheen.app, signed with the configured certificate, handle the website's links

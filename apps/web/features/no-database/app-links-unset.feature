@issue-76
Feature: Without the app's signing settings the website still builds and answers its app-link files
  The website builds /.well-known/apple-app-site-association and
  /.well-known/assetlinks.json from APPLE_TEAM_ID and ANDROID_SHA256. A
  deploy, a preview or a developer's machine may have neither: then the site
  still builds, and both files still answer, claiming no app, so every Share
  page link opens in the browser.

  This scenario fetches both files from the production build that
  features/no-database/serve-without-database.ts builds and serves with
  APPLE_TEAM_ID and ANDROID_SHA256 unset.

  @AC-5
  Scenario: With APPLE_TEAM_ID and ANDROID_SHA256 unset the site builds, and both app-link files answer, claiming no app
    Given the site was built and is served without APPLE_TEAM_ID or ANDROID_SHA256
    When a phone fetches /.well-known/apple-app-site-association and /.well-known/assetlinks.json
    Then each answers 200 with JSON, without a redirect
    And the Apple app site association names no app
    And the Android asset links name no app

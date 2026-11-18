@issue-171
Feature: Pages that read Passages are built and served without Neon
  Passages and Phrases live in Neon (#171), and every page that shows them
  reads them on request, never at build: `pnpm build` runs without a
  database, before the deploy runs `db:migrate`. So with Neon unreachable for
  the whole build the site still builds; a Surah page or a Share page never
  cached answers the error page with a Retry rather than a page without its
  Passages, and shows no Passage title read from anywhere else.

  These scenarios drive, in a browser, a production build made and served
  with its database unreachable
  (features/no-database/serve-without-database.ts). The Passage titles the
  pages must not show are Surah 18's, as the Passages file was last committed
  before it moved into Neon.

  @AC-6
  Scenario Outline: <address>, built and served with Neon unreachable, shows the error page with Retry and no Passage title
    Given the site was built and is served with its database unreachable
    When I open "<address>"
    Then the page answers 200
    And the page says it could not be loaded and offers Retry
    And the page shows none of Surah 18's Passage titles in <Language>, in its text or its title

    Examples:
      | address                   | Language |
      | /en/18                    | English  |
      | /ur/18                    | Urdu     |
      | /en/share/18/83-88/uthmani | English  |
      | /ur/share/18/83-88/uthmani | Urdu     |

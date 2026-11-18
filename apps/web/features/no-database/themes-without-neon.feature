@issue-170
Feature: Pages that read Themes are built without Neon and left to render on request
  Themes live in Neon (ADR 0037), and every page that shows them reads them
  on request, never at build (ADR 0016, ADR 0020): `pnpm build` runs without
  a database, before the deploy runs `db:migrate`. So with Neon unreachable
  for the whole build the site still builds, and its build output holds none
  of those pages: the Themes list, the Theme pages, Theme openings and Theme
  parts, Explore (which counts the Theme categories), the Surah pages, Surah
  openings and Surah parts (which carry each Ayah's Theme chips), and the
  published Surah files and manifest (whose Ayahs carry their Themes).

  A Theme page's Link preview picture is asked for at build too: Next.js runs
  its `generateImageMetadata` for each Language with no Theme slug, and it
  must answer no picture then rather than read Neon (ADR 0026), or the build
  fails.

  This scenario reads the build output (.next/prerender-manifest.json) of the
  production build made and served with its database unreachable
  (features/no-database/serve-without-database.ts).

  @AC-4
  Scenario: With Neon unreachable the site still builds, and prerenders no page that reads Themes
    Given the site was built and is served with its database unreachable
    Then the build prerendered none of these pages, in either Language:
      | page                     | address                            |
      | the Themes list          | /<lang>/themes                     |
      | a Theme page             | /<lang>/themes/<slug>              |
      | a Theme opening          | /<lang>/opening/themes/<slug>      |
      | a Theme part             | /parts/<lang>/themes/<slug>/<part> |
      | a Theme's Link preview   | /<lang>/themes/<slug>/<picture>    |
      | Explore                  | /<lang>/explore                    |
      | a Surah page             | /<lang>/<surah>                    |
      | a Surah opening          | /<lang>/opening/<surah>            |
      | a Surah part             | /parts/<lang>/<surah>/<part>       |
      | a published Surah file   | /data/v1/surahs/<surah>.json       |
      | the published manifest   | /data/v1/manifest.json             |

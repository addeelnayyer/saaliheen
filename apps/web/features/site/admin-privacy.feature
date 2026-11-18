Feature: The admin area stays out of sight of readers and search engines
  The admin area is not linked from the reading site and every admin page
  tells search engines not to index it, by a robots meta tag or an
  X-Robots-Tag header. Admin pages are rendered on demand for whoever is signed in;
  the reading pages stay static, served from Next's cache as to any reader.

  @AC-4
  Scenario Outline: <Page> tells search engines not to index it
    Given I am <Who>
    When I fetch "<Path>" as this browser
    Then the page it ends on is an admin page that tells search engines not to index it

    Examples:
      | Page                          | Who                                                       | Path                |
      | The "not an Admin" page       | signed in as "reader@saaliheen.test", who is not an Admin | /admin              |
      | The Surah picker              | signed in as the Admin "admin@saaliheen.test" via GitHub  | /admin              |
      | The Passage editor of Surah 18 | signed in as the Admin "admin@saaliheen.test" via GitHub  | /admin/18           |

  @AC-12
  Scenario: The reading site has no link to the admin area
    Then none of these reading pages, served or as shown, links to the admin area:
      | /ur         |
      | /en         |
      | /ur/1       |
      | /en/1       |
      | /ur/18      |
      | /en/114     |
      | /ur/credits |
      | /en/credits |

  @AC-6
  Scenario: Reading pages are still served as static pages, even to a signed-in Admin
    Given I am signed in as the Admin "admin@saaliheen.test" via GitHub
    Then these reading pages are served as static pages from Next's cache, setting no cookie:
      | /ur         |
      | /en         |
      | /ur/1       |
      | /en/18      |
      | /ur/114     |
      | /en/credits |

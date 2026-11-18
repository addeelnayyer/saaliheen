// #170 AC-6: a Theme page in Next's cache is served while the database refuses
// every connection (ADR 0020, ADR 0040); one never rendered is the error page
// with Retry, kept for a second only, so it is the Theme page again soon after
// the database answers. The run's Postgres
// (../site/test-database.ts) is made to refuse connections to its database, as
// an unreachable Neon does, and takes them again after each scenario.

import { execFileSync } from "node:child_process";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { Client } from "pg";
import { expect } from "vitest";
import { committedThemes } from "../site/committed-output.ts";
import { testDatabase } from "../site/test-database.ts";
import { baseURL } from "./support";

const feature = await loadFeature("./themes-when-neon-is-unreachable.feature");

const LANGUAGE: Record<string, "ur" | "en"> = { Urdu: "ur", English: "en" };

const db = () => testDatabase(Number(process.env.PORT));

/** Run `sql` as the container's superuser in its `postgres` database, never the site's. */
const asSuperuser = (sql: string) =>
  execFileSync("docker", ["exec", db().container, "psql", "-U", "saaliheen", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });

/** The site's database refuses every new connection, and those it has are closed. */
function refuseConnections() {
  asSuperuser("alter database saaliheen_test allow_connections false");
  asSuperuser("select pg_terminate_backend(pid) from pg_stat_activity where datname = 'saaliheen_test' and pid <> pg_backend_pid()");
}

const takeConnections = () => asSuperuser("alter database saaliheen_test allow_connections true");

/** The text of the page's first heading, its tags dropped. */
const heading = (html: string) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, "").trim();

/** Whether `html` is the error page: its alert saying the page could not be loaded, with a Retry button. */
const isErrorPage = (html: string) =>
  /<div[^>]*role="alert"[^>]*>[\s\S]*?could not be loaded[\s\S]*?<button[^>]*>Retry<\/button>/.test(html);

const NOINDEX = /<meta name="robots" content="[^"]*noindex/;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The database refuses every connection, and a client trying one is refused. */
async function databaseRefuses() {
  refuseConnections();
  const client = new Client({ connectionString: db().url, connectionTimeoutMillis: 5_000 });
  await expect(client.connect(), "the database still takes connections").rejects.toThrow();
  await client.end().catch(() => undefined);
}

/** The committed name of Theme `slug` in `lang`. */
function themeName(slug: string, lang: "ur" | "en") {
  const theme = committedThemes().themes.find((t) => t.slug === slug);
  expect(theme, `no committed Theme ${slug}`).toBeDefined();
  return theme![lang];
}

const fetchPage = async (path: string) => {
  const res = await fetch(`${baseURL()}${path}`);
  return { status: res.status, cache: res.headers.get("x-nextjs-cache"), html: await res.text() };
};

/**
 * Pages a scenario left as the error page in Next's cache. Once the database
 * answers again each is asked for until it is its Theme page again, so that no
 * later feature (the warm-up's) is served the error page kept from this one.
 */
const leftAsErrorPages = new Set<string>();

async function redrawn(path: string) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await pause(1_100);
    if (!isErrorPage((await fetchPage(path)).html)) return;
  }
  throw new Error(`${path} is still the error page after the database answered again`);
}

describeFeature(feature, ({ ScenarioOutline, AfterEachScenario }) => {
  AfterEachScenario(async () => {
    takeConnections();
    for (const path of leftAsErrorPages) await redrawn(path);
    leftAsErrorPages.clear();
  });

  ScenarioOutline(
    "The Theme page of <theme> in <Language>, once rendered, is still served when Neon cannot answer",
    ({ Given, When, Then, And }, variables) => {
      const lang = LANGUAGE[variables.Language];
      const path = `/${lang}/themes/${variables.theme}`;
      let served: Awaited<ReturnType<typeof fetchPage>>;

      Given('the Theme page of "<theme>" in <Language> has been rendered into Next\'s cache', async () => {
        const first = await fetchPage(path);
        expect(first.status, `${path} did not render`).toBe(200);
        const again = await fetchPage(path);
        expect(again.cache, `${path} was not kept in the cache`).toBe("HIT");
      });
      When("the database refuses every connection", databaseRefuses);
      Then('the Theme page of "<theme>" in <Language> answers 200 from Next\'s cache', async () => {
        served = await fetchPage(path);
        expect(served.status).toBe(200);
        expect(served.cache).toBe("HIT");
      });
      And("it is headed with the Theme's name in <Language>, and is not the error page", () => {
        expect(heading(served.html)).toContain(themeName(variables.theme, lang));
        expect(served.html).not.toMatch(NOINDEX);
      });
    },
  );

  // Nothing can show that a page has not been rendered without rendering it:
  // these Themes are ones no other scenario asks for, and this feature runs
  // before the warm-up's, which renders every Theme page (vitest.api.config.ts).
  const NOT_RENDERED = 'the Theme page of "<theme>" in <Language> has not been rendered';

  ScenarioOutline(
    "The Theme page of <theme> in <Language>, never rendered, is the error page with Retry when Neon cannot answer",
    ({ Given, When, Then, And }, variables) => {
      const path = `/${LANGUAGE[variables.Language]}/themes/${variables.theme}`;
      let served: Awaited<ReturnType<typeof fetchPage>>;

      Given(NOT_RENDERED, () => {});
      When("the database refuses every connection", databaseRefuses);
      Then('the Theme page of "<theme>" in <Language> answers 200', async () => {
        leftAsErrorPages.add(path);
        served = await fetchPage(path);
        expect(served.status).toBe(200);
      });
      And("it is the error page: an alert that says the page could not be loaded, with a Retry button", () => {
        expect(isErrorPage(served.html), `${path} is not the error page`).toBe(true);
        expect(heading(served.html), `${path} is headed as a Theme page`).toBeUndefined();
      });
      And("it is kept out of search engines", () => {
        expect(served.html).toMatch(NOINDEX);
      });
    },
  );

  ScenarioOutline(
    "The Theme page of <theme> in <Language>, drawn as the error page, is the Theme page again soon after Neon answers",
    ({ Given, When, Then, And }, variables) => {
      const lang = LANGUAGE[variables.Language];
      const path = `/${lang}/themes/${variables.theme}`;
      const isThemePage = (page: Awaited<ReturnType<typeof fetchPage>>) =>
        page.status === 200 && !isErrorPage(page.html) && (heading(page.html) ?? "").includes(themeName(variables.theme, lang));

      Given(NOT_RENDERED, () => {});
      And("the database refuses every connection", databaseRefuses);
      And('the Theme page of "<theme>" in <Language> is the error page', async () => {
        leftAsErrorPages.add(path);
        const page = await fetchPage(path);
        expect(page.status).toBe(200);
        expect(isErrorPage(page.html), `${path} is not the error page`).toBe(true);
      });
      When("the database takes connections again", () => {
        takeConnections();
      });
      And("more than a second passes", () => pause(1_500));
      Then(
        'within two requests the Theme page of "<theme>" in <Language> is headed with the Theme\'s name in <Language>, and is not the error page',
        async () => {
          // The first may still be the error page, kept while it is drawn
          // again behind it; the next, given that time, is the Theme page.
          const first = await fetchPage(path);
          if (isThemePage(first)) return;
          await pause(2_000);
          const second = await fetchPage(path);
          expect(isThemePage(second), `${path} is still not the Theme page (${second.cache})`).toBe(true);
        },
      );
      And("later requests for it are served from Next's cache as the Theme page", async () => {
        for (let i = 0; i < 2; i++) {
          const later = await fetchPage(path);
          expect(later.cache).toBe("HIT");
          expect(isThemePage(later), `${path} was not the Theme page`).toBe(true);
          expect(later.html).not.toMatch(NOINDEX);
        }
      });
    },
  );
});

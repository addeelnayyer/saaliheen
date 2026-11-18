// #170 AC-7: `pnpm dev` starts, migrates and keeps its own Postgres, and a
// DATABASE_URL overrides it (ADR 0041). `pnpm dev` is started here as a
// developer starts it, on PORT, with the dev Postgres's container and volume
// renamed and its port moved for the run.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { CONTENT_MIGRATIONS } from "../../scripts/content/migrations.ts";
import { committedThemes } from "../site/committed-output.ts";
import { startTestDatabase, stopTestDatabase, testDatabase } from "../site/test-database.ts";
import { WEB, devContainers, devDatabase, devVolumes, docker, query, removeDevDatabase, runningDev, sitePort, startDev, stopDev } from "./dev-support.ts";

const feature = await loadFeature("./dev-database.feature");

/** The text of the page's first heading, its tags dropped. */
const heading = (html: string) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, "").trim();

const LANGUAGE: Record<string, "ur" | "en"> = { Urdu: "ur", English: "en" };

/** Theme `slug`'s page in `lang` from `pnpm dev`: its status and heading. */
async function themePage(slug: string, lang: "ur" | "en") {
  const res = await fetch(`http://127.0.0.1:${sitePort()}/${lang}/themes/${slug}`);
  return { status: res.status, heading: heading(await res.text()) };
}

const renameTheme = (url: string, slug: string, en: string) => query(url, "update theme set name_en = $2 where slug = $1", [slug, en]);

describeFeature(feature, ({ Background, Scenario, AfterEachScenario, AfterAllScenarios }) => {
  AfterEachScenario(async () => {
    await stopDev();
    removeDevDatabase();
  });
  AfterAllScenarios(() => {
    stopTestDatabase(testDatabase(sitePort()));
  });

  Background(({ Given, And }) => {
    Given("no DATABASE_URL is set, in the environment or in apps/web's .env files", () => {
      const files = fs.readdirSync(WEB).filter((f) => f.startsWith(".env"));
      const naming = files.filter((f) => /^\s*DATABASE_URL\s*=/m.test(fs.readFileSync(path.join(WEB, f), "utf8")));
      expect(naming, "apps/web's .env files name a DATABASE_URL, which would override pnpm dev's own Postgres").toEqual([]);
    });
    And("the run's dev Postgres has no container and no volume", () => {
      removeDevDatabase();
      expect(devContainers()).toBe("");
      expect(devVolumes()).toBe("");
    });
  });

  const expectThemePage = async (slug: string, lang: "ur" | "en", name: string) => {
    const page = await themePage(slug, lang);
    expect(page.status).toBe(200);
    expect(page.heading).toContain(name);
  };

  Scenario("`pnpm dev` starts and migrates its own Postgres, and serves Theme pages", ({ When, Then, And }) => {
    When("I start `pnpm dev`", () => startDev());
    Then(
      "a pgvector/pgvector:pg17 container of the run's name takes connections on 127.0.0.1 at the run's port, keeping its data in a Docker volume of that name",
      async () => {
        const [container] = JSON.parse(docker(["inspect", devDatabase().name])) as {
          Config: { Image: string };
          State: { Running: boolean };
          Mounts: { Type: string; Name?: string; Destination: string }[];
          HostConfig: { PortBindings: Record<string, { HostIp: string; HostPort: string }[]> };
        }[];
        expect(container.Config.Image).toBe("pgvector/pgvector:pg17");
        expect(container.State.Running).toBe(true);
        expect(container.HostConfig.PortBindings["5432/tcp"]).toEqual([{ HostIp: "127.0.0.1", HostPort: String(devDatabase().port) }]);
        expect(container.Mounts.filter((m) => m.Type === "volume").map((m) => m.Name)).toEqual([devDatabase().name]);
        expect(await query(devDatabase().url, "select 1 as one")).toEqual([{ one: 1 }]);
      },
    );
    And("its database has run every content migration, and holds {int} Themes in {int} Theme categories", async (_, themes: number, categories: number) => {
      const ran = await query<{ name: string }>(devDatabase().url, "select name from content_migration order by name");
      expect(ran.map((r) => r.name)).toEqual(CONTENT_MIGRATIONS.map((m) => m.name).sort());
      const [counts] = await query<{ themes: number; categories: number }>(
        devDatabase().url,
        "select (select count(*) from theme)::int as themes, (select count(*) from theme_category)::int as categories",
      );
      expect(counts).toEqual({ themes, categories });
    });
    And('the Theme page of {string} in English answers 200, headed {string}', (_, slug: string, name: string) => expectThemePage(slug, "en", name));
    And('the Theme page of {string} in Urdu answers 200, headed with its Urdu name', async (_, slug: string) => {
      const theme = committedThemes().themes.find((t) => t.slug === slug);
      expect(theme, `no committed Theme ${slug}`).toBeDefined();
      await expectThemePage(slug, LANGUAGE.Urdu, theme!.ur);
    });
  });

  Scenario("What `pnpm dev`'s Postgres holds survives a restart", ({ Given, And, When, Then }) => {
    Given('`pnpm dev` has served the Theme page of {string} once', async (_, slug: string) => {
      await startDev();
      expect((await themePage(slug, "en")).status).toBe(200);
    });
    And('the Theme {string} is renamed {string} in English in its database', async (_, slug: string, en: string) => {
      await renameTheme(devDatabase().url, slug, en);
    });
    When("`pnpm dev` is stopped and its Postgres container removed, leaving its volume", async () => {
      await stopDev();
      docker(["rm", "-f", devDatabase().name]);
      expect(devContainers()).toBe("");
      expect(devVolumes()).toBe(devDatabase().name);
    });
    And("I start `pnpm dev` again", () => startDev());
    Then('its database still names the Theme {string} {string} in English', async (_, slug: string, en: string) => {
      expect(await query(devDatabase().url, "select name_en from theme where slug = $1", [slug])).toEqual([{ name_en: en }]);
    });
    And("`pnpm dev` ran no content migration again", () => {
      expect(runningDev()!.output).toContain("db:migrate: 0 content migrations run");
    });
    And('the Theme page of {string} in English answers 200, headed {string}', (_, slug: string, name: string) => expectThemePage(slug, "en", name));
  });

  Scenario("A DATABASE_URL overrides `pnpm dev`'s own Postgres", ({ Given, When, Then, And }) => {
    const other = () => testDatabase(sitePort());
    Given('a migrated Postgres of its own, in which the Theme {string} is named {string} in English', async (_, slug: string, en: string) => {
      await startTestDatabase(other());
      execFileSync("pnpm", ["run", "db:migrate"], { cwd: WEB, stdio: "inherit", env: { ...process.env, DATABASE_URL: other().url } });
      await renameTheme(other().url, slug, en);
    });
    When("I start `pnpm dev` with DATABASE_URL naming that Postgres", () => startDev(other().url));
    Then('the Theme page of {string} in English answers 200, headed {string}', (_, slug: string, name: string) => expectThemePage(slug, "en", name));
    And("no container or volume of the run's dev Postgres was made", () => {
      expect(devContainers()).toBe("");
      expect(devVolumes()).toBe("");
    });
  });
});

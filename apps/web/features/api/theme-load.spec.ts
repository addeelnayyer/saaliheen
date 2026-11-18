import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { Pool } from "pg";
import { expect } from "vitest";
import { migrateContent } from "../../scripts/content/migrate.ts";
import { CONTENT_MIGRATIONS } from "../../scripts/content/migrations.ts";
import { loadThemes, type ThemesInput } from "../../scripts/content/themes.ts";
import { testDatabase } from "../site/test-database.ts";
import { auditMark, hasTable } from "./audit";
import { database } from "./support";

// The Theme load (#170, ADR 0037): the Theme tables `pnpm db:migrate` made and
// loaded in the run's own Postgres, read directly, since no endpoint answers
// them yet, and compared with the Themes file as last committed before Themes
// moved into Neon. The refused loads run the content migrations, with the
// Theme load given a changed Themes file, in a database of their own beside
// the run's.

const feature = await loadFeature("./theme-load.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");
/** The last commit before Themes moved into Neon, whose data/themes.json is the Themes file the load copies. */
const BEFORE_THE_MOVE = "5127e948092b0bcc0c825a59034cdf9ecaba9bce";
const THEME_TABLES = ["theme_category", "theme", "ayah_theme"] as const;

/** The Themes file as last committed, read from git so it outlives the file's deletion. */
const committedThemes = (): ThemesInput =>
  JSON.parse(
    execFileSync("git", ["show", `${BEFORE_THE_MOVE}:apps/web/data/themes.json`], { cwd: WEB, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
  ) as ThemesInput;

/** What a run of a script left: whether it succeeded, and everything it printed. */
interface Run {
  ok: boolean;
  output: string;
}

/** Run `pnpm run <script>` in the website's directory against the database at `url`. */
async function runScript(script: string, url: string): Promise<Run> {
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", script], {
      cwd: WEB,
      env: { ...process.env, DATABASE_URL: url },
      encoding: "utf8",
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

const runUrl = () => testDatabase(Number(process.env.PORT)).url;

/** The refused loads' own database, beside the run's in its container. */
const sideName = () => `theme_load_${Number(process.env.PORT)}`;
const sideUrl = () => runUrl().replace(/\/[^/]+$/, `/${sideName()}`);

/** The content migration that loads the Themes, as ./scripts/content/migrations.ts registers it. */
function themeLoad() {
  const load = CONTENT_MIGRATIONS.find((m) => m.run === loadThemes);
  expect(load, "the content migrations include the Theme load, registered as `run: loadThemes`").toBeDefined();
  return load!;
}

/** Every row of `table` in `db`, each as sorted-key JSON, sorted: a snapshot to compare. */
async function rowsOf(table: string, db: Pool = database()): Promise<string[]> {
  return (await db.query(`select * from "${table}"`)).rows.map((row) => JSON.stringify(row, Object.keys(row).sort())).sort();
}

/** Each Ayah's Theme slugs in the database, in tagged order, keyed `s:a`. */
async function ayahThemes(): Promise<Record<string, string[]>> {
  const { rows } = await database().query<{ surah: number; ayah: number; theme: string }>(
    `select surah, ayah, theme from ayah_theme order by surah, ayah, position`,
  );
  const ayahs: Record<string, string[]> = {};
  for (const { surah, ayah, theme } of rows) (ayahs[`${surah}:${ayah}`] ??= []).push(theme);
  return ayahs;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario, defineSteps }) => {
  let themes: ThemesInput;
  let side: Pool | undefined;
  let noted: Record<string, string[]> | undefined;
  let notedMark: number | null = null;
  let run: Run | undefined;
  let refusal: Error | undefined;

  BeforeAllScenarios(() => {
    themes = committedThemes();
  });

  BeforeEachScenario(() => {
    noted = run = refusal = undefined;
    notedMark = null;
  });

  AfterAllScenarios(async () => {
    await side?.end();
    await database().query(`drop database if exists ${sideName()} with (force)`);
  });

  const ran = () => {
    if (!run) throw new Error("nothing run yet in this scenario");
    return run;
  };

  /** A fresh database of its own, migrated by `pnpm db:migrate`, with its Theme tables emptied and its Theme load unrecorded. */
  async function sideDatabase(): Promise<Pool> {
    const load = themeLoad();
    if (!side) {
      await database().query(`drop database if exists ${sideName()} with (force)`);
      await database().query(`create database ${sideName()}`);
      const migrated = await runScript("db:migrate", sideUrl());
      expect(migrated.ok, `db:migrate migrates a database of its own: ${migrated.output}`).toBe(true);
      side = new Pool({ connectionString: sideUrl(), max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true });
    }
    for (const table of THEME_TABLES) expect(await hasTable(table, side), `db:migrate made the table \`${table}\``).toBe(true);
    await side.query(`delete from ayah_theme; delete from theme; delete from theme_category`);
    await side.query(`delete from content_migration where name = $1`, [load.name]);
    return side;
  }

  /** The committed Themes file with Ayah 2:255's Themes changed as a scenario says. */
  function changed(change: string): ThemesInput {
    const ayahs = { ...themes.ayahs };
    const listed = change.match(/^the Themes "(.+)"$/);
    if (change === "no Themes") ayahs["2:255"] = [];
    else if (change === "no entry") delete ayahs["2:255"];
    else if (listed) ayahs["2:255"] = listed[1].split(", ");
    else throw new Error(`no change named "${change}"`);
    return { ...themes, ayahs };
  }

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("`pnpm db:migrate` has made the Theme tables in the run's database", async () => {
      for (const table of THEME_TABLES) expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
    });

    step(
      "the Theme categories in the database are exactly the Themes file's 13, each with its slug and its English and Urdu names",
      async () => {
        const { rows } = await database().query(`select slug, name_en, name_ur from theme_category order by slug`);
        const expected = themes.categories
          .map(({ slug, en, ur }) => ({ slug, name_en: en, name_ur: ur }))
          .sort((a, b) => a.slug.localeCompare(b.slug));
        expect(expected).toHaveLength(13);
        expect(rows).toEqual(expected);
      },
    );

    step(
      "the Themes in the database are exactly the Themes file's 258, each with its slug, its English and Urdu names, its Theme category and its description",
      async () => {
        const { rows } = await database().query(`select slug, name_en, name_ur, category, description from theme order by slug`);
        const expected = themes.themes
          .map(({ slug, en, ur, category, description }) => ({ slug, name_en: en, name_ur: ur, category, description }))
          .sort((a, b) => a.slug.localeCompare(b.slug));
        expect(expected).toHaveLength(258);
        expect(rows).toEqual(expected);
      },
    );

    step("every one of the 6236 Ayahs has, in order, the Themes the Themes file tags it with, and no Ayah has another", async () => {
      const ayahs = await ayahThemes();
      expect(Object.keys(themes.ayahs)).toHaveLength(6236);
      expect(Object.keys(ayahs), "Ayahs with Themes in the database").toHaveLength(6236);
      expect(ayahs).toEqual(themes.ayahs);
    });

    step("every Theme an Ayah has is one of the database's Themes", async () => {
      const { rows } = await database().query(`select distinct theme from ayah_theme where theme not in (select slug from theme)`);
      expect(rows.map((r) => r.theme), "Themes an Ayah names that the database does not hold").toEqual([]);
    });

    step("Ayah {any} has the Themes {string}, in that order", async (_, ayah: string, names: string) => {
      const { rows } = await database().query<{ name_en: string }>(
        `select t.name_en from ayah_theme a join theme t on t.slug = a.theme
          where a.surah = $1 and a.ayah = $2 order by a.position`,
        ayah.split(":").map(Number),
      );
      expect(rows.map((r) => r.name_en)).toEqual(names.split(", "));
    });

    step("I note every row of the Theme tables and the latest content audit row", async () => {
      noted = Object.fromEntries(await Promise.all(THEME_TABLES.map(async (t) => [t, await rowsOf(t)] as const)));
      notedMark = (await hasTable("content_audit")) ? await auditMark() : null;
    });

    step("I run `pnpm db:migrate` again", async () => {
      run = await runScript("db:migrate", runUrl());
    });

    step("it succeeds, reporting 0 content migrations run", () => {
      const { ok, output } = ran();
      expect(ok, output).toBe(true);
      expect(output).toContain("0 content migrations run");
    });

    step("every row of the Theme tables is as noted", async () => {
      expect(Object.fromEntries(await Promise.all(THEME_TABLES.map(async (t) => [t, await rowsOf(t)] as const)))).toEqual(noted);
    });

    step("no content audit row has been written since", async () => {
      if (notedMark !== null) expect(await auditMark(), "the latest content audit row").toBe(notedMark);
    });

    step(
      "a database of its own, migrated by `pnpm db:migrate`, whose Theme tables are then emptied and whose Theme load is no longer recorded as run",
      async () => {
        await sideDatabase();
      },
    );

    step("its content migrations run with the Themes file changed so that Ayah 2:255 has {any}", async (_, change: string) => {
      const input = changed(change);
      const migrations = CONTENT_MIGRATIONS.map((m) => (m.run === loadThemes ? { ...m, run: (client: Parameters<typeof loadThemes>[0]) => loadThemes(client, input) } : m));
      refusal = await migrateContent(side!, migrations).then(
        () => undefined,
        (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
      );
    });

    step("they fail, naming {any}", (_, named: string) => {
      expect(refusal, "the content migrations failed").toBeInstanceOf(Error);
      for (const name of named.match(/"[^"]+"/g)!.map((n) => n.slice(1, -1))) {
        expect(refusal!.message, `the failure names ${name}`).toMatch(new RegExp(`(^|[^\\w:-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w:-])`));
      }
    });

    step("that database holds no Theme category, Theme or Ayah's Theme", async () => {
      for (const table of THEME_TABLES) expect(await rowsOf(table, side!), `rows of \`${table}\``).toEqual([]);
    });

    step("that database does not record the Theme load as run", async () => {
      const { rowCount } = await side!.query(`select 1 from content_migration where name = $1`, [themeLoad().name]);
      expect(rowCount, `"${themeLoad().name}" in content_migration`).toBe(0);
    });
  });

  Scenario("Every Theme category is loaded, with its slug and its English and Urdu names", () => {});
  Scenario("Every Theme is loaded, with its slug, English and Urdu names, Theme category and description", () => {});
  Scenario("Every one of the 6236 Ayahs has its Themes, in tagged order, and each is a Theme the database holds", () => {});
  ScenarioOutline("Ayah <ayah> has the Themes <themes>, in that order", () => {});
  Scenario("Running `pnpm db:migrate` again changes no row", () => {});
  ScenarioOutline("The Theme load refuses Themes where Ayah 2:255 has <change>, naming it, and writes nothing", () => {});
});

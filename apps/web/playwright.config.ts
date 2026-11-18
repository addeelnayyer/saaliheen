import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { TEST_SERVER_SETTINGS } from "./features/site/admin-settings";
import { fakeLlmAddresses } from "./features/site/fake-llm";

// Seam 2 (#1 § Testing Decisions): Playwright drives the production build as a
// user does. The web server builds once (`pnpm build`) as a standalone build
// and serves it with `pnpm start:standalone` on `PORT`. A standalone server
// holds only the files the build traced, as a Vercel deployment does, never
// the repo's own `data/`: a page that reads a file its trace lacks fails here
// as it would in production. E2E_SKIP_BUILD=1 serves an existing standalone
// build without rebuilding.
// Accounts (#66) live in Postgres: before the build the web server starts the
// run's own, empty Postgres in Docker and applies the Account schema to it
// (features/site/start-test-database.ts); the global teardown removes it.
// Quran Chat (#78) asks OpenAI and Claude: a first web server serves fakes of
// both (features/site/serve-fake-llm.ts), which the site is pointed at.
// The acceptance tests are Gherkin: `bddgen` turns features/site/*.feature,
// with the step definitions in features/site/steps/, into .features-gen/.

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error("playwright.config.ts: set PORT, e.g. `PORT=3002 pnpm test:e2e`");
}
const baseURL = `http://127.0.0.1:${port}`;
const { openAiBaseUrl, anthropicBaseUrl } = fakeLlmAddresses(port);

// Release switches (#41) are build-time environment settings, on only when
// set to "on". The suite runs once with every switch off and once with them
// on: NEXT_PUBLIC_PASSAGE_HEADINGS and NEXT_PUBLIC_TAFSIR (#234) are set
// together. Off, every scenario but those tagged @passage-headings-on or
// @tafsir-on runs; on, only those (so a scenario tagged @passage-headings-off
// or @tafsir-off never runs there). `pnpm test:e2e` makes both runs, each
// against its own build.
const released = process.env.NEXT_PUBLIC_PASSAGE_HEADINGS === "on";
if ((process.env.NEXT_PUBLIC_TAFSIR === "on") !== released) {
  throw new Error("playwright.config.ts: set NEXT_PUBLIC_PASSAGE_HEADINGS and NEXT_PUBLIC_TAFSIR to \"on\" together, or neither");
}
/** The tags of the scenarios run with the release switches on. */
const RELEASED = /@(passage-headings|tafsir)-on\b/;

/** The generated spec of features/site/iltifat-editor.feature. */
const ILTIFAT_EDITOR = /iltifat-editor\.feature\.spec\.js$/;
/** The generated specs of the Marked Words features (#143), each a project of its own. */
const MARKED_WORDS_PAGES = /iltifat-pages-marked-words\.feature\.spec\.js$/;
const MARKED_WORDS_EDITOR = /iltifat-editor-marked-words\.feature\.spec\.js$/;
/** The generated spec of features/site/supplication-editor.feature (#201), a project of its own. */
const SUPPLICATION_EDITOR = /supplication-editor\.feature\.spec\.js$/;
/** The generated spec of features/site/supplications-page-spans.feature (#270), a project of its own. */
const SUPPLICATION_SPANS = /supplications-page-spans\.feature\.spec\.js$/;
/** The generated spec of features/site/supplication-editor-spans.feature (#271), a project of its own. */
const SUPPLICATION_SPAN_MARKING = /supplication-editor-spans\.feature\.spec\.js$/;
/** The generated spec of features/site/allah-reference-publishing.feature (#153), a project of its own. */
const ALLAH_REFERENCE_PUBLISHING = /allah-reference-publishing\.feature\.spec\.js$/;
/** The generated spec of features/site/allah-reference-revisions.feature (#154), a project of its own. */
const ALLAH_REFERENCE_REVISIONS = /allah-reference-revisions\.feature\.spec\.js$/;
/** The generated specs of the Passage and Phrase publishing features (#171) and of Passages and the Tafsir (#235), a project of their own. */
const PASSAGE_PUBLISHING = /(^|[\\/])(publishing|phrase-publishing|published-phrases|passages-and-tafsir)\.feature\.spec\.js$/;
/** The generated spec of features/site/passage-revisions.feature (#174), a project of its own. */
const PASSAGE_REVISIONS = /passage-revisions\.feature\.spec\.js$/;

const features = defineBddConfig({
  features: "features/site/**/*.feature",
  steps: "features/site/steps/**/*.ts",
});

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  grep: released ? RELEASED : undefined,
  grepInvert: released ? undefined : RELEASED,
  retries: 0,
  // Surah 18 is arranged in the run's Postgres before any scenario runs (#171),
  // then the server is warmed as a deployment is (#172).
  globalSetup: ["./features/site/passages-in-the-test-database.ts", "./features/site/warm-up-the-test-server.ts"],
  globalTeardown: "./features/site/stop-test-database.ts",
  reporter: [["list"]],
  // Al-Baqarah is about 6,100 Word cards; give its page time to load.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  // The Iltifat editor's scenarios (#142) save Iltifat, which every Iltifat
  // page, chip and direction scenario reads: they run in a project of their
  // own, one at a time, once the rest of the suite has run. To run only them,
  // pass `--no-deps` (`--project=iltifat-editor --no-deps`).
  // The Marked Words scenarios (#143) save Iltifat with Marked Words, which
  // the Iltifat pages and the editor's list show: each feature runs in a
  // project of its own, one scenario at a time, after the Iltifat editor's.
  // Publishing Allah references (#153) changes what readers of a Surah see:
  // its scenarios run in a project of their own, one at a time, once the
  // chromium project has run. Undoing Allah reference publishes (#154) does
  // too: its scenarios run in a project of their own, one at a time, after
  // the Allah reference publishing project. So do publishing Passages and
  // Phrases (#171), which write the run's Postgres that the Passage editor's
  // scenarios read, after the Allah reference revisions project. The
  // Supplication editor's scenarios (#201) save Supplications, which the
  // Supplications page's scenarios read: a project of their own, one at a
  // time, once the chromium project has run. The Supplication span scenarios
  // (#270) save Supplications with spans: a project of their own, one at a
  // time, after the Supplication editor's. So do the Supplication editor's
  // span marking scenarios (#271), after the Supplication span scenarios.
  projects: [
    {
      name: "chromium",
      testDir: features,
      testIgnore: [
        ILTIFAT_EDITOR,
        MARKED_WORDS_PAGES,
        MARKED_WORDS_EDITOR,
        ALLAH_REFERENCE_PUBLISHING,
        ALLAH_REFERENCE_REVISIONS,
        PASSAGE_PUBLISHING,
        PASSAGE_REVISIONS,
        SUPPLICATION_EDITOR,
        SUPPLICATION_SPANS,
        SUPPLICATION_SPAN_MARKING,
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iltifat-editor",
      testDir: features,
      testMatch: ILTIFAT_EDITOR,
      dependencies: ["chromium"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iltifat-pages-marked-words",
      testDir: features,
      testMatch: MARKED_WORDS_PAGES,
      dependencies: ["iltifat-editor"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iltifat-editor-marked-words",
      testDir: features,
      testMatch: MARKED_WORDS_EDITOR,
      dependencies: ["iltifat-pages-marked-words"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "supplication-editor",
      testDir: features,
      testMatch: SUPPLICATION_EDITOR,
      dependencies: ["chromium"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "supplication-spans",
      testDir: features,
      testMatch: SUPPLICATION_SPANS,
      dependencies: ["supplication-editor"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "supplication-span-marking",
      testDir: features,
      testMatch: SUPPLICATION_SPAN_MARKING,
      dependencies: ["supplication-spans"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "allah-reference-publishing",
      testDir: features,
      testMatch: ALLAH_REFERENCE_PUBLISHING,
      dependencies: ["chromium"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "allah-reference-revisions",
      testDir: features,
      testMatch: ALLAH_REFERENCE_REVISIONS,
      dependencies: ["allah-reference-publishing"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "passage-publishing",
      testDir: features,
      testMatch: PASSAGE_PUBLISHING,
      dependencies: ["allah-reference-revisions"],
      // Its four files share Surah 18 in the run's Postgres: one worker, so no two run at once.
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "passage-revisions",
      testDir: features,
      testMatch: PASSAGE_REVISIONS,
      dependencies: ["passage-publishing"],
      // It publishes and undoes in Surah 18, as passage-publishing does: one at a time, after it.
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning features/site/serve-fake-llm.ts",
      // Ready once the fake Claude answers what it last received.
      url: `${anthropicBaseUrl}/recorded`,
      reuseExistingServer: false,
      env: { PORT: String(port) },
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: [
        "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning features/site/start-test-database.ts",
        ...(process.env.E2E_SKIP_BUILD ? [] : ["pnpm build"]),
        "pnpm start:standalone",
      ].join(" && "),
      // Ready once a Surah page serves; `/` itself is not a page.
      url: `${baseURL}/ur/1`,
      // Always test the build this run made, never a stale server on the port.
      reuseExistingServer: false,
      // Accounts' test configuration (#66): the run's Postgres, the placeholder
      // GitHub, Google and Apple apps, and the Account test-only sign-in switched
      // on; and the admin area's (#42, #67): the Admin allow-list.
      // Quran Chat's (#78): the fake OpenAI and the fake Claude.
      env: {
        ...TEST_SERVER_SETTINGS,
        NEXT_OUTPUT: "standalone",
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        OPENAI_BASE_URL: openAiBaseUrl,
        OPENAI_API_KEY: "fake-openai-key",
        ANTHROPIC_BASE_URL: anthropicBaseUrl,
        ANTHROPIC_API_KEY: "fake-anthropic-key",
      },
      timeout: 600_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});

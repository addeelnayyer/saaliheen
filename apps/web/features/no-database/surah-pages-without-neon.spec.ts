import net from "node:net";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { chromium, type Browser, type Page } from "@playwright/test";
import { expect } from "vitest";
import { UNREACHABLE } from "./serve-without-database";

const feature = await loadFeature("./surah-pages-without-neon.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** Allah reference colour in the light and the dark theme (#147), as getComputedStyle gives it. */
const GOLDS = ["rgb(168, 122, 10)", "rgb(227, 184, 79)"];

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;

describeFeature(feature, ({ ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let browser: Browser;
  let page: Page;
  let status: number | undefined;

  BeforeAllScenarios(async () => {
    browser = await chromium.launch();
  });
  AfterAllScenarios(async () => {
    await browser.close();
  });
  BeforeEachScenario(async () => {
    page = await browser.newPage({ baseURL: baseURL() });
    status = undefined;
  });
  AfterEachScenario(async () => {
    await page.close();
  });

  /** Open Surah `surah` in `language` (Urdu or English), noting what the page answers. */
  const open = async (surah: number, language: string) => {
    const lang = { Urdu: "ur", English: "en" }[language];
    if (!lang) throw new Error(`no Language ${language}`);
    status = (await page.goto(`/${lang}/${surah}`))?.status();
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the site was built and is served with its database unreachable", async () => {
      // The database the build was made and is served with takes no connections.
      const { hostname, port } = new URL(UNREACHABLE);
      const connects = await new Promise<boolean>((resolve) => {
        const socket = net.connect(Number(port), hostname, () => (socket.destroy(), resolve(true)));
        socket.on("error", () => resolve(false));
      });
      expect(connects, `something takes connections at ${hostname}:${port}`).toBe(false);
      expect((await fetch(`${baseURL()}/ur/1`)).status, "the build serves").toBe(200);
    });


    step("the page answers {int}", (_, expected: number) => {
      expect(status).toBe(expected);
    });

    step("the page says it could not be loaded and offers Retry", async () => {
      const error = page.getByRole("alert").filter({ hasText: "This page could not be loaded" });
      await error.waitFor({ timeout: 30_000 });
      await expect(error.getByRole("button", { name: "Retry" }).isVisible()).resolves.toBe(true);
    });

    step("no letter on the page is drawn in Allah reference colour", async () => {
      const gold = await page.evaluate((golds) => {
        const found = new Set<string>();
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const el = n.parentElement;
          if (n.textContent?.trim() && el && golds.includes(getComputedStyle(el).color)) found.add(el.closest("[id]")?.id ?? n.textContent);
        }
        return Array.from(found);
      }, GOLDS);
      expect(gold, "what is drawn in gold").toEqual([]);
    });
  });

  // An outline's steps carry its placeholders, so the one that names them is defined here.
  ScenarioOutline(
    "Surah <surah> in <Language>, built and served with Neon unreachable, shows the error page with Retry and no gold",
    ({ When }, variables) => {
      When("I open Surah <surah> in <Language>", () => open(Number(variables.surah), variables.Language));
    },
  );
  ScenarioOutline("<page>, built and served with Neon unreachable, shows the error page with Retry", ({ When }, variables) => {
    When('I open <page> at "<address>"', async () => {
      status = (await page.goto(variables.address))?.status();
    });
  });
});

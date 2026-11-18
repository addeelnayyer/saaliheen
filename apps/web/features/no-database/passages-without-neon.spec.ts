// Pages that read Passages, built and served without Neon (#171 AC-6): the
// build that ./serve-without-database.ts made with its database unreachable
// succeeded (or the global setup would have failed), and a Surah page and a
// Share page, asked for the first time, answer the error page with Retry and
// show no Passage title.

import net from "node:net";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { chromium, type Browser, type Page } from "@playwright/test";
import { expect } from "vitest";
import { committedPassages } from "../site/committed-output";
import { UNREACHABLE } from "./serve-without-database";

const feature = await loadFeature("./passages-without-neon.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;

/** Surah `surah`'s Passage titles in `language` (Urdu or English), as the Passages file was last committed. */
const passageTitles = (surah: number, language: string) => {
  const key = ({ Urdu: "title_ur", English: "title_en" } as const)[language as "Urdu" | "English"];
  if (!key) throw new Error(`no Language ${language}`);
  return committedPassages()
    .filter((p) => p.surah_no === surah)
    .map((p) => p[key].trim())
    .filter(Boolean);
};

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
      expect((await fetch(`${baseURL()}/privacy`)).status, "the build serves").toBe(200);
    });

    step("the page answers {int}", (_, expected: number) => {
      expect(status).toBe(expected);
    });

    step("the page says it could not be loaded and offers Retry", async () => {
      const error = page.getByRole("alert").filter({ hasText: "This page could not be loaded" });
      await error.waitFor({ timeout: 30_000 });
      await expect(error.getByRole("button", { name: "Retry" }).isVisible()).resolves.toBe(true);
    });

  });

  /** That the page now shown carries none of Surah `surah`'s Passage titles in `language`, in its text, its title or its Link preview tags. */
  const showsNoPassageTitle = async (surah: number, language: string) => {
    const titles = passageTitles(surah, language);
    expect(titles.length, `Surah ${surah}'s committed Passage titles in ${language}`).toBeGreaterThan(0);
    const shown = await page.evaluate(() =>
      [
        document.body.innerText,
        document.title,
        ...Array.from(document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]'), (m) => m.getAttribute("content") ?? ""),
      ].join("\n"),
    );
    expect(titles.filter((title) => shown.includes(title)), "Passage titles the page shows").toEqual([]);
  };

  // An outline's steps carry its placeholders, so those that name them are defined here.
  ScenarioOutline(
    "<address>, built and served with Neon unreachable, shows the error page with Retry and no Passage title",
    ({ When, And }, variables) => {
      When('I open "<address>"', async () => {
        status = (await page.goto(variables.address))?.status();
      });
      And("the page shows none of Surah 18's Passage titles in <Language>, in its text or its title", () => showsNoPassageTitle(18, variables.Language));
    },
  );
});

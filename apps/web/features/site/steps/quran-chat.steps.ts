// Quran Chat (#78): asking, the answer as the reader sees it, its Ayah links
// and Tafsir credit, a declined ruling, and the sign-in a reader not signed in
// is asked for; and its Conversations (#79), listed, reopened, started afresh
// and deleted. Claude is the fixed stub the web server serves
// (../fake-llm.ts), whose answers are ../../api/fake-anthropic.ts's
// FIXED_ANSWERS; what the page shows is read against them.

import { expect, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { FIXED_ANSWERS } from "../../api/fake-anthropic";
import type { Language } from "../support";
import { DIR, expectLangDir, Given, Then, When } from "./fixtures";

const main = (page: Page) => page.getByRole("main");
const question = (page: Page) => main(page).getByRole("textbox", { name: "Your question" });
/** The latest answer in the Conversation open. */
const answer = (page: Page) => main(page).getByRole("article", { name: "Answer" }).last();
const conversations = (page: Page) => main(page).getByRole("region", { name: "Conversations" });
const listed = (page: Page) => conversations(page).locator("li > button:first-child");
const exchanges = (page: Page) => main(page).getByRole("list", { name: "This Conversation" });

/** `text` as the page shows it: each citation `[18:83–84]` in parentheses, `(18:83–84)`. */
const asShown = (text: string) => text.replace(/\[([^\]]+)\]/g, "($1)");

Given("I open Quran Chat in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/quran-chat`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

Then("Quran Chat says it needs an Account, linking to {string}", async ({ reader }, path: string) => {
  const page = reader.page;
  await expect(main(page)).toContainText("Quran Chat needs an Account");
  const link = main(page).getByRole("link", { name: "Sign in", exact: true });
  await expect(link).toBeVisible();
  expect(new URL((await link.getAttribute("href")) ?? "", page.url()).pathname).toBe(path);
});

Then("Quran Chat offers no way to ask", async ({ reader }) => {
  await expect(main(reader.page).getByRole("textbox")).toHaveCount(0);
  await expect(main(reader.page).getByRole("button", { name: "Ask" })).toHaveCount(0);
});

When("I ask Quran Chat {string}", async ({ reader }, text: string) => {
  const page = reader.page;
  await question(page).fill(text);
  await main(page).getByRole("button", { name: "Ask", exact: true }).click();
});

Then(
  "Quran Chat's answer is the fake Claude's answer to {string} in {language}, written in {language}",
  async ({ reader }, asked: string, lang: Language, written: Language) => {
    const fixed = FIXED_ANSWERS[asked];
    if (!fixed) throw new Error(`the fake Claude has no fixed answer to "${asked}"`);
    const text = answer(reader.page).locator("p").first();
    await expect(text).toHaveText(asShown(fixed[lang]));
    await expectLangDir(text, written, DIR[written], "the answer");
  },
);

Then("the answer links {string} to {string} and {string} to {string}", async ({ reader }, first: string, firstPath: string, second: string, secondPath: string) => {
  for (const [cite, path] of [[first, firstPath], [second, secondPath]]) {
    const link = answer(reader.page).getByRole("link", { name: cite, exact: true });
    await expect(link, `the answer's link to ${cite}`).toHaveCount(1);
    const href = new URL((await link.getAttribute("href")) ?? "", reader.page.url());
    expect(`${href.pathname}${href.hash}`, `where ${cite} leads`).toBe(path);
  }
});

Then("the answer cites the Tafsir entry {string}", async ({ reader }, ayahs: string) => {
  await expect(answer(reader.page).getByText(`Tafsir ${ayahs}`, { exact: true })).toBeVisible();
});

Then("beneath the answer, Quran Chat credits the Tafsir in {language}", async ({ reader }, lang: Language) => {
  const credit = answer(reader.page).locator(":scope > p").last();
  await expect(credit).toContainText("al-Mukhtasar");
  await expect(credit).toContainText(lang === "ur" ? "Urdu edition" : "English edition");
});

Then("Quran Chat does not credit the Tafsir", async ({ reader }) => {
  await expect(answer(reader.page).getByRole("link").first()).toBeVisible();
  await expect(answer(reader.page)).not.toContainText("al-Mukhtasar");
});

Then("Quran Chat declines, in {language}, saying {string}", async ({ reader }, lang: Language, text: string) => {
  const declined = answer(reader.page).locator("p").first();
  await expect(declined).toHaveText(text);
  await expectLangDir(declined, lang, DIR[lang], "the decline");
});

// ---------------------------------------------------------------- Conversations (#79)

Then("Quran Chat lists no Conversations yet", async ({ reader }) => {
  await expect(conversations(reader.page)).toContainText("No Conversations yet");
  await expect(listed(reader.page)).toHaveCount(0);
});

Then("Quran Chat lists these Conversations:", async ({ reader }, table: DataTable) => {
  await expect(listed(reader.page)).toHaveText(table.raw().map(([title]) => title));
});

Then("the Conversation open shows these questions, each answered:", async ({ reader }, table: DataTable) => {
  const page = reader.page;
  await expect(exchanges(page).locator(":scope > li > p:first-child")).toHaveText(table.raw().map(([asked]) => asked));
  const answers = exchanges(page).getByRole("article", { name: "Answer" });
  await expect(answers).toHaveCount(table.raw().length);
  for (const shown of await answers.all()) {
    await expect(shown, "an answer, whole").toHaveAttribute("aria-busy", "false");
    await expect(shown.locator("p").first(), "the answer's text").toHaveText(/\S/);
    await expect(shown.getByRole("alert")).toHaveCount(0);
  }
});

Then("the Conversation open shows no questions", async ({ reader }) => {
  await expect(exchanges(reader.page)).toHaveCount(0);
});

When("I start a New Conversation", async ({ reader }) => {
  await main(reader.page).getByRole("button", { name: "New Conversation", exact: true }).click();
});

When("I reopen the Conversation {string}", async ({ reader }, title: string) => {
  const reopened = conversations(reader.page).getByRole("button", { name: title, exact: true });
  await reopened.click();
  await expect(reopened, `"${title}" open`).toHaveAttribute("aria-current", "true");
});

When("I delete the Conversation {string}", async ({ reader }, title: string) => {
  await conversations(reader.page).getByRole("button", { name: `Delete “${title}”`, exact: true }).click();
  await expect(conversations(reader.page).getByRole("button", { name: title, exact: true })).toHaveCount(0);
});

Then("Quran Chat says the Conversation was deleted, keeping {string} to ask again", async ({ reader }, asked: string) => {
  await expect(main(reader.page)).toContainText("This Conversation was deleted, perhaps in another browser.");
  await expect(question(reader.page)).toHaveValue(asked);
});

When("I ask Quran Chat again", async ({ reader }) => {
  await main(reader.page).getByRole("button", { name: "Ask", exact: true }).click();
});

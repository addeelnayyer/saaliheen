// The Surah index's Surahs and Juz tabs (#193), found as a user's screen reader
// finds them: a tablist of two tabs, each naming the tabpanel holding its list.
// The Surah index's own (in its main content) and the Surah bar picker's (in
// its dialog) are told apart by where they are.

import type { Locator, Page } from "@playwright/test";

export type IndexTab = "Surahs" | "Juz";

/** A tab named `name` ("Surahs 114" is the Surahs tab), inside `scope`. */
export const tabIn = (scope: Locator, name: IndexTab) => scope.getByRole("tab", { name: new RegExp(`^\\W*${name}\\b`) });

/** The list a tab names, inside `scope`. */
export const panelIn = (scope: Locator, name: IndexTab) => scope.getByRole("tabpanel", { name: new RegExp(`^\\W*${name}\\b`) });

/** The Surah index's content. */
export const indexMain = (page: Page) => page.getByRole("main");

export const indexTab = (page: Page, name: IndexTab) => tabIn(indexMain(page), name);
export const indexPanel = (page: Page, name: IndexTab) => panelIn(indexMain(page), name);

/** The links of a list's rows. */
export const rowLinks = (panel: Locator) => panel.getByRole("listitem").getByRole("link");

/** What each row of a list shows: its address, its text, its separate text pieces and its number (its first all-digits piece). */
export const rowsOf = (panel: Locator) =>
  rowLinks(panel).evaluateAll((links) =>
    links.map((a) => {
      const pieces = Array.from(a.querySelectorAll("*"))
        .filter((el) => el.children.length === 0)
        .map((el) => (el.textContent ?? "").trim())
        .filter(Boolean);
      return {
        href: a.getAttribute("href") ?? "",
        text: (a as HTMLElement).innerText.replace(/\s+/g, " ").trim(),
        pieces,
        number: Number(pieces.find((p) => /^\d+$/.test(p)) ?? NaN),
      };
    }),
  );

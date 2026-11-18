// Static text is unselectable (#18): triple-clicks and Select All leave the
// page's selection empty everywhere, while text typed into the Surah search box
// can still be selected. Word text, Word meanings and Ayah translations are
// read from the QUL sources (../support).

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahTranslation, card, cardLocations, searchBox, sourceWord, type Language } from "../support";
import { Then, When, langOf } from "./fixtures";
import { scriptText } from "./reader";
import { openedRoot, rootDialog } from "./roots";

/** Triple-click `target` where a person would: in its middle, once it is on screen. */
async function tripleClick(target: Locator, what: string) {
  await target.scrollIntoViewIfNeeded();
  await expect(target, what).toBeVisible();
  await target.click({ clickCount: 3 });
}

/** A style rule that turns the iOS touch callout off, and the at-rule conditions (`@media …`) it sits inside. */
interface CalloutOffRule {
  selector: string;
  conditions: string[];
}

/**
 * Every rule in `css` that declares `-webkit-touch-callout: none`, read from
 * the stylesheet's source text. No Playwright engine knows the property, so
 * the browser drops it when parsing and neither computed style nor the CSSOM
 * shows it (#18 § Testing Decisions makes this iOS-only property the one check
 * not made through computed style). Rules nested in at-rules such as `@media`
 * keep those at-rules as conditions.
 */
function calloutOffRules(css: string): CalloutOffRule[] {
  const rules: CalloutOffRule[] = [];
  const open: { prelude: string; body: string }[] = [];
  let text = "";
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      open.push({ prelude: text.trim(), body: "" });
      text = "";
    } else if (ch === "}") {
      const block = open.pop();
      if (!block) continue;
      block.body += text;
      text = "";
      if (!block.prelude.startsWith("@") && /-webkit-touch-callout\s*:\s*none\b/.test(block.body)) {
        rules.push({ selector: block.prelude, conditions: open.map((b) => b.prelude).filter((p) => p.startsWith("@")) });
      }
    } else if (ch === ";") {
      if (open.length) open[open.length - 1].body += text + ";";
      text = "";
    } else {
      text += ch;
    }
  }
  return rules;
}

/** The touch-callout rules of every stylesheet the page loaded, inline or linked. */
async function pageCalloutOffRules(page: Page): Promise<CalloutOffRule[]> {
  const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  const linked = await Promise.all(hrefs.map(async (href) => (await page.request.get(href)).text()));
  const inline = await page.locator("style").allTextContents();
  return [...inline, ...linked].flatMap(calloutOffRules);
}

// ---------------------------------------------------------------- selecting

When("I triple-click the Arabic text on the Word card at {location}", async ({ page }, location: string) => {
  // A Surah page opens in the Uthmani Script.
  const arabic = scriptText(location, "uthmani");
  await tripleClick(card(page, location).getByText(arabic, { exact: true }), `the Arabic text "${arabic}" at ${location}`);
});

When("I triple-click the Word meaning on the Word card at {location}", async ({ page, reading }, location: string) => {
  const meaning = sourceWord(location).meaning[langOf(reading)];
  await tripleClick(card(page, location).getByText(meaning, { exact: true }), `the Word meaning "${meaning}" at ${location}`);
});

When("I triple-click the {language} Ayah translation of {word}", async ({ page }, lang: Language, ayah: string) => {
  await tripleClick(page.getByText(ayahTranslation(ayah, lang), { exact: true }), `the ${lang} Ayah translation of ${ayah}`);
});

When("I triple-click the Root's letters in the Root dialog", async ({ page, reading }) => {
  const { letters } = openedRoot(reading);
  await tripleClick(rootDialog(page).getByText(letters, { exact: true }).first(), `"${letters}" in the Root dialog`);
});

When("I triple-click the page's main heading", async ({ page }) => {
  await tripleClick(page.getByRole("heading", { level: 1 }).first(), "the page's main heading");
});

When("I triple-click the first paragraph on the page", async ({ page }) => {
  // Read has no paragraph since its stats line left (#193): its static text
  // nearest one is the selected tab's label, which is no link to follow.
  const paragraph = page.locator("main p");
  if ((await paragraph.count()) > 0) await tripleClick(paragraph.first(), "the first paragraph on the page");
  else await tripleClick(page.locator('main [role="tab"][aria-selected="true"]'), "the selected tab's label");
});

When("I press Select All", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+A");
});

Then("no text on the page is selected", async ({ page }) => {
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "the page's selection").toBe("");
});

// ---------------------------------------------------------------- the search box

When("I select everything in the search box", async ({ page }) => {
  await searchBox(page).click({ clickCount: 3 });
});

Then("the selected text in the search box is {string}", async ({ page }, text: string) => {
  const selected = await searchBox(page).evaluate((el) => {
    const input = el as HTMLInputElement;
    return input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
  });
  expect(selected, "the text selected in the search box").toBe(text);
});

// ---------------------------------------------------------------- iOS touch feel

Then("every Word card has the touch callout turned off and a transparent tap highlight", async ({ page }) => {
  const locations = await cardLocations(page);
  expect(locations.length, "Word cards on the page").toBeGreaterThan(0);
  const rules = await pageCalloutOffRules(page);
  const wrong = await page.locator("[id]").evaluateAll(
    (els, { locations, rules }) => {
      const holds = (condition: string) => {
        if (condition.startsWith("@media")) return matchMedia(condition.slice("@media".length).trim()).matches;
        if (condition.startsWith("@supports")) return CSS.supports(condition.slice("@supports".length).trim());
        return condition.startsWith("@layer");
      };
      const matches = (el: Element, selector: string) => {
        try {
          return el.closest(selector) !== null; // the property inherits
        } catch {
          return false; // not a selector the DOM understands
        }
      };
      return els
        .filter((el) => locations.includes(el.id))
        .map((el) => ({
          id: el.id,
          callout: rules.some((r) => r.conditions.every(holds) && matches(el, r.selector)),
          tap: getComputedStyle(el).getPropertyValue("-webkit-tap-highlight-color"),
        }))
        .filter((s) => !s.callout || s.tap !== "rgba(0, 0, 0, 0)")
        .map((s) => `${s.id}: touch callout ${s.callout ? "off" : "not turned off"}, tap highlight ${s.tap}`);
    },
    { locations, rules },
  );
  expect(wrong, "Word cards with a touch callout or a visible tap highlight").toEqual([]);
});

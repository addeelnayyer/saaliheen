// Urdu spaced for Dubai's Naskh letters (#341): every Urdu text the page
// draws, by its computed line height over its computed size.

import { expect } from "@playwright/test";
import { Then } from "./fixtures";

Then(
  "every Urdu text on the page has a line height {float} to {float} times its size",
  async ({ page }, low: number, high: number) => {
    // Each drawn element in Urdu (its nearest lang is "ur") that holds text of its own, or a field's value.
    const texts = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.querySelectorAll<HTMLElement>('[lang="ur"], [lang="ur"] *'))
        .map((el) => ({
          el,
          text: (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
            ? el.value
            : Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("")
          ).trim().slice(0, 30),
        }))
        .filter(({ el, text }) => text !== "" && el.closest("[lang]")?.getAttribute("lang") === "ur" && el.getClientRects().length > 0)
        .map(({ el, text }) => {
          const style = getComputedStyle(el);
          const size = parseFloat(style.fontSize);
          return { text, lineHeight: style.lineHeight, size, ratio: parseFloat(style.lineHeight) / size };
        });
    });
    expect(texts.length, "the page draws Urdu").toBeGreaterThan(0);
    const off = texts
      .filter((t) => !(t.ratio >= low && t.ratio <= high))
      .map((t) => `"${t.text}": line height ${t.lineHeight} at ${t.size}px`);
    expect(off, `Urdu texts spaced outside ${low} to ${high} times their size`).toEqual([]);
  },
);

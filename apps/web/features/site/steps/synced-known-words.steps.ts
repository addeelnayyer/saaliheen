// Known words following an Account between browsers (#252). The browsers,
// signing in and turning between them are the synced settings' steps
// (./synced-settings.steps.ts); marking and what a browser shows are the Known
// Roots' (./known-roots.steps.ts). Here: what an Account holds, set and read
// through the versioned API's Known words resource, /api/v1/known-words, as the
// mobile app would. A Root is written by its letters with spaces.

import { expect, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Given, Then } from "./fixtures";
import { apiSignedIn, settled } from "./synced-settings.steps";

const KNOWN_WORDS = "/api/v1/known-words";

// Marks and unmarks another device brought to the Account, each made the given
// number of minutes before this step: 0 is now, after anything this scenario's
// browsers marked before it.
Given(
  "the Account {string} has these Known Roots, marked this many minutes ago:",
  async ({ reader }, email: string, table: DataTable) => {
    const now = Date.now();
    const knownWords = table.hashes().map((row) => ({
      kind: "root",
      text: row.root,
      known: row.known === "true",
      markedAt: now - Number(row["minutes ago"]) * 60_000,
    }));
    const api = await apiSignedIn(reader.baseURL, email);
    try {
      const res = await api.patch(KNOWN_WORDS, { data: { knownWords } });
      expect(res.status(), `the API kept the Account's Known words: ${(await res.text()).slice(0, 200)}`).toBe(200);
    } finally {
      await api.dispose();
    }
  },
);

/** Expects the Account's Known words, as the API answers them, to be `expected` ("<kind> <text> <known>"), in any order. */
async function expectAccountKnownWords(reader: { page: Page; baseURL: string }, email: string, expected: string[]) {
  await settled(reader.page);
  const api = await apiSignedIn(reader.baseURL, email);
  try {
    const res = await api.get(KNOWN_WORDS);
    expect(res.status(), `the API answers the Account's Known words: ${(await res.text()).slice(0, 200)}`).toBe(200);
    const { knownWords } = (await res.json()) as { knownWords: { kind: string; text: string; known: boolean }[] };
    const held = knownWords.map(({ kind, text, known }) => `${kind} ${text} ${known}`).sort();
    expect(held).toEqual([...expected].sort());
  } finally {
    await api.dispose();
  }
}

// Every Root the Account has marked or unmarked, in any order.
Then("the Account {string} has these Known Roots, as the API answers:", async ({ reader }, email: string, table: DataTable) => {
  await expectAccountKnownWords(reader, email, table.hashes().map((row) => `root ${row.root} ${row.known}`));
});

// Every Root and particle the Account has marked or unmarked, in any order (#251).
Then("the Account {string} has these Known words, as the API answers:", async ({ reader }, email: string, table: DataTable) => {
  await expectAccountKnownWords(reader, email, table.hashes().map((row) => `${row.kind} ${row.text} ${row.known}`));
});

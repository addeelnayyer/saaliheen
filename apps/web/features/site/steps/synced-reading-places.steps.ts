// Reading places following an Account between browsers (#71). The browsers,
// signing in and turning between them are the synced settings' steps
// (./synced-settings.steps.ts); the Reading places a browser shows are read off
// its Surah index (./reading-place.steps.ts). Here: a browser losing its network
// and getting it back, and what an Account holds, set and read through the
// versioned API's Reading places resource, /api/v1/reading-places, as the
// mobile app would. A place is written surah:ayah.

import { expect } from "@playwright/test";
import { parseReadingPlace } from "@saaliheen/reading-places";
import type { DataTable } from "playwright-bdd";
import { Given, Then, When } from "./fixtures";
import { apiSignedIn, settled } from "./synced-settings.steps";

const READING_PLACES = "/api/v1/reading-places";

/** `18:40` as a Reading place's Surah and Ayah. */
function placeOf(written: string) {
  const place = parseReadingPlace(written);
  if (!place) throw new Error(`not a Reading place: ${written}`);
  return place;
}

// The browser loses its network: the page it has open keeps working, and any
// request it sends fails, as a phone's does on a train.
When("I take this browser offline", async ({ reader }) => {
  await settled(reader.page);
  await reader.page.context().setOffline(true);
});

When("I bring this browser back online", async ({ reader }) => {
  await reader.page.context().setOffline(false);
});

// Reading places another device brought to the Account, each read the given
// number of minutes before this step: 0 is now, after anything this scenario's
// browsers read before it.
Given(
  "the Account {string} has these Reading places, read this many minutes ago:",
  async ({ reader }, email: string, table: DataTable) => {
    const now = Date.now();
    const readingPlaces = table.hashes().map((row) => ({
      ...placeOf(row.place),
      readAt: now - Number(row["minutes ago"]) * 60_000,
    }));
    const api = await apiSignedIn(reader.baseURL, email);
    try {
      const res = await api.patch(READING_PLACES, { data: { readingPlaces } });
      expect(res.status(), `the API kept the Account's Reading places: ${(await res.text()).slice(0, 200)}`).toBe(200);
    } finally {
      await api.dispose();
    }
  },
);

Then(
  "the Account {string} has these Reading places, newest first, as the API answers:",
  async ({ reader }, email: string, table: DataTable) => {
    await settled(reader.page);
    const api = await apiSignedIn(reader.baseURL, email);
    try {
      const res = await api.get(READING_PLACES);
      expect(res.status(), `the API answers the Account's Reading places: ${(await res.text()).slice(0, 200)}`).toBe(200);
      const { readingPlaces } = (await res.json()) as { readingPlaces: { surah: number; ayah: number }[] };
      expect(readingPlaces.map(({ surah, ayah }) => `${surah}:${ayah}`)).toEqual(table.hashes().map((row) => row.place));
    } finally {
      await api.dispose();
    }
  },
);

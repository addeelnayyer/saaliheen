// What the server does with the browser's requests for parts, shared by the
// Surah opening (#24) and the Theme opening (#131) steps: one mechanism, so one
// way to hold it back. Every request under /parts/ is intercepted, which is all
// a reader on a slow or broken connection would see.

import type { Page, Route } from "@playwright/test";

/** What the server does with the requests for parts. */
export interface PartsServer {
  /** "serve" answers at once; "hold" keeps them waiting; "fail" drops them. */
  mode: "serve" | "hold" | "fail";
  /** Whether the first part is served at once whatever the mode. */
  firstServed: boolean;
  /** The held-back requests, each served when let go. */
  waiting: (() => void)[];
  /** The address of every part requested since interception began, in order. */
  requested: string[];
}

const servers = new WeakMap<Page, PartsServer>();

/** Starts intercepting `page`'s requests for parts, served at once until told otherwise. */
async function intercept(page: Page): Promise<PartsServer> {
  const server: PartsServer = { mode: "serve", firstServed: false, waiting: [], requested: [] };
  servers.set(page, server);
  await page.route("**/parts/**", async (route: Route) => {
    const url = new URL(route.request().url());
    server.requested.push(url.pathname);
    const first = /\/1\.json$/.test(url.pathname);
    if (server.mode === "serve" || (server.firstServed && first)) return route.continue();
    if (server.mode === "fail") return route.abort("internetdisconnected");
    await new Promise<void>((go) => server.waiting.push(go));
    // The page may have gone on without it.
    await route.continue().catch(() => undefined);
  });
  return server;
}

/** Sets how `page`'s requests for parts are answered, intercepting them the first time. */
export async function partsServer(page: Page, mode: PartsServer["mode"], firstServed = false) {
  const server = servers.get(page) ?? (await intercept(page));
  server.mode = mode;
  server.firstServed = firstServed;
  if (mode === "serve") server.waiting.splice(0).forEach((go) => go());
}

/** The addresses of the parts `page` has requested since its parts were first intercepted. */
export const requestedParts = (page: Page): string[] => [...(servers.get(page)?.requested ?? [])];

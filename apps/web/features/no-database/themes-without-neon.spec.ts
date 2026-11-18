// Pages that read Themes, built without Neon (#170 AC-4): the build that
// ./serve-without-database.ts made with its database unreachable succeeded
// (or the global setup would have failed), and its prerender manifest lists
// none of the pages that read Themes.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { UNREACHABLE } from "./serve-without-database";

const feature = await loadFeature("./themes-without-neon.feature");

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;
/** The build output the global setup made. */
const PRERENDER_MANIFEST = path.join(__dirname, "..", "..", ".next", "prerender-manifest.json");

/** Each placeholder of an address in the feature's table, as the part of a path it stands for. */
const PLACEHOLDERS: Record<string, string> = {
  "<lang>": "(?:ur|en)",
  "<slug>": "[a-z0-9-]+",
  "<surah>": "\\d{1,3}",
  "<part>": "\\d+\\.json",
  "<picture>": "(?:opengraph|twitter)-image[^/]*(?:/[^/]+)?",
};

/** The paths `address` (with placeholders) stands for, as a pattern. */
const patternOf = (address: string) =>
  new RegExp(`^${address.replace(/<\w+>|[.]/g, (m) => PLACEHOLDERS[m] ?? (m === "." ? "\\." : m))}$`);

describeFeature(feature, ({ Scenario }) => {
  Scenario("With Neon unreachable the site still builds, and prerenders no page that reads Themes", ({ Given, Then }) => {
    Given("the site was built and is served with its database unreachable", async () => {
      const { hostname, port } = new URL(UNREACHABLE);
      const connects = await new Promise<boolean>((resolve) => {
        const socket = net.connect(Number(port), hostname, () => (socket.destroy(), resolve(true)));
        socket.on("error", () => resolve(false));
      });
      expect(connects, `something takes connections at ${hostname}:${port}`).toBe(false);
      expect((await fetch(`${baseURL()}/privacy`)).status, "the build serves").toBe(200);
      expect(fs.existsSync(PRERENDER_MANIFEST), "the build wrote its prerender manifest").toBe(true);
    });

    Then("the build prerendered none of these pages, in either Language:", (_, table: { page: string; address: string }[]) => {
      const routes = Object.keys((JSON.parse(fs.readFileSync(PRERENDER_MANIFEST, "utf8")) as { routes: Record<string, unknown> }).routes);
      expect(routes.length, "pages the build prerendered").toBeGreaterThan(0);
      const prerendered = table.flatMap(({ page, address }) => {
        const found = routes.filter((r) => patternOf(address).test(r));
        return found.length ? [`${page}: ${found.length} prerendered, e.g. ${found.slice(0, 3).join(", ")}`] : [];
      });
      expect(prerendered, "pages that read Themes, prerendered at build").toEqual([]);
    });
  });
});

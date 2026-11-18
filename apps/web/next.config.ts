import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site tests serve a standalone build (playwright.config.ts): its server
  // holds only the files each route's output trace names, as a Vercel
  // deployment does, so a file missing from a trace fails the tests too.
  // Next takes the monorepo's root (where pnpm-lock.yaml is) as the tracing
  // root, so the standalone server sits at .next/standalone/apps/web/ (#63).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // When this build was made, inlined into its code: the Allah references'
  // data cache (src/allah-references/for-surah.ts, #147) keys on it, so each
  // build reads Neon afresh rather than a cache an earlier build left in
  // .next/cache, while a publish still refreshes a running build by its tag.
  env: { BUILD_TIME: String(Date.now()) },
  // Urdu is the site's first Language: `/` has no page of its own.
  async redirects() {
    return [{ source: "/", destination: "/ur", permanent: false }];
  },
  // The admin area (#42) is never indexed: an X-Robots-Tag header on every
  // admin page, beside the pages' own robots meta tag.
  async headers() {
    return ["/admin", "/admin/:path*"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Opening a Surah from inside the app (#24, ADR 0005): every request
        // the app's router makes, prefetches included, asks for a React Server
        // Components payload with the `rsc: 1` header, and a browser loading a
        // page never sends it (node_modules/next/dist/docs/01-app/02-guides/
        // cdn-caching.md, "Where CDN Caching Is Challenging"). So the router's
        // requests for a Surah page get the Surah opened in parts, a small page
        // whose Ayahs load in the browser, while a direct load, a reload or a
        // search engine gets the whole Surah page. Next already marks both
        // answers `Vary: rsc` and gives the router's requests their own `_rsc`
        // search parameter, so a cache never mixes them up.
        {
          source: "/:lang(ur|en)/:surah(\\d{1,3})",
          has: [{ type: "header", key: "rsc", value: "1" }],
          destination: "/:lang/opening/:surah",
        },
        // A Theme page opened from inside the app (#131, ADR 0014) the same
        // way: its first Theme part at once and the rest from its parts.
        {
          source: "/:lang(ur|en)/themes/:slug",
          has: [{ type: "header", key: "rsc", value: "1" }],
          destination: "/:lang/opening/themes/:slug",
        },
      ],
    };
  },
};

export default nextConfig;

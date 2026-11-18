// The build's config, read without Expo so the scenarios run it in Node: the
// origin the app reads /data/v1 from, the release switches (#72) and the
// build's version (#73). A release switch holds back a feature until it is
// ready, as the website's do (apps/web/src/app/[lang]/release.ts) and by the
// same rule: on only when set to "on". EXPO_PUBLIC_ values are inlined into the
// app's bundle, so their state is the build's; app.json's `extra` gives each
// when the environment does not.

/** The origin the app reads /data/v1 from, without a trailing slash: EXPO_PUBLIC_DATA_ORIGIN, else `extra.dataOrigin` in app.json. */
export function configuredOrigin(env: string | undefined, extra?: { dataOrigin?: unknown }): string {
  const configured = env || (extra?.dataOrigin as string | undefined);
  if (!configured) throw new Error("No data origin: set extra.dataOrigin in app.json or EXPO_PUBLIC_DATA_ORIGIN");
  return configured.replace(/\/+$/, "");
}

/** A release switch: on only when the environment, else app.json's `extra`, sets it "on". */
const switchOn = (env: string | undefined, extra: unknown): boolean => (env || extra) === "on";

/** Passage headings above the first Ayah of each Passage, off until a Scholar has checked the Passage titles. */
export const passageHeadingsOn = (env: string | undefined, extra?: { passageHeadings?: unknown }): boolean =>
  switchOn(env, extra?.passageHeadings);

/** The Tafsir after each Passage (#236), off until the Passages are redrawn around the Tafsir entries. */
export const tafsirOn = (env: string | undefined, extra?: { tafsir?: unknown }): boolean => switchOn(env, extra?.tafsir);

/** A build's version (#73): app.json's `version`, as the build's config gives it, compared with the manifest's minAppVersion. */
export function buildVersion(config: { version?: string } | null | undefined): string {
  const version = config?.version;
  if (!version) throw new Error("No app version: set version in app.json");
  return version;
}

// The app-link files (#76, ADR 0048): what tells a phone that the Saaliheen
// app opens the site's Share page links. iOS reads
// /.well-known/apple-app-site-association, naming the app by its Apple team
// and bundle ID and the paths it claims; Android reads
// /.well-known/assetlinks.json, naming the app by its package and the SHA-256
// fingerprints of the certificates it is signed with. Both are made from the
// settings APPLE_TEAM_ID and ANDROID_SHA256 (comma-separated, for an upload key
// and Google Play's signing key), read on each request; with a setting unset
// the file names no app, so every link opens in the browser.

import { SHARE_PATH_PREFIXES } from "@saaliheen/share";

/** The app's bundle ID on iOS and package on Android, as apps/mobile/app.json gives them. */
export const APP_ID = "com.saaliheen.app";

/** The apple-app-site-association for the Apple team `teamId`: its app links claim only Share pages; none without a team. */
export function appleAppSiteAssociation(teamId: string | undefined) {
  const team = teamId?.trim();
  const components = SHARE_PATH_PREFIXES.map((prefix) => ({ "/": `${prefix}*`, comment: "A Share page" }));
  return { applinks: { details: team ? [{ appIDs: [`${team}.${APP_ID}`], components }] : [] } };
}

/** The assetlinks.json for the certificate fingerprints `sha256` (comma-separated): it lets the app handle the site's links; none without a fingerprint. */
export function assetLinks(sha256: string | undefined) {
  const fingerprints = (sha256 ?? "").split(",").map((f) => f.trim()).filter(Boolean);
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

// The app links' test configuration (#76): the Apple team and the Android
// signing certificate the site tests' own server runs with, so that the
// website's /.well-known/apple-app-site-association and
// /.well-known/assetlinks.json name the app as a phone would see them in
// production. Neither is a real team or certificate. The server without a
// database (../no-database/serve-without-database.ts) runs with both unset.

/** A made-up 10-character Apple team ID. */
export const TEST_APPLE_TEAM_ID = "SAALIHEEN7";
/** A made-up SHA-256 certificate fingerprint: 32 colon-separated hex bytes. */
export const TEST_ANDROID_SHA256 = Array.from({ length: 32 }, (_, i) => (0xa0 + i).toString(16).toUpperCase()).join(":");

/** The app's identity on iOS and on Android, as apps/mobile/app.json gives it. */
export const APP_ID = "com.saaliheen.app";

/** The settings that name the app to phones. */
export const APP_LINK_SETTINGS: Record<string, string> = {
  APPLE_TEAM_ID: TEST_APPLE_TEAM_ID,
  ANDROID_SHA256: TEST_ANDROID_SHA256,
};

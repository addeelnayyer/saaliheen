// The app's config: app.json, plus Sign in with Google's client ids (#75),
// which are set where the app is built, never committed:
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (the website's Google client, GOOGLE_CLIENT_ID)
// and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (the app's iOS client), whose reversed
// id is the URL scheme Google's sheet answers on. Without an iOS client id the
// build has no Google sheet to open, and Sign in with Google is cancelled.

import type { ConfigContext, ExpoConfig } from "expo/config";

/** Google's iOS URL scheme for client `id` ("123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc"). */
const reversed = (id: string) => id.split(".").reverse().join(".");

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const google = googleIosClientId ? [["@react-native-google-signin/google-signin", { iosUrlScheme: reversed(googleIosClientId) }] as [string, object]] : [];
  return {
    ...config,
    name: config.name ?? "Saaliheen",
    slug: config.slug ?? "saaliheen",
    plugins: [...(config.plugins ?? []), ...google],
    extra: { ...config.extra, googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, googleIosClientId },
  };
};

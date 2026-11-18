// What the app's Account (src/account.ts, #75) is given from the device: the
// keychain it keeps its sign-in in (expo-secure-store), the connection it
// listens to (expo-network), and the device's own Sign in with Google
// (@react-native-google-signin/google-signin) and Sign in with Apple
// (expo-apple-authentication) sheets, each giving the provider's id token, or
// null when the reader cancels it. Google's client ids are app config
// (app.config.ts): `extra.googleWebClientId`, the website's own client, which
// Google names as the id token's audience, and `extra.googleIosClientId`.

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import type { Connection, IdToken, Keychain, SignInMethod, SignInSheet } from "./account";

/** The device's keychain, kept on this device only, readable once it has been unlocked after starting. */
export const deviceKeychain: Keychain = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};

/** The device's connection: online while it is connected. */
export const deviceConnection: Connection = {
  subscribe(listener) {
    const subscription = Network.addNetworkStateListener(({ isConnected }) => listener(isConnected === true));
    return () => subscription.remove();
  },
};

/** Google's client ids, as the app was built with them. */
const googleClients = (): { googleWebClientId?: string; googleIosClientId?: string } => ({ ...Constants.expoConfig?.extra });

/** A sheet's id token, or null when it gave none. */
const tokenOf = (token: string | null | undefined): IdToken | null => (token ? { token } : null);

/** The Sign in with Google sheet: its id token, or null when cancelled. */
async function googleSheet(): Promise<IdToken | null> {
  const { googleWebClientId, googleIosClientId } = googleClients();
  GoogleSignin.configure({ webClientId: googleWebClientId, iosClientId: googleIosClientId });
  const answer = await GoogleSignin.signIn();
  return tokenOf(answer.type === "success" ? answer.data.idToken : null);
}

/** The Sign in with Apple sheet, asking for the email: its id token, or null when cancelled. */
async function appleSheet(): Promise<IdToken | null> {
  const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL] });
  return tokenOf(credential.identityToken);
}

const SHEETS: Record<SignInMethod, () => Promise<IdToken | null>> = { google: googleSheet, apple: appleSheet };

/** The device's sheet for `method`; a sheet that fails or is dismissed is cancelled. */
export const deviceSheet: SignInSheet = (method) => SHEETS[method]().catch(() => null);

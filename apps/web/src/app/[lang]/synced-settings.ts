// Script and Language following an Account (#70): a signed-in browser keeps
// them in its Account through the versioned API's settings resource
// (/api/v1/settings) and shows the Account's on every page it opens. Choosing a
// Script or switching Language saves it there straight away; each page this
// browser opens, and right after sign-in, applies what the Account holds: its
// Script on <html> and in browser storage, and its Language by moving to that
// Language's address. An Account that has not chosen one yet takes this
// device's: the Script it shows and the Language of the page it is on. Arabic
// size and Meaning size stay on each device and are never sent.

import { LANGUAGES, type Language, type Script } from "@saaliheen/dataset/types";
import { accountClient } from "@/account/client";
import type { SettingsChange, SyncedSettings } from "@/account/synced-settings";
import { currentScript, STORED_AS } from "./settings";
import { store } from "./storage";

const SETTINGS = "/api/v1/settings";

/** Whether this browser was signed in when it last asked; only then is a choice saved. */
let signedIn = false;

/** Whether this browser was signed in to an Account when a page last asked (syncWithAccount). */
export const signedInToAccount = () => signedIn;
/** The saves sent so far, one after another, so a page applies the Account only after they land. */
let saving: Promise<unknown> = Promise.resolve();

/** Save `change` to the Account this browser is signed in to; nothing when signed out. */
export function saveToAccount(change: SettingsChange) {
  if (!signedIn) return;
  const body = JSON.stringify(change);
  saving = saving
    .then(() => fetch(SETTINGS, { method: "PATCH", headers: { "content-type": "application/json" }, body }))
    .catch(() => {});
}

/** The Account's settings, or undefined when this browser is not signed in. */
async function accountSettings(): Promise<SyncedSettings | undefined> {
  const { data } = await accountClient.getSession();
  signedIn = Boolean(data);
  if (!signedIn) return undefined;
  const res = await fetch(SETTINGS, { cache: "no-store" });
  return res.ok ? ((await res.json()) as SyncedSettings) : undefined;
}

/** This device's settings for those the Account has not chosen yet. */
function unchosen(account: SyncedSettings, lang: Language): SettingsChange {
  const change: SettingsChange = {};
  if (!account.script) change.script = currentScript();
  if (!account.language) change.language = lang;
  return change;
}

/** Show `script` and keep it in browser storage, as choosing it does. */
function showScript(script: Script) {
  document.documentElement.setAttribute("data-script", script);
  store(STORED_AS.script, script);
}

/** This page's address in `language`: the same path, query and fragment, as the Language switch keeps them. */
const addressIn = (language: Language) => {
  const { pathname, search, hash } = window.location;
  return `/${language}${pathname.replace(/^\/[^/]+/, "")}${search}${hash}`;
};

/** The Language of the page this browser shows, from its address. */
export function pageLanguage(): Language | undefined {
  const segment = window.location.pathname.split("/")[1];
  return LANGUAGES.find((l) => l === segment);
}

/** Save this device's settings for those the Account has not chosen yet. */
function fillUnchosen(account: SyncedSettings, lang: Language) {
  const change = unchosen(account, lang);
  if (Object.keys(change).length > 0) saveToAccount(change);
}

/** Show the Account's Script, when it has one this page does not show. */
function applyScript({ script }: SyncedSettings) {
  if (script && script !== currentScript()) showScript(script);
}

/** The address in the Account's Language, when it has one this page is not in. */
const languageAddress = ({ language }: SyncedSettings, lang: Language) =>
  language && language !== lang ? addressIn(language) : undefined;

/**
 * Bring the Account's Script and Language to this page, once the saves sent so
 * far have landed. Answers the address to move to when the Account's Language
 * is not this page's.
 */
export async function syncWithAccount(lang: Language): Promise<string | undefined> {
  await saving;
  const account = await accountSettings();
  if (!account) return undefined;
  fillUnchosen(account, lang);
  applyScript(account);
  return languageAddress(account, lang);
}

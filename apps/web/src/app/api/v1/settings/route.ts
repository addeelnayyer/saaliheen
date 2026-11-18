// An Account's synced settings (#70, ADR 0008), /api/v1/settings: GET answers
// { script, language }, each null until the Account first chooses; PATCH saves
// the ones its JSON body names and answers them all. Either answers to the
// website's session cookie or the mobile app's bearer token, and refuses a
// request with neither (401). A body that is not a JSON object, or names a
// Script or Language that is not one, is refused (400) and changes nothing.

import { readSettings, saveSettings, settingsChange } from "@/account/synced-settings";
import { apiError, apiJson } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

export async function GET(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  return apiJson(await readSettings(account));
}

export async function PATCH(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const change = settingsChange(await request.json().catch(() => undefined));
  if (!change) return apiError(400, "send a JSON object naming a script (uthmani or indopak) and/or a language (ur or en)");
  return apiJson(await saveSettings(account, change));
}

// An Account's Quran Chat Conversations (#79), GET /api/v1/conversations:
// { conversations: [{ id, title, startedAt, updatedAt }] }, the one asked in
// most recently first, times in milliseconds since the epoch. It answers to
// the website's session cookie or the mobile app's bearer token, and refuses a
// request with neither (401). A Conversation is started by asking a question
// without one (../questions/route.ts).

import { database } from "@/database";
import { listConversations } from "@/quran-chat/conversations";
import { apiJson } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

export async function GET(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  return apiJson({ conversations: await listConversations(database(), account) });
}

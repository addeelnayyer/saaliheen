// One of an Account's Quran Chat Conversations (#79),
// /api/v1/conversations/{id}: GET reopens it, { id, title, startedAt,
// updatedAt, questions: [{ question, language, askedAt, answer, declined }] },
// its questions in the order they were asked, an answer null when none was
// kept; DELETE deletes it and every question in it (204). Either refuses a
// request from no Account (401), and answers 404 for a Conversation that is
// not the Account's, whether another's or none.

import { database } from "@/database";
import { deleteConversation, NO_SUCH_CONVERSATION, readConversation } from "@/quran-chat/conversations";
import { apiError, apiJson, withMinAppVersion } from "../../respond";
import { notSignedIn, signedInAccount } from "../../signed-in";

const notFound = () => apiError(404, NO_SUCH_CONVERSATION);

export async function GET(request: Request, { params }: RouteContext<"/api/v1/conversations/[id]">) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const conversation = await readConversation(database(), account, (await params).id);
  return conversation ? apiJson(conversation) : notFound();
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/conversations/[id]">) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const deleted = await deleteConversation(database(), account, (await params).id);
  return deleted ? withMinAppVersion(new Response(null, { status: 204 })) : notFound();
}

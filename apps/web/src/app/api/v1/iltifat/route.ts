// Every Iltifat, as the mobile app reads them (#139, ADR 0012), /api/v1/iltifat:
// GET answers { iltifat, counts }, needing no Account. "iltifat" lists every
// Iltifat in Quran order, Disputed ones included, each with its Marked Words
// in reading order (#143, ADR 0026), [] when it has none; "counts" gives each Iltifat direction's
// count in the overview's order, its Disputed Iltifat counted apart. Both come
// from Neon through the Iltifat module, cached under the overview's tag
// (ADR 0016, ADR 0017), and by the CDN for a minute, so an app can find the Iltifat cited at any Ayah from this one
// answer.

import { cachedEveryIltifat, cachedIltifatCounts } from "@/iltifat/cached";
import { apiJson, cachedAtEdge } from "../respond";

export async function GET() {
  const [iltifat, counts] = await Promise.all([cachedEveryIltifat(), cachedIltifatCounts()]);
  return cachedAtEdge(apiJson({ iltifat, counts }), 60);
}

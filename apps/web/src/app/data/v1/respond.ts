// How every file under /data/v1 is answered (#65): exactly the bytes its
// manifest hash is taken over (publishedFile), as JSON.

import { publishedFile } from "@saaliheen/dataset/published";

export const publishedResponse = (value: unknown) =>
  new Response(publishedFile(value), { headers: { "content-type": "application/json" } });

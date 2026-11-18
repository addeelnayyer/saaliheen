// Share page links opening the app (#76, ADR 0048): a link on
// https://saaliheen.com that iOS or Android hands the app (it claims only
// /<lang>/share/…), or one under the app's own saaliheen:// scheme, opens the
// Share page it names (app/(read)/share.tsx), with no edit strip. Any other
// link opens the app as it would anyway.

import { sharePath } from "@saaliheen/share";
import { APP_SCHEME, shareRequestOfLink } from "../src/share";

/** The system hands over a whole link, or a path alone, which is read as under the app's own scheme. */
const asLink = (path: string) => (path.includes("://") ? path : `${APP_SCHEME}://${path.replace(/^\/+/, "")}`);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const request = shareRequestOfLink(asLink(path));
  return request ? `/share?path=${encodeURIComponent(sharePath(request))}` : path;
}

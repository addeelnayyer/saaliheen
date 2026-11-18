// A Share page whose address names no Share layout: a single Ayah, or a run
// set out Ayah by Ayah (#55). See ../../../share-page.tsx.

import { generateMetadata, SharePage } from "../../../share-page";

// No address is rendered at build time; each renders on its first request and
// is then cached. Addresses the page does not allow are not found.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export { generateMetadata };
export default SharePage;

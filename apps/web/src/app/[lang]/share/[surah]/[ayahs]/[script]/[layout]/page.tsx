// A Share page whose address names its Share layout (#55): /ayah-by-ayah or
// /flowing after a run. See ../../../../share-page.tsx.

import { generateMetadata, SharePage } from "../../../../share-page";

// No address is rendered at build time; each renders on its first request and
// is then cached. Addresses the page does not allow are not found.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export { generateMetadata };
export default SharePage;

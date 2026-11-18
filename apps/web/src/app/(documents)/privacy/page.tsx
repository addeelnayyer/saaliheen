// The privacy policy without a Language (#50): the address Google's and Apple's sign-in
// setup names. A reader reaches it in their Language from Me ([lang]/privacy, #192).

import type { Metadata } from "next";
import { STRINGS } from "../../[lang]/strings";
import { Document } from "../document";
import { PrivacyPolicy } from "./privacy-text";

export const metadata: Metadata = { title: `${STRINGS.privacy} · ${STRINGS.brand}` };

export default function Page() {
  return (
    <Document>
      <PrivacyPolicy />
    </Document>
  );
}

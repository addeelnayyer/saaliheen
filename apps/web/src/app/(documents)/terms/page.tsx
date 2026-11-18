// The terms of service without a Language (#50): the address Google's sign-in
// setup names. A reader reaches it in their Language from Me ([lang]/terms, #192).

import type { Metadata } from "next";
import { STRINGS } from "../../[lang]/strings";
import { Document } from "../document";
import { TermsOfService } from "./terms-text";

export const metadata: Metadata = { title: `${STRINGS.terms} · ${STRINGS.brand}` };

export default function Page() {
  return (
    <Document>
      <TermsOfService />
    </Document>
  );
}

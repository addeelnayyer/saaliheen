// The terms of service (#50), the second link Google's sign-in setup asks for.

import Link from "next/link";
import type { Language } from "@/dataset/reader";
import { Contact, DocumentText, documentHref, OWNER } from "../document";

/** The terms document's text; its links keep `lang` when it is read in one. */
export function TermsOfService({ lang }: { lang?: Language }) {
  return (
    <DocumentText title="Terms of service" updated="5 October 2026">
      <p>
        Saaliheen (saaliheen.com) is run by {OWNER}. By using the site you agree to these terms. If you have a question about
        them, write to <Contact />.
      </p>

      <h2>The content</h2>
      <p>
        The Quran text, Word meanings, Roots and Ayah translations on Saaliheen come from Tarteel&apos;s Quranic Universal
        Library (QUL) and the translators named on the <Link href={documentHref(lang, "/credits")}>Credits</Link> page. They remain the work of
        their sources and keep their own licences.
      </p>

      <h2>No warranty</h2>
      <p>
        We take care to show the content faithfully, but the site is provided as it is, without any warranty. We are not liable
        for any loss arising from its use, or from the site being unavailable.
      </p>

      <h2>Using the site</h2>
      <ul>
        <li>You may read, study and share links to the site freely.</li>
        <li>Do not copy the site in bulk, or load it in a way that harms its service to others.</li>
        <li>Do not present Saaliheen&apos;s content as something it is not, or alter it while naming Saaliheen as its source.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        Reading never needs an Account. You may keep one by signing in with Google or Apple; it is for your own use of the site.
        You can delete it at any time with Delete Account on the Sign-in page. It is deleted at once, with everything tied to
        it, and this cannot be undone.
      </p>

      <h2>Admins</h2>
      <p>Admin access is given by invitation only, and can be withdrawn at any time.</p>

      <h2>Privacy</h2>
      <p>
        The <Link href={documentHref(lang, "/privacy")}>privacy policy</Link> explains what information the site handles.
      </p>

      <h2>Changes and law</h2>
      <p>
        These terms may change; the date above shows the latest version. They are governed by the laws of Pakistan.
      </p>
    </DocumentText>
  );
}

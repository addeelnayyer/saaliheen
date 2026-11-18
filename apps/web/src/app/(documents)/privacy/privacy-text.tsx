// The privacy policy (#50), the link Google's and Apple's sign-in setup ask
// for. It describes only what the site does today, Accounts included (#68):
// add Quran Chat when it ships.

import Link from "next/link";
import type { Language } from "@/dataset/reader";
import { Contact, DocumentText, documentHref, OWNER } from "../document";

/** The privacy document's text; its links keep `lang` when it is read in one. */
export function PrivacyPolicy({ lang }: { lang?: Language }) {
  return (
    <DocumentText title="Privacy policy" updated="6 October 2026">
      <p>
        Saaliheen (saaliheen.com) is run by {OWNER}. This policy explains what information the site handles and why. If you
        have a question about it, write to <Contact />.
      </p>

      <h2>Reading the Quran</h2>
      <p>You can use Saaliheen without an account. We do not use analytics, advertising or tracking of any kind, and we set no cookies for readers.</p>
      <p>
        Your choices, such as the Arabic script, the theme and the text sizes, and the Ayah where you last stopped reading in
        each Surah, are kept in your own browser&apos;s storage. They never reach us, and you can remove them at any time by clearing this
        site&apos;s data in your browser.
      </p>

      <h2>Our host</h2>
      <p>
        The site is hosted by Vercel. Like any web server, Vercel records standard details of each request, such as your IP
        address, browser and the page asked for, to deliver the site and keep it secure. We do not use these records to
        identify or follow readers.
      </p>

      <h2>Accounts</h2>
      <p>
        Reading never needs an Account. If you choose to keep one, you sign in with Google or Apple. Signing in gives us your
        email address, and the name and picture Google or Apple share with it. We keep these, with a note of whether you signed
        in with Google or Apple, so that signing in again brings you back to the same Account. A cookie then keeps you signed
        in on that browser until you sign out. Accounts are stored in a database at Neon, which we use as our database
        provider.
      </p>
      <p>
        You can delete your Account at any time with Delete Account on the Sign-in page. Your Account and everything tied to
        it are deleted at once, with no grace period, and you are signed out on every device. Signing in again later makes a
        new, empty Account.
      </p>

      <h2>Admins</h2>
      <p>
        A few invited Admins sign in, with GitHub or Google, to maintain the site&apos;s content. Signing in gives us only the
        Admin&apos;s email address, which we check against the list of invited Admins; we ask for nothing else. A cookie then
        keeps the Admin signed in. Changes an Admin makes are kept in their browser until they publish them.
      </p>

      <h2>Sharing</h2>
      <p>We do not sell, rent or share personal information with anyone, apart from the hosting and the Account database described above.</p>

      <h2>Changes</h2>
      <p>
        When the site starts handling new information, this policy will say so first, with a new date above. The{" "}
        <Link href={documentHref(lang, "/terms")}>terms of service</Link> cover the rest of your use of the site.
      </p>
    </DocumentText>
  );
}

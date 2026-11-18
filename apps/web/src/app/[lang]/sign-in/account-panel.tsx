"use client";

// The Sign-in page's panel (#66): while the browser asks the site whether it is
// signed in, a note; signed out, a button per sign-in method; signed in, the
// Account's email, Sign out and Delete Account (#68). On the Admin entry
// (`?admin=<admin page>`, #67) it offers GitHub too, and a sign-in comes back
// to that admin page.

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { accountClient } from "@/account/client";
import { METHOD_NAMES, METHODS, READER_METHODS, type Method } from "@/account/settings";
import { ADMIN_ENTRY_PARAM, adminPageOrHome } from "@/admin/admin-entry";
import { Button } from "@/components/ui/button";
import { STRINGS } from "../strings";
import { ACCOUNT_BUTTON } from "./account-button";
import { DeleteAccount } from "./delete-account";
import styles from "./sign-in.module.css";

/** What this Sign-in page offers and where a sign-in comes back to: the Admin entry's admin page, else here. */
function useEntry(): { methods: readonly Method[]; back?: string; failedBefore: boolean } {
  const params = useSearchParams();
  const failedBefore = params.has("error");
  if (!params.has(ADMIN_ENTRY_PARAM)) return { methods: READER_METHODS, failedBefore };
  return { methods: METHODS, back: adminPageOrHome(params.get(ADMIN_ENTRY_PARAM)), failedBefore };
}

function SignInChoices() {
  const { methods, back, failedBefore } = useEntry();
  const [failed, setFailed] = useState(failedBefore);
  const signIn = async (provider: Method) => {
    setFailed(false);
    const here = window.location.pathname;
    // A refused or failed sign-in comes back to this page, the Admin entry kept.
    const errorCallbackURL = here + window.location.search.replace(/[?&]error=[^&]*/g, "");
    // On success the client sends the browser on to the method's sign-in page.
    const { error } = await accountClient.signIn.social({ provider, callbackURL: back ?? here, errorCallbackURL });
    if (error) setFailed(true);
  };
  return (
    <>
      <p className={styles.lead}>{STRINGS.signInLead}</p>
      {failed && (
        <p role="alert" className={styles.error}>
          {STRINGS.signInFailed}
        </p>
      )}
      <div className={styles.stack}>
        {methods.map((provider) => (
          <Button key={provider} variant="secondary" className={ACCOUNT_BUTTON} onClick={() => signIn(provider)}>
            {STRINGS.signInWith(METHOD_NAMES[provider])}
          </Button>
        ))}
      </div>
    </>
  );
}

function SignedIn({ email }: { email: string }) {
  return (
    <div className={styles.stack}>
      <p className={styles.who}>
        {STRINGS.signedInAs} <strong>{email}</strong>
      </p>
      <Button variant="secondary" className={ACCOUNT_BUTTON} onClick={() => accountClient.signOut()}>
        {STRINGS.signOut}
      </Button>
      <DeleteAccount />
    </div>
  );
}

export function AccountPanel() {
  const { data, isPending } = accountClient.useSession();
  if (isPending) return <p className={styles.lead}>{STRINGS.signingIn}</p>;
  return data ? <SignedIn email={data.user.email} /> : <SignInChoices />;
}

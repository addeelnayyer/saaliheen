"use client";

// Me's first entry (#192): Sign in for anyone not signed in; signed in, who
// they are and a link to their Account (the Sign-in page, which signs out and
// deletes it), and for an Admin a link to the admin area.

import Link from "next/link";
import { useEffect, useState } from "react";
import { accountClient } from "@/account/client";
import type { Language } from "@/dataset/reader";
import { STRINGS } from "../strings";
import { signedInAsAdmin } from "./is-admin";
import styles from "./me.module.css";

/** Whether the Account signed in as `email` is an Admin's, once the site has said. */
function useAdmin(email: string | undefined): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!email) return;
    let current = true;
    signedInAsAdmin()
      .then((yes) => current && setAdmin(yes))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [email]);
  return !!email && admin;
}

export function MeAccount({ lang }: { lang: Language }) {
  const { data } = accountClient.useSession();
  const email = data?.user.email;
  const admin = useAdmin(email);
  if (!email) {
    return (
      <Link className={styles.primary} href={`/${lang}/sign-in`}>
        {STRINGS.signIn}
      </Link>
    );
  }
  return (
    <div className={styles.account}>
      <p className={styles.who}>
        {STRINGS.signedInAs} <strong>{email}</strong>
      </p>
      <Link className={styles.entry} href={`/${lang}/sign-in`}>
        {STRINGS.account}
      </Link>
      {admin && (
        <Link className={styles.entry} href="/admin" prefetch={false}>
          {STRINGS.admin}
        </Link>
      )}
    </div>
  );
}

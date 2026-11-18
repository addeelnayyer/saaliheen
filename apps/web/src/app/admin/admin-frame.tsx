// What every admin page a signed-in person sees shares (#42): the bar naming
// who is signed in, with Sign out, which signs their Account out (#67): a
// plain form post to ./sign-out, so the browser has signed out by the time
// it lands on the admin area again.

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import styles from "./admin.module.css";

export function AdminFrame({ email, children }: { email: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <Link className={styles.brand} href="/admin" prefetch={false}>
          Saaliheen admin
        </Link>
        {/* Back to the reading site (#192). */}
        <Link className={styles.back} href="/" prefetch={false}>
          ← Reading site
        </Link>
        <form method="post" action="/admin/sign-out" className={styles.who}>
          <span>Signed in as {email}</span>
          <Button type="submit" variant="secondary" size="control">
            Sign out
          </Button>
        </form>
      </header>
      {children}
    </main>
  );
}

/** A signed-in person whose email is not on the Admin allow-list: told so, not shown an error. */
export function NotAnAdmin({ email }: { email: string }) {
  return (
    <AdminFrame email={email}>
      <h1 className={styles.title}>You are not an Admin</h1>
      <p className={styles.lead}>
        {email} is not on the Admin allow-list, so the admin area is closed to it. If you should be an Admin, ask a
        developer to add this email address, or sign out and sign in to another Account.
      </p>
    </AdminFrame>
  );
}

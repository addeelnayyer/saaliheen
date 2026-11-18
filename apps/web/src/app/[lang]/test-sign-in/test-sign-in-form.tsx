"use client";

// The Account test sign-in's form (#66, #67): posts the email, the chosen
// method and the name a provider would give (optional) to Better Auth's
// test-sign-in endpoint, then opens the Sign-in page. A refused sign-in (GitHub
// for anyone not on the Admin allow-list) says so and stays here.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AUTH_BASE_PATH, METHOD_NAMES, METHODS } from "@/account/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Language } from "@/dataset/reader";
import { ACCOUNT_BUTTON } from "../sign-in/account-button";
import styles from "../sign-in/sign-in.module.css";

export function TestSignInForm({ lang }: { lang: Language }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const method = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    const form = new FormData(event.currentTarget);
    const res = await fetch(`${AUTH_BASE_PATH}/test-sign-in`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), name: form.get("name"), method }),
    });
    setFailed(!res.ok);
    if (res.ok) router.push(`/${lang}/sign-in`);
  };
  return (
    <form onSubmit={submit} className={styles.stack}>
      {failed && (
        <p role="alert" className={styles.error}>
          Test sign-in failed.
        </p>
      )}
      <label className={styles.field}>
        Email
        <Input type="email" name="email" required autoComplete="off" />
      </label>
      <label className={styles.field}>
        Name
        <Input type="text" name="name" autoComplete="off" />
      </label>
      {METHODS.map((method) => (
        <Button key={method} type="submit" name="method" value={method} variant="secondary" className={ACCOUNT_BUTTON}>
          Test sign-in via {METHOD_NAMES[method]}
        </Button>
      ))}
    </form>
  );
}

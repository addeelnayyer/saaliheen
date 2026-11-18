// The Account test-only sign-in (#66, #67): signs a person in to an Account by
// email as if through GitHub, Google or Apple, so the site tests can sign
// readers and Admins in without them. It exists only while the
// test configuration switches it on (ACCOUNT_TEST_SIGN_IN=on, never on a Vercel
// deployment); otherwise this address is not found.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { accountTestSignInOn } from "@/account/settings";
import { LANGUAGES, type Language } from "@/dataset/reader";
import { TestSignInForm } from "./test-sign-in-form";
import styles from "../sign-in/sign-in.module.css";

export const metadata: Metadata = { title: "Test sign-in", robots: { index: false, follow: false } };

export default async function TestSignIn({ params }: PageProps<"/[lang]/test-sign-in">) {
  await connection();
  const { lang } = await params;
  if (!accountTestSignInOn() || !(LANGUAGES as readonly string[]).includes(lang)) notFound();
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Test sign-in</h1>
      <p className={styles.lead}>For the site tests only: sign in to an Account by email, without GitHub, Google or Apple.</p>
      <TestSignInForm lang={lang as Language} />
    </main>
  );
}

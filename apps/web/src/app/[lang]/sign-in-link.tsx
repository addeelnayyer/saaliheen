"use client";

// The top bar's Sign in (#192): shown while signed out, a Button (#306). The
// signed-in mark on <html> (@/account/signed-in-mark.ts) hides it before first
// paint; once the browser has asked the site, a mark that has
// gone stale (a session that ended elsewhere) is corrected, either way.

import Link from "next/link";
import { useEffect } from "react";
import { accountClient } from "@/account/client";
import { SIGNED_IN_ATTRIBUTE, SIGNED_IN_COOKIE } from "@/account/signed-in-mark";
import type { Language } from "@/dataset/reader";
import { Button } from "@/components/ui/button";
import { STRINGS } from "./strings";

/** Make the signed-in mark say what the site said. */
function correctMark(signedIn: boolean) {
  const html = document.documentElement;
  if (signedIn) return html.setAttribute(SIGNED_IN_ATTRIBUTE, "");
  html.removeAttribute(SIGNED_IN_ATTRIBUTE);
  document.cookie = `${SIGNED_IN_COOKIE}=; path=/; max-age=0`;
}

export function SignInLink({ lang }: { lang: Language }) {
  const { data, isPending } = accountClient.useSession();
  useEffect(() => {
    if (!isPending) correctMark(!!data);
  }, [data, isPending]);
  return (
    <Button
      asChild
      variant="filled"
      className="h-auto self-center px-4 py-1.5 text-[13.5px] leading-[inherit] [html[data-signed-in]_&]:hidden"
    >
      <Link href={`/${lang}/sign-in`} data-sign-in="">
        {STRINGS.signIn}
      </Link>
    </Button>
  );
}

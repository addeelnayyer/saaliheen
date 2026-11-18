"use client";

// The error page under a Language for a page that fails as it renders (ADR
// 0020), such as an Iltifat page with Neon unreachable. A page rendered on its
// first request and then cached draws the same page itself instead
// (src/themes/unavailable.ts). Retry renders the page again; nothing here is
// cached.

import { PageUnavailable } from "./page-unavailable";
import indexStyles from "./index.module.css";

export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className={indexStyles.app}>
      <PageUnavailable retry={retry} />
    </main>
  );
}

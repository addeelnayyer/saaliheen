"use client";

// Applies a signed-in Account's Script and Language (#70, ./synced-settings.ts)
// on each page the browser opens, by load or by the app's own navigation (the
// test sign-in's move to the Sign-in page included), then syncs its Reading
// places (#71, ./synced-reading-places.ts) and its Known words (#252,
// ./synced-known-words.ts) with the Account's. It shows nothing.

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncKnownWords } from "./synced-known-words";
import { syncReadingPlaces } from "./synced-reading-places";
import { pageLanguage, syncWithAccount } from "./synced-settings";

export function SettingsSync() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const lang = pageLanguage();
    if (!lang) return;
    let current = true;
    syncWithAccount(lang)
      .then((address) => {
        if (address && current) router.replace(address);
        return Promise.all([syncReadingPlaces(), syncKnownWords()]);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [pathname, router]);
  return null;
}

"use client";

// The share buttons of Quran Analysis (#19, #56): static text cannot be
// selected (ADR 0004), so each Ayah's "Ayah N" heading, and each Passage
// heading, carries a share button. Tapping one opens the Share page of that
// Ayah or exactly that Passage, in the page's Language and the reader's
// current Script, with the edit strip; sending and copying happen there.
// One listener serves every button, so long Surahs carry no handler per Ayah.

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Language } from "@/dataset/reader";
import { currentScript } from "../settings";
import { inAppHref } from "../share/in-app";

/** The Shared Ayahs of the share button a click landed on, if any: its `data-share`, `surah:from` or `surah:from-to` (ayah.tsx). */
function sharedOfClick(target: EventTarget | null) {
  const data = target instanceof Element ? target.closest<HTMLElement>("button[data-share]")?.dataset.share : undefined;
  const [surah, from, to = from] = data?.split(/[:-]/).map(Number) ?? [];
  return data ? { surah, from, to } : undefined;
}

/** Opens the Share page of whichever share button is tapped. */
export function ShareButtons({ lang }: { lang: Language }) {
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const shared = sharedOfClick(event.target);
      if (shared) router.push(inAppHref({ lang, script: currentScript(), ...shared }));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [lang, router]);
  return null;
}

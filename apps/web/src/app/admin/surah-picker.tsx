"use client";

// The Surah picker (#42): all 114 Surahs, each linking to its Passage editor,
// narrowed by a search for a number (that Surah only) or for part of a name
// (Latin, any case, or Arabic). Its search field and its Surahs are shadcn/ui's
// Input and Button (#298), on the site's tokens.

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SurahName } from "@/dataset/reader";
import styles from "./admin.module.css";

/** Whether `surah` is one a search for `query` shows. */
function matchesSearch(surah: SurahName, query: string): boolean {
  const q = query.trim();
  if (/^\d+$/.test(q)) return surah.number === Number(q);
  return surah.nameLatin.toLowerCase().includes(q.toLowerCase()) || surah.nameArabic.includes(q);
}

export function SurahPicker({ surahs }: { surahs: SurahName[] }) {
  const [query, setQuery] = useState("");
  const shown = surahs.filter((s) => matchesSearch(s, query));
  return (
    <>
      <Input
        type="search"
        aria-label="Search Surahs by number or name"
        placeholder="Search by number or name"
        className="mb-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length === 0 && <p className={styles.empty}>No Surah matches “{query}”.</p>}
      <ul className="grid gap-1">
        {shown.map((s) => (
          <li key={s.number}>
            <Button
              asChild
              variant="ghost"
              className="grid h-auto grid-cols-[3ch_1fr_auto] items-baseline justify-normal gap-3 px-3 py-2.5 text-[length:inherit] font-normal whitespace-normal hover:bg-secondary"
            >
              <Link href={`/admin/${s.number}`} prefetch={false}>
                <span className="text-end text-muted-foreground tabular-nums">{s.number}</span>
                <span>{s.nameLatin}</span>
                <span className="text-[18px]" lang="ar" dir="rtl">
                  {s.nameArabic}
                </span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

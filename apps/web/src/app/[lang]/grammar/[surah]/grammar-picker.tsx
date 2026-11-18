"use client";

// The Surah picker at a Grammar page's head (#279): a button opening a modal
// dialog of the 114 Surahs, searched as the Surah index searches them, each
// leading to its Grammar page. Built like the Surah bar's quick picker
// ([surah]/surah-picker.tsx), but with no Juz: opening a Juz is reading
// (index-lists.tsx), and Quran Grammar is studying, never reading. The Surahs
// are the Surah bar picker's, fetched on the first opening and kept while the
// site runs, so a Grammar page carries none of them. It is a shadcn/ui Dialog,
// as the Surah bar's picker is (#307).

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { Language } from "@/dataset/reader";
import { ListOr, Search, SurahRow } from "../../index-lists";
import { findSurahs, foldNames, type IndexSurah } from "../../index-search";
import { STRINGS } from "../../strings";
import { loadSurahs, PickerSheet } from "../../[surah]/surah-picker";
import { grammarPath } from "../grammar-path";

/** The Surahs, once fetched; none until then (or while a fetch has failed). */
function useSurahs(): IndexSurah[] {
  const [surahs, setSurahs] = useState<IndexSurah[]>([]);
  useEffect(() => {
    let live = true;
    loadSurahs().then(
      (s) => live && setSurahs(s),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return surahs;
}

/** The picker's content: a search over the Surahs' list, once fetched, scrolling on its own. */
function PickerContent({ lang, onFollow }: { lang: Language; onFollow: () => void }) {
  const surahs = useSurahs();
  const [query, setQuery] = useState("");
  const names = useMemo(() => foldNames(surahs), [surahs]);
  const shown = findSurahs(query, surahs, names);

  return (
    <PickerSheet title={STRINGS.grammarPicker}>
      <Search query={query} onQuery={setQuery} label={STRINGS.searchSurahs} />
      {surahs.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <ListOr empty={STRINGS.noSurah(query.trim())}>
            {shown.map((s) => (
              <SurahRow key={s.number} lang={lang} surah={s} href={grammarPath(lang, s.number)} onFollow={onFollow} />
            ))}
          </ListOr>
        </div>
      )}
    </PickerSheet>
  );
}

/** The button opening the picker, and the picker while it is open; Radix returns the focus to the button when it closes. */
export function GrammarPicker({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="pill" size="pill" className="py-[5px] text-[13.5px]">
          {STRINGS.grammarPicker}
        </Button>
      </DialogTrigger>
      {open && <PickerContent lang={lang} onFollow={() => setOpen(false)} />}
    </Dialog>
  );
}

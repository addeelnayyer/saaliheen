"use client";

// The Surah bar's quick picker (#193): the Surah's number and names on the
// Surah bar are a button opening a modal dialog with the Surah index's Surahs
// and Juz tabs and search (../index-lists.tsx), its Juz following the reader's
// Script. Choosing a Surah opens its page; choosing a Juz, the Surah page where
// it starts, at its first Ayah. On the mini bar the first tap only shows the
// full bar, as a tap anywhere on it does (surah-bar.tsx). The lists are the
// published dataset's (/data/v1/surahs.json and /data/v1/juz.json), fetched on
// the first opening and kept while the site runs. The picker opens on the
// Surahs tab and does not change the Surah index's remembered tab. It is a
// shadcn/ui Dialog (#304), whose backdrop holds the page beneath still.

import { useEffect, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { JuzLists, Language } from "@/dataset/reader";
import { cn } from "@/lib/utils";
import { fetchJsonOnce } from "../caches";
import { IndexLists } from "../index-lists";
import type { IndexSurah } from "../index-search";
import type { IndexTab } from "../index-tab";
import { STRINGS } from "../strings";

interface PickerData {
  surahs: IndexSurah[];
  juz: JuzLists;
}

const fetched = new Map<string, Promise<unknown>>();
/** The Surahs as the index lists them, fetched once while the site runs; the Grammar page's picker reads them too (#279). */
export const loadSurahs = () => fetchJsonOnce(fetched, "surahs", "/data/v1/surahs.json") as Promise<IndexSurah[]>;
const loadData = async (): Promise<PickerData> => {
  const [surahs, juz] = await Promise.all([
    loadSurahs(),
    fetchJsonOnce(fetched, "juz", "/data/v1/juz.json") as Promise<JuzLists>,
  ]);
  return { surahs, juz };
};

/** The lists, once fetched; null until then (or while a fetch has failed). */
function usePickerData(): PickerData | null {
  const [data, setData] = useState<PickerData | null>(null);
  useEffect(() => {
    let live = true;
    loadData().then(
      (d) => live && setData(d),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/**
 * A picker's sheet (this one's, and the Grammar page's, #279): centred, as
 * tall as the screen allows, its heading and close button over `children`.
 */
export function PickerSheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DialogContent
      aria-describedby={undefined}
      className="flex h-[min(760px,calc(100dvh-32px))] w-[min(560px,calc(100vw-32px))] flex-col gap-2 overflow-hidden overscroll-contain px-[18px] pt-4"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <DialogTitle className="text-[17px] font-semibold">{title}</DialogTitle>
        <DialogClose asChild>
          <Button variant="secondary" size="icon" className="rounded-full border-0 text-[20px] leading-none font-normal hover:bg-secondary" aria-label={STRINGS.closePicker}>
            ×
          </Button>
        </DialogClose>
      </div>
      {children}
    </DialogContent>
  );
}

/** The picker's content: the Surah index's tabs, search and lists, once fetched, each list scrolling on its own. */
function PickerContent({ lang, onFollow }: { lang: Language; onFollow: () => void }) {
  const data = usePickerData();
  const [tab, setTab] = useState<IndexTab>("surahs");
  return (
    <PickerSheet title={STRINGS.picker}>
      {data && <IndexLists lang={lang} surahs={data.surahs} juz={data.juz} tab={tab} onTab={setTab} onFollow={onFollow} />}
    </PickerSheet>
  );
}

/**
 * The Surah's number and names (`children`) as the button opening the picker.
 * `bar` is the Surah bar: while it is mini, a tap shows its full form instead.
 * Radix returns the focus to the button when the picker closes.
 */
export function SurahPicker({ lang, bar, className, children }: { lang: Language; bar: RefObject<HTMLDivElement | null>; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const onClick = (event: MouseEvent) => {
    const el = bar.current;
    if (el?.getAttribute("data-form") !== "mini") return;
    el.setAttribute("data-form", "full");
    event.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Its corners are a utility, so it keeps them while focused (a shadcn/ui part's outline reverts to its layered corners). */}
      <DialogTrigger className={cn(className, "rounded-md")} onClick={onClick}>
        {children}
      </DialogTrigger>
      {open && <PickerContent lang={lang} onFollow={() => setOpen(false)} />}
    </Dialog>
  );
}

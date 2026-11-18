"use client";

// A Spelling of a Root page (#287, #288): its heading, a button that opens and
// closes it, its open or closed state said to a screen reader, and under it,
// while open, the Ayahs it occurs in. A small Root's page arrives with every
// Spelling open and all its Ayahs. A large Root's arrives with every Spelling
// closed and none of them: opening one, or choosing its Lemma in the Lemma
// row, fetches its first fifty Ayahs, and "Show more" the next fifty, until
// the last part, by ../../in-parts/use-parts-on-demand.ts. A part that cannot
// be read gives way to a message and Retry, the rest of the page untouched.

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useEffectEvent, useId, useMemo, useState, type ReactNode } from "react";
import { joinedScripts } from "@saaliheen/dataset/parts";
import type { Language } from "@/dataset/reader";
import type { SpellingPartAyah } from "@/roots/parts";
import { AyahList, type ListedAyahText, type Marks } from "../../ayah-list";
import { Failure } from "../../in-parts/failure";
import shared from "../../in-parts/in-parts.module.css";
import { usePartsOnDemand } from "../../in-parts/use-parts-on-demand";
import { STRINGS } from "../../strings";
import styles from "./root-page.module.css";

/** How many Ayah rows of skeleton stand in for a part on its way. */
const SKELETON_ROWS = 2;

/** Calls `choose` when the Lemma section `section` is chosen: the page opened at it, a link to it followed, or Back or Forward to it. */
function useChosen(section: string, choose: () => void) {
  const chosen = useEffectEvent(choose);
  useEffect(() => {
    // Lemma section ids are plain ASCII, so the hash needs no decoding.
    const target = `#${section}`;
    const atIt = () => location.hash === target && chosen();
    // A link to the section the address already names changes no hash, so its click is heard too.
    const onClick = (event: MouseEvent) => (event.target as Element | null)?.closest?.(`a[href="${target}"]`) && chosen();
    atIt();
    window.addEventListener("hashchange", atIt);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", atIt);
      document.removeEventListener("click", onClick);
    };
  }, [section]);
}

/** Part `ayahs` as the Ayah list lists them, each linking to its first marked Word, and the Words it marks. */
function listed(ayahs: SpellingPartAyah[]): { list: ListedAyahText[]; marks: Marks } {
  const marks = new Map(ayahs.flatMap((a) => a.marked.map((location) => [location, { tint: "root" as const, said: STRINGS.markedWord }])));
  const list = ayahs.map(({ surah, number, indopakEnd, translation, words, marked }) => ({
    surah,
    number,
    indopakEnd,
    ...joinedScripts(words),
    translation,
    words,
    opens: marked[0],
  }));
  return { list, marks };
}

/**
 * A Spelling's heading, the button that opens and closes it: a chevron before
 * its text, pointing along the line while closed and down while open.
 */
const TOGGLE =
  "-ms-1 flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-[2px] text-start hover:bg-accent " +
  "before:box-content before:size-[7px] before:border-0 before:border-r-2 before:border-b-2 before:border-solid before:border-muted-foreground before:content-[''] " +
  "before:-rotate-45 before:transition-transform before:duration-150 before:ease-[ease] rtl:before:rotate-135 aria-expanded:before:rotate-45 motion-reduce:before:transition-none";

export function SpellingSection({
  lang,
  section,
  address,
  partCount,
  arrivedWith,
  heading,
}: {
  lang: Language;
  /** The id of its Lemma's section, which the Lemma row leads to. */
  section: string;
  /** Where its parts are served (spellingPartsAddress). */
  address: string;
  partCount: number;
  /** Its one part, on a small Root's page, which starts open with it; none on a large Root's, which starts closed. */
  arrivedWith?: SpellingPartAyah[];
  /** What its heading says: its text, meaning and count. */
  heading: ReactNode;
}) {
  const [open, setOpen] = useState(arrivedWith !== undefined);
  const parts = usePartsOnDemand(address, partCount, arrivedWith);
  const ayahs = useId();
  const openIt = () => {
    setOpen(true);
    parts.first();
  };
  useChosen(section, openIt);
  const { list, marks } = useMemo(() => listed(parts.arrived.flat()), [parts.arrived]);
  return (
    <Collapsible className={styles.spelling} open={open} onOpenChange={(opened) => (opened ? openIt() : setOpen(false))}>
      <h3 className={styles.spellingHeading}>
        {/* Naming its Ayahs whether open or closed: Radix names them only while open. */}
        <CollapsibleTrigger className={TOGGLE} aria-controls={ayahs}>
          {heading}
        </CollapsibleTrigger>
      </h3>
      {/* Kept on the page while closed, hidden, as Radix keeps it only shown. */}
      <CollapsibleContent forceMount id={ayahs} hidden={!open} className={styles.ayahs} aria-busy={parts.loading}>
        {list.length > 0 && <AyahList lang={lang} ayahs={list} marks={marks} linked />}
        {parts.loading &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => <div key={i} className={`${shared.ghost} ${styles.ghostAyah}`} aria-hidden="true" data-skeleton="" />)}
        {parts.failed ? (
          <Failure onRetry={parts.retry} message={STRINGS.spellingPartFailed} />
        ) : (
          // Kept while the next part is on its way, so focus stays on it rather than falling to the page.
          list.length > 0 &&
          !parts.complete && (
            <Button
              variant="pill"
              size="pill"
              className="justify-self-center px-4 text-primary aria-disabled:cursor-progress aria-disabled:opacity-60"
              onClick={parts.more}
              aria-disabled={parts.loading}
            >
              {STRINGS.showMore}
            </Button>
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

"use client";

// The Supplications page's filters and the entries they keep (#200, #195): the
// Opening chips, each with how many entries it would give with the switches as
// they are; "Prophets only", keeping the Prophet's supplications; and "Show
// other words to Allah", off by default, adding the Other words to Allah. The
// server renders every entry (./entry.tsx); these choose which to show, at
// once, without asking the server again. The choices live in the link
// (`?opening=rabbana|rabbi|other`, `?prophets=1`, `?others=1`), so a filtered
// view can be shared, and the page's Language switch carries them to the other
// Language. An `opening` no entry has is kept as it is, and leaves nothing.
// The Supplication editor's list (#201) keeps its entries with the same
// filters, at its own address and with no Language switch.

import { useSearchParams } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import type { Language } from "@/dataset/reader";
import type { Opening } from "@/supplications/supplications";
import { LanguageSwitch } from "../language-link";
import { STRINGS } from "../strings";
import { supplicationsPath } from "./supplications-path";
import { OnOffSwitch } from "../reader-settings";
import { Toggle } from "@/components/ui/toggle";
import styles from "./supplications.module.css";

/** One entry, as the server rendered it, with what the filters read of it. */
export interface FilteredEntry {
  id: number;
  openings: Opening[];
  /** Whether its Speaker includes a Prophet. */
  includesProphet: boolean;
  /** Whether it is one of the Other words to Allah rather than a Supplication. */
  otherWords: boolean;
  entry: ReactNode;
}

/** The reader's choices; an `opening` of `null` is All. */
interface Choices {
  opening: string | null;
  prophets: boolean;
  others: boolean;
}

const choicesIn = (query: URLSearchParams): Choices => ({
  opening: query.get("opening"),
  prophets: query.get("prophets") === "1",
  others: query.get("others") === "1",
});

/** The choices as the link carries them: `?opening=rabbana&prophets=1&others=1`, or nothing for none. */
function queryOf({ opening, prophets, others }: Choices) {
  const query = new URLSearchParams();
  if (opening !== null) query.set("opening", opening);
  if (prophets) query.set("prophets", "1");
  if (others) query.set("others", "1");
  const written = query.toString();
  return written && `?${written}`;
}

/** The entries the switches keep. */
const keptBySwitches = (entries: FilteredEntry[], { prophets, others }: Choices) =>
  entries.filter((e) => (others || !e.otherWords) && (!prophets || e.includesProphet));

const withOpening = (entries: FilteredEntry[], opening: string | null) =>
  opening === null ? entries : entries.filter((e) => (e.openings as string[]).includes(opening));

/** An Opening chip: muted, or on the page's paper in the accent when chosen. */
const CHIP =
  "h-auto min-w-0 cursor-pointer items-baseline gap-1.5 rounded-full px-3.5 py-0.5 text-[13px] leading-[inherit] font-normal whitespace-normal text-muted-foreground transition-none hover:bg-transparent hover:text-primary data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-primary data-[state=on]:shadow-[0_1px_2px_var(--shadow)] data-[state=on]:hover:bg-background";

const CHIPS: { opening: Opening | null; label: string; arabic?: string }[] = [
  { opening: null, label: STRINGS.all },
  { opening: "rabbana", label: STRINGS.rabbana, arabic: "رَبَّنَا" },
  { opening: "rabbi", label: STRINGS.rabbi, arabic: "رَبِّ" },
  { opening: "other", label: STRINGS.otherOpening },
];

interface Props {
  entries: FilteredEntry[];
  /** The page's address, without the choices. */
  path: string;
  /** The page's Language, which adds the Language switch; none for the admin list. */
  lang?: Language;
}

/** The filters, then the entries they keep, in the order given (Quran order), or a plain message when they keep none. */
export function FilteredSupplications({ entries, path, lang }: Props) {
  const choices = choicesIn(useSearchParams());
  const kept = keptBySwitches(entries, choices);
  const shown = withOpening(kept, choices.opening);
  const query = queryOf(choices);
  // Next keeps useSearchParams in step with the History API, so the page follows without a navigation.
  const choose = (change: Partial<Choices>) => window.history.replaceState(null, "", path + queryOf({ ...choices, ...change }));
  return (
    <>
      <div className={styles.filters}>
        <div className={styles.chips} role="group" aria-label={STRINGS.openingLabel}>
          {CHIPS.map(({ opening, label, arabic }) => (
            <Toggle key={label} className={CHIP} pressed={choices.opening === opening} onPressedChange={() => choose({ opening })}>
              {arabic && (
                <span className={styles.arabic} lang="ar" dir="rtl">
                  {arabic}
                </span>
              )}
              {label}
              <span className={styles.count}>{withOpening(kept, opening).length}</span>
            </Toggle>
          ))}
        </div>
        <OnOffSwitch on={choices.prophets} onToggle={() => choose({ prophets: !choices.prophets })} label={STRINGS.prophetsOnly} />
        <OnOffSwitch on={choices.others} onToggle={() => choose({ others: !choices.others })} label={STRINGS.showOtherWords} />
        {lang && <LanguageSwitch lang={lang} hrefs={{ ur: supplicationsPath("ur") + query, en: supplicationsPath("en") + query }} />}
      </div>
      {shown.length > 0 ? (
        shown.map((e) => <Fragment key={e.id}>{e.entry}</Fragment>)
      ) : (
        <p className={styles.empty} role="status">
          {STRINGS.noSupplications}
        </p>
      )}
    </>
  );
}


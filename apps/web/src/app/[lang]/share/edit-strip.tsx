"use client";

// The edit strip (#56): the sharer's controls above a Share page, shown only
// to someone who arrived from inside the app (in-app.tsx). It chooses the
// Surah, the from and to Ayahs and the Share layout, offering only allowed
// Shared Ayahs (share-address.ts), and each choice opens that Share page in
// place, keeping the Language and Script. `children` are the sharer's own
// actions on the page (Share, Copy text), set at the strip's end.

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import type { Language, Script } from "@/dataset/reader";
import { inAppHref } from "./in-app";
import { LayoutToggle, type LayoutLabels } from "./layout-toggle";
import { allowedTo, ayahNumbers, toAfterFrom, type PassageRun, type ShareLayout, type ShareTarget, type SurahShape } from "@saaliheen/share";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import s from "./edit-strip.module.css";

/** A list's look: the browser's select, outlined in a fainter gold. */
const LIST =
  "h-auto max-w-full rounded-sm bg-transparent border-[color-mix(in_srgb,var(--gold)_60%,transparent)] px-2 py-[5px] text-[length:inherit] leading-[inherit] text-foreground shadow-none transition-none";

/** A Surah as the Surah list offers it. */
export interface SurahChoice {
  number: number;
  nameLatin: string;
}

/** What the edit strip needs: the Share page's address and its Surah's shape, and every Surah to choose from. */
export interface EditStripProps {
  lang: Language;
  script: Script;
  surah: number;
  ayahCount: number;
  passages: PassageRun[];
  from: number;
  to: number;
  /** null for a single Ayah, which has none. */
  layout: ShareLayout | null;
  surahs: SurahChoice[];
  labels: EditStripLabels;
}

export interface EditStripLabels extends LayoutLabels {
  strip: string;
  surah: string;
  from: string;
  to: string;
}

/** A labelled native list of numbered choices. Labelled by `for`, so the list's name is the label alone, not its chosen value too. */
function NumberList({ label, value, options, choose, className }: { label: string; value: number; options: { n: number; text: string }[]; choose: (n: number) => void; className?: string }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <NativeSelect arrow="browser" id={id} className={cn(LIST, className)} value={value} onChange={(e) => choose(Number(e.target.value))}>
        {options.map((o) => (
          <NativeSelectOption key={o.n} value={o.n}>
            {o.text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

const numbered = (ns: number[]) => ns.map((n) => ({ n, text: String(n) }));

/** The from and to Ayahs to offer: those this Surah allows, or only the chosen ones while another Surah's page is on its way. */
function offered(shape: SurahShape, sameSurah: boolean, from: number, to: number) {
  if (!sameSurah) return { froms: [from], tos: [to] };
  return { froms: ayahNumbers(1, shape.ayahCount), tos: allowedTo(shape, from) };
}

/** The layout the strip shows chosen: a single Ayah has none, so Ayah by Ayah. */
const shownLayout = (single: boolean, layout: ShareLayout | null) => (single ? "ayah-by-ayah" : (layout ?? "ayah-by-ayah"));

/**
 * The strip shows each choice at once, and the next choice builds on it, even
 * while the Share page it opens is still on its way; the page that arrives
 * draws a fresh strip from its own address (SharePage keys its body by the address).
 */
export function EditStrip({ children, ...props }: EditStripProps & { children?: ReactNode }) {
  const { lang, script, ayahCount, passages, surahs, labels } = props;
  const router = useRouter();
  const [chosen, setChosen] = useState({ surah: props.surah, from: props.from, to: props.to, layout: props.layout });
  const { surah, from, to, layout } = chosen;
  const shape = { ayahCount, passages };
  const open = (choice: Partial<ShareTarget>) => {
    const target = { ...chosen, ...choice };
    setChosen(target);
    router.replace(inAppHref({ lang, script, ...target }), { scroll: false });
  };
  const single = from === to;
  const shown = shownLayout(single, layout);
  const { froms, tos } = offered(shape, surah === props.surah, from, to);
  return (
    <div role="group" aria-label={labels.strip} className={s.strip}>
      <div className={s.fields}>
        <NumberList
          label={labels.surah}
          className="max-w-[12em]"
          value={surah}
          options={surahs.map((c) => ({ n: c.number, text: `${c.number}. ${c.nameLatin}` }))}
          choose={(n) => open({ surah: n, from: 1, to: 1 })}
        />
        <NumberList
          label={labels.from}
          value={from}
          options={numbered(froms)}
          choose={(n) => open({ from: n, to: toAfterFrom(shape, n, to) })}
        />
        <NumberList label={labels.to} value={to} options={numbered(tos)} choose={(n) => open({ to: n })} />
        <LayoutToggle shown={shown} choose={(l) => open({ layout: l })} labels={labels} disabled={single} />
      </div>
      {children && <div className={s.actions}>{children}</div>}
    </div>
  );
}

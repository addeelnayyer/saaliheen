// The Share layout toggle (#55, #56): the visitor's below the Shared Ayahs, and the
// sharer's in the edit strip, where a single Ayah leaves it disabled.

import { SHARE_LAYOUTS, type ShareLayout } from "@saaliheen/share";
import { Toggle } from "@/components/ui/toggle";
import s from "./share.module.css";

/** One layout's Toggle: the gold pill's half, filled gold when pressed. */
const LAYOUT =
  "h-auto min-w-0 cursor-pointer rounded-none px-3.5 py-[5px] text-[length:inherit] leading-[inherit] [font-weight:inherit] text-inherit transition-none hover:bg-transparent hover:text-inherit data-[state=on]:bg-(--gold) data-[state=on]:text-(--paper) data-[state=on]:hover:bg-(--gold) data-[state=on]:hover:text-(--paper) disabled:opacity-60";

/** The toggle's name and each layout's. */
export type LayoutLabels = { layout: string } & Record<ShareLayout, string>;

export function LayoutToggle({
  shown,
  choose,
  labels,
  disabled,
}: {
  shown: ShareLayout;
  choose: (l: ShareLayout) => void;
  labels: LayoutLabels;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={labels.layout} className={s.toggle}>
      {SHARE_LAYOUTS.map((l) => (
        <Toggle key={l} className={LAYOUT} pressed={shown === l} disabled={disabled} onPressedChange={() => choose(l)}>
          {labels[l]}
        </Toggle>
      ))}
    </div>
  );
}

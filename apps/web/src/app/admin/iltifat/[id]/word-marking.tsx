"use client";

// Marking an Iltifat's Words in its editor (#143): the side a tap marks, "From"
// or "To", each beside a swatch of its tint and named with its person; and a
// Word card that a tap marks on that side, or takes out when it is marked. A
// marked card is drawn on its side's tint, the reader's (globals.css), and a
// screen reader hears its side with it ("from He"). The sides are shadcn/ui's
// RadioGroup (#300); a Word card is the reading surface's, in CSS Modules.

import { useId, type ReactNode } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SIDES, type Side } from "@/iltifat/marked-words";
import { DIRECTION_WORDS, SIDE_NAMES, sideWords } from "../../../[lang]/iltifat/directions";
import own from "../iltifat-editor.module.css";
import { useEditing } from "./iltifat-editing";

/** The radio buttons choosing the side a tap on a Word card marks. */
export function SideChoice() {
  const { direction, side: chosen, chooseSide } = useEditing();
  const heading = useId();
  return (
    <div className={own.sides}>
      <span id={heading} className={own.label}>
        Tap Word cards to mark them as the Iltifat&apos;s
      </span>
      <RadioGroup className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-labelledby={heading} value={chosen} onValueChange={(side) => chooseSide(side as Side)}>
        {SIDES.map((side) => (
          <label key={side} className={own.check}>
            <RadioGroupItem value={side} />
            <span className={`${own.swatch} ${own[side]}`} aria-hidden="true" />
            <span>{SIDE_NAMES[side]}</span>
            <span className={own.person} aria-hidden="true">
              {DIRECTION_WORDS[direction][side]}
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

/** A Word card that marks and unmarks its Word; its id is its Word location. */
export function MarkableCard({ location, children }: { location: string; children: ReactNode }) {
  const { direction, fields, tap } = useEditing();
  const side = fields.markedWords.find((w) => w.location === location)?.side;
  return (
    <button type="button" id={location} className={`${own.word} ${side ? own[side] : ""}`.trim()} data-side={side} onClick={() => tap(location)}>
      {children}
      {side && <span className={own.said}>{sideWords(direction, side)}</span>}
    </button>
  );
}

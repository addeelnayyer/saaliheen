"use client";

// Marking a Supplication's spans in its editor (#271, ADR 0063): how a tap on
// a Word card marks them, and the Word card a tap starts, ends or takes out a
// span at (@/admin/span-taps). A card in a span is drawn on the Supplication
// span tint, the reader's (globals.css), and a span's pending start is drawn
// ringed; a screen reader hears either with the card's Word.

import type { ReactNode } from "react";
import { holds } from "@/supplications/spans";
import own from "../supplication-editor.module.css";
import { useEditing } from "./supplication-editing";

/** How a tap on a Word card marks a span, beside a swatch of the span tint. */
export function SpanHint() {
  return (
    <p className={own.hint}>
      <span className={own.swatch} aria-hidden="true" />
      <span>
        Tap a Word card to start a Supplication span, then the same Word or a later one to end it. Tap a Word in a span to take the span out.
      </span>
    </p>
  );
}

/** A Word card that starts, ends or takes out a span; its id is its Word location. */
export function SpanCard({ location, children }: { location: string; children: ReactNode }) {
  const { fields, pending, tap } = useEditing();
  const inSpan = fields.spans.some((s) => holds(s, location));
  const starting = pending === location;
  const [state, said] = inSpan ? [own.inSpan, "in a Supplication span"] : starting ? [own.starting, "a Supplication span starts here"] : [];
  return (
    <button type="button" id={location} className={state ? `${own.word} ${state}` : own.word} onClick={() => tap(location)}>
      {children}
      {said && <span className={own.said}>{said}</span>}
    </button>
  );
}

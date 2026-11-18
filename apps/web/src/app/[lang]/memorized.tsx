"use client";

// Memorized? (#248, #251): the reader's choice whether a Root or particle is
// one of their Known words, in the Root dialog's and Particle dialog's heads
// and on every row of the Known words page; a shadcn/ui Switch (#302).

import { isKnown, type KnownWordKey } from "@saaliheen/known-words";
import { Switch } from "@/components/ui/switch";
import { useKnownWords } from "./known-words";
import { STRINGS } from "./strings";
import { markKnownWord } from "./synced-known-words";

/** Memorized? for `entry`, on when the reader knows it; `name` names it among many. */
export function MemorizedSwitch({ entry, known, name }: { entry: KnownWordKey; known: boolean; name?: string }) {
  return (
    <Switch checked={known} onCheckedChange={(on) => markKnownWord(entry, on)} aria-label={name}>
      {STRINGS.memorized}
    </Switch>
  );
}

/** Memorized? for `entry`, reading the Known words itself: for a place that shows one entry. */
export function Memorized({ entry }: { entry: KnownWordKey }) {
  return <MemorizedSwitch entry={entry} known={isKnown(useKnownWords(), entry)} />;
}

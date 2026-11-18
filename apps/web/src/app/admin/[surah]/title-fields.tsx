"use client";

// A Passage's title fields (#44): English and Urdu (right to left), side by
// side, stacked on a phone. Enter, or leaving both fields, keeps what was
// typed; Escape puts the titles back. An empty field is marked, and an English
// title the Surah bar will cut short gets a soft warning, never a limit. The
// fields are shadcn/ui Inputs (#299).

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { isLong, LONG_TITLE } from "./unpublished-changes";
import styles from "./editor.module.css";

/** A title field: the site's 16px field on a surface, ringed in red while empty. */
const FIELD = "h-auto bg-card px-2.5 py-2 text-base leading-[inherit] text-foreground shadow-none aria-invalid:ring-1 aria-invalid:ring-destructive";

interface Props {
  en: string;
  ur: string;
  onSave: (en: string, ur: string) => void;
  onCancel: () => void;
}

export function TitleFields({ en, ur, onSave, onCancel }: Props) {
  const [typed, setTyped] = useState({ en, ur });
  const warningId = useId();
  // Enter, Escape and leaving the fields each close them; only the first counts.
  const closed = useRef(false);
  const close = (keep: boolean) => {
    if (closed.current) return;
    closed.current = true;
    if (keep) onSave(typed.en, typed.ur);
    else onCancel();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    e.preventDefault();
    close(e.key === "Enter");
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close(true);
  };

  return (
    <div className={styles.fields} onKeyDown={onKeyDown} onBlur={onBlur}>
      <label className={styles.field}>
        <span>English</span>
        <Input
          aria-label="English Passage title"
          className={FIELD}
          value={typed.en}
          aria-invalid={!typed.en.trim()}
          aria-describedby={isLong(typed.en) ? warningId : undefined}
          autoFocus
          onChange={(e) => setTyped({ ...typed, en: e.target.value })}
        />
        {isLong(typed.en) && (
          <span id={warningId} className={styles.warning}>
            Over {LONG_TITLE} characters: it will be cut short in the Surah bar.
          </span>
        )}
      </label>
      <label className={styles.field}>
        <span>Urdu</span>
        <Input
          aria-label="Urdu Passage title"
          className={FIELD}
          lang="ur"
          dir="rtl"
          value={typed.ur}
          aria-invalid={!typed.ur.trim()}
          onChange={(e) => setTyped({ ...typed, ur: e.target.value })}
        />
      </label>
    </div>
  );
}

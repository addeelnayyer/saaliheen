"use client";

// The sharer's two buttons on a Share page (#56), at the end of the edit
// strip: "Share" hands over the reference and the link (the share sheet, or
// the clipboard without one); "Copy text" always copies the Shared Ayahs'
// full text. Both texts arrive
// ready-made, so the share sheet opens while the tap still counts. How copying
// went shows briefly at the top of the screen.

import { useEffect, useRef, useState } from "react";
import { STRINGS } from "../strings";
import { copy, shareOrCopy } from "./send";
import { Button } from "@/components/ui/button";
import s from "./share.module.css";

/** Share, filled gold; Copy text, outlined in it. */
const SHARER =
  "h-auto cursor-pointer rounded-full border border-(--gold) bg-(--gold) px-4 py-[5px] text-[length:inherit] leading-[inherit] [font-weight:inherit] text-(--paper) shadow-none transition-none hover:bg-(--gold)";
const SHARER_OUTLINED = `${SHARER} bg-transparent text-inherit hover:bg-transparent`;

/** How long "Copied" or "Couldn't copy" stays on screen. */
const MESSAGE_MS = 2000;

/** The copy message: show `text`, then fade it out; the last text stays in place while it fades. */
function useCopyMessage() {
  const [message, setMessage] = useState({ text: "", shown: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text: string | null) => {
    if (!text) return;
    setMessage({ text, shown: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage({ text, shown: false }), MESSAGE_MS);
  };
  return [message, show] as const;
}

export function SharerButtons({ shareText, copyText }: { shareText: string; copyText: string }) {
  const [message, show] = useCopyMessage();
  return (
    <>
      <div className={s.sharer}>
        <Button type="button" className={SHARER} onClick={() => shareOrCopy(shareText).then(show)}>
          {STRINGS.share}
        </Button>
        <Button type="button" className={SHARER_OUTLINED} onClick={() => copy(copyText).then(show)}>
          {STRINGS.copyText}
        </Button>
      </div>
      {/* Always on the page, so assistive technology announces each message as it comes. */}
      <div role="status" className={s.message} data-shown={message.shown}>
        {message.text}
      </div>
    </>
  );
}

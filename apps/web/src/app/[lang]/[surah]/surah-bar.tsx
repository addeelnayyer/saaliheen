"use client";

// The Surah bar: on a Surah page, the top bar and a slim row under it (the
// Reading settings button, the Surah's number and names, and the play button),
// sticky at every width; the previous and next Surahs are at the Surah's foot
// (#192). Reading down shrinks it to its mini form,
// only the slim row; scrolling up, or tapping the mini bar's empty space, or
// keyboard focus entering the hidden top bar, shows the full form again. The
// form is data-form on the bar, set here and never rendered by React; the bar
// slides by it (surah-bar.module.css) and never changes height, so nothing
// under it moves. Before hydration a deep-linked page is already mini, by CSS.
// With the Passage headings switch on (#43), the slim row also shows the
// current Passage's title under the Surah's number and names: the Passage
// holding the Ayah being read (ayah-in-view.tsx), or the first before one is.
// Its play button plays the Recitation from that Ayah, or Ayah 1 (#115).
// Between the top bar and the slim row, the full form alone has the Ayah layout
// switch, Study or Flowing (#125), the Translation language switch and "Share Ayahs" (#192). Switching keeps the Ayah at the top of the
// screen there, below the bar in whichever form it is (ayah-at-top.ts, which
// finds the bar's bottom by its slim row's data-slim-row); the page moves for
// it, but that is not reading, so the bar keeps its form until the reader
// takes the page over. While a Recited Word is marked, switching keeps it in
// sight instead, and the Reading place where listening put it (#126). The
// Surah's number and names are a button opening the quick picker of Surahs
// and Juz (#193, surah-picker.tsx); on the mini bar its first tap only shows
// the full bar.

import { useEffect, useRef, type ReactNode } from "react";
import type { Language, PartPassage, Surah } from "@/dataset/reader";
import { LanguageSwitch } from "../language-link";
import { AyahLayoutSwitch } from "../reader-settings";
import { SettingsDrawer, type SampleAyah } from "../settings-drawer";
import { StartSharingLink } from "../share/in-app";
import { ayahId } from "../reading-place";
import { inLanguage, STRINGS } from "../strings";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { keepAyahAtTop, TAKE_OVER } from "./ayah-at-top";
import { useAyahInView } from "./ayah-in-view";
import { PlayButton, useRecitation } from "./recitation";
import styles from "./surah-bar.module.css";
import { SurahPicker } from "./surah-picker";

/** The Share Ayahs link: the tinted pill, on a link. */
const SHARE_AYAHS = cn(buttonVariants({ variant: "pill", size: "pill" }), "block no-underline");

type Form = "full" | "mini";

/** How far the page must move one way, in CSS pixels, before the bar changes form: a resting finger or a trackpad's bounce does not. */
const HYSTERESIS = 10;

/**
 * `children` is the top bar (site-bar.tsx). `sample` is the Ayah the Reading
 * settings sheet previews. `passages`, the Surah's Passages in
 * `lang`, only with the Passage headings switch on: the slim row then shows
 * the current one's title.
 */
export function SurahBar({
  lang,
  surah,
  sample,
  passages,
  children,
}: {
  lang: Language;
  surah: Pick<Surah, "number" | "nameArabic" | "nameLatin">;
  sample: SampleAyah;
  passages?: PartPassage[];
  children: ReactNode;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const ayahInView = useAyahInView(surah.number);
  const { keepRecitedWordInSight } = useRecitation();
  // Switching the Ayah layout keeps the Recited Word in sight (#126), or else
  // the Ayah being read at the top of the screen (#125).
  const keepAyahInPlace = (change: () => void) => {
    if (!keepRecitedWordInSight(change)) keepAyahAtTop(change, ayahInView ? ayahId({ surah: surah.number, ayah: ayahInView }) : null);
  };
  const row = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = bar.current!;
    const inRow = (target: EventTarget | null) => row.current!.contains(target as Node);
    const setForm = (form: Form) => el.setAttribute("data-form", form);
    // Until the page is scrolled past the full bar, the bar stays full.
    let fullHeight = el.offsetHeight;
    const sizes = new ResizeObserver(() => (fullHeight = el.offsetHeight));
    sizes.observe(el);
    const formAt = (y: number): Form => (y < fullHeight ? "full" : "mini");

    let lastY = window.scrollY;
    let travelled = 0; // Signed: how far the page has moved in its current direction.

    // Switching the Ayah layout moves the page to keep its Ayah at the top
    // (ayah-at-top.ts): not reading, so the bar keeps its form, and the switch
    // just used stays on screen, until the reader takes the page over.
    let switching = false;
    const tookOver = () => (switching = false);
    const layoutSwitched = new MutationObserver(() => (switching = true));
    layoutSwitched.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ayah-layout"] });

    // What shows just under the bar, and where it was, as of the last scroll.
    // Ayahs coming on screen take their real heights (content-visibility), and
    // the browser's scroll anchoring scrolls the page to make up for those
    // above the screen: a scroll that leaves this where it was moved nothing
    // the reader sees, so it is not reading either way.
    let shown: Element | null = null;
    let shownTop = 0;
    const noteShown = () => {
      shown = document.elementFromPoint(window.innerWidth / 2, el.getBoundingClientRect().bottom + 1);
      shownTop = shown?.getBoundingClientRect().top ?? 0;
    };
    // Nor is one that makes up for an Ayah across the screen's top taking its
    // real height: that Ayah was skipped when the scroll before was noted, so
    // nothing in it could be, and the browser keeps one of its Word cards still.
    let resizedAbove = false;
    const sized = new WeakSet<Element>();
    const ayahSizes = new ResizeObserver((entries) => {
      const under = el.getBoundingClientRect().bottom;
      for (const { target } of entries) {
        if (sized.has(target) && target.getBoundingClientRect().top < under) resizedAbove = true;
        sized.add(target);
      }
    });
    document.querySelectorAll("main section[id*=':']").forEach((ayah) => ayahSizes.observe(ayah));
    // A scroll the Ayah layout switch makes (below) is not reading either.
    const anchored = () =>
      switching || resizedAbove || (!!shown?.isConnected && Math.abs(shown.getBoundingClientRect().top - shownTop) < 1);

    // The browser scrolls to a deep link's Word as soon as it is parsed; on a
    // slow load the Ayahs above it can still grow after that and push it down
    // the screen. Still on screen (the reader has not scrolled away): put it back.
    const target = document.querySelector(":target");
    if (target) {
      const { top } = target.getBoundingClientRect();
      const landing = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      if (top >= 0 && top < window.innerHeight && Math.abs(top - landing) > 1) {
        target.scrollIntoView({ block: "start", behavior: "instant" });
        lastY = window.scrollY;
      }
    }
    // A deep link or a reload deep in the Surah starts mini; the top of the page starts full.
    setForm(formAt(lastY));
    noteShown();

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      const still = anchored();
      resizedAbove = false;
      noteShown();
      if (formAt(y) === "full") {
        travelled = 0;
        setForm("full");
        return;
      }
      if (still) return;
      // A change of direction starts counting again.
      travelled = Math.sign(dy) === Math.sign(travelled) ? travelled + dy : dy;
      if (travelled >= HYSTERESIS) setForm("mini");
      else if (travelled <= -HYSTERESIS) setForm("full");
    };
    // A jump to a Word location (a Root dialog's link) lands mini, whichever way it went.
    // The page has already scrolled by now, so the scroll event that follows sees no movement.
    const onHashChange = () => {
      lastY = window.scrollY;
      travelled = 0;
      setForm(formAt(lastY));
      noteShown();
    };
    // A tap on the mini bar's empty space (not on one of its links or switches) shows the full bar.
    const onClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest("a, button")) setForm("full");
    };
    // Keyboard focus on one of the bar's controls never moves the page, and
    // entering the slid-off top bar slides it back on screen. The browser has
    // already scrolled the page to reveal the focused control, out of the
    // scroll padding (a scroll event not yet handled, so lastY is still where
    // the reader was): put the page back, so the Words never move.
    const onFocusIn = (event: FocusEvent) => {
      if (window.scrollY !== lastY) window.scrollTo({ top: lastY, behavior: "instant" });
      if (!inRow(event.target)) setForm("full");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    TAKE_OVER.forEach((type) => window.addEventListener(type, tookOver, { passive: true }));
    window.addEventListener("hashchange", onHashChange);
    el.addEventListener("click", onClick);
    el.addEventListener("focusin", onFocusIn);
    return () => {
      sizes.disconnect();
      ayahSizes.disconnect();
      layoutSwitched.disconnect();
      TAKE_OVER.forEach((type) => window.removeEventListener(type, tookOver));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
      el.removeEventListener("click", onClick);
      el.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  // The Surah's number and names open the quick picker of Surahs and Juz (#193).
  const names = (
    <SurahPicker lang={lang} bar={bar} className={styles.names}>
      <span className={styles.sNo}>{surah.number}</span>
      <span className={styles.ar} lang="ar" dir="rtl">
        {surah.nameArabic}
      </span>
      <span className={styles.latin}>{surah.nameLatin}</span>
    </SurahPicker>
  );

  return (
    <div ref={bar} className={passages ? `${styles.bar} ${styles.titled}` : styles.bar}>
      {children}
      <nav ref={row} className={styles.row} aria-label={STRINGS.surahBarLabel} data-slim-row="">
        <SettingsDrawer lang={lang} sample={sample} className={styles.btn} />
        {passages ? (
          <div className={styles.namesAndTitle}>
            {names}
            <PassageTitle lang={lang} surah={surah.number} passages={passages} />
          </div>
        ) : (
          names
        )}
        <div className={styles.pager}>
          <PlayButton ayah={ayahInView ?? 1} />
        </div>
      </nav>
      {/* Drawn between the top bar and the slim row (surah-bar.module.css), but
          after the slim row in focus order, so the slim row's buttons stay next to the top bar's links. */}
      <div className={styles.tools}>
        <AyahLayoutSwitch keepInPlace={keepAyahInPlace} />
        <SurahLanguageSwitch lang={lang} surah={surah.number} />
        {/* "Share Ayahs" left the site bar (#192): sharing starts here, beside the reading tools. */}
        <StartSharingLink lang={lang} className={SHARE_AYAHS}>
          {STRINGS.shareAyahs}
        </StartSharingLink>
      </div>
    </div>
  );
}

/**
 * The Translation language switch, beside the Ayah layout switch (#192): the
 * bar's Language links moved to Me, but on a Surah page switching keeps the
 * reader on the same Surah, and on a look-up's Word or Ayah (LanguageLink).
 */
function SurahLanguageSwitch({ lang, surah }: { lang: Language; surah: number }) {
  return <LanguageSwitch lang={lang} hrefs={{ ur: `/ur/${surah}`, en: `/en/${surah}` }} />;
}

/** The current Passage's title: the Passage holding the Ayah being read, or the Surah's first before one is. */
function PassageTitle({ lang, surah, passages }: { lang: Language; surah: number; passages: PartPassage[] }) {
  const ayah = useAyahInView(surah);
  const passage = (ayah && passages.find((p) => p.from <= ayah && ayah <= p.till)) || passages[0];
  return (
    <span className={styles.passage} {...inLanguage(lang)}>
      {passage?.title}
    </span>
  );
}

"use client";

// The Root dialog of the Option B mockup (#1 § Design): clicking a Word card's
// Root tag opens a centred modal dialog with the Root's letters,
// transliteration and counts, then one row per Lemma that expands to its
// Spellings in the chosen Script, each with its meaning and Word locations.
// Beside the letters, Memorized? marks or unmarks the Root as one of the
// reader's Known words (#248), and above them a link leads to the Root's Root
// page in the page's Language (#289).
// The dialog opens at once with the Root's letters; the rest is the Root's
// static file, /roots/<id>.json, fetched only when its dialog first opens. It closes with its close button, Escape, a click
// outside, a chosen Word location or the Root page link, and gives focus back to the Root tag.
// Its head stays in view while the Lemmas scroll, and the page beneath holds
// still until it closes. It is a shadcn/ui Dialog, its close button a Button
// and each Lemma row a Collapsible (#302, @/components/ui/dialog).
// The dialog is English; only the Lemma and Spelling meanings are in the Language.
// Opened from a Word card's Root tag, it opens on that Word (#322): its Lemma
// row (or the row of Words with no Lemma) stays in its place but is marked and
// open, and in it the Word's Spelling and Word location are marked, in the pale
// tint a Root page marks its Words with. The marks stay until the dialog closes.
// Once the Root's file has loaded, the dialog scrolls the marked Spelling into
// view beneath its head, with its Lemma row too when both fit (#324); it does
// this once, and never moves on its own again while it is open.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type UIEvent } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Language, Lemma, Root, RootTag, Spelling } from "@/dataset/reader";
import { fetchJsonOnce } from "../caches";
import { Memorized } from "../memorized";
import { locationPath } from "../reading-place";
import { rootPageHref } from "../roots/root-path";
import { inLanguage, STRINGS } from "../strings";
import { ScriptText } from "./script-text";
import styles from "./root-dialog.module.css";

const loaded = new Map<number, Promise<Root>>();

/** Root `id`'s file, fetched once per page. */
const loadRoot = (id: number) => fetchJsonOnce(loaded, id, `/roots/${id}.json`);

/** A Root tag as the Root dialog opens on it: its Root, and the Word location of the Word it is for, if it gives one. */
type TappedRootTag = RootTag & { location?: string };

/** What a Root tag shows: its Root's id and letters; and the Word location of its Word, if it gives one. */
const readRootTag = (tag: HTMLElement): TappedRootTag => ({
  id: Number(tag.dataset.root),
  letters: tag.textContent ?? "",
  location: tag.dataset.location,
});

/** A Root or Particle dialog's key: its tag and the Word it opened on, so it opens afresh, and brings its mark into view, for each tapped Word. */
export const tagKey = (tag: { id: number; location?: string }) => `${tag.id}:${tag.location ?? ""}`;

/** Opens the Root dialog for whichever Root tag on the page is clicked. */
export function RootDialog({ lang }: { lang: Language }) {
  const { open, close, returnFocus } = useTagDialog("button[data-root]", readRootTag, loadRoot);
  return open ? (
    <TagDialog key={tagKey(open.tag)} onClose={close} onClosed={returnFocus}>
      <RootSheet tag={open.tag} root={open.file} lang={lang} />
    </TagDialog>
  ) : null;
}

/**
 * The dialog open for whichever tag matching `selector` (a Root tag, a
 * Particle tag, or a Word on a Grammar page, keyed by its Word location) is
 * clicked: the tag as `read` gives it at once, and its file once `load` has it.
 * `close` closes it and `returnFocus` gives focus back to the tag, once a
 * TagDialog has closed. `read` and `load` are the module's own, so they never
 * change.
 */
export function useTagDialog<Tag extends { id: number | string }, File>(
  selector: string,
  read: (tag: HTMLElement) => Tag,
  load: (id: Tag["id"]) => Promise<File>,
) {
  const [open, setOpen] = useState<{ tag: Tag; file: File | null } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onClick = (event: globalThis.MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      if (!element) return;
      const tag = read(element);
      opener.current = element;
      setOpen({ tag, file: null });
      load(tag.id).then(
        // Filled in only while this tag's dialog is still the one open.
        (file) => setOpen((now) => (now?.tag === tag ? { tag, file } : now)),
        () => undefined,
      );
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [selector, read, load]);

  const close = useCallback(() => setOpen(null), []);
  const returnFocus = useCallback(() => opener.current?.focus({ preventScroll: true }), []);

  return { open, close, returnFocus };
}

/**
 * The Root dialog's, the Particle dialog's or the Word grammar dialog's card,
 * open until `onClose` closes it: by its close button, Escape, a click
 * outside, or a chosen Word location or Root page link. Once it has gone,
 * `onClosed` gives focus back. Any other prop is the card's own.
 */
export function TagDialog({
  onClose,
  onClosed,
  children,
  ...card
}: { onClose: () => void; onClosed: () => void; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <Dialog open onOpenChange={(open) => open || onClose()}>
      <DialogContent
        className="max-h-[min(82dvh,760px)] w-[min(600px,calc(100vw-32px))]"
        aria-describedby={undefined}
        {...card}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
        onClick={(event) => {
          if ((event.target as Element).closest("a[href]")) onClose();
        }}
        onScroll={markScrolled}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's close button, in its head. */
export function CloseButton() {
  return (
    <DialogClose asChild>
      <Button variant="ghost" size="icon" className={`${styles.closeAt} rounded-full bg-secondary text-[20px] leading-none font-normal`} aria-label={STRINGS.close}>
        ×
      </Button>
    </DialogClose>
  );
}

/** Marks the Root dialog (or the Particle dialog, or the Word grammar dialog) once what follows its head has scrolled beneath it, which then shows a line under it. */
export function markScrolled(event: UIEvent<HTMLElement>) {
  const dialog = event.currentTarget;
  dialog.toggleAttribute("data-scrolled", dialog.scrollTop > 0);
}

/** How far the marked Spelling, brought into view, is kept from the dialog's head and its foot. */
const MARK_MARGIN = 12;

/** The top and bottom of `el`, in the content of `dialog`, which scrolls: as laid out, not as its opening animation scales it. */
function spanIn(dialog: HTMLElement, el: Element) {
  const [box, outer] = [el.getBoundingClientRect(), dialog.getBoundingClientRect()];
  const scale = outer.width / dialog.offsetWidth || 1;
  const top = (box.top - outer.top) / scale - dialog.clientTop + dialog.scrollTop;
  return { top, bottom: top + box.height / scale };
}

/**
 * Scrolls the dialog holding `list`, once, as `list` first lays out, so its
 * marked Spelling is in view beneath the dialog's pinned head: with, when
 * they fit, its Lemma row above it; and when the Spelling is too tall to fit,
 * as much of it as fits around its marked Word location link. It does nothing
 * when that is in view already, or when nothing is marked. The Root dialog's,
 * and the Particle dialog's (#327), whose Spellings share .spelling and
 * have no Lemma row.
 */
export function useMarkInView<T extends HTMLElement>() {
  const list = useRef<T>(null);
  useLayoutEffect(() => {
    const spelling = list.current?.querySelector(`.${styles.spelling}[data-marked]`);
    const dialog = list.current?.closest<HTMLElement>("[role=dialog]");
    if (!spelling || !dialog) return;
    const row = spelling.closest(`.${styles.lemma}`)?.querySelector(`.${styles.row}`) ?? spelling;
    const link = spelling.querySelector('[aria-current="true"]') ?? spelling;
    // The view beneath the head, kept clear of its edges by a margin.
    const head = (dialog.querySelector("header")?.offsetHeight ?? 0) + MARK_MARGIN;
    const foot = dialog.clientHeight - MARK_MARGIN;
    const room = foot - head;
    const [rowAt, spellingAt, linkAt] = [row, spelling, link].map((el) => spanIn(dialog, el));
    // What must show: the Spelling, or around its link when the Spelling is too tall; and from the row down, as far as that allows.
    const bottom = spellingAt.bottom - spellingAt.top <= room ? spellingAt.bottom : linkAt.bottom;
    const top = Math.max(rowAt.top, bottom - room);
    if (top < dialog.scrollTop + head) dialog.scrollTop = top - head;
    else if (bottom > dialog.scrollTop + foot) dialog.scrollTop = bottom - foot;
  }, []);
  return list;
}

interface SheetProps {
  tag: TappedRootTag;
  /** Null until the Root's file has loaded. */
  root: Root | null;
  lang: Language;
}

function RootSheet({ tag, root, lang }: SheetProps) {
  return (
    <div className={styles.body}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <div className={styles.lab}>{STRINGS.rootLabel}</div>
          <Link className={styles.rootPage} href={rootPageHref(lang, tag.letters)}>
            {STRINGS.rootPage}
          </Link>
          <DialogTitle className={styles.letters} lang="ar">
            {tag.letters}
          </DialogTitle>
          {root && (
            <p className={styles.translit} dir="ltr" lang="ar-Latn">
              {root.transliteration}
            </p>
          )}
        </div>
        <div className={styles.memorized}>
          <Memorized entry={{ kind: "root", text: tag.letters }} />
        </div>
        <CloseButton />
      </header>
      {root ? <RootBody root={root} lang={lang} marked={tag.location} /> : <p className={styles.loading} aria-busy="true" />}
    </div>
  );
}

/**
 * The Root's counts and its Lemma rows, in a list named by its title. The
 * Lemma whose Spellings list the `marked` Word location is marked, as is that
 * Word location, and brought into view; one the Root's file does not list marks nothing.
 */
function RootBody({ root, lang, marked }: { root: Root; lang: Language; marked?: string }) {
  const titleId = useId();
  const markedLemma = marked ? root.lemmas.findIndex((l) => l.spellings.some((s) => s.locations.includes(marked))) : -1;
  const lemmas = useMarkInView<HTMLUListElement>();
  return (
    <>
      <p className={styles.stat}>{STRINGS.rootCounts(root.occurrences, root.uniqueWords)}</p>
      <h3 id={titleId} className={styles.title}>
        {STRINGS.lemmasTitle}
      </h3>
      <ul ref={lemmas} className={styles.lemmas} aria-labelledby={titleId}>
        {root.lemmas.map((lemma, i) => (
          <LemmaRow key={lemma.id ?? `none-${i}`} lemma={lemma} lang={lang} marked={i === markedLemma ? marked : undefined} />
        ))}
      </ul>
    </>
  );
}

/**
 * A Lemma, its count and representative meaning; a disclosure button for its
 * Spellings. The list is the button's panel even while it is collapsed, and
 * the button names it then too: Radix's CollapsibleContent leaves neither.
 * The Lemma of the `marked` Word location starts open, and stays marked when closed.
 */
function LemmaRow({ lemma, lang, marked }: { lemma: Lemma; lang: Language; marked?: string }) {
  const [open, setOpen] = useState(!!marked);
  const panelId = useId();
  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <li className={styles.lemma}>
        <CollapsibleTrigger className={styles.row} aria-controls={panelId} data-marked={marked ? "" : undefined}>
          <span className={styles.lemmaText} lang="ar" dir="rtl">
            {lemma.text ?? STRINGS.noLemma}
          </span>
          <span className={styles.count}>{STRINGS.times(lemma.occurrences)}</span>
          <span className={styles.lemmaMean} {...inLanguage(lang)}>
            {lemma.meaning[lang] || STRINGS.noMeaning}
          </span>
          {marked && <span className="sr-only">, {STRINGS.thisWordsLemma}</span>}
        </CollapsibleTrigger>
        <ol id={panelId} className={styles.spellings} hidden={!open}>
          {open && lemma.spellings.map((s) => <SpellingItem key={s.locations[0]} spelling={s} lang={lang} marked={marked} />)}
        </ol>
      </li>
    </Collapsible>
  );
}

/**
 * A link to a Word location. One in another Surah opens it inside the app, in
 * parts (#192); one in this Surah is a plain link, so following it fires
 * hashchange and the page lands on it as on any look-up (./reading-place-tracker).
 */
function WordLocationLink({ location, lang, pathname, current }: { location: string; lang: Language; pathname: string; current: boolean }) {
  const href = locationPath(lang, location);
  const here = pathname === href.split("#")[0];
  const Anchor = here ? "a" : Link;
  return (
    <Anchor className={styles.ref} href={href} dir="ltr" aria-current={current ? "true" : undefined}>
      {location}
    </Anchor>
  );
}

/**
 * A Spelling in each Script (only the active Script's shows), its meaning and
 * a link to each Word location; the Particle dialog's too. A Spelling listing
 * the `marked` Word location is marked, and so is that Word location's link.
 */
export function SpellingItem({ spelling, lang, marked }: { spelling: Spelling; lang: Language; marked?: string }) {
  const pathname = usePathname();
  const holdsMark = !!marked && spelling.locations.includes(marked);
  return (
    <li className={styles.spelling} data-marked={holdsMark ? "" : undefined}>
      <span className={styles.spText} lang="ar" dir="rtl">
        <ScriptText uthmani={spelling.uthmani} indopak={spelling.indopak}>
          {(text, script) => <span className={script || undefined}>{text}</span>}
        </ScriptText>
      </span>
      <span className={styles.spMean} {...inLanguage(lang)}>
        {spelling.meaning[lang] || STRINGS.noMeaning}
      </span>
      <span className={styles.refs}>
        {spelling.locations.map((location) => (
          <WordLocationLink key={location} location={location} lang={lang} pathname={pathname} current={location === marked} />
        ))}
      </span>
    </li>
  );
}

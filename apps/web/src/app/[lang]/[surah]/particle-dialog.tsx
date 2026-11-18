"use client";

// The Particle dialog (#249): clicking a Word card's Particle tag opens a
// dialog like the Root dialog, with the particle in the chosen Script and its
// count, then its Spellings in the chosen Script, each with its meaning and
// Word locations. Beside the particle, Memorized? marks or unmarks it as one
// of the reader's Known words (#251), kept by its kind and text (ADR 0057).
// It opens at once with the particle; the rest is the
// particle's static file, /particles/<id>.json, fetched only when its dialog
// first opens. It closes, keeps its head in view and holds the page still as
// the Root dialog does, as the same shadcn/ui Dialog (./root-dialog, #302),
// and shares its look.
// The dialog is English; only the Spelling meanings are in the Language.
// Opened from a Particle tag, it opens on that tag's Word (#327): the Word's
// Spelling and Word location are marked as the Root dialog marks them, and
// once the particle's file has loaded the dialog scrolls the marked Spelling
// into view, once, as the Root dialog does (#324).

import { DialogTitle } from "@/components/ui/dialog";
import type { Language, Particle, ParticleKind } from "@/dataset/reader";
import { fetchJsonOnce } from "../caches";
import { Memorized } from "../memorized";
import { STRINGS } from "../strings";
import { CloseButton, SpellingItem, TagDialog, tagKey, useMarkInView, useTagDialog } from "./root-dialog";
import { ScriptText } from "./script-text";
import styles from "./root-dialog.module.css";

const loaded = new Map<number, Promise<Particle>>();

/** Particle `id`'s file, fetched once per page. */
const loadParticle = (id: number) => fetchJsonOnce(loaded, id, `/particles/${id}.json`);

/** What a Particle tag shows: its particle's number and kind, its text in each Script, and the Word location of the Word it is for. */
interface ShownTag {
  id: number;
  kind: ParticleKind;
  /** The particle's text, what a Known particle is kept by. */
  uthmani: string;
  indopak: string;
  location?: string;
}

/** The Particle tag's text in each Script, as its ScriptText rendered it: one element when both read alike. */
function shownTag(tag: HTMLElement): ShownTag {
  const [uthmani, indopak = uthmani] = [...tag.children].map((e) => e.textContent ?? "");
  return { id: Number(tag.dataset.particle), kind: tag.dataset.kind as ParticleKind, uthmani, indopak, location: tag.dataset.location };
}

/** Opens the Particle dialog for whichever Particle tag on the page is clicked. */
export function ParticleDialog({ lang }: { lang: Language }) {
  const { open, close, returnFocus } = useTagDialog("button[data-particle]", shownTag, loadParticle);
  return open ? (
    <TagDialog key={tagKey(open.tag)} onClose={close} onClosed={returnFocus}>
      <ParticleSheet tag={open.tag} particle={open.file} lang={lang} />
    </TagDialog>
  ) : null;
}

interface SheetProps {
  tag: ShownTag;
  /** Null until the particle's file has loaded. */
  particle: Particle | null;
  lang: Language;
}

function ParticleSheet({ tag, particle, lang }: SheetProps) {
  return (
    <div className={styles.body}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <div className={styles.lab}>{STRINGS.particleLabel}</div>
          <DialogTitle className={styles.letters} lang="ar">
            <ScriptText uthmani={tag.uthmani} indopak={tag.indopak}>
              {(text, script) => <span className={script || undefined}>{text}</span>}
            </ScriptText>
          </DialogTitle>
        </div>
        <div className={styles.memorized}>
          <Memorized entry={{ kind: tag.kind, text: tag.uthmani }} />
        </div>
        <CloseButton />
      </header>
      {particle ? <ParticleBody particle={particle} lang={lang} marked={tag.location} /> : <p className={styles.loading} aria-busy="true" />}
    </div>
  );
}

/** The particle's count and its Spellings; the Spelling listing the `marked` Word location is marked, as is that Word location, and brought into view. */
function ParticleBody({ particle, lang, marked }: { particle: Particle; lang: Language; marked?: string }) {
  const spellings = useMarkInView<HTMLOListElement>();
  return (
    <>
      <p className={styles.stat}>{STRINGS.particleCount(particle.occurrences)}</p>
      <h3 className={styles.title}>{STRINGS.spellingsTitle}</h3>
      <ol ref={spellings} className={styles.particleSpellings}>
        {particle.spellings.map((s) => (
          <SpellingItem key={s.locations[0]} spelling={s} lang={lang} marked={marked} />
        ))}
      </ol>
    </>
  );
}

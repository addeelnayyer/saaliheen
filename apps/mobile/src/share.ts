// Sharing Ayahs from the app (#76): the app's Share page, the way the
// website's Share flow does it (#55, #56). A reader opens a Share page from an
// Ayah's or a Passage heading's share button, or from the Surah bar's "Share
// Ayahs" (on 1:1–7, as on the website), picks the Shared Ayahs and the Share
// layout on its edit strip, and hands the share sheet the reference and the
// Share page's link on https://saaliheen.com. A Share page link, on
// https://saaliheen.com or under the app's own saaliheen:// scheme, opens the
// same Share page in the app, with no edit strip. Opening a Share page is not
// reading: it leaves the Reading places as they were. This module imports
// nothing from React Native or Expo, so the app's scenarios
// (features/sharing-ayahs.feature) run it in Node.
//
// The Share rules (which Shared Ayahs may be shared, the Share page's address
// and link, and what Share hands over) are the website's own, from
// @saaliheen/share. Passage titles show as the Passage headings release
// switch says, as on the website.

import type { Surah } from "@saaliheen/dataset/types";
import {
  allowedTo,
  ayahNumbers,
  ayahsLabel,
  isAllowed,
  namedShareOfPath,
  passageOf,
  reference,
  SHARE_LAYOUTS,
  shareLink,
  shareText,
  SITE_URL,
  toAfterFrom,
  type ShareLayout,
  type ShareTarget,
  type SurahShape,
} from "@saaliheen/share";
import type { Language, QuranAnalysis, Script, SurahIndexEntry } from "./quran-analysis";

export type { ShareLayout };

/** What a Share page shows and its link records: the Language, the Script, the Surah, the from and to Ayahs, and the Share layout (null for a single Ayah, which has none). */
export type ShareRequest = ShareTarget;

/** One Shared Ayah as the Share page shows it: its number, its Words' Arabic in the page's Script, in order, and its Ayah translation in the page's Language. */
export interface SharedAyahView {
  number: number;
  words: string[];
  translation: string;
}

/** The phone's share sheet: it is handed the text to send, and says whether the reader sent it or dismissed it. */
export interface ShareSheet {
  share(content: { message: string }): Promise<"shared" | "dismissed">;
}

/** One Surah as the edit strip's Surah list offers it. */
export interface SurahChoice {
  number: number;
  nameLatin: string;
}

/** The sharer's controls on a Share page opened from inside the app. Each choice answers the Share page it leads to. */
export interface EditStrip {
  readonly surah: number;
  readonly from: number;
  readonly to: number;
  /** Every Surah, in order. */
  readonly surahs: SurahChoice[];
  /** The from Ayahs offered: every Ayah of the Surah. */
  readonly fromAyahs: number[];
  /** The to Ayahs offered: only those that leave allowed Shared Ayahs. */
  readonly toAyahs: number[];
  /** The Share layouts offered, in order; none for a single Ayah. */
  readonly layouts: ShareLayout[];
  chooseSurah(surah: number): Promise<SharePage>;
  chooseFrom(ayah: number): Promise<SharePage>;
  chooseTo(ayah: number): Promise<SharePage>;
  chooseLayout(layout: ShareLayout): Promise<SharePage>;
}

/** A Share page in the app. */
export interface SharePage {
  readonly lang: Language;
  readonly script: Script;
  readonly surah: number;
  readonly from: number;
  readonly to: number;
  /** The Share layout the Shared Ayahs are set out in; null for a single Ayah. */
  readonly layout: ShareLayout | null;
  /** The Surah's English name and the Shared Ayahs as the headpiece writes them: "Al-Kahf 18:83–88", "Al-Fatihah 1:5". */
  readonly reference: string;
  /** The Passage title in the page's Language while the Shared Ayahs are exactly a Passage; else null. */
  readonly passageTitle: string | null;
  readonly ayahs: SharedAyahView[];
  /** The Share page's link: its address on https://saaliheen.com. */
  readonly link: string;
  /** The edit strip, on a Share page opened from inside the app; null on one opened from a link. */
  readonly editStrip: EditStrip | null;
  /** "Share": hands the share sheet the reference and the link, a blank line between. */
  share(sheet: ShareSheet): Promise<void>;
}

/** Where the Surah bar's "Share Ayahs" opens the Share page, as on the website: Al-Fatihah, 1:1–7. */
export const SHARE_AYAHS_START = { surah: 1, from: 1, to: 7 } as const;

/** The app's own scheme, as app.json names it: saaliheen://<lang>/share/… opens a Share page as https://saaliheen.com/<lang>/share/… does. */
export const APP_SCHEME = "saaliheen";

/** The Share page `request` names, in full: its layout settled (null for a single Ayah, Ayah by Ayah for a run that names none). */
const settled = (request: ShareRequest): Required<ShareRequest> => ({
  ...request,
  layout: request.from === request.to ? null : (request.layout ?? "ayah-by-ayah"),
});

/** What the allowed Shared Ayahs of `surah` depend on. */
const shapeOf = (surah: Surah): SurahShape => ({ ayahCount: surah.ayahs.length, passages: surah.passages });

/** Shared Ayahs `from`..`to` of `surah` in `script` and `lang`. */
const sharedAyahs = (surah: Surah, { script, lang, from, to }: ShareRequest): SharedAyahView[] =>
  surah.ayahs.slice(from - 1, to).map((a) => ({ number: a.number, words: a.words.map((w) => w[script]), translation: a.translation[lang] }));

/** What a Share page is opened from: its request, its Surah as the app reads it and every Surah. */
interface Opened {
  app: QuranAnalysis;
  request: Required<ShareRequest>;
  surah: Surah;
  passageTitles: boolean;
  surahs: SurahIndexEntry[];
}

/** The edit strip over the Share page `opened` shows: each choice opens the Share page it leads to, keeping the Language and Script. */
function editStrip({ app, request, surah, surahs }: Opened): EditStrip {
  const shape = shapeOf(surah);
  const { from, to } = request;
  const choose = async (choice: Partial<ShareRequest>) => {
    const next = await opening(app, { ...request, ...choice }, surahs);
    if (!next) throw new Error(`the edit strip offered Ayahs that may not be shared: ${JSON.stringify(choice)}`);
    return sharePage(next, true);
  };
  return {
    surah: request.surah,
    from,
    to,
    surahs: surahs.map(({ number, nameLatin }) => ({ number, nameLatin })),
    fromAyahs: ayahNumbers(1, shape.ayahCount),
    toAyahs: allowedTo(shape, from),
    layouts: from === to ? [] : [...SHARE_LAYOUTS],
    chooseSurah: (n) => choose({ surah: n, from: 1, to: 1 }),
    chooseFrom: (n) => choose({ from: n, to: toAfterFrom(shape, n, to) }),
    chooseTo: (n) => choose({ to: n }),
    chooseLayout: (layout) => choose({ layout }),
  };
}

/** The Share page `opened` shows, with its edit strip when `sharer`. */
function sharePage(opened: Opened, sharer: boolean): SharePage {
  const { request, surah, passageTitles } = opened;
  const { lang, from, to } = request;
  const ref = reference(surah.nameLatin, ayahsLabel(surah.number, from, to));
  const link = shareLink(request);
  return {
    ...request,
    reference: ref,
    passageTitle: (passageTitles && passageOf(surah.passages, from, to)?.[lang]) || null,
    ayahs: sharedAyahs(surah, request),
    link,
    editStrip: sharer ? editStrip(opened) : null,
    async share(sheet) {
      // Sent or dismissed, the Share page stays as it was.
      await sheet.share({ message: shareText(ref, link) });
    },
  };
}

/**
 * The Share page `request` names, opened in the app on `app`'s data: with the
 * edit strip when `sharer` (opened from inside the app), without it when
 * opened from a link. Null when the Ayahs may not be shared. It reads the
 * Surah and the Surah index, and keeps nothing in the device's storage, so
 * the Reading places stay as they were.
 */
export async function openSharePage(app: QuranAnalysis, request: ShareRequest, options: { sharer: boolean }): Promise<SharePage | null> {
  const opened = await opening(app, request, await app.surahIndex());
  return opened && sharePage(opened, options.sharer);
}

/** What the Share page `request` names is opened from, given every Surah; null when the Ayahs may not be shared. */
async function opening(app: QuranAnalysis, request: ShareRequest, surahs: SurahIndexEntry[]): Promise<Opened | null> {
  if (!surahs.some((s) => s.number === request.surah)) return null;
  const { surah, passageTitles } = await app.sharedSurah(request.surah, request.lang);
  if (!isAllowed(shapeOf(surah), request.from, request.to)) return null;
  return { app, request: settled(request), surah, passageTitles, surahs };
}

/** The links that open a Share page in the app: on the production site, and under the app's own scheme. */
const LINK_STARTS = [`${SITE_URL}/`, `${APP_SCHEME}://`];

/** A link's path, from the / after its site or scheme to its end, less any query or fragment; null for a link the app does not open. */
function pathOfLink(link: string): string | null {
  const start = LINK_STARTS.find((s) => link.startsWith(s));
  if (start === undefined) return null;
  return `/${link.slice(start.length)}`.replace(/[?#].*$/, "");
}

/** The Share page a link names, https://saaliheen.com/<lang>/share/… or saaliheen://<lang>/share/…; null for any other link. */
export function shareRequestOfLink(link: string): ShareRequest | null {
  const path = pathOfLink(link);
  return (path !== null && namedShareOfPath(path)) || null;
}

/** The edit strip's chips, each with the gap after it, as one length in points: an Ayah number's, and a Surah's, which carries its name too. */
export const EDIT_STRIP_CHIP = { ayah: 56, surah: 156, gap: 6 } as const;

/**
 * Where an edit strip row of `count` chips, each `chipLength` long with its
 * gap, opens scrolled to in a row `rowLength` long, so that chip `index`, the
 * chosen one, is wholly in view: centred where the row can scroll that far,
 * else as near the centre as the row's ends allow.
 */
export function chipRowOffset(index: number, count: number, chipLength: number, rowLength: number): number {
  const centred = index * chipLength - (rowLength - chipLength) / 2;
  const furthest = Math.max(0, count * chipLength - rowLength);
  return Math.min(furthest, Math.max(0, centred));
}

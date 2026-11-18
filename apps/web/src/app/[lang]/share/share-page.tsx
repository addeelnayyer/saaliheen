// The Share page as a visitor sees it (#55): the Shared Ayahs in frame B
// ("Mushaf"), in the Language and Script the address names. Both Share page
// routes (with and without a Share layout in the address) render this.
//
// Share pages render on request, not at build time (there are far too many
// addresses), and are then cached: every address shows the same page to every
// visitor, so nothing here reads the visitor's settings. The Script is the
// address's, the look follows the device's colour scheme, the text sizes are
// the page's own, and the Reading place is neither read nor moved. Its Allah
// references (#149) come from the same cached data module as a Surah page's.
// Its Passages, which say what may be shared, are read from Neon (#171): when
// Neon cannot answer and the page is not in the cache, it is the error page.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withAllahReferences } from "@/allah-references/mark";
import { isLanguage, listSurahs } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { drawnAyahEnd, sharedAyahEnd } from "../[surah]/ayah-end";
import { PASSAGE_HEADINGS } from "../release";
import { Brand } from "../site-bar";
import barStyles from "../site-bar.module.css";
import { inLanguage, STRINGS, TRANSLATOR } from "../strings";
import { UNAVAILABLE_METADATA, UnavailablePage } from "../unavailable-page";
import { ShareLanguageSwitch } from "./in-app";
import { previewDescription, previewTitle } from "./link-preview";
import { Dome, Tailpiece } from "./ornaments";
import { reference, shareLink, sharePath, shareText, type ShareAddress, type ShareTarget } from "@saaliheen/share";
import { ayahsLabel, sharedAyahsOf, type SharedAyahs } from "./shared-ayahs";
import { SharePageBody } from "./share-page-body";
import { SharerButtons } from "./sharer-buttons";
import { copyText } from "./share-text";
import s from "./share.module.css";

interface SharePageProps {
  params: Promise<ShareAddress>;
}

/** The address's Shared Ayahs, or UNAVAILABLE when Neon cannot answer; anything else is not found. */
async function load(params: SharePageProps["params"]) {
  const shared = await orUnavailable(() => params.then((address) => sharedAyahsOf(address, PASSAGE_HEADINGS)));
  if (!shared) notFound();
  return shared;
}

/** The address's path after its Language, for the error page's bars. */
const pathAfterLanguage = ({ surah, ayahs, script, layout }: ShareAddress) => `/share/${surah}/${ayahs}/${script}${layout ? `/${layout}` : ""}`;

/** Where the address that shows `shared` points. */
const targetOf = ({ lang, script, surah, from, to, layout }: SharedAyahs): ShareTarget => ({ lang, surah: surah.number, from, to, script, layout });

/** The address that shows `shared`. */
const pathOf = (shared: SharedAyahs) => sharePath(targetOf(shared));

/**
 * The page's title and its Link preview tags (#57). Every address in them is on
 * the production site, wherever the page is served; the picture's tags come
 * from the route's opengraph-image and twitter-image files.
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const shared = await load(params);
  if (shared === UNAVAILABLE) return UNAVAILABLE_METADATA;
  const title = previewTitle(shared);
  const description = previewDescription(shared);
  return {
    title: `${reference(shared.surah.nameLatin, ayahsLabel(shared))} · ${STRINGS.brand}`,
    description,
    openGraph: { type: "article", siteName: STRINGS.brand, title, description, url: pathOf(shared) },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * The brand bar (#192): a Share page is a dead end for a visitor, so it gets
 * the brand, leading to the Surah index in the page's Language, and the
 * Language switch, which keeps the Shared Ayahs, their Script and their Share
 * layout, and the edit strip for a sharer. No Read, Explore or Me.
 */
function BrandBar({ shared }: { shared: SharedAyahs }) {
  const hrefs = { ur: pathOf({ ...shared, lang: "ur" }), en: pathOf({ ...shared, lang: "en" }) };
  return (
    <header className={`${barStyles.bar} ${s.brandBar}`}>
      <Brand lang={shared.lang} />
      <ShareLanguageSwitch lang={shared.lang} hrefs={hrefs} />
    </header>
  );
}

/** The headpiece: a small dome above a rounded cartouche with the Surah's names, the Ayah range and any Passage title. */
function Head({ shared }: { shared: SharedAyahs }) {
  return (
    <header className={s.head}>
      <Dome className={s.dome} />
      <div className={s.cartouche}>
        <p className={`${s.surahArabic} ${s[shared.script]}`} lang="ar" dir="rtl">
          {shared.surah.nameArabic}
        </p>
        <p className={s.surahLatin}>
          {shared.surah.nameLatin} · {ayahsLabel(shared)}
        </p>
        {shared.passageTitle && (
          <p className={s.passageTitle} {...inLanguage(shared.lang)}>
            {shared.passageTitle}
          </p>
        )}
      </div>
    </header>
  );
}

/** The tailpiece, then the colophon: the translator, a link to the first Shared Ayah in Quran Analysis, and the Saaliheen name. */
function Foot({ shared }: { shared: SharedAyahs }) {
  const { lang, surah, from } = shared;
  return (
    <footer className={s.foot}>
      <Tailpiece className={s.tail} />
      <p>{STRINGS.translationBy(TRANSLATOR[lang])}</p>
      <p>
        <Link href={`/${lang}/${surah.number}#${surah.number}:${from}`}>{STRINGS.readInQuranAnalysis}</Link>
      </p>
      <p className={s.brand}>{STRINGS.brand}</p>
    </footer>
  );
}

/**
 * The sharer's Share and Copy text buttons, with the texts they hand over:
 * the link is this Share page's own path on the production site, with nothing
 * after it, so whoever opens it gets no edit strip.
 */
function Sharer({ shared }: { shared: SharedAyahs }) {
  const { lang, script } = shared;
  const ref = reference(shared.surah.nameLatin, ayahsLabel(shared));
  const link = shareLink(targetOf(shared));
  // Each Ayah's Words in the address's Script, joined by spaces, then its end.
  const ayahs = shared.ayahs.map((a) => ({
    arabic: `${a.words.map((w) => w[script]).join(" ")} ${sharedAyahEnd(a, script)}`,
    translation: a.translation,
  }));
  return <SharerButtons shareText={shareText(ref, link)} copyText={copyText(ayahs, lang, ref, link)} />;
}

/** Every Surah, as the edit strip's Surah list offers it. */
const surahChoices = async () => (await listSurahs()).map(({ number, nameLatin }) => ({ number, nameLatin }));

const STRIP_LABELS = {
  strip: STRINGS.chooseAyahsToShare,
  surah: STRINGS.surahBarLabel,
  from: STRINGS.fromAyah,
  to: STRINGS.toAyah,
  layout: STRINGS.shareLayout,
  "ayah-by-ayah": STRINGS.ayahByAyah,
  flowing: STRINGS.flowing,
};

export async function SharePage({ params }: SharePageProps) {
  const shared = await load(params);
  if (shared === UNAVAILABLE) return <SharePageUnavailable address={await params} />;
  const { lang, script, surah, from, to, layout } = shared;
  const marked = await withAllahReferences(surah.number, shared.ayahs);
  const ayahs = marked.map((a) => ({
    number: a.number,
    words: a.words.map((w) => ({ location: w.location, text: w[script], allahReference: w.allahReference })),
    end: drawnAyahEnd(a, script),
    translation: a.translation,
  }));
  const passages = surah.passages.map(({ from, till }) => ({ from, till }));
  const path = pathOf(shared);
  return (
    <>
      <BrandBar shared={shared} />
      <SharePageBody
        // A fresh body for each address, so the visitor's layout toggle starts from the address's layout and the edit strip from its choices.
        key={path}
        ayahs={ayahs}
        strip={{ lang, script, surah: surah.number, ayahCount: surah.ayahCount, passages, from, to, layout, surahs: await surahChoices(), labels: STRIP_LABELS }}
        head={<Head shared={shared} />}
        foot={<Foot shared={shared} />}
        sharerActions={<Sharer shared={shared} />}
        shareYourOwn={STRINGS.shareYourOwn}
      />
    </>
  );
}

/** The error page in place of a Share page whose Passages Neon could not give; any other Language is not found. */
function SharePageUnavailable({ address }: { address: ShareAddress }) {
  if (!isLanguage(address.lang)) notFound();
  return <UnavailablePage lang={address.lang} path={pathAfterLanguage(address)} />;
}

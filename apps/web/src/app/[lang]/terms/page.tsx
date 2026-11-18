// The terms of service in the reader's Language (#192): reached from Me, under the
// reading pages' bars, every link keeping the Language. The text is English
// whatever the Language, as Credits is.

import type { Metadata } from "next";
import type { Language } from "@/dataset/reader";
import { TermsOfService } from "../../(documents)/terms/terms-text";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import indexStyles from "../index.module.css";
import { languageParams } from "../language-params";

// Prerendered in each Language; any other is a 404.
export const dynamicParams = false;
export const generateStaticParams = languageParams;

export const metadata: Metadata = { title: `${STRINGS.terms} · ${STRINGS.brand}` };

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  const lang = (await params).lang as Language;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/terms" />
      <TermsOfService lang={lang} />
    </div>
  );
}

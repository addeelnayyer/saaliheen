// Arabic in each Script, shared by the Surah page and the Root dialog.

import type { ReactNode } from "react";
import styles from "./script-text.module.css";

/**
 * Arabic in each Script, of which only the active Script's shows (data-script
 * on <html>). Text the two Scripts write alike is rendered once, for both, in
 * the active Script's typeface.
 */
export function ScriptText({
  uthmani,
  indopak,
  children,
}: {
  uthmani: string;
  indopak: string;
  children: (text: string, scriptClass: string) => ReactNode;
}) {
  if (uthmani === indopak) return children(uthmani, "");
  return (
    <>
      {children(uthmani, styles.uthmani)}
      {children(indopak, styles.indopak)}
    </>
  );
}

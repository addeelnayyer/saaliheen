// Below what a page opened in parts (ADR 0005, 0014) shows, until it is whole:
// its skeleton, or, once loading has stopped short, what went wrong and Retry.

import type { ReactNode } from "react";
import { Failure } from "./failure";

/** Nothing once `done`; Failure with Retry once `failed`; else `children`, the page's own skeleton. */
export function StillToCome({
  done,
  failed,
  onRetry,
  children,
}: {
  done: boolean;
  failed: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (done) return null;
  if (failed) return <Failure onRetry={onRetry} />;
  return children;
}

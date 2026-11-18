"use client";

// An admin editor's guard on unsaved changes (#142, #201): while there are
// any, the browser asks before the page is left or reloaded.

import { useEffect } from "react";

/** While `unsaved`, the browser asks before the page is left or reloaded. */
export function useLeaveWarning(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
}

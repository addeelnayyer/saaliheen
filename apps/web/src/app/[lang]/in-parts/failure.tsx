// In place of the parts still to come, once loading has stopped short (ADR
// 0005, 0014), or of a Root page's Spelling part that failed (#288): what went
// wrong and a Retry button.

import { STRINGS } from "../strings";
import { Button } from "@/components/ui/button";
import styles from "./in-parts.module.css";

export function Failure({ onRetry, message = STRINGS.partsFailed }: { onRetry: () => void; message?: string }) {
  return (
    <div className={styles.failed} role="alert" dir="ltr" lang="en">
      <p>{message}</p>
      <Button variant="pill" size="pill" className="px-4 text-primary" onClick={onRetry}>
        {STRINGS.retry}
      </Button>
    </div>
  );
}

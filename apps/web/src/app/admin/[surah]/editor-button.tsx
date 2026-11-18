// The Passage editor's word buttons (#299): Summary, Undo and Publish in the
// Unpublished changes bar, the Phrase controls, and Join with above and the
// ↑ / ↓ under a Passage heading. A shadcn/ui Button on the site's tokens: a
// bordered surface in the text's own weight, faded while disabled; `filled`,
// the accent, while it may be pressed (Publish).

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Button>, "variant" | "size"> & { filled?: boolean };

export function EditorButton({ filled, className, ...props }: Props) {
  const fill = filled && !props.disabled;
  return (
    <Button
      type="button"
      variant={fill ? "default" : "outline"}
      size="control"
      className={cn("font-normal disabled:opacity-45", fill && "border border-primary", className)}
      {...props}
    />
  );
}

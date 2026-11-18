// shadcn/ui's Input (#298, ADR 0067), as `shadcn add input` vendored it but
// for focus and selection: the site's own :focus-visible outline and
// ::selection (globals.css) mark them, so upstream's rings and selection
// colours are taken out; so are its dark: background, the tokens switching
// for dark themselves, and its smaller md: text. It is the site's field (#300,
// #301), as every Input on the site overrode it alike: as tall as its text, on
// the card, in the page's own type and ink, with no shadow.
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-auto w-full min-w-0 rounded-md border border-input bg-card px-3 py-2.5 text-[length:inherit] leading-[inherit] text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }

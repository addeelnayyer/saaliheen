// shadcn/ui's Textarea (#300, #306, ADR 0067), as `shadcn add textarea` vendored it
// but for focus: the site's own :focus-visible outline (globals.css) marks it,
// so upstream's focus and invalid rings are taken out; so are its dark:
// background, the tokens switching for dark themselves, its smaller md: text,
// and field-sizing, so that its rows set its height as a textarea's do. It is
// the site's field: the page's text on the surface, with no shadow.
import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-input bg-card px-3 py-2.5 text-[length:inherit] leading-[inherit] text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

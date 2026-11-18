// shadcn/ui's Toggle (#299, #306, ADR 0067), as `shadcn add toggle` vendored it but
// for focus: the site's own :focus-visible outline (globals.css) marks it, so
// upstream's outline-none and focus ring, and the invalid ring drawn with it,
// are taken out, and so is its dark: invalid ring, the tokens switching for
// dark themselves. Like the vendored Button, it shows a pointer, changes
// without a transition and answers a tap without waiting for a double-tap. Its
// hover moves from the base into upstream's two variants, beside the site's
// pill: a bordered surface, rounded in full, filled with the accent while on,
// in the text size around it. The segment variant and size (#305) are an
// option on the site's segmented track (the Script, the theme): transparent
// muted text, the accent under the pointer. Its on look is not its own, so
// the on look of upstream's variants moves from the base into them: the
// option a reader chose is drawn by <html>'s attribute (site-bar.module.css),
// right at first paint, before hydration; the Makki/Madani filter, the page's
// own state, draws its chosen option from data-state (#307).
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        pill:
          "rounded-full border border-border bg-card text-[length:inherit] leading-[inherit] font-normal text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        segment:
          "rounded-full bg-transparent text-[12.5px] font-normal text-muted-foreground transition-colors duration-150 ease-[ease] hover:text-primary motion-reduce:transition-none",
      },
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
        pill: "h-auto px-3 py-1",
        segment: "h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }

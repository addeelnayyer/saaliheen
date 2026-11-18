// shadcn/ui's Button (#298, ADR 0067), as `shadcn add button` vendored it but
// for focus: the site's own :focus-visible outline (globals.css) marks it, so
// upstream's focus ring, and the invalid ring drawn with it, are taken out;
// so are the ghost, outline and destructive variants' dark: classes (#300), the
// tokens switching for dark themselves. Like the site's own buttons (#299), it
// shows a pointer, changes at once rather than with a transition, and answers a
// tap without waiting for a double-tap. Its outline and secondary variants are
// the site's (a bordered surface, a bordered tint, each the chip under the
// pointer); its control size is the site's 14px button, as tall as its line,
// and the wide and compact sizes are the admin's full-width and small buttons
// (#300). The destructive variant's text is the paper rather than white, as no
// colour is added (#301).
// The pill variant and size are the tinted pill the site's bars and pages
// have always offered (the Surah bar's Listen, a Retry, Show more, Reset
// sizes); filled is the accent pill that never dims on hover (Sign in, Ask)
// (#305, #306).
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-background hover:bg-destructive/90",
        outline: "border border-border bg-card text-foreground hover:bg-accent",
        secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        pill: "rounded-full bg-secondary text-foreground transition-[background-color,color] duration-150 ease-[ease] hover:bg-accent hover:text-primary motion-reduce:transition-none",
        filled: "rounded-full bg-primary text-primary-foreground transition-none",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        control: "h-auto min-w-10 px-3 py-1.5 leading-[inherit]",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        wide: "h-auto w-full px-4 py-2.5 text-[length:inherit]",
        compact: "h-auto px-3 py-1.5",
        pill: "h-auto gap-1 px-3.5 py-[3px] text-[13px] font-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

"use client"

// shadcn/ui's Switch (#302, #305, ADR 0067): Memorized?, in the Root dialog's
// and Particle dialog's heads and on the Known words page's rows, the reader
// settings' on/off switches and the Supplications page's. As `shadcn add
// switch` vendored it but for these:
// - It is the site's labelled switch: its label is its children, written on
//   it after the thumb's track, so the whole pill is the switch and its label
//   names it. The Root is that pill (the tint, rounded in full, in 12.5px
//   muted text, the accent under the pointer while off, the ink while on);
//   the track is a span inside it, the line while off and the accent while
//   on, and the thumb, the paper with a shadow, slides along it by its inline
//   start (taking 0.2s, unless motion is reduced).
// - The track's colour and the thumb's place are --switch-track and
//   --switch-at, which its state sets, so a stylesheet can draw it on or off
//   from elsewhere: a reader setting's switch is drawn by <html>'s attribute
//   (site-bar.module.css), so it is right at first paint, before hydration.
// - Focus is marked by the site's own :focus-visible outline (globals.css),
//   as on the vendored Button, so upstream's focus ring is taken out, and so
//   are its dark: classes, the tokens switching for dark themselves. It shows
//   a pointer and answers a tap without waiting for a double-tap; disabled,
//   it is greyed out.

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch inline-flex cursor-pointer touch-manipulation items-center gap-2 rounded-full bg-secondary py-[3px] ps-[5px] pe-3 text-[12.5px] whitespace-nowrap text-muted-foreground [--switch-at:2px] [--switch-track:var(--color-input)] hover:text-primary disabled:cursor-default disabled:opacity-45 data-[state=checked]:text-foreground data-[state=checked]:[--switch-at:14px] data-[state=checked]:[--switch-track:var(--color-primary)]",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-track"
        aria-hidden="true"
        className="relative h-[18px] w-[30px] flex-none rounded-full bg-(--switch-track) transition-[background-color] duration-200 motion-reduce:transition-none"
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="pointer-events-none absolute top-0.5 start-(--switch-at) block size-3.5 rounded-full bg-background shadow-[0_1px_2px_var(--shadow)] transition-[inset-inline-start] duration-200 motion-reduce:transition-none"
        />
      </span>
      {children}
    </SwitchPrimitive.Root>
  )
}

export { Switch }

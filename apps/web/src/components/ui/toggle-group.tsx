"use client"

// shadcn/ui's ToggleGroup (#305, #307, ADR 0067): the reader settings' segmented
// switches (the Script, the theme, Section marks), the Surah bar's Ayah
// layout and the Surah index's Makki/Madani filter. As `shadcn add toggle-group` vendored it but for these:
// - A single group keeps the role the site's segmented switches have always
//   had: a group of toggle buttons, the chosen one pressed. Radix makes it a
//   radiogroup of radios instead, so the Root says it is a group and each
//   Item a button, pressed while it holds the group's value.
// - Its options are each rounded on the site's track, so upstream's joined
//   look (square inner corners while spacing is 0) is taken out.

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    /** A single group's value, for its Items to say whether they are pressed. */
    single?: { value: string | undefined }
  }
>({
  size: "default",
  variant: "default",
  spacing: 0,
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
  }) {
  const single = props.type === "single" ? { value: props.value } : undefined
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      role="group"
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, single }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  const pressed = context.single && {
    role: "button",
    "aria-checked": undefined,
    "aria-pressed": context.single.value === props.value,
  }

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      {...pressed}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }

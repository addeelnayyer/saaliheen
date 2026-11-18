"use client"

// shadcn/ui's Sheet (#305, ADR 0067): the Settings drawer. As `shadcn add
// sheet` vendored it but for these:
// - The Overlay is not Radix's, as in the AlertDialog (alert-dialog.tsx):
//   Radix's carries its scroll lock, which moves the page beneath, so it is
//   ./held-backdrop's, holding the page instead and closing the sheet on a
//   click. Radix's Content would close it already on the press, before the
//   click, which then lands on the page beneath once the backdrop is gone; so
//   the Content ignores a press outside.
// - The Content says it is modal (aria-modal), as a native modal <dialog> does.
// - There is one side, the site's: a bottom sheet on a phone, up to most of
//   the screen, and from 601px wide a full-height panel on the right, 400px at
//   most. It is the paper in 22px corners on its inner edge with the site's
//   shadow, in the page's 15px type, and slides in (unless motion is reduced)
//   but leaves at once, as the site's dialogs do. Its parts fill it, the
//   header and anything else that stays put above the part that scrolls.
// - The built-in close button is left to the caller (SheetClose), to sit in
//   the header beside the title; the Header is that row, the Title the
//   site's 17px. The Footer and Description, unused, are taken out.

import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog as SheetPrimitive } from "radix-ui"

import { BackdropClosingRoot, HeldBackdrop } from "@/components/ui/held-backdrop"

function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return (
    <BackdropClosingRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      render={(state) => <SheetPrimitive.Root data-slot="sheet" {...state} {...props} />}
    />
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay(props: React.ComponentProps<"div">) {
  return <HeldBackdrop data-slot="sheet-overlay" {...props} />
}

function SheetContent({
  className,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        aria-modal="true"
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          event.preventDefault()
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-screen animate-sheet-up flex-col overflow-hidden rounded-t-[22px] bg-background text-[15px] text-foreground shadow-[0_20px_60px_rgba(0,0,0,.22)] motion-reduce:animate-none min-[601px]:inset-y-0 min-[601px]:right-0 min-[601px]:left-auto min-[601px]:h-dvh min-[601px]:max-h-none min-[601px]:w-[min(400px,100vw)] min-[601px]:animate-sheet-in min-[601px]:rounded-tr-none min-[601px]:rounded-l-[22px]",
          className
        )}
        {...props}
      />
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-none items-center justify-between gap-3 px-4 pt-3.5 pb-2 min-[601px]:px-5 min-[601px]:pt-4 min-[601px]:pb-2.5",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-[17px] font-semibold", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
}

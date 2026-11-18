"use client"

// shadcn/ui's Dialog (#302, #303, #304, #307, ADR 0067): the Root dialog, the
// Particle dialog, the Word grammar dialog, and the Surah pickers of the Surah
// bar and of a Grammar page.
// As `shadcn add dialog` vendored it but for these, following the AlertDialog
// (./alert-dialog.tsx):
// - The Overlay is not Radix's, whose scroll lock moves the page beneath: it
//   is ./held-backdrop's, holding the page still and closing the dialog on a
//   click. Radix's own closing on a press outside is turned off, since it
//   closes on the press, and the click that follows would land on the page
//   beneath (on a Word, opening another dialog). The focus trap, the hiding of
//   the rest of the page and Escape are Radix's Content's, and stay.
// - The Content says it is modal (aria-modal), as a native modal <dialog> does.
// - The Content has no close button of its own: each dialog places its own,
//   a DialogClose, where its head has room for it.
// - The Overlay and Content take the site's dialog look: the scrim, the paper
//   card in 22px corners with its shadow, the page's own type, popping in.
//   The card has no padding and scrolls as one, so a
//   head inside it can stay pinned while the rest scrolls beneath it.
// - No Header, Footer or Description: no dialog on the site has them.

import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog as DialogPrimitive } from "radix-ui"

import { BackdropClosingRoot, HeldBackdrop } from "@/components/ui/held-backdrop"

function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <BackdropClosingRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      render={(state) => <DialogPrimitive.Root data-slot="dialog" {...state} {...props} />}
    />
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay(props: React.ComponentProps<"div">) {
  return <HeldBackdrop data-slot="dialog-overlay" {...props} />
}

function DialogContent({
  className,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        aria-modal="true"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] overflow-auto overscroll-contain rounded-[22px] bg-background p-0 text-[15px] text-foreground shadow-[0_20px_60px_rgba(0,0,0,.22)] animate-dialog-pop motion-reduce:animate-none",
          className
        )}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          event.preventDefault()
        }}
        {...props}
      />
    </DialogPortal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={className}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

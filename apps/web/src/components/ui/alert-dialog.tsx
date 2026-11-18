"use client"

// shadcn/ui's AlertDialog (#300, #301, ADR 0067): Delete Account's
// confirmation and the admin's Delete for good. As `shadcn add alert-dialog`
// vendored it but for these:
// - The Overlay is not Radix's, whose scroll lock moves the page beneath (it
//   sets <body>'s padding to its margins, taking the site's 16px gutter
//   away): it is ./held-backdrop's, holding the page still and closing the
//   dialog on a click (#297), which Radix's AlertDialog never does. The focus
//   trap, the hiding of the rest of the page and Escape are Radix's
//   Content's, and stay.
// - The Content says it is modal (aria-modal), as a native modal <dialog> does.
// - The Overlay, Content, Title, Description and Footer take the site's
//   confirmation look: the scrim, the paper card in 22px corners with its
//   shadow, the page's own type and two buttons side by side; and none
//   animates, as no confirmation on the site does. The card is as wide as a native
//   modal <dialog> in the page's 15px type would be: 36px narrower than the
//   screen, at most 420px.
// - Action and Cancel hand their className to the Button, not to the
//   primitive beneath it, so it merges with the Button's own classes (a
//   className on the primitive is joined through the Slot unmerged, and
//   loses to them).

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { BackdropClosingRoot, HeldBackdrop } from "@/components/ui/held-backdrop"

function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return (
    <BackdropClosingRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      render={(state) => (
        <AlertDialogPrimitive.Root data-slot="alert-dialog" {...state} {...props} />
      )}
    />
  )
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay(props: React.ComponentProps<"div">) {
  return <HeldBackdrop data-slot="alert-dialog-overlay" {...props} />
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        aria-modal="true"
        className={cn(
          "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-[min(420px,calc(100vw-36px))] translate-x-[-50%] translate-y-[-50%] gap-3 rounded-[22px] bg-background p-5 text-[15px] text-foreground shadow-[0_20px_60px_rgba(0,0,0,.22)] data-[size=sm]:max-w-xs",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "mt-1 grid grid-cols-2 gap-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-[17px] font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}

"use client"

// The backdrop a vendored Radix dialog draws in place of Radix's Overlay
// (ADR 0067, "The page-hold contract"): ./alert-dialog's, ./dialog's and ./sheet's.
// Radix's Overlay carries its scroll lock, which moves the page beneath, so
// the backdrop runs the site's page hold (src/lib/hold-page.ts) instead. It
// takes pointer events back, as Radix's does, since Radix turns them off on
// <body> while the dialog is open, and a click on it closes the dialog, as a
// click outside closes every dialog on the site (#297): the dialog's Root
// keeps the open state itself, as Radix's would, controlled or not, and hands
// the backdrop its closing.

import * as React from "react"
import { cn } from "@/lib/utils"
import { useHoldPage } from "@/lib/hold-page"

/** Closes the open dialog, for its backdrop. */
const CloseContext = React.createContext<() => void>(() => {})

interface OpenState {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A Radix dialog Root's open state, kept by the Root itself so that its
 * backdrop can close it: `render` is given the state to hand Radix's Root.
 */
export function BackdropClosingRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  render,
}: OpenState & {
  render: (state: { open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  return <CloseContext value={() => setOpen(false)}>{render({ open, onOpenChange: setOpen })}</CloseContext>
}

/** The scrim beneath the dialog, holding the page still and closing the dialog on a click. */
export function HeldBackdrop({ className, ...props }: React.ComponentProps<"div">) {
  useHoldPage()
  const close = React.useContext(CloseContext)
  return (
    <div
      className={cn("pointer-events-auto fixed inset-0 z-50 bg-(--scrim)", className)}
      onClick={close}
      {...props}
    />
  )
}

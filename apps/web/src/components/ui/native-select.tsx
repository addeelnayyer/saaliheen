// shadcn/ui's NativeSelect (#300, ADR 0067), as `shadcn add native-select`
// vendored it but for focus and selection: the site's own :focus-visible
// outline and ::selection (globals.css) mark it, so upstream's rings and
// selection colours are taken out; so are its dark: classes, the tokens
// switching for dark themselves. A native select, so its role, keyboard and
// options are the browser's. It is the site's field, as wide as its place:
// the page's text on the surface, with no shadow. With `arrow="browser"`
// (#306) it is the browser's select alone, its own arrow and no wrapper,
// sizing itself, its options the select's colours: the Surah bar's speed and
// the Share page's lists, as the site's selects have always been.
import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

function NativeSelect({
  className,
  size = "default",
  arrow = "chevron",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  arrow?: "chevron" | "browser"
}) {
  if (arrow === "browser") {
    return (
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "min-w-0 rounded-md border border-input bg-card px-3 py-2.5 text-[length:inherit] leading-[inherit] text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[size=sm]:h-8 data-[size=sm]:py-1 [&>option]:bg-[color:revert] [&>option]:text-[color:revert]",
          "aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    )
  }
  return (
    <div
      className="group/native-select relative has-[select:disabled]:opacity-50"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-auto w-full min-w-0 appearance-none rounded-md border border-input bg-card px-3 py-2.5 pr-9 text-[length:inherit] leading-[inherit] text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1",
          "aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }

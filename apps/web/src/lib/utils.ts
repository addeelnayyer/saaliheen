// shadcn/ui's class helper (#298, ADR 0067): joins class names and lets a
// later Tailwind class win over an earlier one it conflicts with.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

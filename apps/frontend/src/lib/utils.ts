import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Helper wymagany przez komponenty shadcn/ui (alias `utils` w components.json). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

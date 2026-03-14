import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS conflict resolution.
 * Combines clsx for conditional classes with tailwind-merge
 * to handle Tailwind utility class conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

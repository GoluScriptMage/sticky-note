import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const checker = (value: string, message: string) => {
  if (!value) {
    throw new Error(message);
  }
};
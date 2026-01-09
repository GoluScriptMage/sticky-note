import type { Action } from "@prisma/client/runtime/library";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type ActionResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: string;
    };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ensures that a value is neither null nor undefined.
export function ensure<T>(
  value: T | null | undefined,
  message: string = "Value is null or undefined"
): T {
  if (value === null || value === undefined || value === false) {
    throw new Error(message);
  }
  return value;
}

// Action Wrapper
export async function actionWrapper<T>(
  actionFn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await actionFn();
    return { data: result, error: null };
  } catch (err) {
    console.error("Something went wrong!", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Something went wrong!",
    };
  }
}

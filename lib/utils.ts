import { clsx, type ClassValue } from "clsx";
import { error } from "console";
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
  actionFn: () => Promise<ActionResponse<T>>
) {
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


// Cached user fetcher so for same req less db calls
export const getAuthUser = cache(async () => {
  const { userId } = await auth();
  ensure(userId!, "Unauthorised");

  let user = db.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  if (!user) {
    user = await syncUser();
  }
  return user;
});
// get any of user's data (auto-syncs user if not found)
export async function getUserData(userId: string, fields: Prisma.UserSelect) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    let user = await db.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: fields,
    });

    // Sync if user not found try the clerk if it exists or not
    if (!user) {
      console.log("User is not in DB, Syncing...");
      const syncedUser = await syncUser();
      if (syncedUser) {
        user = await db.user.findUnique({
          where: {
            clerkId: userId,
          },
          select: fields,
        });
      }
    }

    return user;
  });
}
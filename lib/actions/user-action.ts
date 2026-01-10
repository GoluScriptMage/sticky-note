"use server";

import { db } from "../db";
import type { Prisma } from "@prisma/client";
import { actionWrapper, ensure } from "../utils";
import { getAuthUser } from "./actions-utils";
import type { UserData } from "@/types";

// get any of user's data - (for auth user no id needed or else provide id)
export async function getUserData(fields: Prisma.UserSelect, userId?: string) {
  return actionWrapper(async () => {
    // Step 1. Get the auth user
    const user = await getAuthUser();

    // Step 2. Get the requested data
    const userData = await db.user.findUnique({
      where: {
        clerkId: userId || user?.id,
      },
      select: fields,
    });

    // Step 3. Return the data
    return ensure(userData, "User not found");
  });
}

// update any of user's data (auto-syncs user if not found)
export async function updateUserData(data: Prisma.UserUpdateInput) {
  return actionWrapper(async () => {
    // Step 1.
    const user = await getAuthUser();

    // Step 2. Update the data
    const updatedUser = await db.user.update({
      where: {
        clerkId: user?.id,
      },
      data,
    });

    // Step 3. Return the updated user
    return ensure(updatedUser, "User not found");
  });
}

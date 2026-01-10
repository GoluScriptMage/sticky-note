"use server";

import { cache } from "react";
import { db } from "../db";
import { clerkClient, auth } from "@clerk/nextjs/server";
import { ensure } from "../utils";

/**
 * Sync user from Clerk to database (fallback when webhook fails)
 * Creates a new user record in the database using Clerk data
 */
export async function syncUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorised");
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  console.log("🔄 Syncing user from Clerk to DB:", userId);

  const newUser = await db.user.create({
    data: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        clerkUser.username ||
        "User",
      username: clerkUser.username || null,
      imageUrl: clerkUser.imageUrl ?? null,
    },
  });
  
  console.log("✅ User synced to DB:", newUser.id);
  return newUser;
}

/**
 * Get the current authenticated user from database
 * Uses React cache() for request deduplication - same request = single DB call
 * Will auto-sync from Clerk if user doesn't exist in DB
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorised");
  }

  let dbUser = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  // Auto-sync if user not found (webhook might have failed)
  if (!dbUser) {
    dbUser = await syncUser();
  }

  return dbUser;
});

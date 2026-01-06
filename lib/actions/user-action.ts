"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { checker } from "../utils";
import { clear } from "node:console";
import { AwardIcon } from "lucide-react";
import { sync } from "framer-motion";

// Sync user from Clerk to database (fallback when webhook fails)
export async function syncUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  if (!clerkUser) return null;

  console.log("🔄 Syncing user from Clerk to DB:", userId);

  try {
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
  } catch (err) {
    console.error("❌ Error syncing user:", err);
    return null;
  }
}

// get any of user's data (auto-syncs user if not found)
export async function getUserData(userId: string, fields: Prisma.UserSelect) {
  try {
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
  } catch (err) {
    console.log("Something went wrong in Get User Data:", err);
  }
}

// update any of user's data (auto-syncs user if not found)
export async function updateUserData(data: Prisma.UserUpdateInput) {
  const { userId } = await auth();
  checker(userId!, "user not authenticated");

  // Ensure user exists in DB first
  const existingUser = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!existingUser) {
    console.log("⚠️ User not in DB for update, syncing first...");
    await syncUser();
  }

  try {
    const updatedUser = await db.user.update({
      where: {
        clerkId: userId,
      },
      data,
    });
    console.log("User data Updated Successfully.");
    return updatedUser;
  } catch (err) {
    console.log("Error! Can't update User Data:", err);
  }
}

// get user's notes
export async function getUserNotes() {
  const { userId } = await auth();

  checker(userId, "User not authenticated");

  // Find user in Your DATABASE
  const user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      notes: {
        createdAt: "desc",
      },
    },
  });

  return user;
}

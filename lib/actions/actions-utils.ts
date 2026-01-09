import { cache } from "react";
import { db } from "../db";
import { clerkClient, auth } from "@clerk/nextjs/server";
import { actionWrapper, ensure } from "../utils";

// Sync user from Clerk to database (fallback when webhook fails)
export async function syncUser() {
  const { userId } = await auth();
  ensure(userId!, "Unauthorised");

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId!);
  ensure(clerkUser, "Clerk user not found");

  console.log("🔄 Syncing user from Clerk to DB:", userId);

  const newUser = await db.user.create({
    data: {
      clerkId: userId!,
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

// Cached user fetcher so for same req less db calls
export const getAuthUser = cache(async () => {
  const { userId } = await auth();
  ensure(userId!, "Unauthorised");

  let user = await db.user.findUnique({
    where: {
      clerkId: userId!,
    },
  });

  if (!user) {
    user = await syncUser();
  }
  return user;
});

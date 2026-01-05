"use server";

import { auth } from "@clerk/nextjs/server";
import { syncUser } from "./user-action";
import { db } from "../db";

//Verify room before joining if it exists or not
export async function verifyRoom(roomId: string) {
  // Get the user id
  const { userId } = await auth();

  if (!userId) return null;

  try {
    const room = await db.room.findUnique({
      where: {
        id: roomId,
      },
    });
  } catch (err) {
    console.error("Error verifying room: ", err);
  }

  //
}

// create new room (auto-syncs user if not found)
export async function createRoom(roomName?: string) {
  const { userId: clerkUserId } = await auth();

  checker(clerkUserId, "User not authenticated");

  let user = await db.user.findUnique({ where: { clerkId: clerkUserId } });

  // Auto-sync user if not found
  if (!user) {
    console.log("⚠️ User not in DB for room creation, syncing first...");
    user = await syncUser();
  }

  checker(user?.id, "User not found in database");

  console.log("Creating room with name:", roomName);
  const name = roomName?.trim() || "New Room";

  try {
    const newRoom = await db.room.create({
      data: {
        roomName: name,
        owner: { connect: { id: user!.id } },
        users: {
          connect: {
            id: user!.id,
          },
        },
      },
    });
    return newRoom.id;
  } catch (err) {
    console.error("Can't create new room", err);
    throw err;
  }
}

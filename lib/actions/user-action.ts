"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { title } from "process";
import type { StickyNote } from "@/types/types";

const checker = (value: string, message: string) => {
  if (!value) {
    throw new Error(message);
  }
};

export async function getCurrentUser() {
  const { userId } = await auth();

  checker(userId, "User not authenticated");

  const user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  return user;
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

// create a new note
export async function createNote(data: Partial<StickyNote>, roomId: string) {
  if (!author || !content || !title) {
    throw new Error("Missing required Fields");
  }

  const { userId } = await auth();

  checker(userId, "User not authenticated");

  const user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
  });

  checker(user?.id, "User not found in DataBase");

  const newNote = await db.note.create({
    data: {
      ...data,
      roomId,
      userId: user.id,
    },
  });
  return newNote;
}

// create new room
export async function createRoom(roomName?: string) {
  const { userId: clerkUserId } = await auth();

  checker(clerkUserId, "User not authenticated");

  const user = await db.user.findUnique({ where: { clerkId: clerkUserId } });
  checker(user?.id, "User not found in database");

  const name = roomName?.trim() || "New Room";

  const newRoom = await db.room.create({
    data: {
      name,
      users: {
        connect: {
          id: user!.id,
        },
      },
    },
  });
  return newRoom;
}

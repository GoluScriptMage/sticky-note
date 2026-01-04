"use server";

import type { StickyNote } from "@/types/types";
import { auth } from "@clerk/nextjs/server";
import { db } from "../db";
import { checker } from "../utils";

// create a new note
export async function createNote(data: Partial<StickyNote>, roomId: string) {
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
      createdBy: user.username,
    },
  });
  return newNote;
}

export async function updateNote(noteId: string, data: Partial<StickyNote>) {
  const { userId } = await auth();
  console.log("Hello ji");

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const newNote = await db.note.updateMany({
    where: {
      id: noteId,
      userId: userId,
    },
    data: {
      ...data,
    },
  });
  return newNote;
}

export async function deleteNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("user not authenticated");
  }

  await db.note.delete({
    where: {
      id: noteId,
      userId: userId,
    },
  });
}

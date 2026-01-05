"use server";

import type { StickyNote } from "@/types/types";
import { auth } from "@clerk/nextjs/server";
import { db } from "../db";
import { checker } from "../utils";

type NoteData = Pick<StickyNote, "id" | "content" | "noteName">;

// create a new note
export async function createNote(data: Partial<StickyNote>, roomId: string) {
  try {
    const { userId } = await auth();

    checker(userId, "User not authenticated");

    const user = await db.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    console.log(user);

    checker(user?.id, "User not found in DataBase");

    const newNote = await db.note.create({
      data: {
        id: data.id,
        ...data,
        roomId,
        userId: user.id,
        createdBy: user.username,
      },
    });
    return newNote;
  } catch (error) {
    console.log("Error from CreateNote", error);
  }
}

export async function updateNote(data: NoteData) {
  const { userId } = await auth();
  console.log("Updating note:", data.id);

  if (!userId) {
    throw new Error("User not authenticated");
  }

  try {
    const updatedNote = await db.note.update({
      where: {
        id: data.id,
      },
      data: {
        content: data.content,
        noteName: data.noteName,
      },
    });
    console.log("✅ Note updated successfully:", updatedNote.id);
    return updatedNote;
  } catch (error) {
    console.error("❌ Error from UpdateNote:", error);
    throw error;
  }
}

export async function deleteNote(noteId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("user not authenticated");
  }
  console.log("Deleting note with ID:", noteId);
  try {
    await db.note.delete({
      where: {
        id: noteId,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting note:", error);
    throw error;
  }
}

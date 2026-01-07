"use server";

import type { StickyNote } from "@/types/types";
import { db } from "../db";
import { actionWrapper, ensure, getAuthUser } from "../utils";

type NoteData = Pick<StickyNote, "id" | "content" | "noteName">;

// create a new note
export async function createNote(data: Partial<StickyNote>, roomId: string) {
  return actionWrapper(async () => {
    // Step 1
    const user = await getAuthUser();

    // Step 2. Create the note
    const newNote = await db.note.create({
      data: {
        id: data.id,
        ...data,
        roomId,
        userId: user.id,
        createdBy: user.username,
      },
    });
    return ensure(newNote, "Create note failed!");
  });
}

// update an existing note for - (only the owner)
export async function updateNote(data: NoteData) {
  return actionWrapper(async () => {
    // step 1. Check for user auth
    const user = await getAuthUser();

    // Step 2. update the note
    const updatedNote = await db.note.update({
      where: {
        id: data.id,
        userId: user.id,
      },
      data: {
        content: data.content,
        noteName: data.noteName,
      },
    });

    // step 3. Return the updated note
    return ensure(updatedNote, "Update note failed!");
  });
}

// Delete note for - (only the owner)
export async function deleteNote(noteId: string) {
  return actionWrapper(async () => {
    // Step 1. Check for user auth
    const user = await getAuthUser();

    // Step 2. Delete the note
    const deleteNote = await db.note.delete({
      where: {
        id: noteId,
        userId: user.id,
      },
    });
    return ensure(deleteNote, "Delete note failed!");
  });
}

// get user's notes -  for many notes use getUserData
export async function getUserNote(noteId?: string) {
  return actionWrapper(async () => {
    // Step 1. Get authenticated user
     await getAuthUser();

    // Step 2. Find user with notes from DATABASE
    const userWithNotes = await db.note.findUnique({
      where: {
        id: noteId, // Get notes for specific user or auth user
      },
      include: {
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Step 3. Return notes
    return ensure(userWithNotes?.notes || [], "No notes found for user");
  });
}

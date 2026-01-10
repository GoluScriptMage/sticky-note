"use server";

import type { StickyNote } from "@/types";
import { db } from "../db";
import { actionWrapper, ensure } from "../utils";
import { getCurrentUser } from "./auth";

type NoteData = Pick<StickyNote, "id" | "content" | "noteName">;

// create a new note
export async function createNote(data: Partial<StickyNote>, roomId: string) {
  return actionWrapper(async () => {
    const user = await getCurrentUser();

    const newNote = await db.note.create({
      data: {
        id: data.id,
        noteName: data.noteName ?? "Untitled",
        content: data.content ?? "",
        x: data.x ?? 0,
        y: data.y ?? 0,
        roomId,
        userId: user.id,
        createdBy: user.username ?? "Anonymous",
      },
    });
    return ensure(newNote, "Create note failed!");
  });
}

// update an existing note for - (only the owner)
export async function updateNote(data: NoteData) {
  return actionWrapper(async () => {
    const user = await getCurrentUser();

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

    return ensure(updatedNote, "Update note failed!");
  });
}

// Update note position after drag (x, y coordinates)
export async function updateNotePosition(noteId: string, x: number, y: number) {
  return actionWrapper(async () => {
    const user = await getCurrentUser();

    const updatedNote = await db.note.update({
      where: {
        id: noteId,
        userId: user.id,
      },
      data: {
        x,
        y,
      },
    });

    return ensure(updatedNote, "Update note position failed!");
  });
}

// Delete note for - (only the owner)
export async function deleteNote(noteId: string) {
  return actionWrapper(async () => {
    const user = await getCurrentUser();

    const deletedNote = await db.note.delete({
      where: {
        id: noteId,
        userId: user.id,
      },
    });
    return ensure(deletedNote, "Delete note failed!");
  });
}

// get user's notes -  for many notes use getUserData
export async function getUserNote(noteId?: string) {
  return actionWrapper(async () => {
    await getCurrentUser();

    const note = await db.note.findUnique({
      where: {
        id: noteId,
      },
    });

    return ensure(note, "Note not found");
  });
}

// Get all notes for a room
export async function getRoomNotes(roomId: string) {
  return actionWrapper(async () => {
    await getCurrentUser();

    const notes = await db.note.findMany({
      where: {
        roomId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return notes;
  });
}

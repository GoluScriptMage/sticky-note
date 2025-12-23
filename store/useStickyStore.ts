import { dummyNotes } from "@/constants/dummyData";
import type { NoteCoordinates, StickyNote, UserData } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StickyStore {
  notes: StickyNote[];
  userData: UserData | null;
  coordinates: NoteCoordinates | null;
  showForm: boolean;
  selectNoteId: string | null;
  editNote: Partial<StickyNote> | null;

  handleNoteDelete: (noteId: string) => void;
  handleNoteEdit: (noteId: string) => void;
  setStore: (updates: Partial<StickyStore>) => void;
  addNote: (newNote: StickyNote) => void;
  updateUserData: (userName: string) => void;
  updateExistingNote: (updateNote: Partial<StickyNote>) => void;
}

// pass the persist middleware into create(...) and initialize all fields/handlers
export const useStickyStore = create<StickyStore>()(
  persist(
    (set, get) => ({
      notes: [],
      userData: null,
      coordinates: null,
      showForm: false,
      selectNoteId: null,
      editNote: null,

      // For any Logic to update state
      setStore: (updates) => {
        set((state) => ({
          ...state,
          ...updates,
        }));
      },

      //update user data
      updateUserData: (userName) => {
        const userId = crypto.randomUUID().split("-")[0];
        const roomId = crypto.randomUUID().split("-")[1];
        set(() => ({
          userData: {
            userId: userId,
            userName: userName,
            roomId: roomId,
          },
        }));
      },

      // Update notes array
      addNote: (newNote) => {
        set((state) => ({
          notes: [...state.notes, newNote],
        }));
      },

      // update existing note
      updateExistingNote: (updateNote) => {
        set((state) => ({
          notes: state.notes.map((n) => {
            return n.id === updateNote.id ? { ...n, ...updateNote } : n;
          }),
        }));
      },

      // If note delete is triggered
      handleNoteDelete: (noteId) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== noteId),
        }));
      },

      // If note edit is triggered
      handleNoteEdit: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (note) {
          set(() => ({
            coordinates: { x: note.x, y: note.y },
            showForm: true,
            editNote: note,
          }));
        }
      },
    }),
    {
      name: "sticky-store",
    }
  )
);

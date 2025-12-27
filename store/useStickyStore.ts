import { dummyNotes } from "@/constants/dummyData";
import type {
  NoteCoordinates,
  OtherUserCursor,
  OtherUsers,
  StickyNote,
  UserData,
} from "@/types/types";
import { notStrictEqual } from "assert";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StickyStore {
  notes: StickyNote[];
  userData: UserData | null;
  coordinates: NoteCoordinates | null;
  showForm: boolean;
  selectNoteId: string | null;
  editNote: Partial<StickyNote> | null;
  otherUsers: OtherUsers;
  offSet: NoteCoordinates | null;
  isDummyNotesAdded: boolean;

  handleNoteDelete: (noteId: string) => void;
  handleNoteEdit: (noteId: string) => void;
  setStore: (updates: Partial<StickyStore>) => void;
  addNote: (newNote: StickyNote) => void;
  addDummyNotes: () => void;
  updateUserData: (userName: string) => void;
  updateExistingNote: (updateNote: Partial<StickyNote>) => void;
  updateOtherUsers: (userId: string, data: OtherUserCursor) => void;
  deleteOtherUsers: (userId: string) => void;
  updateNote: (id: string, data: Partial<StickyNote>) => void;
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
      otherUsers: {},
      offSet: null,
      isDummyNotesAdded: false,

      // For any Logic to update state
      setStore: (updates) => {
        set((state) => ({
          ...state,
          ...updates,
        }));
      },

      updateNote: (id, data) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...data } : note
          ),
        }));
      },

      // add dummy notes - only adds if notes array is empty
      addDummyNotes: () => {
        const currentNotes = get().notes;
        if (currentNotes.length === 0) {
          set({ notes: dummyNotes, isDummyNotesAdded: true });
        }
      },

      //update user data
      updateUserData: (userName) => {
        const userId = crypto.randomUUID().split("-")[0];
        const roomId = "bf64";
        set(() => ({
          userData: {
            userId: userId,
            userName: userName,
            roomId: roomId,
          },
        }));
      },

      //update other users postions and data
      updateOtherUsers: (userId, data) => {
        // Find the current users and create a new otherUsers object with the updated entry
        set((state) => {
          const newOtherUsers = {
            ...state.otherUsers,
            [userId]: { ...(state.otherUsers[userId] || {}), ...data },
          };
          return { otherUsers: newOtherUsers };
        });
      },

      deleteOtherUsers: (userId): Partial<StickyStore> => {
        // Find current user delte it
        const newData: OtherUsers = { ...get().otherUsers };

        delete newData[userId];

        set(() => ({
          otherUsers: { ...newData },
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

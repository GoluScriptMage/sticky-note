import { dummyNotes } from "@/constants/dummyData";
import type {
  Position,
  StickyNote,
  UserData,
  RemoteCursors,
  RemoteCursor,
  StickyStore,
  StickyStoreState,
} from "@/types/index";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      // offSet: null,
      isDummyNotesAdded: false,

      // For any Logic to update state
      setStore: (updates: Partial<StickyStoreState>) => {
        set(updates);
      },

      updateNote: (id: string, data: Partial<StickyNote>) => {
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
      updateUserData: (userName: string, roomId: string) => {
        set(() => ({
          userData: {
            userName,
            roomId,
            cursorColor: "#000000", // Default color, customize as needed
          },
        }));
      },

      //update other users postions and data
      updateOtherUsers: (userId: string, data: RemoteCursor) => {
        // Find the current users and create a new otherUsers object with the updated entry
        console.log("UserName from the Socket ", data.userName);
        set((state) => {
          const newOtherUsers = {
            ...state.otherUsers,
            [userId]: { ...(state.otherUsers[userId] || {}), ...data },
          };
          return { otherUsers: newOtherUsers };
        });
      },

      deleteOtherUsers: (userId: string) => {
        // Find current user delte it
        const newData: RemoteCursors = { ...get().otherUsers };

        delete newData[userId];

        set(() => ({
          otherUsers: { ...newData },
        }));
      },

      // Update notes array
      addNote: (newNote: StickyNote) => {
        set((state) => ({
          notes: [...state.notes, newNote],
        }));
      },

      // update existing note
      updateExistingNote: (updateNote: Partial<StickyNote>) => {
        set((state) => ({
          notes: state.notes.map((n) => {
            return n.id === updateNote.id ? { ...n, ...updateNote } : n;
          }),
        }));
      },

      // If note delete is triggered
      deleteNote: (noteId: string) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== noteId),
        }));
      },

      // If note edit is triggered
      handleNoteEdit: (noteId: string) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (note) {
          set(() => ({
            coordinates: { x: note.x, y: note.y },
            showForm: true,
            editNote: note,
          }));
        }
      },

      // Alias for type compatibility
      updateOtherUser: (userId: string, data: RemoteCursor) => {
        set((state) => {
          const newOtherUsers = {
            ...state.otherUsers,
            [userId]: { ...(state.otherUsers[userId] || {}), ...data },
          };
          return { otherUsers: newOtherUsers };
        });
      },

      // Alias for type compatibility
      removeOtherUser: (userId: string) => {
        const newData: RemoteCursors = { ...get().otherUsers };
        delete newData[userId];
        set(() => ({
          otherUsers: { ...newData },
        }));
      },
    }),
    {
      name: "sticky-store",
    }
  )
);

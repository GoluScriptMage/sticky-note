import { dummyNotes } from "@/constants/dummyData";
import type {
  Position,
  StickyNote,
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
      // State
      notes: [],
      userData: null,
      formPosition: null,
      isFormOpen: false,
      selectedNoteId: null,
      editingNote: null,
      remoteCursors: {},
      isDummyNotesAdded: false,

      // Generic state update
      setState: (updates: Partial<StickyStoreState>) => {
        set(updates);
      },

      // Note Actions
      addNote: (newNote: StickyNote) => {
        set((state) => ({
          notes: [...state.notes, newNote],
        }));
      },

      updateNote: (id: string, data: Partial<StickyNote>) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...data } : note
          ),
        }));
      },

      deleteNote: (noteId: string) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== noteId),
        }));
      },

      // Form Actions
      openNoteForm: (position: Position, note?: StickyNote) => {
        set({
          formPosition: position,
          isFormOpen: true,
          editingNote: note ?? null,
        });
      },

      closeNoteForm: () => {
        set({
          isFormOpen: false,
          formPosition: null,
          editingNote: null,
        });
      },

      selectNote: (noteId: string | null) => {
        set({ selectedNoteId: noteId });
      },

      startEditingNote: (noteId: string) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (note) {
          set({
            formPosition: { x: note.x, y: note.y },
            isFormOpen: true,
            editingNote: note,
          });
        }
      },

      // User Actions
      setUserData: (userName: string, roomId: string) => {
        // Generate a bright, visible cursor color
        const colors = [
          "#FF4136", // Red
          "#FF851B", // Orange
          "#FFDC00", // Yellow
          "#2ECC40", // Green
          "#00D9FF", // Cyan
          "#0074D9", // Blue
          "#B10DC9", // Purple
          "#F012BE", // Magenta
          "#01FF70", // Lime
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        set({
          userData: {
            userName,
            roomId,
            cursorColor: randomColor,
          },
        });
      },

      updateRemoteCursor: (userId: string, data: Partial<RemoteCursor>) => {
        set((state) => {
          const existingCursor = state.remoteCursors[userId] || {
            x: 0,
            y: 0,
            userName: "",
            cursorColor: "#000000",
          };
          return {
            remoteCursors: {
              ...state.remoteCursors,
              [userId]: { ...existingCursor, ...data },
            },
          };
        });
      },

      removeRemoteCursor: (userId: string) => {
        set((state) => {
          const { [userId]: _, ...rest } = state.remoteCursors;
          return { remoteCursors: rest };
        });
      },

      // Dev Test
      addDummyNotes: () => {
        const currentNotes = get().notes;
        if (currentNotes.length === 0) {
          set({ notes: dummyNotes, isDummyNotesAdded: true });
        }
      },
    }),
    {
      name: "sticky-store",
      partialize: (state) => ({
        notes: state.notes,
        isDummyNotesAdded: state.isDummyNotesAdded,
        userData: state.userData, // Persist user data including userName
      }),
    }
  )
);

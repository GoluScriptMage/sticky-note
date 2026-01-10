/**
 * The complete Shape for the Sticky Store Actions + State
 * Used in Store and components
 */

import type { Position, StickyNote } from "./note.types";
import type { RemoteCursor, RemoteCursors, UserData } from "./user.types";

// For State managements
export interface StickyStoreState {
  notes: StickyNote[];
  // User Data
  userData: UserData | null;
  remoteCursors: RemoteCursors;

  // UI State
  isFormOpen: boolean;
  selectedNoteId: string | null;
  formPosition: Position | null;
  editingNote: Partial<StickyNote> | null;

  // Internal State
  isDummyNotesAdded: boolean;
}

// Store Actions
export interface StickyStoreActions {
  // Generic Update Store
  setState: (updates: Partial<StickyStoreState>) => void;

  // Note Actions
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, data: Partial<StickyNote>) => void;
  deleteNote: (noteId: string) => void;

  // Form Actions
  openNoteForm: (position: Position, note?: StickyNote) => void;
  closeNoteForm: () => void;
  selectNote: (noteId: string | null) => void;
  startEditingNote: (noteId: string) => void;

  // User Actions
  setUserData: (userName: string, roomId: string) => void;
  updateRemoteCursor: (userId: string, data: Partial<RemoteCursor>) => void;
  removeRemoteCursor: (userId: string) => void;

  // Dev Test
  addDummyNotes: () => void;
}

/**
 * Complete Store type (state + actions)
 *
 */

export type StickyStore = StickyStoreActions & StickyStoreState;

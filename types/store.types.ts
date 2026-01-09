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
  otherUsers: RemoteCursors;

  // UI State
  showForm: boolean;
  selectNoteId: string | null;
  coordinates: Position | null;
  editNote: Partial<StickyNote> | null;

  // Internal State
  isDummyNotesAdded: boolean;
}

// Store Actions
export interface StickyStoreActions {
  // Genric Update Store
  setStore: (updates: Partial<StickyStoreState>) => void;

  // Note Actions
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, data: Partial<StickyNote>) => void;
  deleteNote: (noteId: string) => void;
  handleNoteEdit: (noteId: string) => void;

  // User Actions
  updateUserData: (userName: string, roomId: string) => void;
  updateOtherUser: (userId: string, data: RemoteCursor) => void;
  removeOtherUser: (userId: string) => void;

  // Dev Test
  addDummyNotes: () => void;
}

/**
 * Complete Store type (state + actions)
 *
 */

export type StickyStore = StickyStoreActions & StickyStoreState;

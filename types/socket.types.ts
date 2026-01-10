/**
 * Socekt Events for the Sync and other things
 * Used in: Socket.io server and room client
 */

import type { Socket } from "socket.io-client";
import type { Position, StickyNote } from "@/types/index";

// user payload for data
export interface UserPayload {
  userId: string;
  userName: string;
  roomId: string;
  cursorColor: string;
}
export interface NoteMovedPayload extends Position {
  noteId: string;
}

// Cursor Position payload
export interface CursorPayload extends Position {
  noteId: string;
  userId: string;
  timeStamp: number;
}

export type UserJoinedPayload = {
  userId: string;
  userName: string;
  cursorColor: string;
  x: number;
  y: number;
};

export type UserLeftPayload = Omit<UserPayload, "cursorColor">;

// Note confirmation payload for optimistic updates
export interface NoteConfirmedPayload {
  tempId: string;
  realId: string;
}

// Note rollback payload for failed operations
export interface NoteRollbackPayload {
  tempId: string;
  error?: string;
}

// Server to Client Events
export interface ServerToClientEvents {
  user_joined: (data: UserJoinedPayload) => void; // When a new user joins
  user_left: (data: UserLeftPayload) => void; // When a user leaves
  room_data: (data: Partial<UserPayload>) => void; // Current room data
  mouse_update: (data: CursorPayload) => void; // Mouse position updates

  // Notes Crud Events
  note_created: (data: StickyNote) => void;
  note_update: (data: Partial<StickyNote>) => void;
  note_deleted: (noteId: string) => void;
  note_moved: (data: NoteMovedPayload) => void;
  note_confirmed: (data: NoteConfirmedPayload) => void;
  note_rollback: (data: NoteRollbackPayload) => void; // Rollback note if conflict happens with db and couldn't saved
}

// Client to server Events
export interface ClientToServerEvents {
  join_room: (data: UserPayload) => void; // Join a room
  leave_room: (data: UserPayload) => void; // Leave a room
  get_room_data: (data: Partial<UserPayload>) => void; // Get current room data
  mouse_move: (data: CursorPayload) => void; // Mouse position updates

  note_create: (note: StickyNote) => void;
  note_update: (note: StickyNote) => void;
  note_delete: (noteId: string, roomId: string) => void;
  note_move: (data: NoteMovedPayload) => void;
  note_confirm: (data: NoteConfirmedPayload) => void;
  note_rollback: (data: NoteRollbackPayload) => void; // rollback
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

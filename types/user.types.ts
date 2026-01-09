// Types for the user related action

import type { Position } from "./note.types";

/**
 * Core user data actions types structure
 * Used in: Store, Components
 */

// Data for the user
export interface UserData {
  userName: string; // Display name for cursors
  roomId: string; // Current room Id
  cursorColor: string; // Color assigned to user cursor in other users screen
}

// Other user cursor data structure + position for the cursors
export interface RemoteCursor extends Position {
  userName: string;
  cursorColor: string; // Hex color code for the cursor
}

// Map of RemoteUserCursor with userId
// user id as the key and RemoteUserCursor as value
export type RemoteCursors = Record<string, RemoteCursor>;

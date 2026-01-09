/**
 * Socekt Events for the Sync and other things
 * Used in: Socket.io server and room client
 */

import type { Socket } from "socket.io-client";

// user payload for data
export interface UserPayload {
  userId: string;
  userName: string;
  roomId: string;
}

// Cursor Position payload
export interface CursorPayload extends UserPayload {
  userId: string;
}

// Server to Client Events
export interface ServerToClientEvents {
  // User Joined Room
  user_joined: (data: UserPayload) => void;

  // User Left Room
  user_left: (data: UserPayload) => void;

  // send the current room data
  room_data: (data: Partial<UserPayload>) => void;

  // Tell others about mouse movements
  mouse_update: (data: CursorPayload) => void;
}

// Client to server Events
export interface ClientToServerEvents {
  // Join Room
  join_room: (data: UserPayload) => void;

  // Leave Room
  leave_room: (data: UserPayload) => void;

  // get the current room Data
  get_room_data: (data: Partial<UserPayload>) => void;

  // Send mouse updated postions
  mouse_move: (data: CursorPayload) => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

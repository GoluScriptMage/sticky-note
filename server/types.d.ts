/**
 * Socket.IO Types for Server
 * Matches the client types in ../types/socket.types.ts
 */
import type { Socket } from "socket.io";
export interface Position {
    x: number;
    y: number;
}
export interface UserPayload {
    userId: string;
    userName: string;
    roomId: string;
    cursorColor: string;
}
export interface CursorPayload extends Position {
    noteId: string;
    userId: string;
    timeStamp: number;
}
export interface UserJoinedPayload {
    userId: string;
    userName: string;
    cursorColor: string;
    x: number;
    y: number;
}
export interface UserLeftPayload {
    userId: string;
    userName: string;
    roomId: string;
}
export interface NoteMovedPayload extends Position {
    noteId: string;
}
export interface StickyNote {
    id: string;
    noteName: string;
    createdBy: string | null;
    content: string;
    x: number;
    y: number;
    color?: string;
    zIndex?: number;
}
export interface ServerToClientEvents {
    user_joined: (data: UserJoinedPayload) => void;
    user_left: (data: UserLeftPayload) => void;
    room_data: (data: Partial<UserPayload>) => void;
    mouse_update: (data: {
        userId: string;
        x: number;
        y: number;
    }) => void;
    note_created: (data: StickyNote) => void;
    note_update: (data: Partial<StickyNote>) => void;
    note_deleted: (noteId: string) => void;
    note_moved: (data: NoteMovedPayload) => void;
    note_confirmed: (noteId: string) => void;
    note_rollback: (noteId: string) => void;
}
export interface ClientToServerEvents {
    join_room: (data: UserPayload) => void;
    leave_room: (data: UserPayload) => void;
    get_room_data: (data: Partial<UserPayload>) => void;
    mouse_move: (data: CursorPayload) => void;
    note_create: (note: StickyNote) => void;
    note_update: (note: StickyNote) => void;
    note_delete: (noteId: string, roomId: string) => void;
    note_move: (data: NoteMovedPayload) => void;
    note_confirm: (noteId: string) => void;
    note_rollback: (tempId: string) => void;
}
export interface SocketData {
    userId: string;
    userName: string;
    roomId: string;
    cursorColor: string;
}
export type TypedServerSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
//# sourceMappingURL=types.d.ts.map
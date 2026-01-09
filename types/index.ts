/**
 * Single file containing all types used in application
 * Used everywhere
 */

export type {
  StickyNote,
  UpdateNoteData,
  Position,
  NoteColorTheme,
} from "./note.types";

export type { UserData, RemoteCursor, RemoteCursors } from "./user.types";

export type {
  UserPayload,
  CursorPayload,
  ClientToServerEvents,
  ServerToClientEvents,
  TypedSocket,
  UserJoinedPayload,
  UserLeftPayload
} from "./socket.types";

export type {
  StickyStoreState,
  StickyStoreActions,
  StickyStore,
} from "./store.types";

// **  Interfaces **

// For User Data in localStorage
export interface UserData {
  userName: string;
  roomId: string;
}

// Sticky Note Properties
export interface StickyNote {
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
  color?: string;
  z?: number;
}

export interface OtherUserCursor {
  userName?: string;
  x?: number;
  y?: number;
  color?: string;
}

// For other Users
export type OtherUsers = Record<string, OtherUserCursor>;

// For Coordinates
export type NoteCoordinates = Pick<StickyPageProps, "x" | "y">;

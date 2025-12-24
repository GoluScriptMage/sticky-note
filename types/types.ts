// **  Interfaces **

// For User Data in localStorage
export interface UserData {
  userName: string;
  userId: string;
  roomId: string;
}

// Sticky Note Properties
export interface StickyNote {
  id: string;
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
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

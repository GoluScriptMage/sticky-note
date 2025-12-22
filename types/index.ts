// **  Interfaces **

// For User Data in localStorage
export interface UserData {
  sync_userName: string;
  sync_userId: string;
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

// For Coordinates
export type NoteCoordinates = Pick<StickyPageProps, "x" | "y">;

/**
 *  Core sticky note data strucutre
 * User in: DataBase, Store, Components
 */

export interface StickyNote {
  id: string;
  noteName: string; // title
  content: string; // body
  createdBy?: string; // User who created the note
  x: number;
  y: number;
  zIndex?: number; // Optional zIndex for layering
  color?: string; // Optional to sotre color for note css
}

// To update any note data except id
export type UpdateNoteData = Partial<StickyNote> & {
  id: string;
};

// Position interface for x and y coordinates
export interface Position {
  x: number;
  y: number;
}

// Note color theming structure to use them again on update time
export interface NoteColorTheme {
  bg: string;
  border: string;
  header: string;
  accent: string;
  text: string;
  shadow: string;
}

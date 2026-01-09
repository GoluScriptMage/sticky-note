# 02 - Types Unification

## 🎯 Goal

Create a clean, consistent type system that's easy to understand and maintain.

**Why?** Good types = fewer bugs, better autocomplete, easier refactoring.

---

## Current Problems

### Problem 1: Types Scattered Across Files

```
types/types.ts        → General types
types/socketTypes.ts  → Socket types
store/useStickyStore.ts → Store types
app/room/[id]/room-types.ts → Room types
app/room/[id]/sticky-note.tsx → Props defined inline
```

**Why this is bad:**

- Hard to find where a type is defined
- Types might get duplicated
- No single source of truth

### Problem 2: Inconsistent Naming

```typescript
StickyNote; // PascalCase ✓
NoteCoordinates; // PascalCase ✓
OtherUserCursor; // PascalCase ✓
DataPayload; // Generic name 😕
StickyStore; // Store vs State confusion
```

### Problem 3: Missing/Wrong Types

```typescript
// Missing id in StickyNote
// content: string | number (why number?)
// createdBy: string | null (inconsistent with usage)
```

---

## The Solution: Organized Type Structure

### New Structure:

```
types/
├── index.ts          # Re-exports everything
├── note.types.ts     # Note-related types
├── user.types.ts     # User-related types
├── room.types.ts     # Room-related types
├── socket.types.ts   # Socket event types
└── store.types.ts    # Zustand store types
```

---

## Step 1: Create `types/note.types.ts`

### Why This File?

Groups all note-related types in one place.

### Create the file:

```typescript
// types/note.types.ts

/**
 * Core sticky note data structure
 * Used in: database, store, components
 */
export interface StickyNote {
  /** Unique identifier (format: uuid_roomPrefix) */
  id: string;

  /** Display title of the note */
  noteName: string;

  /** Username of creator, null for anonymous */
  createdBy: string | null;

  /** Note content/body text */
  content: string;

  /** X position in world coordinates (pixels) */
  x: number;

  /** Y position in world coordinates (pixels) */
  y: number;

  /** Optional color theme key */
  color?: string;

  /** Z-index for stacking order */
  zIndex?: number;
}

/**
 * Data needed to create a new note
 * Omits id (auto-generated) and timestamps
 */
export type CreateNoteData = Omit<StickyNote, "id">;

/**
 * Data for updating an existing note
 * All fields optional except id
 */
export type UpdateNoteData = Partial<StickyNote> & { id: string };

/**
 * 2D position coordinates
 * Used for: note positions, cursor positions, click positions
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Note color theme configuration
 */
export interface NoteColorTheme {
  bg: string;
  border: string;
  header: string;
  accent: string;
  text: string;
  shadow: string;
}
```

### What Changed and Why:

| Before                      | After                              | Why                    |
| --------------------------- | ---------------------------------- | ---------------------- |
| `content: string \| number` | `content: string`                  | Content is always text |
| `z?: number`                | `zIndex?: number`                  | Clearer name           |
| No JSDoc comments           | Full documentation                 | Self-documenting code  |
| No utility types            | `CreateNoteData`, `UpdateNoteData` | DRY principle          |
| `NoteCoordinates`           | `Position`                         | More generic, reusable |

---

## Step 2: Create `types/user.types.ts`

### Why This File?

Groups all user-related types.

```typescript
// types/user.types.ts

import type { Position } from "./note.types";

/**
 * Local user data stored in browser
 */
export interface UserData {
  /** Display name for cursor labels */
  userName: string;

  /** Current room the user is in */
  roomId: string;
}

/**
 * Cursor data for other users in the room
 */
export interface RemoteCursor extends Position {
  /** Display name shown on cursor */
  userName: string;

  /** Cursor color (hex) */
  color: string;
}

/**
 * Map of user IDs to their cursor data
 * Used in: store, Cursor component
 */
export type RemoteCursors = Record<string, RemoteCursor>;
```

### What Changed:

| Before            | After              | Why                          |
| ----------------- | ------------------ | ---------------------------- |
| `OtherUserCursor` | `RemoteCursor`     | Clearer what "other" means   |
| Optional fields   | Required fields    | Cursors always have all data |
| Separate x, y     | `extends Position` | Reuse Position type          |

---

## Step 3: Create `types/socket.types.ts`

### Why This File?

Socket event types are complex. Having them separate makes them easy to find.

```typescript
// types/socket.types.ts

import type { Position } from "./note.types";

// ============================================================================
// PAYLOAD TYPES
// ============================================================================

/**
 * User identification payload
 * Sent when joining/leaving rooms
 */
export interface UserPayload {
  userId: string;
  roomId: string;
  userName: string;
}

/**
 * Cursor position update payload
 */
export interface CursorPayload extends Position {
  userId: string;
}

// ============================================================================
// SOCKET EVENT MAPS
// ============================================================================

/**
 * Events the SERVER sends TO the client
 *
 * Usage in socket.io:
 * socket.on('user_joined', (data: UserPayload) => {...})
 */
export interface ServerToClientEvents {
  /** Another user joined the room */
  user_joined: (data: UserPayload) => void;

  /** A user left the room */
  user_left: (data: UserPayload) => void;

  /** Receive room state on join */
  room_data: (data: Partial<UserPayload>) => void;

  /** Another user's cursor moved */
  mouse_update: (data: CursorPayload) => void;
}

/**
 * Events the CLIENT sends TO the server
 *
 * Usage in socket.io:
 * socket.emit('join_room', data)
 */
export interface ClientToServerEvents {
  /** Request to join a room */
  join_room: (data: UserPayload) => void;

  /** Notify leaving a room */
  leave_room: (data: UserPayload) => void;

  /** Request current room state */
  get_room_data: (data: Partial<UserPayload>) => void;

  /** Send cursor position update */
  mouse_move: (data: Position) => void;
}

/**
 * Type for the typed socket instance
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
```

### What Changed:

| Before                       | After               | Why                        |
| ---------------------------- | ------------------- | -------------------------- |
| `DataPayload`                | `UserPayload`       | Describes what it contains |
| `NoteCoordinates & {userId}` | `CursorPayload`     | Named type is clearer      |
| No TypedSocket               | `TypedSocket` alias | Easy to type socket refs   |

---

## Step 4: Create `types/store.types.ts`

### Why This File?

Store types are separate because they're used differently than data types.

```typescript
// types/store.types.ts

import type { StickyNote, UpdateNoteData, Position } from "./note.types";
import type { UserData, RemoteCursors } from "./user.types";

// ============================================================================
// STORE STATE
// ============================================================================

/**
 * The complete state shape of the sticky store
 */
export interface StickyStoreState {
  // === Note Data ===
  notes: StickyNote[];

  // === User Data ===
  userData: UserData | null;
  otherUsers: RemoteCursors;

  // === UI State ===
  showForm: boolean;
  selectNoteId: string | null;
  editNote: Partial<StickyNote> | null;
  coordinates: Position | null;

  // === Internal Flags ===
  isDummyNotesAdded: boolean;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

/**
 * Actions available on the store
 */
export interface StickyStoreActions {
  // === Generic Update ===
  setStore: (updates: Partial<StickyStoreState>) => void;

  // === Note Actions ===
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, data: Partial<StickyNote>) => void;
  deleteNote: (noteId: string) => void;
  editNote: (noteId: string) => void;

  // === User Actions ===
  updateUserData: (userName: string, roomId: string) => void;
  updateOtherUser: (
    userId: string,
    data: Partial<RemoteCursors[string]>
  ) => void;
  removeOtherUser: (userId: string) => void;

  // === Dev/Test Actions ===
  addDummyNotes: () => void;
}

/**
 * Complete store type (state + actions)
 */
export type StickyStore = StickyStoreState & StickyStoreActions;
```

### Key Changes:

1. **Separated State from Actions** - Clearer what's data vs functions
2. **Renamed confusing methods:**
   - `handleNoteDelete` → `deleteNote` (clearer)
   - `handleNoteEdit` → `editNote` (clearer)
   - `updateExistingNote` → merged into `updateNote` (DRY)
   - `deleteOtherUsers` → `removeOtherUser` (singular, clearer verb)
   - `updateOtherUsers` → `updateOtherUser` (singular)

---

## Step 5: Create `types/index.ts`

### Why This File?

Central export so you can import from one place.

```typescript
// types/index.ts

// Note types
export type {
  StickyNote,
  CreateNoteData,
  UpdateNoteData,
  Position,
  NoteColorTheme,
} from "./note.types";

// User types
export type { UserData, RemoteCursor, RemoteCursors } from "./user.types";

// Socket types
export type {
  UserPayload,
  CursorPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  TypedSocket,
} from "./socket.types";

// Store types
export type {
  StickyStoreState,
  StickyStoreActions,
  StickyStore,
} from "./store.types";
```

### Usage After:

```typescript
// Before: Multiple imports
import type { StickyNote } from "@/types/types";
import type { ServerToClientEvents } from "@/types/socketTypes";

// After: Single import
import type { StickyNote, ServerToClientEvents } from "@/types";
```

---

## Step 6: Update Existing Imports

After creating the new type files, update imports across your codebase:

### Files to Update:

```typescript
// hooks/useSocket.ts
- import { ServerToClientEvents, ClientToServerEvents, DataPayload } from "@/types/socketTypes";
+ import type { ServerToClientEvents, ClientToServerEvents, UserPayload, TypedSocket } from "@/types";

// store/useStickyStore.ts
- import type { NoteCoordinates, OtherUserCursor, OtherUsers, StickyNote, UserData } from "@/types/types";
+ import type { Position, RemoteCursor, RemoteCursors, StickyNote, UserData, StickyStoreState, StickyStoreActions } from "@/types";

// app/room/[id]/sticky-note.tsx
- import type { StickyNote } from "@/types/types";
+ import type { StickyNote } from "@/types";
```

---

## Step 7: Delete Old Type Files

After migrating everything:

```bash
# Remove old files
rm types/types.ts
rm types/socketTypes.ts
rm app/room/[id]/room-types.ts  # If it only had duplicates
```

---

## 🎓 What You Learned

### 1. Type Organization Patterns

**Feature-based:** Group by what the types represent

```
types/
├── note.types.ts   # All about notes
├── user.types.ts   # All about users
└── socket.types.ts # All about sockets
```

### 2. Type Naming Conventions

| Pattern           | Example              | When to Use              |
| ----------------- | -------------------- | ------------------------ |
| `PascalCase`      | `StickyNote`         | All types and interfaces |
| `*Data` suffix    | `UserData`           | Raw data structures      |
| `*Payload` suffix | `UserPayload`        | Data sent over network   |
| `*Props` suffix   | `StickyNoteProps`    | React component props    |
| `*State` suffix   | `StickyStoreState`   | State container types    |
| `*Actions` suffix | `StickyStoreActions` | Action/method types      |

### 3. Type Utilities

```typescript
// Omit - Remove fields from a type
type CreateNote = Omit<StickyNote, "id">;

// Pick - Select specific fields
type Position = Pick<StickyNote, "x" | "y">;

// Partial - Make all fields optional
type NoteUpdate = Partial<StickyNote>;

// Required - Make all fields required
type RequiredNote = Required<StickyNote>;

// Record - Create a map type
type CursorMap = Record<string, RemoteCursor>;
```

### 4. Documentation with JSDoc

```typescript
/**
 * Brief description of what this type represents.
 *
 * @example
 * const note: StickyNote = {
 *   id: 'abc123',
 *   noteName: 'My Note',
 *   // ...
 * };
 */
export interface StickyNote {
  /** Unique identifier */
  id: string;
  // ...
}
```

---

## ✅ Verification Checklist

After all changes:

```bash
# 1. Make sure all new files exist
ls types/

# Expected output:
# index.ts
# note.types.ts
# user.types.ts
# socket.types.ts
# store.types.ts

# 2. Run TypeScript check
npx tsc --noEmit

# 3. Test imports work
# Add this to any file temporarily:
import type { StickyNote, UserData, TypedSocket } from "@/types";
```

---

## 📊 Before vs After Comparison

### Before:

```
types/
├── types.ts          # 31 lines, missing fields, wrong types
└── socketTypes.ts    # 46 lines, generic names
```

### After:

```
types/
├── index.ts          # ~40 lines, central exports
├── note.types.ts     # ~50 lines, complete note types
├── user.types.ts     # ~30 lines, user types
├── socket.types.ts   # ~60 lines, socket types with docs
└── store.types.ts    # ~50 lines, store types
```

**Total: ~230 lines vs ~77 lines**

But wait, more lines? Yes, because:

- Full JSDoc documentation
- Type utilities (`CreateNoteData`, `UpdateNoteData`)
- Clear naming
- No missing fields

---

**Next: [03-STATE-MANAGEMENT.md](./03-STATE-MANAGEMENT.md)** - Let's fix the Zustand store!

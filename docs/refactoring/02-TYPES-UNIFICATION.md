# 🏷️ Phase 2: Types Unification

> **Time**: ~1 hour  
> **Priority**: HIGH - Types are the foundation of TypeScript  
> **Difficulty**: Medium

---

## 📋 Overview

Your codebase has **duplicate type definitions** scattered across multiple files:

- `types/types.ts`
- `types/socketTypes.ts`
- `app/room/[id]/room-types.ts`

This causes:

1. **Inconsistency** - Same thing defined differently
2. **Maintenance hell** - Change in one place, forget another
3. **Type mismatches** - Different definitions cause subtle bugs

---

## 🔍 Current State Analysis

### Duplicate: `StickyNote`

**In `types/types.ts`:**

```typescript
export interface StickyNote {
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
  color?: string;
  z?: number;
}
```

**In `app/room/[id]/room-types.ts`:**

```typescript
export interface StickyNote {
  id: string;
  noteName: string;
  content: string;
  createdBy?: string;
  x: number;
  y: number;
}
```

### Problems:

| Field       | types.ts           | room-types.ts | Issue                        |
| ----------- | ------------------ | ------------- | ---------------------------- |
| `id`        | ❌ Missing         | ✅ Has        | How do you identify notes?!  |
| `content`   | `string \| number` | `string`      | Why would content be number? |
| `createdBy` | `string \| null`   | `string?`     | Inconsistent nullability     |
| `color`     | ✅ Has             | ❌ Missing    | One has colors, one doesn't  |
| `z`         | ✅ Has             | ❌ Missing    | Z-index missing in one       |

---

## 🎯 Target State

```
types/
├── index.ts          # Re-exports everything
├── user.types.ts     # User-related types
├── room.types.ts     # Room-related types
├── note.types.ts     # Note-related types
└── socket.types.ts   # Socket.io types
```

---

## 📝 Step-by-Step Implementation

### Step 1: Create `types/note.types.ts`

```typescript
/**
 * Note Types
 *
 * Single source of truth for all note-related types.
 * These types mirror the Prisma schema but are safe to use client-side.
 */

// ============================================
// BASE TYPES
// ============================================

/**
 * Core sticky note properties.
 * Matches the Note model in Prisma schema.
 */
export interface Note {
  id: string;
  noteName: string;
  content: string;
  createdBy: string;
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  roomId: string;
}

/**
 * Client-side sticky note representation.
 * Used in Zustand store and UI components.
 * Omits server-only fields like userId, timestamps.
 */
export interface StickyNote {
  id: string;
  noteName: string;
  content: string;
  createdBy: string;
  x: number;
  y: number;
  z?: number;
  color?: string;
}

// ============================================
// FORM TYPES
// ============================================

/**
 * Data needed to create a new note.
 */
export type CreateNoteInput = Pick<
  StickyNote,
  "noteName" | "content" | "x" | "y"
> & {
  color?: string;
};

/**
 * Data needed to update a note.
 */
export type UpdateNoteInput = Pick<StickyNote, "id"> &
  Partial<Pick<StickyNote, "noteName" | "content">>;

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Coordinates for note positioning.
 */
export interface NoteCoordinates {
  x: number;
  y: number;
}

/**
 * Note with selected state (for UI).
 */
export interface SelectableNote extends StickyNote {
  isSelected: boolean;
}
```

### 🧠 Why These Design Choices?

| Choice                              | Why                                                   |
| ----------------------------------- | ----------------------------------------------------- |
| `Note` vs `StickyNote`              | `Note` matches DB exactly, `StickyNote` is for client |
| All fields required in `StickyNote` | No guessing about undefined fields                    |
| `Pick` and `Partial`                | TypeScript utilities - learn them!                    |
| Separate `Input` types              | Clear contract for what forms need                    |

---

### Step 2: Create `types/user.types.ts`

```typescript
/**
 * User Types
 *
 * Single source of truth for all user-related types.
 */

// ============================================
// BASE TYPES
// ============================================

/**
 * Full user model (matches Prisma schema).
 */
export interface User {
  id: string;
  clerkId: string;
  name: string;
  username: string | null;
  email: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User data stored in client state.
 * Minimal info needed for the UI.
 */
export interface UserData {
  userName: string;
  roomId?: string;
}

// ============================================
// CURSOR TYPES
// ============================================

/**
 * Other user's cursor position and info.
 */
export interface OtherUserCursor {
  userName: string;
  x: number;
  y: number;
  color: string;
}

/**
 * Map of all other users' cursors.
 * Key is the socket ID.
 */
export type OtherUsers = Record<string, OtherUserCursor>;

// ============================================
// AUTH TYPES
// ============================================

/**
 * Minimal user info from authentication.
 */
export interface AuthUser {
  id: string;
  username: string | null;
  email: string;
}
```

---

### Step 3: Create `types/room.types.ts`

```typescript
/**
 * Room Types
 *
 * Single source of truth for all room-related types.
 */

import type { StickyNote } from "./note.types";
import type { User } from "./user.types";

// ============================================
// BASE TYPES
// ============================================

/**
 * Full room model (matches Prisma schema).
 */
export interface Room {
  id: string;
  roomName: string;
  ownerId: string;
}

/**
 * Room with related data.
 */
export interface RoomWithRelations extends Room {
  owner: User;
  users: User[];
  notes: StickyNote[];
}

/**
 * Room item for lists (minimal data).
 */
export interface RoomListItem {
  id: string;
  roomName: string;
}

// ============================================
// COMPONENT PROPS
// ============================================

/**
 * Props for zoom control components.
 */
export interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
  scale: number;
}

// ============================================
// CANVAS TYPES
// ============================================

/**
 * Canvas transform state.
 */
export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Canvas viewport bounds.
 */
export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
```

---

### Step 4: Create `types/socket.types.ts`

```typescript
/**
 * Socket.io Types
 *
 * Type definitions for real-time communication.
 * These types are used by both client and server.
 */

import type { NoteCoordinates } from "./note.types";

// ============================================
// PAYLOAD TYPES
// ============================================

/**
 * Standard payload for room-related socket events.
 */
export interface RoomEventPayload {
  userId: string;
  roomId: string;
  userName: string;
}

/**
 * Payload for mouse movement events.
 */
export interface MouseMovePayload extends NoteCoordinates {
  userId: string;
}

// ============================================
// EVENT INTERFACES
// ============================================

/**
 * Events sent from server to client.
 */
export interface ServerToClientEvents {
  /** Notifies clients when a user joins the room */
  user_joined: (data: RoomEventPayload) => void;

  /** Notifies clients when a user leaves the room */
  user_left: (data: RoomEventPayload) => void;

  /** Sends current room data to newly joined user */
  room_data: (data: Partial<RoomEventPayload>) => void;

  /** Broadcasts cursor position updates */
  mouse_update: (data: MouseMovePayload) => void;
}

/**
 * Events sent from client to server.
 */
export interface ClientToServerEvents {
  /** Request to join a room */
  join_room: (data: RoomEventPayload) => void;

  /** Request to leave a room */
  leave_room: (data: RoomEventPayload) => void;

  /** Request current room data */
  get_room_data: (data: Partial<RoomEventPayload>) => void;

  /** Send cursor position update */
  mouse_move: (data: NoteCoordinates) => void;
}

/**
 * Socket data stored in socket.data.
 */
export interface SocketData {
  userId: string;
  roomId: string;
  userName: string;
}

// ============================================
// TYPE ALIASES
// ============================================

/**
 * Type alias for backwards compatibility.
 * @deprecated Use RoomEventPayload instead
 */
export type DataPayload = RoomEventPayload;
```

---

### Step 5: Create `types/index.ts`

```typescript
/**
 * Types Index
 *
 * Re-exports all types for convenient importing.
 *
 * @example
 * // Instead of:
 * import { StickyNote } from '@/types/note.types';
 * import { User } from '@/types/user.types';
 *
 * // You can do:
 * import { StickyNote, User } from '@/types';
 */

// Note types
export type {
  Note,
  StickyNote,
  CreateNoteInput,
  UpdateNoteInput,
  NoteCoordinates,
  SelectableNote,
} from "./note.types";

// User types
export type {
  User,
  UserData,
  OtherUserCursor,
  OtherUsers,
  AuthUser,
} from "./user.types";

// Room types
export type {
  Room,
  RoomWithRelations,
  RoomListItem,
  ZoomControlsProps,
  CanvasTransform,
  ViewportBounds,
} from "./room.types";

// Socket types
export type {
  RoomEventPayload,
  MouseMovePayload,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  DataPayload,
} from "./socket.types";
```

---

### Step 6: Update All Imports

Now you need to update imports across your codebase.

**Search and Replace Pattern:**

| Old Import                   | New Import       |
| ---------------------------- | ---------------- |
| `from "@/types/types"`       | `from "@/types"` |
| `from "@/types/socketTypes"` | `from "@/types"` |
| `from "./room-types"`        | `from "@/types"` |

**Files to Update:**

1. `store/useStickyStore.ts`
2. `hooks/useSocket.ts`
3. `hooks/useCanvasTransform.ts`
4. `app/room/[id]/page.tsx`
5. `app/room/[id]/sticky-note.tsx`
6. `app/room/[id]/note-form.tsx`
7. `app/room/[id]/zoom-controls.tsx`
8. `lib/actions/note-actions.ts`
9. `constants/dummyData.ts`
10. `server/index.ts`

**Example Update:**

```typescript
// Before
import type { StickyNote, UserData, OtherUsers } from "@/types/types";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/socketTypes";

// After
import type {
  StickyNote,
  UserData,
  OtherUsers,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types";
```

---

### Step 7: Delete Old Files

After updating all imports:

1. Delete `types/types.ts`
2. Delete `types/socketTypes.ts`
3. Delete `app/room/[id]/room-types.ts`

---

## ✅ Verification Checklist

Run these commands to verify:

```bash
# Check for any remaining old imports
grep -r "from \"@/types/types\"" .
grep -r "from \"@/types/socketTypes\"" .
grep -r "from \"./room-types\"" .

# Should return nothing if all imports are updated

# Run TypeScript check
npx tsc --noEmit
```

---

## 🧠 Deep Dive: TypeScript Utility Types

### `Pick<T, K>`

Selects specific properties from a type.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Only id and name
type PublicUser = Pick<User, "id" | "name">;
// { id: string; name: string; }
```

### `Omit<T, K>`

Removes specific properties from a type.

```typescript
// Everything except password
type SafeUser = Omit<User, "password">;
// { id: string; name: string; email: string; }
```

### `Partial<T>`

Makes all properties optional.

```typescript
type UpdateUserInput = Partial<User>;
// { id?: string; name?: string; email?: string; password?: string; }
```

### `Required<T>`

Makes all properties required.

```typescript
interface Config {
  debug?: boolean;
  apiUrl?: string;
}

type RequiredConfig = Required<Config>;
// { debug: boolean; apiUrl: string; }
```

### `Record<K, V>`

Creates a type with keys of type K and values of type V.

```typescript
type UserMap = Record<string, User>;
// { [key: string]: User }
```

---

## 💡 Pro Tips

### 1. Use `type` vs `interface` Correctly

```typescript
// Use interface for objects that might be extended
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// Use type for unions, intersections, or primitives
type Status = "pending" | "success" | "error";
type ID = string | number;
```

### 2. Export Types Separately

```typescript
// ✅ Good - clear what's a type
export type { StickyNote, User };
export { createNote, deleteNote };

// ❌ Avoid - unclear what's what
export { StickyNote, User, createNote, deleteNote };
```

### 3. Use Discriminated Unions

```typescript
// For state that has different shapes
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// TypeScript knows the shape based on status!
function handleState(state: AsyncState<User>) {
  if (state.status === "success") {
    console.log(state.data); // TypeScript knows data exists
  }
  if (state.status === "error") {
    console.log(state.error); // TypeScript knows error exists
  }
}
```

---

## 📚 What You Learned

1. **Single Source of Truth** - One definition per type
2. **Organized by Domain** - User types, note types, etc.
3. **TypeScript Utilities** - Pick, Omit, Partial, Record
4. **Barrel Exports** - index.ts re-exports for clean imports
5. **Type vs Interface** - When to use each
6. **JSDoc Comments** - Document your types!

---

## ⏭️ Next Step

Now that your types are unified, move on to:
**[03-STATE-MANAGEMENT.md](./03-STATE-MANAGEMENT.md)** - Split Zustand store

---

## 🔗 Resources

- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Matt Pocock's TypeScript Tips](https://www.totaltypescript.com/)

# 04 - Server Actions Refactoring

## 🎯 Goal

Fix errors in server actions and establish consistent patterns for error handling.

**Why?** Server actions are how your frontend talks to the database. They MUST be reliable.

---

## Current Problems

### Problem 1: Duplicate Functions

```typescript
// actions-utils.ts
export async function syncUser() {...}

// Also imported from user-action.ts (but doesn't exist there)
import { syncUser } from "./user-action";
```

### Problem 2: Variable Shadowing

```typescript
// user-action.ts
export async function getUserData(userId?: string, fields: Prisma.UserSelect) {
  return actionWrapper(async () => {
    const user = await getAuthUser(); // First 'user'
    let user = await db.user.findUnique({
      // Second 'user' - ERROR!
      //...
    });
  });
}
```

### Problem 3: Inconsistent actionWrapper Usage

```typescript
// Some actions return the result directly
return actionWrapper(async () => {
  const result = await actionFn();
  return { data: result, error: null }; // Double wrapping!
});

// actionWrapper already wraps in { data, error }!
```

### Problem 4: Missing Type Safety

```typescript
// Parameter 'fields' has implicit 'any' type
export async function getUserData(userId?: string, fields: Prisma.UserSelect) {
  // TypeScript doesn't know the return type
}
```

---

## The Solution: Clean Server Actions

### New File Structure:

```
lib/
├── db.ts                    # Database client (keep as is)
├── utils.ts                 # General utilities
└── actions/
    ├── index.ts            # Re-exports all actions
    ├── auth.ts             # Auth utilities (getAuthUser, syncUser)
    ├── note-actions.ts     # Note CRUD
    ├── room-actions.ts     # Room CRUD
    └── user-actions.ts     # User data fetching/updating
```

---

## Step 1: Fix `lib/utils.ts`

### Before (with test code):

```typescript
import { clsx, type ClassValue } from "clsx";
import { error } from "console";
import { twMerge } from "tailwind-merge";

export type ActionResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensure<T>(
  value: T | null | undefined,
  message: string = "Value is null or undefined"
): T {
  if (value === null || value === undefined || value === false) {
    throw new Error(message);
  }
  return value;
}

const hell: number = "hell"; // ❌ Remove this
console.log(hell); // ❌ Remove this

export async function actionWrapper<T>(
  actionFn: () => Promise<ActionResponse<T>> // ❌ Wrong type
) {
  try {
    const result = await actionFn();
    return { data: result, error: null }; // ❌ Double wrapping
  } catch (err) {
    console.error("Something went wrong!", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Something went wrong!",
    };
  }
}
```

### After (clean version):

```typescript
// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// TAILWIND UTILITIES
// ============================================================================

/**
 * Combines class names with Tailwind merge
 * Usage: cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Ensures a value is not null/undefined
 * Throws an error with custom message if it is
 *
 * @example
 * const user = ensure(await db.user.findUnique(...), "User not found");
 * // user is guaranteed to be non-null after this
 */
export function ensure<T>(
  value: T | null | undefined,
  message: string = "Value is null or undefined"
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

// ============================================================================
// ACTION RESPONSE TYPES
// ============================================================================

/**
 * Standard response type for server actions
 * Always returns either { data, error: null } or { data: null, error }
 */
export type ActionResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Wraps an async function in try-catch and returns ActionResponse
 * Use this for all server actions to ensure consistent error handling
 *
 * @example
 * export async function createNote(data: NoteData) {
 *   return actionWrapper(async () => {
 *     const note = await db.note.create({ data });
 *     return note;  // Just return the data, wrapper handles the rest
 *   });
 * }
 */
export async function actionWrapper<T>(
  actionFn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await actionFn();
    return { data: result, error: null };
  } catch (err) {
    console.error("[Action Error]", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Something went wrong!",
    };
  }
}
```

### Key Changes:

1. **Removed test code** - No more `hell` variable
2. **Fixed `actionWrapper` signature** - Takes `() => Promise<T>`, not `() => Promise<ActionResponse<T>>`
3. **Better JSDoc comments** - Explains usage with examples
4. **Removed unused import** - `error` from "console" wasn't used

---

## Step 2: Create `lib/actions/auth.ts`

### Why This File?

Centralizes all authentication-related utilities.

```typescript
// lib/actions/auth.ts
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { ensure, actionWrapper } from "@/lib/utils";

// ============================================================================
// SYNC USER
// ============================================================================

/**
 * Syncs a user from Clerk to our database
 * Called when user doesn't exist in DB (webhook missed or first time)
 */
export async function syncUser() {
  return actionWrapper(async () => {
    const { userId } = await auth();
    ensure(userId, "Not authenticated");

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (existingUser) {
      return existingUser;
    }

    // Fetch from Clerk and create in DB
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    ensure(clerkUser, "Clerk user not found");

    console.log("🔄 Syncing user from Clerk to DB:", userId);

    const newUser = await db.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name:
          `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
          clerkUser.username ||
          "User",
        username: clerkUser.username || null,
        imageUrl: clerkUser.imageUrl ?? null,
      },
    });

    console.log("✅ User synced to DB:", newUser.id);
    return newUser;
  });
}

// ============================================================================
// GET AUTH USER
// ============================================================================

/**
 * Gets the current authenticated user from the database
 * Uses React cache to dedupe requests within the same render
 *
 * @throws Error if not authenticated
 * @returns Database user object
 */
export const getAuthUser = cache(async () => {
  const { userId } = await auth();
  ensure(userId, "Not authenticated");

  // Try to find user in our DB
  let user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  // If not found, sync from Clerk
  if (!user) {
    const syncResult = await syncUser();
    if (syncResult.error) {
      throw new Error(syncResult.error);
    }
    user = syncResult.data;
  }

  return ensure(user, "User not found");
});
```

---

## Step 3: Fix `lib/actions/user-actions.ts`

### Before (with errors):

```typescript
"use server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { actionWrapper, ensure } from "../utils";
import { getAuthUser } from "./actions-utils";

export async function getUserData(userId?: string, fields: Prisma.UserSelect) {
  return actionWrapper(async () => {
    const user = await getAuthUser(); // ❌ First 'user'
    let user = await db.user.findUnique({
      // ❌ Second 'user'
      where: {
        clerkId: userId || user?.id,
      },
      select: fields,
    });
    return ensure(user, "User not found");
  });
}
```

### After (fixed):

```typescript
// lib/actions/user-actions.ts
"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { actionWrapper, ensure } from "@/lib/utils";
import { getAuthUser } from "./auth";

// ============================================================================
// GET USER DATA
// ============================================================================

/**
 * Fetches specific fields for a user
 *
 * @param userId - Optional user ID. If not provided, uses current auth user
 * @param fields - Prisma select object specifying which fields to return
 *
 * @example
 * // Get current user's rooms
 * const result = await getUserData(undefined, { rooms: true });
 *
 * // Get specific user's profile
 * const result = await getUserData("user_123", { name: true, email: true });
 */
export async function getUserData<T extends Prisma.UserSelect>(
  userId: string | undefined,
  fields: T
) {
  return actionWrapper(async () => {
    const authUser = await getAuthUser();

    const userData = await db.user.findUnique({
      where: {
        clerkId: userId || authUser.clerkId,
      },
      select: fields,
    });

    return ensure(userData, "User not found");
  });
}

// ============================================================================
// UPDATE USER DATA
// ============================================================================

/**
 * Updates data for the current authenticated user
 *
 * @param data - Prisma update input object
 *
 * @example
 * await updateUserData({ name: "New Name" });
 */
export async function updateUserData(data: Prisma.UserUpdateInput) {
  return actionWrapper(async () => {
    const authUser = await getAuthUser();

    const updatedUser = await db.user.update({
      where: {
        clerkId: authUser.clerkId,
      },
      data,
    });

    return ensure(updatedUser, "Update failed");
  });
}
```

### Key Fixes:

1. **Renamed variables** - `user` → `authUser`, second `user` → `userData`
2. **Added generics** - `<T extends Prisma.UserSelect>` for type inference
3. **Fixed import path** - Use `@/lib/utils` consistently
4. **Added JSDoc** - Clear documentation with examples

---

## Step 4: Fix `lib/actions/note-actions.ts`

```typescript
// lib/actions/note-actions.ts
"use server";

import type { StickyNote } from "@/types";
import { db } from "@/lib/db";
import { actionWrapper, ensure } from "@/lib/utils";
import { getAuthUser } from "./auth";

// ============================================================================
// TYPES
// ============================================================================

type CreateNoteInput = Pick<StickyNote, "noteName" | "content" | "x" | "y"> & {
  id?: string;
  color?: string;
};

type UpdateNoteInput = Pick<StickyNote, "id"> &
  Partial<Pick<StickyNote, "noteName" | "content">>;

// ============================================================================
// CREATE NOTE
// ============================================================================

/**
 * Creates a new sticky note in a room
 *
 * @param data - Note data (noteName, content, x, y)
 * @param roomId - ID of the room to create the note in
 */
export async function createNote(data: CreateNoteInput, roomId: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    const newNote = await db.note.create({
      data: {
        id: data.id,
        noteName: data.noteName,
        content: String(data.content),
        x: data.x,
        y: data.y,
        color: data.color,
        roomId,
        userId: user.id,
        createdBy: user.username || user.name,
      },
    });

    return ensure(newNote, "Failed to create note");
  });
}

// ============================================================================
// UPDATE NOTE
// ============================================================================

/**
 * Updates an existing note (only if user owns it)
 *
 * @param data - Note ID and fields to update
 */
export async function updateNote(data: UpdateNoteInput) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    const updatedNote = await db.note.update({
      where: {
        id: data.id,
        userId: user.id, // Only owner can update
      },
      data: {
        ...(data.noteName !== undefined && { noteName: data.noteName }),
        ...(data.content !== undefined && { content: String(data.content) }),
      },
    });

    return ensure(updatedNote, "Failed to update note");
  });
}

// ============================================================================
// DELETE NOTE
// ============================================================================

/**
 * Deletes a note (only if user owns it)
 *
 * @param noteId - ID of the note to delete
 */
export async function deleteNote(noteId: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    const deletedNote = await db.note.delete({
      where: {
        id: noteId,
        userId: user.id, // Only owner can delete
      },
    });

    return ensure(deletedNote, "Failed to delete note");
  });
}

// ============================================================================
// GET ROOM NOTES
// ============================================================================

/**
 * Fetches all notes in a room
 *
 * @param roomId - ID of the room
 */
export async function getRoomNotes(roomId: string) {
  return actionWrapper(async () => {
    await getAuthUser(); // Ensure user is authenticated

    const notes = await db.note.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });

    return notes;
  });
}
```

---

## Step 5: Fix `lib/actions/room-actions.ts`

```typescript
// lib/actions/room-actions.ts
"use server";

import { db } from "@/lib/db";
import { actionWrapper, ensure } from "@/lib/utils";
import { getAuthUser } from "./auth";

// ============================================================================
// VERIFY ROOM
// ============================================================================

/**
 * Checks if a room exists
 * Used before joining to validate room ID
 *
 * @param roomId - ID of the room to verify
 * @returns The room if found
 */
export async function verifyRoom(roomId: string) {
  return actionWrapper(async () => {
    await getAuthUser(); // Ensure authenticated

    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    return ensure(room, "Room not found");
  });
}

// ============================================================================
// CREATE ROOM
// ============================================================================

/**
 * Creates a new room and adds the creator as owner and member
 *
 * @param roomName - Optional name for the room (defaults to "New Room")
 * @returns The new room's ID
 */
export async function createRoom(roomName?: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    const name = roomName?.trim() || "New Room";

    const newRoom = await db.room.create({
      data: {
        roomName: name,
        owner: { connect: { id: user.id } },
        users: { connect: { id: user.id } },
      },
    });

    return newRoom.id;
  });
}

// ============================================================================
// JOIN ROOM
// ============================================================================

/**
 * Adds the current user to a room's member list
 *
 * @param roomId - ID of the room to join
 */
export async function joinRoom(roomId: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    const updatedRoom = await db.room.update({
      where: { id: roomId },
      data: {
        users: { connect: { id: user.id } },
      },
    });

    return ensure(updatedRoom, "Failed to join room");
  });
}

// ============================================================================
// LEAVE ROOM
// ============================================================================

/**
 * Removes the current user from a room's member list
 *
 * @param roomId - ID of the room to leave
 */
export async function leaveRoom(roomId: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();

    const updatedRoom = await db.room.update({
      where: { id: roomId },
      data: {
        users: { disconnect: { id: user.id } },
      },
    });

    return ensure(updatedRoom, "Failed to leave room");
  });
}
```

---

## Step 6: Create Index File

```typescript
// lib/actions/index.ts

// Auth utilities
export { getAuthUser, syncUser } from "./auth";

// Note actions
export {
  createNote,
  updateNote,
  deleteNote,
  getRoomNotes,
} from "./note-actions";

// Room actions
export { verifyRoom, createRoom, joinRoom, leaveRoom } from "./room-actions";

// User actions
export { getUserData, updateUserData } from "./user-actions";
```

---

## Step 7: Delete Old Files

```bash
# Remove the old actions-utils.ts (replaced by auth.ts)
rm lib/actions/actions-utils.ts
```

---

## 🎓 What You Learned

### 1. Consistent Action Pattern

Every action follows this pattern:

```typescript
export async function actionName(params) {
  return actionWrapper(async () => {
    const user = await getAuthUser();  // 1. Authenticate

    const result = await db.model.operation({...});  // 2. Database operation

    return ensure(result, "Error message");  // 3. Validate & return
  });
}
```

### 2. ActionWrapper Simplifies Error Handling

```typescript
// Without actionWrapper - lots of boilerplate
export async function createNote(data) {
  try {
    const result = await db.note.create({...});
    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// With actionWrapper - clean and consistent
export async function createNote(data) {
  return actionWrapper(async () => {
    return await db.note.create({...});
  });
}
```

### 3. Type-Safe Parameters

```typescript
// ❌ Implicit any
function getUserData(fields) {}

// ✅ Explicit types with generics
function getUserData<T extends Prisma.UserSelect>(fields: T) {}
```

### 4. Separation of Concerns

| File              | Responsibility             |
| ----------------- | -------------------------- |
| `auth.ts`         | Authentication & user sync |
| `note-actions.ts` | Note CRUD                  |
| `room-actions.ts` | Room CRUD                  |
| `user-actions.ts` | User data queries          |

---

## ✅ Verification Checklist

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Test each action works
# - Create a room
# - Join a room
# - Create a note
# - Update a note
# - Delete a note
```

---

**Next: [05-COMPONENTS.md](./05-COMPONENTS.md)** - Breaking down the 322-line page.tsx!

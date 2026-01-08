# ⚡ Phase 4: Server Actions Refactoring

> **Time**: ~1 hour  
> **Priority**: HIGH - Server code needs to be bulletproof  
> **Difficulty**: Medium

---

## 📋 Overview

Your server actions have several issues:

1. **No input validation** - Trust issues!
2. **Inconsistent error handling** - Some throw, some return
3. **Mixed concerns** - `actionWrapper` signature is confusing
4. **No type safety** - Missing return types

---

## 🔍 Current State Analysis

```typescript
// Current issues in room-actions.ts
export async function createRoom(roomName?: string) {
  return actionWrapper(async () => {
    const user = await getAuthUser();  // What if this fails?

    const name = roomName?.trim() || "New Room";  // No validation!

    const newRoom = await db.room.create({...});

    return newRoom.id;  // Just returns ID, not full room
  });
}
```

### Problems:

| Issue                | Risk                         |
| -------------------- | ---------------------------- |
| No input validation  | SQL injection, XSS           |
| No length limits     | Database overflow            |
| Inconsistent returns | Hard to use on client        |
| No error types       | Can't handle specific errors |

---

## 🎯 Target Architecture

```
lib/
├── validations/           # Input validation schemas
│   ├── room.schema.ts
│   ├── note.schema.ts
│   └── user.schema.ts
└── actions/
    ├── index.ts           # Re-exports
    ├── room.actions.ts    # Room CRUD
    ├── note.actions.ts    # Note CRUD
    └── user.actions.ts    # User operations
```

---

## 📝 Step-by-Step Implementation

### Step 1: Install Zod for Validation

```bash
npm install zod
```

### 🧠 Why Zod?

- **Runtime validation** - Catches bad data at runtime
- **Type inference** - Generates TypeScript types automatically
- **Composable** - Build complex schemas from simple ones
- **Great errors** - Human-readable error messages

---

### Step 2: Create `lib/validations/room.schema.ts`

```typescript
/**
 * Room Validation Schemas
 *
 * Zod schemas for validating room-related input.
 * These run at RUNTIME to catch bad data.
 */

import { z } from "zod";

// ============================================
// CONSTANTS
// ============================================

export const ROOM_NAME_MIN = 1;
export const ROOM_NAME_MAX = 50;

// ============================================
// SCHEMAS
// ============================================

/**
 * Schema for creating a new room.
 */
export const createRoomSchema = z.object({
  roomName: z
    .string()
    .min(ROOM_NAME_MIN, "Room name is required")
    .max(ROOM_NAME_MAX, `Room name must be ${ROOM_NAME_MAX} characters or less`)
    .transform((val) => val.trim()),
});

/**
 * Schema for room ID validation.
 */
export const roomIdSchema = z.object({
  roomId: z.string().min(1, "Room ID is required").max(100, "Invalid room ID"),
});

// ============================================
// INFERRED TYPES
// ============================================

/** Type for create room input */
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

/** Type for room ID input */
export type RoomIdInput = z.infer<typeof roomIdSchema>;
```

---

### Step 3: Create `lib/validations/note.schema.ts`

```typescript
/**
 * Note Validation Schemas
 */

import { z } from "zod";

// ============================================
// CONSTANTS
// ============================================

export const NOTE_NAME_MAX = 100;
export const NOTE_CONTENT_MAX = 2000;
export const NOTE_COLORS = [
  "#fef3c7", // amber
  "#fce7f3", // pink
  "#dbeafe", // blue
  "#d1fae5", // green
  "#ede9fe", // purple
  "#ffedd5", // orange
] as const;

// ============================================
// SCHEMAS
// ============================================

/**
 * Schema for creating a new note.
 */
export const createNoteSchema = z.object({
  noteName: z
    .string()
    .min(1, "Note title is required")
    .max(NOTE_NAME_MAX, `Title must be ${NOTE_NAME_MAX} characters or less`)
    .transform((val) => val.trim()),

  content: z
    .string()
    .max(
      NOTE_CONTENT_MAX,
      `Content must be ${NOTE_CONTENT_MAX} characters or less`
    )
    .default(""),

  x: z
    .number()
    .min(-10000, "Position out of bounds")
    .max(10000, "Position out of bounds"),

  y: z
    .number()
    .min(-10000, "Position out of bounds")
    .max(10000, "Position out of bounds"),

  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format")
    .optional(),
});

/**
 * Schema for updating a note.
 */
export const updateNoteSchema = z.object({
  id: z.string().min(1, "Note ID is required"),
  noteName: z
    .string()
    .min(1)
    .max(NOTE_NAME_MAX)
    .transform((val) => val.trim())
    .optional(),
  content: z.string().max(NOTE_CONTENT_MAX).optional(),
});

/**
 * Schema for note ID.
 */
export const noteIdSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
});

// ============================================
// INFERRED TYPES
// ============================================

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteIdInput = z.infer<typeof noteIdSchema>;
```

---

### Step 4: Update `lib/utils.ts` with Better Error Handling

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ZodError } from "zod";

// ============================================
// TYPES
// ============================================

/**
 * Standard response for server actions.
 * Always returns either data OR error, never both.
 */
export type ActionResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

/**
 * Error codes for specific error handling.
 */
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================
// UTILITIES
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures a value is not null or undefined.
 * @throws Error with the provided message
 */
export function ensure<T>(
  value: T | null | undefined,
  message = "Value is null or undefined"
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Wraps server actions with consistent error handling.
 *
 * @example
 * export async function createRoom(input: unknown) {
 *   return actionWrapper(async () => {
 *     const data = createRoomSchema.parse(input);
 *     const room = await db.room.create({ data });
 *     return room;
 *   });
 * }
 */
export async function actionWrapper<T>(
  actionFn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await actionFn();
    return { success: true, data: result, error: null };
  } catch (err) {
    console.error("[Action Error]:", err);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => e.message).join(", ");
      return { success: false, data: null, error: message };
    }

    // Handle known errors
    if (err instanceof Error) {
      return { success: false, data: null, error: err.message };
    }

    // Unknown errors
    return {
      success: false,
      data: null,
      error: "An unexpected error occurred",
    };
  }
}
```

---

### Step 5: Refactor `lib/actions/room.actions.ts`

```typescript
/**
 * Room Server Actions
 *
 * All room-related database operations.
 * These run on the server only.
 */

"use server";

import { db } from "@/lib/db";
import { actionWrapper, ensure } from "@/lib/utils";
import { getAuthUser } from "./user.actions";
import { createRoomSchema, roomIdSchema } from "@/lib/validations/room.schema";
import type { Room } from "@/types";

// ============================================
// CREATE
// ============================================

/**
 * Create a new room.
 * The authenticated user becomes the owner.
 *
 * @param input - Room creation data
 * @returns The created room
 */
export async function createRoom(input: unknown) {
  return actionWrapper(async () => {
    // 1. Authenticate
    const user = await getAuthUser();
    ensure(user, "You must be signed in to create a room");

    // 2. Validate input
    const { roomName } = createRoomSchema.parse(input);

    // 3. Create room
    const room = await db.room.create({
      data: {
        roomName,
        ownerId: user.id,
        users: {
          connect: { id: user.id },
        },
      },
    });

    // 4. Return room
    return room;
  });
}

// ============================================
// READ
// ============================================

/**
 * Get a room by ID.
 *
 * @param input - Object containing roomId
 * @returns The room if found
 */
export async function getRoom(input: unknown) {
  return actionWrapper(async () => {
    const { roomId } = roomIdSchema.parse(input);

    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, name: true, imageUrl: true },
        },
        users: {
          select: { id: true, name: true, imageUrl: true },
        },
        notes: true,
      },
    });

    return ensure(room, "Room not found");
  });
}

/**
 * Verify a room exists.
 * Lightweight check without fetching all data.
 *
 * @param input - Object containing roomId
 * @returns true if room exists
 */
export async function verifyRoom(input: unknown) {
  return actionWrapper(async () => {
    const { roomId } = roomIdSchema.parse(input);

    const room = await db.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    return ensure(room, "Room not found") !== null;
  });
}

// ============================================
// UPDATE
// ============================================

/**
 * Join a room.
 * Adds the authenticated user to the room's users.
 *
 * @param input - Object containing roomId
 * @returns The updated room
 */
export async function joinRoom(input: unknown) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in to join a room");

    const { roomId } = roomIdSchema.parse(input);

    const room = await db.room.update({
      where: { id: roomId },
      data: {
        users: {
          connect: { id: user.id },
        },
      },
    });

    return ensure(room, "Failed to join room");
  });
}

/**
 * Leave a room.
 * Removes the authenticated user from the room's users.
 *
 * @param input - Object containing roomId
 * @returns The updated room
 */
export async function leaveRoom(input: unknown) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in to leave a room");

    const { roomId } = roomIdSchema.parse(input);

    const room = await db.room.update({
      where: { id: roomId },
      data: {
        users: {
          disconnect: { id: user.id },
        },
      },
    });

    return ensure(room, "Failed to leave room");
  });
}

// ============================================
// DELETE
// ============================================

/**
 * Delete a room.
 * Only the owner can delete a room.
 *
 * @param input - Object containing roomId
 * @returns The deleted room
 */
export async function deleteRoom(input: unknown) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in to delete a room");

    const { roomId } = roomIdSchema.parse(input);

    // Check ownership
    const room = await db.room.findUnique({
      where: { id: roomId },
      select: { ownerId: true },
    });

    ensure(room, "Room not found");
    ensure(room.ownerId === user.id, "You can only delete rooms you own");

    // Delete room (cascades to notes)
    const deletedRoom = await db.room.delete({
      where: { id: roomId },
    });

    return deletedRoom;
  });
}
```

---

### Step 6: Refactor `lib/actions/note.actions.ts`

```typescript
/**
 * Note Server Actions
 *
 * All note-related database operations.
 */

"use server";

import { db } from "@/lib/db";
import { actionWrapper, ensure } from "@/lib/utils";
import { getAuthUser } from "./user.actions";
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
} from "@/lib/validations/note.schema";
import { roomIdSchema } from "@/lib/validations/room.schema";
import { v4 as uuidv4 } from "uuid";

// ============================================
// CREATE
// ============================================

/**
 * Create a new note in a room.
 */
export async function createNote(noteInput: unknown, roomIdInput: unknown) {
  return actionWrapper(async () => {
    // 1. Authenticate
    const user = await getAuthUser();
    ensure(user, "You must be signed in to create a note");

    // 2. Validate inputs
    const noteData = createNoteSchema.parse(noteInput);
    const { roomId } = roomIdSchema.parse(roomIdInput);

    // 3. Generate unique ID
    const noteId = `${uuidv4().split("-")[0]}_${roomId.split("-")[0]}`;

    // 4. Create note
    const note = await db.note.create({
      data: {
        id: noteId,
        noteName: noteData.noteName,
        content: noteData.content,
        x: noteData.x,
        y: noteData.y,
        color: noteData.color || "#fef3c7",
        createdBy: user.username || user.name,
        userId: user.id,
        roomId,
      },
    });

    return note;
  });
}

// ============================================
// READ
// ============================================

/**
 * Get all notes for a room.
 */
export async function getRoomNotes(input: unknown) {
  return actionWrapper(async () => {
    const { roomId } = roomIdSchema.parse(input);

    const notes = await db.note.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });

    return notes;
  });
}

/**
 * Get a single note by ID.
 */
export async function getNote(input: unknown) {
  return actionWrapper(async () => {
    const { noteId } = noteIdSchema.parse(input);

    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    return ensure(note, "Note not found");
  });
}

// ============================================
// UPDATE
// ============================================

/**
 * Update a note's content.
 * Only the note owner can update.
 */
export async function updateNote(input: unknown) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in to update a note");

    const { id, ...updateData } = updateNoteSchema.parse(input);

    // Only update if user owns the note
    const note = await db.note.update({
      where: {
        id,
        userId: user.id, // Ensures ownership
      },
      data: updateData,
    });

    return ensure(note, "Failed to update note");
  });
}

/**
 * Update a note's position.
 * Any room member can move notes.
 */
export async function updateNotePosition(
  noteIdInput: unknown,
  x: number,
  y: number
) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in");

    const { noteId } = noteIdSchema.parse(noteIdInput);

    const note = await db.note.update({
      where: { id: noteId },
      data: { x, y },
    });

    return note;
  });
}

// ============================================
// DELETE
// ============================================

/**
 * Delete a note.
 * Only the note owner can delete.
 */
export async function deleteNote(input: unknown) {
  return actionWrapper(async () => {
    const user = await getAuthUser();
    ensure(user, "You must be signed in to delete a note");

    const { noteId } = noteIdSchema.parse(input);

    const note = await db.note.delete({
      where: {
        id: noteId,
        userId: user.id, // Ensures ownership
      },
    });

    return ensure(note, "Failed to delete note");
  });
}
```

---

### Step 7: Using Actions on the Client

```typescript
// In a component
"use client";

import { createRoom } from "@/lib/actions/room.actions";
import { toast } from "sonner";

async function handleCreateRoom(formData: FormData) {
  const roomName = formData.get("roomName");

  const result = await createRoom({ roomName });

  if (!result.success) {
    toast.error(result.error);
    return;
  }

  // Success!
  router.push(`/room/${result.data.id}`);
}
```

---

## ✅ Verification Checklist

Test each action:

- [ ] `createRoom` - Valid input creates room
- [ ] `createRoom` - Empty name shows error
- [ ] `createRoom` - Too long name shows error
- [ ] `joinRoom` - Can join existing room
- [ ] `leaveRoom` - Can leave room
- [ ] `createNote` - Valid input creates note
- [ ] `createNote` - Missing title shows error
- [ ] `updateNote` - Can update own note
- [ ] `updateNote` - Cannot update others' notes
- [ ] `deleteNote` - Can delete own note
- [ ] `deleteNote` - Cannot delete others' notes

---

## 🧠 Deep Dive: Zod Patterns

### Chaining Transformations

```typescript
const schema = z
  .string()
  .trim() // Remove whitespace
  .toLowerCase() // Convert to lowercase
  .min(1, "Required") // Then validate length
  .max(50, "Too long");
```

### Custom Validation

```typescript
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .refine((val) => /[A-Z]/.test(val), "Need uppercase")
  .refine((val) => /[0-9]/.test(val), "Need number");
```

### Optional with Default

```typescript
const schema = z.object({
  color: z.string().default("#ffffff"), // Default if undefined
  count: z.number().optional(), // Can be undefined
  name: z.string().nullable(), // Can be null
});
```

### Discriminated Unions

```typescript
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
  z.object({ type: z.literal("scroll"), delta: z.number() }),
]);
```

---

## 📚 What You Learned

1. **Input Validation** - Always validate untrusted input
2. **Zod Schemas** - Runtime validation with type inference
3. **Consistent Responses** - `{ success, data, error }` pattern
4. **Error Handling** - Catch and transform errors properly
5. **Authorization** - Check ownership before operations
6. **Separation of Concerns** - Validation schemas separate from actions

---

## ⏭️ Next Step

Now that your server code is solid, move on to:
**[05-COMPONENTS.md](./05-COMPONENTS.md)** - Extract and organize components

---

## 🔗 Resources

- [Zod Documentation](https://zod.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Prisma Best Practices](https://www.prisma.io/docs/guides)

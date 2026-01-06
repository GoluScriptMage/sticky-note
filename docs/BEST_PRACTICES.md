# Best Practices for StickyVerse

## 🎯 Core Principles

### 1. **Optimistic Updates** (Users see changes instantly)

### 2. **Cache Aggressively** (Reduce database queries)

### 3. **Batch Operations** (Group multiple writes)

### 4. **Error Recovery** (Rollback on failures)

### 5. **Type Safety** (TypeScript everywhere)

---

## 📁 Project Structure

```
stickysync-frontend/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth pages (sign-in, sign-up)
│   ├── dashboard/           # Dashboard page
│   ├── room/[id]/           # Room canvas page
│   └── api/webhooks/        # Webhook handlers only
│
├── lib/
│   ├── actions/             # ✅ Server Actions (USE THIS)
│   │   ├── note-actions.ts
│   │   ├── room-actions.ts
│   │   └── user-action.ts
│   ├── cache.ts             # ✅ Cached queries
│   ├── db.ts                # Prisma client
│   └── utils.ts             # Utility functions
│
├── hooks/                   # React hooks
│   ├── useSocket.ts         # Socket.io connection
│   └── useCanvasTransform.ts
│
├── store/                   # Zustand state management
│   └── useStickyStore.ts
│
├── server/                  # Socket.io server
│   └── index.ts
│
└── types/                   # TypeScript types
    ├── types.ts
    └── socketTypes.ts
```

---

## 🏗️ Architecture Patterns

### **Pattern 1: Optimistic Updates with Rollback**

```typescript
// ✅ GOOD: User sees instant feedback, rollback on error
export async function optimisticCreate<T>(
  localUpdate: () => void,
  socketEmit: () => void,
  dbSave: () => Promise<T>,
  onSuccess: (data: T) => void,
  onError: () => void
) {
  // Step 1: Update UI instantly
  localUpdate();

  // Step 2: Tell others
  socketEmit();

  // Step 3: Save to database
  try {
    const result = await dbSave();
    onSuccess(result);
  } catch (error) {
    console.error("Failed to save:", error);
    onError();
    throw error;
  }
}

// Usage
const handleCreateNote = async (noteData: NoteData) => {
  const tempId = `temp-${Date.now()}`;

  await optimisticCreate(
    // Local update
    () => addNote({ ...noteData, id: tempId }),

    // Socket emit
    () => socket?.emit("note_created", { ...noteData, id: tempId }),

    // Database save
    () => createNote(noteData),

    // Success: replace temp ID
    (savedNote) => {
      updateNote(tempId, savedNote);
      socket?.emit("note_confirmed", { tempId, realId: savedNote.id });
    },

    // Error: rollback
    () => {
      deleteNote(tempId);
      socket?.emit("note_rollback", { tempId });
      toast.error("Failed to create note");
    }
  );
};
```

---

### **Pattern 2: Cached User Lookups**

```typescript
// lib/cache.ts
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Get current authenticated user with request-level caching
 * Multiple calls within same request = only 1 database query
 */
export const getCurrentUser = cache(async () => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      username: true,
      imageUrl: true,
    },
  });

  return user;
});

/**
 * Get user by ID with request-level caching
 */
export const getUserById = cache(async (userId: string) => {
  return await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      imageUrl: true,
    },
  });
});

/**
 * Get room with users, cached for 30 seconds
 */
import { unstable_cache } from "next/cache";

export const getRoomWithUsers = unstable_cache(
  async (roomId: string) => {
    return await db.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        owner: {
          select: { id: true, username: true, imageUrl: true },
        },
        users: {
          select: { id: true, username: true, imageUrl: true },
        },
      },
    });
  },
  ["room-details"], // Cache key prefix
  {
    revalidate: 30, // Cache for 30 seconds
    tags: ["rooms"], // For manual invalidation
  }
);
```

---

### **Pattern 3: Batch Database Operations**

```typescript
// lib/actions/note-actions.ts
"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/cache";
import type { NoteUpdate } from "@/types/types";

/**
 * Save multiple note positions in single transaction
 */
export async function batchUpdateNotePositions(
  updates: Array<{ id: string; x: number; y: number }>
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // ✅ Single database transaction instead of N queries
  await db.$transaction(
    updates.map((update) =>
      db.note.update({
        where: {
          id: update.id,
          createdBy: user.id, // Security: only update own notes
        },
        data: {
          x: update.x,
          y: update.y,
          updatedAt: new Date(),
        },
      })
    )
  );

  return { success: true, count: updates.length };
}

/**
 * Delete multiple notes in single transaction
 */
export async function batchDeleteNotes(noteIds: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const result = await db.note.deleteMany({
    where: {
      id: { in: noteIds },
      createdBy: user.id, // Security: only delete own notes
    },
  });

  return { success: true, count: result.count };
}
```

---

### **Pattern 4: Type-Safe Server Actions**

```typescript
// lib/actions/note-actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/cache";

// ✅ Define schemas for validation
const CreateNoteSchema = z.object({
  noteName: z.string().min(1).max(100),
  content: z.string().max(5000),
  x: z.number(),
  y: z.number(),
  z: z.number().default(0),
  roomId: z.string().cuid(),
});

const UpdateNoteSchema = z.object({
  id: z.string().cuid(),
  noteName: z.string().min(1).max(100).optional(),
  content: z.string().max(5000).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

/**
 * Create note with validation and caching
 */
export async function createNote(input: CreateNoteInput) {
  // Validate input
  const validatedData = CreateNoteSchema.parse(input);

  // Get cached user
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Create note
  const note = await db.note.create({
    data: {
      ...validatedData,
      createdBy: user.id,
    },
    include: {
      creator: {
        select: { username: true, imageUrl: true },
      },
    },
  });

  return note;
}

/**
 * Update note with validation
 */
export async function updateNote(input: UpdateNoteInput) {
  const validatedData = UpdateNoteSchema.parse(input);
  const { id, ...updateData } = validatedData;

  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Security: Only update if user owns the note
  const note = await db.note.update({
    where: {
      id,
      createdBy: user.id, // ← Security check
    },
    data: updateData,
  });

  return note;
}

/**
 * Delete note with security check
 */
export async function deleteNote(noteId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const note = await db.note.delete({
    where: {
      id: noteId,
      createdBy: user.id, // ← Security check
    },
  });

  return { success: true, id: note.id };
}
```

---

## 🔐 Security Best Practices

### **1. Always Verify User Ownership**

```typescript
// ❌ BAD: Anyone can delete any note
export async function deleteNote(noteId: string) {
  await db.note.delete({ where: { id: noteId } });
}

// ✅ GOOD: Only owner can delete
export async function deleteNote(noteId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.note.delete({
    where: {
      id: noteId,
      createdBy: user.id, // ← Security check
    },
  });
}
```

---

### **2. Validate All Inputs**

```typescript
// ❌ BAD: No validation
export async function createNote(data: any) {
  await db.note.create({ data });
}

// ✅ GOOD: Validate with Zod
const NoteSchema = z.object({
  noteName: z.string().min(1).max(100),
  content: z.string().max(5000),
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
});

export async function createNote(data: unknown) {
  const validated = NoteSchema.parse(data); // Throws if invalid
  await db.note.create({ data: validated });
}
```

---

### **3. Rate Limit Socket Events**

```typescript
// hooks/useSocket.ts
import { useRef } from "react";

export function useSocket() {
  const lastEmitTime = useRef<number>(0);
  const THROTTLE_MS = 16; // 60fps max

  const emitMouseMove = (x: number, y: number) => {
    const now = Date.now();

    // ✅ Throttle: Only emit every 16ms
    if (now - lastEmitTime.current < THROTTLE_MS) {
      return;
    }

    lastEmitTime.current = now;
    socket?.emit("mouse_move", { x, y });
  };

  return { emitMouseMove };
}
```

---

## 🚀 Performance Best Practices

### **1. Index Your Database**

```prisma
// prisma/schema.prisma

model Note {
  id        String   @id @default(cuid())
  noteName  String
  content   String
  x         Float
  y         Float
  z         Int      @default(0)
  roomId    String
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  room    Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
  creator User   @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  // ✅ Performance: Add indexes for common queries
  @@index([roomId])                    // Get all notes in room (FAST)
  @@index([createdBy])                 // Get all notes by user (FAST)
  @@index([roomId, createdBy])         // Get user's notes in room (FAST)
  @@index([updatedAt])                 // Get recently updated notes (FAST)
}

model Room {
  id        String   @id @default(cuid())
  roomName  String
  ownerId   String
  createdAt DateTime @default(now())

  owner User   @relation("OwnedRooms", fields: [ownerId], references: [id], onDelete: Cascade)
  users User[]
  notes Note[]

  // ✅ Performance: Index for room lookups
  @@index([ownerId])                   // Get rooms by owner (FAST)
}
```

---

### **2. Select Only Needed Fields**

```typescript
// ❌ BAD: Returns ALL user data (password, metadata, etc.)
const user = await db.user.findUnique({
  where: { id: userId },
});

// ✅ GOOD: Only select what you need
const user = await db.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    username: true,
    imageUrl: true,
    // Don't select unnecessary fields
  },
});
```

---

### **3. Use Prisma's `findMany` Efficiently**

```typescript
// ❌ BAD: N+1 query problem
const notes = await db.note.findMany({ where: { roomId } });
for (const note of notes) {
  const creator = await db.user.findUnique({ where: { id: note.createdBy } });
  // ... 100 notes = 101 queries!
}

// ✅ GOOD: Single query with include
const notes = await db.note.findMany({
  where: { roomId },
  include: {
    creator: {
      select: { username: true, imageUrl: true },
    },
  },
  // 100 notes = 1 query!
});
```

---

## 🧪 Error Handling Best Practices

### **1. Graceful Degradation**

```typescript
// hooks/useSocket.ts
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      reconnection: true, // ✅ Auto-reconnect
      reconnectionAttempts: 5, // ✅ Try 5 times
      reconnectionDelay: 1000, // ✅ Wait 1s between attempts
    });

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      toast.success("Connected to room");
    });

    socket.on("connect_error", (err) => {
      setIsConnected(false);
      setError(err.message);
      toast.error("Connection failed - working offline");
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // Server kicked us out, don't reconnect
        toast.error("Disconnected from room");
      } else {
        // Network issue, will auto-reconnect
        toast.warning("Connection lost - reconnecting...");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket, isConnected, error };
}
```

---

### **2. User-Friendly Error Messages**

```typescript
// lib/actions/note-actions.ts
export async function createNote(input: CreateNoteInput) {
  try {
    const validated = CreateNoteSchema.parse(input);
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("AUTH_REQUIRED");
    }

    const note = await db.note.create({
      data: { ...validated, createdBy: user.id },
    });

    return { success: true, data: note };
  } catch (error) {
    // ✅ Return user-friendly errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid note data. Please check your input.",
      };
    }

    if (error.message === "AUTH_REQUIRED") {
      return {
        success: false,
        error: "Please sign in to create notes.",
      };
    }

    console.error("Failed to create note:", error);
    return {
      success: false,
      error: "Failed to create note. Please try again.",
    };
  }
}
```

---

## 🎨 Code Style Guidelines

### **1. Use Descriptive Variable Names**

```typescript
// ❌ BAD
const u = await db.user.findUnique({ where: { id: uid } });
const n = await db.note.create({ data: d });

// ✅ GOOD
const currentUser = await getCurrentUser();
const newNote = await db.note.create({ data: noteData });
```

---

### **2. Extract Magic Numbers to Constants**

```typescript
// ❌ BAD
if (notes.length > 50) return;
setTimeout(save, 10000);

// ✅ GOOD
const MAX_NOTES_PER_ROOM = 50;
const AUTO_SAVE_INTERVAL_MS = 10_000;

if (notes.length > MAX_NOTES_PER_ROOM) return;
setTimeout(save, AUTO_SAVE_INTERVAL_MS);
```

---

### **3. Use TypeScript Strictly**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,              // ✅ Enable all strict checks
    "noUncheckedIndexedAccess": true,  // ✅ Check array access
    "noImplicitAny": true,       // ✅ No implicit any
    "strictNullChecks": true,    // ✅ Catch null/undefined bugs
  }
}
```

---

## 📊 Monitoring & Logging

### **Best Practices:**

```typescript
// server/index.ts
import { Server } from "socket.io";

const io = new Server(httpServer, {
  // ✅ Enable detailed logging in development
  transports: ["websocket", "polling"],
  allowEIO3: true,
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },
});

// ✅ Log important events with context
io.on("connection", (socket) => {
  console.log("✅ User connected:", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    transport: socket.conn.transport.name,
  });

  socket.on("join_room", (data) => {
    console.log("📥 join_room:", {
      userId: data.userId,
      roomId: data.roomId,
      userName: data.userName,
      socketId: socket.id,
    });

    // Join room and notify others
    socket.join(data.roomId);
    socket.to(data.roomId).emit("user_joined", data);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ User disconnected:", {
      socketId: socket.id,
      reason,
      timestamp: new Date().toISOString(),
    });
  });
});
```

---

## 🎯 Summary: Quick Reference

| Practice                  | Why                                  | Priority  |
| ------------------------- | ------------------------------------ | --------- |
| Use Server Actions        | Automatic caching, type safety       | 🔥 High   |
| Cache user lookups        | Reduce DB queries 10-100x            | 🔥 High   |
| Optimistic updates        | Instant UI feedback                  | 🔥 High   |
| Batch operations          | 4-10x faster than individual queries | 🔥 High   |
| Add database indexes      | 100x query speedup                   | 🔥 High   |
| Validate inputs with Zod  | Prevent bugs and attacks             | 🔥 High   |
| Security checks           | Prevent unauthorized access          | 🔥 High   |
| Socket reconnection       | Handle network issues                | ⭐ Medium |
| Error rollback            | Handle failures gracefully           | ⭐ Medium |
| Throttle socket events    | Prevent spam (60fps max)             | ⭐ Medium |
| Select only needed fields | Reduce bandwidth                     | ⚡ Low    |
| User-friendly errors      | Better UX                            | ⚡ Low    |
| Logging                   | Debug production issues              | ⚡ Low    |

---

**Next Steps:**

1. ✅ Read `IMPLEMENTATION_PLAN.md` for step-by-step setup
2. ✅ Read `SOCKET_IO_COSTS.md` for performance details
3. ✅ Start implementing with these patterns!

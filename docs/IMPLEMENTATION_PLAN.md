# Implementation Plan: Real-Time Note Synchronization

## 🎯 Goal

Transform StickyVerse from single-user to real-time collaborative sticky notes app.

**Current State:** Canvas works, notes saved to DB, cursors sync ✅
**Target State:** Notes sync in real-time across all users ✅

---

## 📋 Implementation Steps

### **Phase 1: Fix Critical Issues** (15 minutes)

#### Step 1.1: Fix Prisma Schema Bug

**File:** `prisma/schema.prisma`

**Problem:** Note model missing `@id` directive

```prisma
// ❌ BEFORE (Line 40)
model Note {
  id        String   // Missing @id directive!
  noteName  String
  // ...
}

// ✅ AFTER
model Note {
  id        String   @id @default(cuid())
  noteName  String
  // ...
}
```

**Commands:**

```bash
# Apply schema changes
npm run db:push

# Verify schema
npm run studio
```

---

#### Step 1.2: Add Database Indexes (Performance)

**File:** `prisma/schema.prisma`

Add indexes to Note model:

```prisma
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

  // ✅ ADD THESE INDEXES
  @@index([roomId])
  @@index([createdBy])
  @@index([roomId, createdBy])
}
```

**Commands:**

```bash
npm run db:push
```

---

### **Phase 2: Add Caching Layer** (20 minutes)

#### Step 2.1: Create Cache Helper

**File:** `lib/cache.ts` (NEW FILE)

```typescript
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Get current user with request-level caching
 * Multiple calls in same request = only 1 DB query
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
 * Get user by ID with caching
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
```

---

#### Step 2.2: Update Server Actions to Use Cache

**File:** `lib/actions/note-actions.ts`

Replace all `auth()` + `db.user.findUnique()` calls with `getCurrentUser()`:

```typescript
import { getCurrentUser } from "@/lib/cache";

export async function createNote(input: CreateNoteInput) {
  "use server";

  // ❌ OLD WAY
  // const { userId } = await auth();
  // const user = await db.user.findUnique({ where: { clerkId: userId } });

  // ✅ NEW WAY (cached!)
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // ... rest of function
}
```

**Do this for:**

- `lib/actions/note-actions.ts` (createNote, updateNote, deleteNote)
- `lib/actions/room-actions.ts` (createRoom, verifyRoom)
- Any other server actions using auth()

---

### **Phase 3: Define Socket Events** (15 minutes)

#### Step 3.1: Update Socket Types

**File:** `types/socketTypes.ts`

Add note synchronization events:

```typescript
import type { StickyNote } from "./types";

export interface DataPayload {
  userId: string;
  roomId: string;
  userName: string;
}

export interface NoteMovedPayload {
  noteId: string;
  x: number;
  y: number;
  timestamp: number;
  userId: string;
}

export interface NoteConfirmedPayload {
  tempId: string;
  realId: string;
}

// Server to Client Events
export interface ServerToClientEvents {
  user_joined: (data: DataPayload) => void;
  user_left: (data: DataPayload) => void;
  room_data: (data: Partial<DataPayload>) => void;
  mouse_update: (data: { userId: string; x: number; y: number }) => void;

  // ✅ ADD THESE NEW EVENTS
  note_created: (note: StickyNote) => void;
  note_updated: (note: StickyNote) => void;
  note_deleted: (noteId: string) => void;
  note_moved: (data: NoteMovedPayload) => void;
  note_confirmed: (data: NoteConfirmedPayload) => void;
  note_rollback: (tempId: string) => void;
}

export interface ClientToServerEvents {
  join_room: (data: DataPayload) => void;
  leave_room: (data: DataPayload) => void;
  get_room_data: (data: Partial<DataPayload>) => void;
  mouse_move: (data: { x: number; y: number }) => void;

  // ✅ ADD THESE NEW EVENTS
  note_create: (note: StickyNote) => void;
  note_update: (note: StickyNote) => void;
  note_delete: (noteId: string, roomId: string) => void;
  note_move: (data: NoteMovedPayload) => void;
  note_confirm: (data: NoteConfirmedPayload) => void;
  note_rollback: (tempId: string) => void;
}

export interface SocketData {
  userId: string;
  roomId: string;
  userName: string;
}
```

---

### **Phase 4: Implement Server-Side Handlers** (20 minutes)

#### Step 4.1: Add Socket Event Handlers

**File:** `server/index.ts`

Add handlers after existing events:

```typescript
io.on("connection", (socket) => {
  // ... existing join_room and mouse_move handlers ...

  // ✅ ADD THESE NEW HANDLERS

  // Handle note creation broadcast
  socket.on("note_create", (note) => {
    console.log("📤 Broadcasting note_created:", note.id);
    socket.to(socket.data.roomId).emit("note_created", note);
  });

  // Handle note update broadcast
  socket.on("note_update", (note) => {
    console.log("📤 Broadcasting note_updated:", note.id);
    socket.to(socket.data.roomId).emit("note_updated", note);
  });

  // Handle note deletion broadcast
  socket.on("note_delete", (noteId, roomId) => {
    console.log("📤 Broadcasting note_deleted:", noteId);
    socket.to(roomId).emit("note_deleted", noteId);
  });

  // Handle note movement broadcast (during drag)
  socket.on("note_move", (data) => {
    socket.to(socket.data.roomId).emit("note_moved", data);
  });

  // Handle note confirmation (after DB save)
  socket.on("note_confirm", (data) => {
    console.log("📤 Broadcasting note_confirmed:", data);
    socket.to(socket.data.roomId).emit("note_confirmed", data);
  });

  // Handle note rollback (if DB save fails)
  socket.on("note_rollback", (tempId) => {
    console.log("📤 Broadcasting note_rollback:", tempId);
    socket.to(socket.data.roomId).emit("note_rollback", tempId);
  });

  // ... existing disconnect handler ...
});
```

---

### **Phase 5: Update Client-Side Socket Hook** (30 minutes)

#### Step 5.1: Add Event Listeners

**File:** `hooks/useSocket.ts`

Add listeners for note events:

```typescript
import { useStickyStore } from "@/store/useStickyStore";

export const useSocket = (roomId: string, userName: string) => {
  const {
    updateOtherUsers,
    deleteOtherUsers,
    // ✅ ADD THESE
    addNote,
    updateNote,
    deleteNote,
  } = useStickyStore();

  useEffect(() => {
    // ... existing socket setup ...

    // ✅ ADD THESE LISTENERS

    // Listen for note creation from others
    socket.on("note_created", (note) => {
      console.log("📥 Received note_created:", note);
      addNote(note);
      toast.info(`${note.createdBy} created a note`);
    });

    // Listen for note updates from others
    socket.on("note_updated", (note) => {
      console.log("📥 Received note_updated:", note);
      updateNote(note.id, note);
    });

    // Listen for note deletion from others
    socket.on("note_deleted", (noteId) => {
      console.log("📥 Received note_deleted:", noteId);
      deleteNote(noteId);
      toast.info("A note was deleted");
    });

    // Listen for note movement (real-time drag)
    socket.on("note_moved", (data) => {
      updateNote(data.noteId, {
        x: data.x,
        y: data.y,
        lastModified: data.timestamp,
      });
    });

    // Listen for note confirmation (temp ID → real ID)
    socket.on("note_confirmed", ({ tempId, realId }) => {
      console.log("📥 Note confirmed:", { tempId, realId });
      const note = useStickyStore.getState().notes.find((n) => n.id === tempId);
      if (note) {
        updateNote(tempId, { id: realId });
      }
    });

    // Listen for note rollback (DB save failed)
    socket.on("note_rollback", (tempId) => {
      console.log("📥 Note rollback:", tempId);
      deleteNote(tempId);
      toast.error("Failed to create note");
    });

    // ... existing cleanup ...
  }, [roomId, userName]);

  return { socket };
};
```

---

### **Phase 6: Update Client-Side Emitters** (30 minutes)

#### Step 6.1: Add Socket Emits to Note Actions

**File:** `app/room/[id]/page.tsx`

Update note creation handler:

```typescript
const handleCreateNote = async (noteData: CreateNoteInput) => {
  const tempId = `temp-${Date.now()}`;
  const tempNote = {
    ...noteData,
    id: tempId,
    createdBy: currentUser?.username || "Unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Step 1: Update local store (instant UI)
  addNote(tempNote);

  // Step 2: Broadcast to others (real-time)
  socket?.emit("note_create", tempNote);

  // Step 3: Save to database (persistence)
  try {
    const savedNote = await createNote({
      noteName: noteData.noteName,
      content: noteData.content,
      x: noteData.x,
      y: noteData.y,
      roomId: roomId,
    });

    // Success: Update temp ID to real ID
    updateNote(tempId, savedNote);
    socket?.emit("note_confirm", { tempId, realId: savedNote.id });

    toast.success("Note created");
  } catch (error) {
    // Failure: Rollback
    deleteNote(tempId);
    socket?.emit("note_rollback", tempId);
    toast.error("Failed to create note");
  }
};
```

---

#### Step 6.2: Add Socket Emits to Note Dragging

**File:** `app/room/[id]/page.tsx`

Update drag handler:

```typescript
const handleNoteDrag = (noteId: string, newX: number, newY: number) => {
  // Update local store
  updateNote(noteId, { x: newX, y: newY, isDirty: true });

  // ✅ Broadcast to others (real-time)
  socket?.emit("note_move", {
    noteId,
    x: newX,
    y: newY,
    timestamp: Date.now(),
    userId: currentUser?.id || "",
  });
};

const handleNoteDragEnd = async (noteId: string) => {
  const note = notes.find((n) => n.id === noteId);
  if (!note?.isDirty) return;

  // Save to database
  try {
    await updateNote(noteId, { x: note.x, y: note.y });
    updateNote(noteId, { isDirty: false });

    // Tell others the position is confirmed
    socket?.emit("note_update", note);
  } catch (error) {
    toast.error("Failed to save note position");
  }
};
```

---

#### Step 6.3: Add Socket Emits to Note Deletion

**File:** `app/room/[id]/page.tsx`

Update delete handler:

```typescript
const handleNoteDelete = async (noteId: string) => {
  // Step 1: Delete locally (instant UI)
  deleteNote(noteId);

  // Step 2: Broadcast to others (real-time)
  socket?.emit("note_delete", noteId, roomId);

  // Step 3: Delete from database (persistence)
  try {
    await deleteNote(noteId);
    toast.success("Note deleted");
  } catch (error) {
    // Rollback: re-add note
    const deletedNote = notes.find((n) => n.id === noteId);
    if (deletedNote) {
      addNote(deletedNote);
    }
    toast.error("Failed to delete note");
  }
};
```

---

### **Phase 7: Add Auto-Save for Dirty Notes** (20 minutes)

#### Step 7.1: Add Auto-Save Hook

**File:** `app/room/[id]/page.tsx`

Add periodic auto-save:

```typescript
// Auto-save dirty notes every 10 seconds
useEffect(() => {
  const AUTO_SAVE_INTERVAL = 10_000; // 10 seconds

  const interval = setInterval(async () => {
    const dirtyNotes = notes.filter(
      (n) => n.isDirty && !n.id.startsWith("temp-")
    );

    if (dirtyNotes.length === 0) return;

    console.log(`💾 Auto-saving ${dirtyNotes.length} dirty notes...`);

    try {
      // Batch update all dirty notes
      await Promise.all(
        dirtyNotes.map((note) => updateNote(note.id, { x: note.x, y: note.y }))
      );

      // Mark as clean
      dirtyNotes.forEach((note) => {
        updateNote(note.id, { isDirty: false });
      });

      console.log("✅ Auto-save complete");
    } catch (error) {
      console.error("❌ Auto-save failed:", error);
    }
  }, AUTO_SAVE_INTERVAL);

  return () => clearInterval(interval);
}, [notes]);
```

---

### **Phase 8: Add Save on User Disconnect** (15 minutes)

#### Step 8.1: Save Notes Before Leaving

**File:** `hooks/useSocket.ts`

Add cleanup handler:

```typescript
export const useSocket = (roomId: string, userName: string) => {
  useEffect(() => {
    const socket = io("http://localhost:3001");

    // ... existing setup ...

    // ✅ Save dirty notes before disconnect
    const handleBeforeUnload = async () => {
      const dirtyNotes = useStickyStore
        .getState()
        .notes.filter((n) => n.isDirty);

      if (dirtyNotes.length > 0) {
        console.log("💾 Saving dirty notes before disconnect...");

        // Use sendBeacon for reliability (works even if page is closing)
        const data = JSON.stringify({
          notes: dirtyNotes.map((n) => ({
            id: n.id,
            x: n.x,
            y: n.y,
          })),
        });

        navigator.sendBeacon("/api/notes/batch-save", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      handleBeforeUnload(); // Save before cleanup
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.disconnect();
    };
  }, [roomId, userName]);

  return { socket };
};
```

---

## 🧪 Testing Checklist

### **Test 1: Note Creation Sync**

1. Open room in Browser A
2. Open same room in Browser B (different user)
3. Create note in Browser A
4. ✅ Check: Note appears in Browser B instantly
5. ✅ Check: Refresh Browser B, note persists

---

### **Test 2: Note Dragging Sync**

1. Open room in Browser A and B
2. Drag note in Browser A
3. ✅ Check: Note moves in Browser B in real-time
4. ✅ Check: Refresh both browsers, note position saved

---

### **Test 3: Note Deletion Sync**

1. Open room in Browser A and B
2. Delete note in Browser A
3. ✅ Check: Note disappears in Browser B instantly
4. ✅ Check: Refresh both browsers, note gone

---

### **Test 4: Connection Loss Recovery**

1. Open room in Browser A
2. Stop Socket.io server (`Ctrl+C` in server terminal)
3. Try to create note
4. ✅ Check: Toast shows "Working offline"
5. Restart server
6. ✅ Check: Connection auto-reconnects
7. ✅ Check: Notes sync after reconnection

---

### **Test 5: Database Failure Rollback**

1. Stop database connection (disconnect Neon)
2. Try to create note
3. ✅ Check: Note appears locally first
4. ✅ Check: After 2 seconds, note disappears (rollback)
5. ✅ Check: Toast shows error message

---

## 📊 Performance Benchmarks

After implementation, test with multiple users:

| Metric                      | Target     | Test Method                                                       |
| --------------------------- | ---------- | ----------------------------------------------------------------- |
| Note creation sync          | < 50ms     | Create note in Browser A, measure time until appears in Browser B |
| Note drag latency           | < 16ms     | Drag note, check smoothness in other browser                      |
| Database queries per action | < 2        | Check server logs with `console.log`                              |
| Auto-save batch size        | < 10 notes | Check auto-save logs                                              |
| Reconnection time           | < 2s       | Disconnect server, measure time to reconnect                      |

---

## 🚀 Deployment Considerations

### **Environment Variables**

```env
# .env.local
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
```

### **Production Socket.io URL**

Update socket connection for production:

```typescript
// hooks/useSocket.ts
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
});
```

---

## 📝 Summary

**Total Time:** ~3 hours

1. ✅ Fix Prisma schema (15 min)
2. ✅ Add caching layer (20 min)
3. ✅ Define socket events (15 min)
4. ✅ Add server handlers (20 min)
5. ✅ Add client listeners (30 min)
6. ✅ Add client emitters (30 min)
7. ✅ Add auto-save (20 min)
8. ✅ Add disconnect save (15 min)
9. ✅ Testing (30 min)

**Result:** Fully functional real-time collaborative sticky notes app! 🎉

---

**Next Steps:**

- Start with Phase 1 (fix schema)
- Test each phase before moving to next
- Use browser DevTools Network tab to see Socket.io messages
- Check server logs for debugging

# 🧩 Phase 5: Component Extraction

> **Time**: ~2 hours  
> **Priority**: HIGH - This is where you make code readable  
> **Difficulty**: Medium

---

## 📋 Overview

Your page files are way too long:

- `dashboard/page.tsx` - **291 lines** (target: < 50)
- `room/[id]/page.tsx` - **322 lines** (target: < 50)
- `(home)/page.tsx` - **197 lines** (target: < 50)

The goal: **Extract components** so pages only compose them together.

---

## 🎯 The 100-Line Rule

Every file should be under **100 lines**. If it's longer:

1. **Extract a component** → `_components/ComponentName.tsx`
2. **Extract a hook** → `hooks/useHookName.ts`
3. **Extract utilities** → `lib/utils/utilName.ts`

---

## 📁 Component Organization

```
app/
├── dashboard/
│   ├── page.tsx              # < 50 lines - just composition
│   └── _components/          # Page-specific components
│       ├── DashboardHeader.tsx
│       ├── RoomSearch.tsx
│       ├── CreateRoomCard.tsx
│       ├── RecentRooms.tsx
│       ├── UserStatus.tsx
│       └── TipsCard.tsx
│
├── room/
│   └── [id]/
│       ├── page.tsx          # < 50 lines
│       └── _components/
│           ├── RoomHeader.tsx
│           ├── Canvas.tsx
│           ├── NotesLayer.tsx
│           ├── CursorsLayer.tsx
│           ├── StickyNote.tsx
│           ├── Cursor.tsx
│           ├── NoteForm.tsx
│           └── ZoomControls.tsx
│
└── (home)/
    ├── page.tsx              # < 50 lines
    └── _components/
        ├── Hero.tsx
        ├── FeatureCards.tsx
        ├── UserNameForm.tsx
        └── CTAButtons.tsx
```

### Why `_components/`?

The underscore prefix:

1. **Next.js ignores it** - Won't create routes
2. **Clear convention** - Shows these are private to the route
3. **Colocation** - Keeps related files together

---

## 📝 Step-by-Step: Dashboard Page

### Current State (291 lines!)

The page currently handles:

- Header with back button
- Search/join room form
- User status display
- Create room card
- Tips section
- Recent rooms list

### Target State (~40 lines)

```tsx
// app/dashboard/page.tsx
import { DashboardHeader } from "./_components/DashboardHeader";
import { RoomSearchCard } from "./_components/RoomSearchCard";
import { UserStatusCard } from "./_components/UserStatusCard";
import { QuickStartCard } from "./_components/QuickStartCard";
import { TipsCard } from "./_components/TipsCard";
import { RecentRoomsCard } from "./_components/RecentRoomsCard";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        <DashboardHeader />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <RoomSearchCard />
            <UserStatusCard />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <QuickStartCard />
            <TipsCard />
            <RecentRoomsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 1: Create `_components/DashboardHeader.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12"
    >
      <div className="space-y-1">
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-gray-400 font-medium">
          Dashboard
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Your Workspace
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Create, search, or rejoin existing rooms
        </p>
      </div>

      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:shadow hover:bg-gray-50 transition-all active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back to home</span>
        <span className="sm:hidden">Home</span>
      </button>
    </motion.div>
  );
}
```

**Lines: ~45** ✅

---

### Step 2: Create `_components/RoomSearchCard.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Search, ArrowRight } from "lucide-react";
import { verifyRoom } from "@/lib/actions/room.actions";
import { toast } from "sonner";

export function RoomSearchCard() {
  const router = useRouter();
  const { userId } = useAuth();
  const [roomInput, setRoomInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinRoom = async () => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    if (!roomInput.trim()) {
      toast.error("Please enter a room ID");
      return;
    }

    setIsLoading(true);

    const result = await verifyRoom({ roomId: roomInput });

    if (result.success) {
      router.push(`/room/${roomInput}`);
    } else {
      toast.error("Room not found", {
        description: "Please check the room ID and try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Find a room</p>
            <p className="text-sm text-gray-500">
              Search or enter room ID to join
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter room ID or search..."
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition-all focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
          />
          <button
            onClick={handleJoinRoom}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-60"
          >
            {isLoading ? (
              "Joining..."
            ) : (
              <>
                <span>Join Room</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Lines: ~85** ✅

---

### Step 3: Create `_components/QuickStartCard.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { createRoom } from "@/lib/actions/room.actions";
import { toast } from "sonner";
import { useUserStore } from "@/store/use-user-store";

export function QuickStartCard() {
  const router = useRouter();
  const { userId } = useAuth();
  const currentUser = useUserStore((s) => s.currentUser);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("roomName") as string;

    const result = await createRoom({ roomName: roomName || "New Room" });

    if (result.success) {
      router.push(`/room/${result.data.id}`);
    } else {
      toast.error(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="font-semibold text-gray-900">Quick Start</p>
        </div>
      </div>

      <div className="px-5 py-5">
        {userId ? (
          <CreateRoomForm
            username={currentUser?.userName}
            loading={loading}
            onSubmit={handleCreateRoom}
          />
        ) : (
          <SignInPrompt />
        )}
      </div>
    </div>
  );
}

// Sub-components (could be extracted further if needed)

function CreateRoomForm({
  username,
  loading,
  onSubmit,
}: {
  username?: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
          {(username || "A").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-gray-500">Welcome back,</p>
          <p className="font-semibold text-gray-900">{username || "Friend"}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="text"
          name="roomName"
          placeholder="Enter room name..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Room
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function SignInPrompt() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Sign in to create or join rooms</p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/sign-in")}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push("/sign-up")}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 transition-all active:scale-95"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
```

**Lines: ~130** - Slightly over, but has 3 sub-components. Could split further.

---

## 📝 Step-by-Step: Room Page

### Current State (322 lines!)

The page handles:

- Canvas setup
- Socket connection
- Zoom/pan
- Note dragging
- Note rendering
- Cursor rendering
- Header
- Zoom controls
- Note form modal

### Target State (~45 lines)

```tsx
// app/room/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { RoomProvider } from "./_components/RoomProvider";
import { RoomHeader } from "./_components/RoomHeader";
import { Canvas } from "./_components/Canvas";
import { ZoomControls } from "./_components/ZoomControls";
import { NoteFormModal } from "./_components/NoteFormModal";

export default function RoomPage() {
  const params = useParams<{ id: string }>();

  return (
    <RoomProvider roomId={params.id}>
      <div className="relative h-screen w-screen overflow-hidden bg-gray-50 touch-none">
        <RoomHeader />
        <Canvas />
        <ZoomControls />
        <NoteFormModal />
      </div>
    </RoomProvider>
  );
}
```

---

### Step 1: Create `_components/RoomProvider.tsx`

This is a **Context Provider** that handles:

- Socket connection
- Canvas transform state
- Current room info

```tsx
"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSocket } from "@/hooks/use-socket";
import {
  useCanvasTransform,
  type UseCanvasTransformReturn,
} from "@/hooks/use-canvas-transform";
import { useUserStore } from "@/store/use-user-store";

// ============================================
// TYPES
// ============================================

interface RoomContextValue {
  roomId: string;
  userId: string;
  canvas: UseCanvasTransformReturn;
}

interface RoomProviderProps {
  roomId: string;
  children: ReactNode;
}

// ============================================
// CONTEXT
// ============================================

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within RoomProvider");
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const { userId } = useAuth();
  const currentUser = useUserStore((s) => s.currentUser);
  const canvas = useCanvasTransform();

  // Connect to socket
  const socket = useSocket({
    roomId,
    userId: userId || "",
    userName: currentUser?.userName || "Anonymous",
    enabled: Boolean(userId),
  });

  // Guard: Must be authenticated
  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please sign in to access this room
          </p>
          <a href="/sign-in" className="text-amber-600 hover:underline">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={{ roomId, userId, canvas }}>
      {children}
    </RoomContext.Provider>
  );
}
```

**Lines: ~75** ✅

---

### Step 2: Create `_components/Canvas.tsx`

```tsx
"use client";

import { useCallback, useRef } from "react";
import { motion, useMotionTemplate, useTransform } from "framer-motion";
import { useRoom } from "./RoomProvider";
import { NotesLayer } from "./NotesLayer";
import { CursorsLayer } from "./CursorsLayer";
import { useNotesStore } from "@/store/use-notes-store";
import { useUIStore } from "@/store/use-ui-store";

export function Canvas() {
  const { canvas } = useRoom();
  const { springX, springY, springScale, containerRef, screenToWorld } = canvas;

  const openNoteForm = useUIStore((s) => s.openNoteForm);
  const selectNote = useNotesStore((s) => s.selectNote);

  const throttleRef = useRef(0);
  const THROTTLE_MS = 50;

  // Background dots pattern
  const bgSize = useTransform(springScale, (s: number) => {
    const size = Math.max(15, 20 * s);
    return `${size}px ${size}px`;
  });
  const bgPosition = useMotionTemplate`${springX}px ${springY}px`;

  // Handle double-click to create note
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // If clicking on a note, select it instead
      if (target.closest(".note-card")) {
        const noteId = target
          .closest(".note-card")
          ?.getAttribute("data-note-id");
        if (noteId) selectNote(noteId);
        return;
      }

      // Otherwise, open form at click position
      const worldPos = screenToWorld(e.clientX, e.clientY);
      openNoteForm({ x: worldPos.x, y: worldPos.y });
    },
    [screenToWorld, openNoteForm, selectNote]
  );

  // Handle click to deselect
  const handleClick = useCallback(() => {
    selectNote(null);
  }, [selectNote]);

  // Handle mouse move for cursor broadcast
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - throttleRef.current < THROTTLE_MS) return;
    throttleRef.current = now;

    // TODO: Emit cursor position via socket
  }, []);

  return (
    <>
      {/* Background pattern */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
          backgroundSize: bgSize,
          backgroundPosition: bgPosition,
        }}
      />

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      >
        {/* Transformed content */}
        <motion.div
          className="absolute origin-top-left"
          style={{
            x: springX,
            y: springY,
            scale: springScale,
            width: "10000px",
            height: "10000px",
          }}
        >
          {/* Welcome message */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
            <h2 className="text-4xl font-bold text-amber-900/80 tracking-tight">
              Welcome to StickyVerse
            </h2>
            <p className="text-gray-500 mt-2">
              Double-click anywhere to create a note
            </p>
          </div>

          <NotesLayer />
          <CursorsLayer />
        </motion.div>
      </div>
    </>
  );
}
```

**Lines: ~95** ✅

---

### Step 3: Create `_components/NotesLayer.tsx`

```tsx
"use client";

import { useNotesStore } from "@/store/use-notes-store";
import { useUIStore, useDragState } from "@/store/use-ui-store";
import { StickyNoteCard } from "./StickyNoteCard";

export function NotesLayer() {
  const notes = useNotesStore((s) => s.notes);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const { draggingNoteId } = useDragState();

  return (
    <>
      {notes.map((note) => (
        <StickyNoteCard
          key={note.id}
          note={note}
          isSelected={selectedNoteId === note.id}
          isDragging={draggingNoteId === note.id}
        />
      ))}
    </>
  );
}
```

**Lines: ~25** ✅

---

### Step 4: Create `_components/StickyNoteCard.tsx`

```tsx
"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { StickyNote } from "@/types";
import { useNotesStore } from "@/store/use-notes-store";
import { useUIStore } from "@/store/use-ui-store";
import { useRoom } from "./RoomProvider";
import { NOTE_COLORS, getColorStyle } from "@/constants/theme";

// ============================================
// TYPES
// ============================================

interface StickyNoteCardProps {
  note: StickyNote;
  isSelected: boolean;
  isDragging: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function StickyNoteCard({
  note,
  isSelected,
  isDragging,
}: StickyNoteCardProps) {
  const { canvas } = useRoom();
  const { screenToWorld } = canvas;

  const deleteNote = useNotesStore((s) => s.deleteNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const openEditForm = useUIStore((s) => s.openEditForm);
  const setDraggingNote = useUIStore((s) => s.setDraggingNote);

  const colorStyle = getColorStyle(note.noteName + (note.createdBy || ""));
  const rotation = getRotation(note.id);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isSelected) return; // Allow button clicks when selected
      e.preventDefault();
      setDraggingNote(note.id);
      // Store offset for drag calculation
    },
    [isSelected, setDraggingNote, note.id]
  );

  const handleEdit = useCallback(() => {
    openEditForm(note);
  }, [openEditForm, note]);

  const handleDelete = useCallback(() => {
    deleteNote(note.id);
    // TODO: Also delete from server
  }, [deleteNote, note.id]);

  return (
    <motion.div
      className="note-card absolute cursor-grab active:cursor-grabbing"
      data-note-id={note.id}
      style={{ left: note.x, top: note.y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.05 : 1,
        rotate: isDragging ? 0 : rotation,
        zIndex: isDragging ? 1000 : isSelected ? 100 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`
          w-[260px] min-h-[160px] rounded-xl border-2 p-4
          ${colorStyle.bg} ${colorStyle.border}
          shadow-lg ${isDragging ? "shadow-2xl" : ""}
          transition-shadow
        `}
      >
        {/* Header */}
        <div
          className={`-mx-4 -mt-4 px-4 py-2 rounded-t-lg ${colorStyle.header}`}
        >
          <h3 className={`font-semibold truncate ${colorStyle.text}`}>
            {note.noteName}
          </h3>
        </div>

        {/* Content */}
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
          {note.content}
        </p>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {note.createdBy || "Anonymous"}
          </span>

          {/* Action buttons - only show when selected */}
          {isSelected && (
            <div className="flex gap-1">
              <button
                onClick={handleEdit}
                className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// HELPERS
// ============================================

function getRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((Math.abs(hash) % 5) - 2) * 1.5; // -3 to +3 degrees
}
```

**Lines: ~120** - Slightly over, but reasonable for a complex component.

---

## 🧠 Component Design Principles

### 1. Props Down, Events Up

```tsx
// ❌ Bad - Child modifies parent state directly
function Child() {
  const setParentState = useParentStore((s) => s.setState);
  return <button onClick={() => setParentState({ value: 1 })} />;
}

// ✅ Good - Child emits events, parent handles
function Child({ onValueChange }: { onValueChange: (v: number) => void }) {
  return <button onClick={() => onValueChange(1)} />;
}
```

### 2. Single Responsibility

```tsx
// ❌ Bad - One component does everything
function Dashboard() {
  // fetching
  // form handling
  // list rendering
  // modal management
  // 300+ lines...
}

// ✅ Good - Separate concerns
function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <SearchSection />
      <RoomsList />
      <CreateModal />
    </>
  );
}
```

### 3. Composition Over Configuration

```tsx
// ❌ Bad - Tons of props
<Card
  title="Hello"
  subtitle="World"
  icon={<Star />}
  actions={[...]}
  variant="primary"
  size="large"
  // ... 20 more props
/>

// ✅ Good - Composition
<Card>
  <Card.Header>
    <Card.Icon><Star /></Card.Icon>
    <Card.Title>Hello</Card.Title>
    <Card.Subtitle>World</Card.Subtitle>
  </Card.Header>
  <Card.Actions>
    <Button>Save</Button>
  </Card.Actions>
</Card>
```

---

## ✅ Verification Checklist

After extracting components:

- [ ] Each page file is under 50 lines
- [ ] Each component file is under 100 lines
- [ ] Components are in `_components/` folders
- [ ] No circular imports
- [ ] All functionality still works
- [ ] TypeScript has no errors

---

## 📚 What You Learned

1. **Component Extraction** - How to break down large files
2. **File Organization** - `_components/` convention
3. **Context Providers** - Sharing state across components
4. **Composition** - Building UIs from small pieces
5. **Single Responsibility** - Each component does one thing
6. **Props vs State** - When to lift state up

---

## ⏭️ Next Step

Now that your components are clean, move on to:
**[06-HOOKS.md](./06-HOOKS.md)** - Split and organize custom hooks

---

## 🔗 Resources

- [React Component Patterns](https://react.dev/learn/thinking-in-react)
- [Composition vs Inheritance](https://react.dev/learn/sharing-state-between-components)
- [Next.js App Router Conventions](https://nextjs.org/docs/app/building-your-application/routing)

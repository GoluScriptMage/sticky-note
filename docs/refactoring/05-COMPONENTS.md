# 05 - Components Refactoring

## 🎯 Goal

Break down the 322-line `page.tsx` into small, focused components under 100 lines each.

**Why?**

- Easier to understand (each file does ONE thing)
- Easier to test
- Easier to modify without breaking other things
- Better performance (smaller components = more targeted re-renders)

---

## Current Problem: God Component

Your `page.tsx` currently handles:

1. Canvas transformation (zoom, pan)
2. Note dragging
3. Mouse position tracking
4. Socket communication
5. UI rendering (header, canvas, notes, cursors, form, zoom controls)
6. Event handlers (click, double-click, mouse move)
7. Loading states

**That's at least 7 different responsibilities in ONE file!**

---

## The Solution: Component Decomposition

### New Structure:

```
app/room/[id]/
├── page.tsx                    # ~80 lines - Orchestration only
├── layout.tsx                  # Room-level layout
│
├── components/
│   ├── RoomHeader.tsx          # ~50 lines
│   ├── Canvas.tsx              # ~60 lines
│   ├── CanvasBackground.tsx    # ~30 lines
│   ├── StickyNote.tsx          # (already exists, refine)
│   ├── NoteForm.tsx            # (already exists, keep)
│   ├── Cursor.tsx              # (already exists, keep)
│   └── ZoomControls.tsx        # (already exists, keep)
│
├── hooks/
│   ├── useNoteDrag.ts          # ~70 lines - Drag logic
│   ├── useMouseTracking.ts     # ~40 lines - Share cursor position
│   └── useRoomSocket.ts        # Room-specific socket setup
│
└── types.ts                    # Room-specific types
```

---

## Step 1: Extract `RoomHeader.tsx`

### Why This Component?

The header is completely independent. It doesn't need canvas state.

### Create the file:

```tsx
// app/room/[id]/components/RoomHeader.tsx
"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface RoomHeaderProps {
  /** Number of users in the room (including current user) */
  userCount: number;
}

/**
 * Room header with navigation and user info
 * Fixed position at top of screen
 */
export function RoomHeader({ userCount }: RoomHeaderProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 pointer-events-none">
      {/* Left side - Navigation & Logo */}
      <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
          title="Back to Dashboard"
          aria-label="Go back to dashboard"
        >
          <BackIcon />
        </button>

        <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
          Sticky<span className="text-amber-600">Verse</span>
        </h1>
      </div>

      {/* Right side - User count & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        <div className="bg-gray-900 text-white text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 rounded-full font-medium shadow-md">
          👥 {userCount}
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

// Extracted icon component
function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
```

### What We Did:

1. **Extracted** header JSX from page.tsx
2. **Made it a controlled component** - receives `userCount` as prop
3. **Extracted** the SVG icon into a separate function
4. **Added** TypeScript interface for props
5. **Added** accessibility attribute (`aria-label`)

---

## Step 2: Extract `CanvasBackground.tsx`

### Why This Component?

The animated dot pattern background is purely visual, no interaction logic.

```tsx
// app/room/[id]/components/CanvasBackground.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";

interface CanvasBackgroundProps {
  /** Background size motion value (reactive to zoom) */
  bgSize: MotionValue<string>;
  /** Background position motion value (reactive to pan) */
  bgPosition: MotionValue<string>;
}

/**
 * Animated dot grid background for the canvas
 * Responds to zoom and pan transformations
 */
export function CanvasBackground({
  bgSize,
  bgPosition,
}: CanvasBackgroundProps) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
      }}
    />
  );
}
```

### Why It's Separate:

- **Single responsibility** - Just draws dots
- **Reusable** - Could be used in other canvas contexts
- **Testable** - Easy to test in isolation

---

## Step 3: Extract `useNoteDrag.ts` Hook

### Why This Hook?

Note dragging is complex logic that shouldn't clutter the page component.

```tsx
// app/room/[id]/hooks/useNoteDrag.ts
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";

interface UseNoteDragOptions {
  /** Function to convert screen coordinates to world coordinates */
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
}

interface UseNoteDragReturn {
  /** Currently dragging note ID, or null */
  draggingNoteId: string | null;
  /** Call this when user starts dragging a note */
  handleDragStart: (
    noteId: string,
    e: React.MouseEvent | React.TouchEvent,
    noteX: number,
    noteY: number
  ) => void;
}

/**
 * Hook to handle note dragging with mouse and touch support
 *
 * @example
 * const { draggingNoteId, handleDragStart } = useNoteDrag({ screenToWorld });
 */
export function useNoteDrag({
  screenToWorld,
}: UseNoteDragOptions): UseNoteDragReturn {
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { updateNote } = useStickyStore(
    useShallow((state) => ({
      updateNote: state.updateNote,
    }))
  );

  // Handle mouse/touch move during drag
  useEffect(() => {
    if (!draggingNoteId) return;

    const handleMove = (clientX: number, clientY: number) => {
      const worldPos = screenToWorld(clientX, clientY);
      const newX = worldPos.x - dragOffsetRef.current.x;
      const newY = worldPos.y - dragOffsetRef.current.y;
      updateNote(draggingNoteId, { x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleEnd = () => {
      setDraggingNoteId(null);
      dragOffsetRef.current = { x: 0, y: 0 };
    };

    // Add listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [draggingNoteId, screenToWorld, updateNote]);

  // Start dragging
  const handleDragStart = useCallback(
    (
      noteId: string,
      e: React.MouseEvent | React.TouchEvent,
      noteX: number,
      noteY: number
    ) => {
      e.preventDefault();
      e.stopPropagation();

      // Get client coordinates
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDraggingNoteId(noteId);
      const clickWorld = screenToWorld(clientX, clientY);
      dragOffsetRef.current = {
        x: clickWorld.x - noteX,
        y: clickWorld.y - noteY,
      };
    },
    [screenToWorld]
  );

  return {
    draggingNoteId,
    handleDragStart,
  };
}
```

### What This Hook Does:

1. **Manages drag state** (`draggingNoteId`)
2. **Handles mouse move/up events** during drag
3. **Handles touch move/end events** for mobile
4. **Updates note position** in the store
5. **Cleans up event listeners** properly

---

## Step 4: Extract `useMouseTracking.ts` Hook

### Why This Hook?

Mouse position broadcasting to other users is separate from dragging.

```tsx
// app/room/[id]/hooks/useMouseTracking.ts
"use client";

import { useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types";

interface UseMouseTrackingOptions {
  /** Socket instance for broadcasting */
  socket: React.RefObject<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>;
  /** Convert screen to world coordinates */
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  /** Throttle delay in ms (default: 50) */
  throttleMs?: number;
}

/**
 * Hook to broadcast mouse position to other users
 * Throttled to prevent overwhelming the socket
 */
export function useMouseTracking({
  socket,
  screenToWorld,
  throttleMs = 50,
}: UseMouseTrackingOptions) {
  const lastBroadcastRef = useRef(0);

  const trackMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastBroadcastRef.current < throttleMs) return;
      lastBroadcastRef.current = now;

      const worldPos = screenToWorld(e.clientX, e.clientY);
      socket.current?.emit("mouse_move", { x: worldPos.x, y: worldPos.y });
    },
    [screenToWorld, socket, throttleMs]
  );

  return { trackMouseMove };
}
```

### What's Better:

1. **Single responsibility** - Only handles mouse tracking
2. **Configurable** - Throttle delay can be changed
3. **Reusable** - Could be used anywhere that needs mouse broadcasting

---

## Step 5: Create `Canvas.tsx` Component

### Why This Component?

Combines canvas-related rendering into one cohesive piece.

```tsx
// app/room/[id]/components/Canvas.tsx
"use client";

import { motion, type MotionValue } from "framer-motion";
import { CanvasBackground } from "./CanvasBackground";
import StickyNoteComponent from "./StickyNote";
import Cursor from "./Cursor";
import type { StickyNote, RemoteCursors } from "@/types";

interface CanvasProps {
  // Transform values
  containerRef: React.RefObject<HTMLDivElement>;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  springScale: MotionValue<number>;
  bgSize: MotionValue<string>;
  bgPosition: MotionValue<string>;

  // Data
  notes: StickyNote[];
  remoteCursors: RemoteCursors;

  // State
  selectedNoteId: string | null;
  draggingNoteId: string | null;

  // Handlers
  onDoubleClick: (e: React.MouseEvent) => void;
  onClick: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onNoteDragStart: (
    noteId: string,
    e: React.MouseEvent,
    x: number,
    y: number
  ) => void;
}

/**
 * Main canvas area with notes and remote cursors
 */
export function Canvas({
  containerRef,
  springX,
  springY,
  springScale,
  bgSize,
  bgPosition,
  notes,
  remoteCursors,
  selectedNoteId,
  draggingNoteId,
  onDoubleClick,
  onClick,
  onMouseMove,
  onNoteDragStart,
}: CanvasProps) {
  return (
    <>
      {/* Animated Background */}
      <CanvasBackground bgSize={bgSize} bgPosition={bgPosition} />

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        onMouseMove={onMouseMove}
      >
        {/* Transformed Content */}
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
          {/* Welcome Message */}
          <WelcomeMessage />

          {/* Sticky Notes */}
          {notes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              {...note}
              isDragging={draggingNoteId === note.id}
              showButtons={selectedNoteId === note.id && !draggingNoteId}
              onDragStart={onNoteDragStart}
            />
          ))}

          {/* Remote Cursors */}
          {Object.entries(remoteCursors).map(([userId, cursor]) => (
            <Cursor
              key={userId}
              x={cursor.x}
              y={cursor.y}
              userName={cursor.userName}
              color={cursor.color}
            />
          ))}
        </motion.div>
      </div>
    </>
  );
}

// Extracted welcome message
function WelcomeMessage() {
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
      <h2 className="text-4xl font-bold text-amber-900/80 tracking-tight whitespace-nowrap">
        Welcome to Sticky (-_-) Verse
      </h2>
      <p className="text-gray-500 mt-2">
        Double-click anywhere to create a note
      </p>
    </div>
  );
}
```

---

## Step 6: Refactored `page.tsx`

Now the page becomes a simple orchestrator:

```tsx
// app/room/[id]/page.tsx
"use client";

import { useCallback, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useShallow } from "zustand/shallow";
import { useMotionTemplate, useTransform } from "framer-motion";

// Store & Hooks
import { useStickyStore } from "@/store/useStickyStore";
import { useSocket } from "@/hooks/useSocket";
import { useCanvasTransform } from "@/hooks/useCanvasTransform";
import { useNoteDrag } from "./hooks/useNoteDrag";
import { useMouseTracking } from "./hooks/useMouseTracking";

// Components
import { RoomHeader } from "./components/RoomHeader";
import { Canvas } from "./components/Canvas";
import { ZoomControls } from "./components/ZoomControls";
import NoteForm from "./components/NoteForm";

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const { userId } = useAuth();
  const roomId = params.id;

  // Auth check
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Store
  const {
    notes,
    userData,
    remoteCursors,
    isFormOpen,
    formPosition,
    selectedNoteId,
    selectNote,
    openNoteForm,
    closeNoteForm,
    loadDummyData,
  } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      userData: state.userData,
      remoteCursors: state.remoteCursors,
      isFormOpen: state.isFormOpen,
      formPosition: state.formPosition,
      selectedNoteId: state.selectedNoteId,
      selectNote: state.selectNote,
      openNoteForm: state.openNoteForm,
      closeNoteForm: state.closeNoteForm,
      loadDummyData: state.loadDummyData,
    }))
  );

  // Canvas transform
  const {
    springX,
    springY,
    springScale,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    screenToWorld,
    x,
    y,
    scale,
  } = useCanvasTransform();

  // Socket connection
  const socket = useSocket(roomId, userId, userData?.userName || "");

  // Note dragging
  const { draggingNoteId, handleDragStart } = useNoteDrag({ screenToWorld });

  // Mouse tracking for other users
  const { trackMouseMove } = useMouseTracking({ socket, screenToWorld });

  // Current zoom level (for display)
  const [currentScale, setCurrentScale] = useState(1);
  useEffect(() => {
    return springScale.on("change", setCurrentScale);
  }, [springScale]);

  // Background animation values
  const bgSize = useTransform(springScale, (s) => {
    const size = Math.max(15, 20 * s);
    return `${size}px ${size}px`;
  });
  const bgPosition = useMotionTemplate`${springX}px ${springY}px`;

  // Load demo data
  useEffect(() => {
    loadDummyData();
  }, [loadDummyData]);

  // Handlers
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      openNoteForm(worldPos);
    },
    [screenToWorld, openNoteForm]
  );

  const handleCanvasClick = useCallback(() => {
    if (!draggingNoteId) {
      selectNote(null);
    }
  }, [draggingNoteId, selectNote]);

  const fitToScreen = useCallback(() => {
    if (typeof window === "undefined") return;
    x.set(window.innerWidth / 2 - 200);
    y.set(window.innerHeight / 2 - 100);
    scale.set(0.8);
  }, [x, y, scale]);

  // Loading state
  if (!userData) {
    return <LoadingState />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50 touch-none">
      <RoomHeader userCount={Object.keys(remoteCursors).length + 1} />

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFitToScreen={fitToScreen}
        scale={currentScale}
      />

      <Canvas
        containerRef={containerRef}
        springX={springX}
        springY={springY}
        springScale={springScale}
        bgSize={bgSize}
        bgPosition={bgPosition}
        notes={notes}
        remoteCursors={remoteCursors}
        selectedNoteId={selectedNoteId}
        draggingNoteId={draggingNoteId}
        onDoubleClick={handleDoubleClick}
        onClick={handleCanvasClick}
        onMouseMove={trackMouseMove}
        onNoteDragStart={handleDragStart}
      />

      {/* Note Form Modal */}
      {isFormOpen && formPosition && (
        <NoteFormModal onClose={closeNoteForm}>
          <NoteForm />
        </NoteFormModal>
      )}
    </div>
  );
}

// Simple loading component
function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Please set up your identity first.</p>
        <a href="/" className="px-6 py-2 bg-black text-white rounded-lg">
          Go to Home
        </a>
      </div>
    </div>
  );
}

// Modal wrapper for note form
function NoteFormModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </>
  );
}
```

---

## 📊 Before vs After Comparison

| Metric                   | Before | After             |
| ------------------------ | ------ | ----------------- |
| `page.tsx` lines         | 322    | ~100              |
| Number of files          | 1      | 6                 |
| Responsibilities in page | 7+     | 1 (orchestration) |
| Testable units           | 1      | 6                 |
| Reusable pieces          | 0      | 4+                |

---

## 🎓 What You Learned

### 1. Component Extraction Rules

**Extract when:**

- Component is > 100 lines
- Component has its own state
- Component could be reused
- Component has a clear single purpose

**Keep inline when:**

- It's just a few lines of JSX
- It's tightly coupled to parent
- It's only used once and simple

### 2. Hook Extraction Rules

**Extract when:**

- Logic is > 20 lines
- Logic involves useState/useEffect
- Logic could be reused
- Logic has clear input/output

### 3. Props Interface Design

```typescript
// ❌ Too many unrelated props
interface CanvasProps {
  notes: Note[];
  users: User[];
  isLoading: boolean;
  onSave: () => void;
  theme: "light" | "dark";
  language: string;
}

// ✅ Grouped by concern
interface CanvasProps {
  // Data
  notes: Note[];

  // State
  selectedNoteId: string | null;

  // Handlers
  onNoteSelect: (id: string) => void;
}
```

---

## ✅ Verification Checklist

After refactoring:

```bash
# 1. All files exist
ls app/room/[id]/components/
ls app/room/[id]/hooks/

# 2. No TypeScript errors
npx tsc --noEmit

# 3. Test functionality
# - Canvas pans and zooms
# - Notes can be created, edited, deleted
# - Notes can be dragged
# - Other users' cursors appear
# - Form opens on double-click
```

---

**Next: [06-HOOKS.md](./06-HOOKS.md)** - Splitting the 591-line useCanvasTransform!

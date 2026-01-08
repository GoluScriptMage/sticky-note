# 🪝 Phase 6: Hooks Refactoring

> **Time**: ~1 hour  
> **Priority**: MEDIUM - Makes logic reusable  
> **Difficulty**: Medium

---

## 📋 Overview

Your `useCanvasTransform.ts` is **591 lines**! That's way too much for a single hook.

It handles:

- Pan/zoom state
- Mouse wheel events
- Touch events (pinch/pan)
- Keyboard events
- Coordinate conversion
- Spring animations

Let's split it into focused, reusable hooks.

---

## 🎯 Target Architecture

```
hooks/
├── use-socket.ts              # Socket.io connection
├── canvas/
│   ├── index.ts              # Re-exports
│   ├── use-canvas-transform.ts   # Main hook (composition)
│   ├── use-pan-zoom.ts       # Pan & zoom state
│   ├── use-wheel-handler.ts  # Mouse wheel events
│   ├── use-touch-handler.ts  # Touch gestures
│   └── use-coordinates.ts    # Coordinate conversion
└── use-note-drag.ts          # Note dragging logic
```

---

## 📝 Step-by-Step Implementation

### Step 1: Create `hooks/canvas/use-pan-zoom.ts`

This hook manages the core pan/zoom state:

```typescript
/**
 * Pan & Zoom State Hook
 *
 * Manages the transform state for canvas pan and zoom.
 * Uses Framer Motion for smooth animations.
 */

"use client";

import { useCallback } from "react";
import { useMotionValue, useSpring, type SpringOptions } from "framer-motion";

// ============================================
// TYPES
// ============================================

export interface PanZoomState {
  /** Current X pan position */
  x: ReturnType<typeof useMotionValue<number>>;
  /** Current Y pan position */
  y: ReturnType<typeof useMotionValue<number>>;
  /** Current zoom scale */
  scale: ReturnType<typeof useMotionValue<number>>;
  /** Spring-animated X for smooth rendering */
  springX: ReturnType<typeof useSpring>;
  /** Spring-animated Y for smooth rendering */
  springY: ReturnType<typeof useSpring>;
  /** Spring-animated scale for smooth rendering */
  springScale: ReturnType<typeof useSpring>;
}

export interface PanZoomActions {
  /** Pan by a delta amount */
  pan: (deltaX: number, deltaY: number) => void;
  /** Set zoom level (0.25 to 3.0) */
  setZoom: (newScale: number) => void;
  /** Zoom toward a specific point */
  zoomToPoint: (screenX: number, screenY: number, newScale: number) => void;
  /** Reset to default view */
  reset: () => void;
  /** Get current transform values */
  getTransform: () => { x: number; y: number; scale: number };
}

export interface UsePanZoomReturn extends PanZoomState, PanZoomActions {}

// ============================================
// CONSTANTS
// ============================================

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3.0;

const SPRING_CONFIG: SpringOptions = {
  stiffness: 400,
  damping: 35,
  mass: 0.3,
};

// ============================================
// HOOK
// ============================================

export function usePanZoom(): UsePanZoomReturn {
  // Raw motion values (instant updates)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Spring-animated values (smooth rendering)
  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);
  const springScale = useSpring(scale, SPRING_CONFIG);

  // Pan by delta
  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      x.set(x.get() + deltaX);
      y.set(y.get() + deltaY);
    },
    [x, y]
  );

  // Set zoom with clamping
  const setZoom = useCallback(
    (newScale: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      scale.set(clamped);
    },
    [scale]
  );

  // Zoom toward a point (Figma-like behavior)
  const zoomToPoint = useCallback(
    (screenX: number, screenY: number, newScale: number) => {
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      // Calculate world position of zoom target
      const worldX = (screenX - currentX) / currentScale;
      const worldY = (screenY - currentY) / currentScale;

      // Calculate new pan to keep world position fixed
      const newX = screenX - worldX * clampedScale;
      const newY = screenY - worldY * clampedScale;

      scale.set(clampedScale);
      x.set(newX);
      y.set(newY);
    },
    [scale, x, y]
  );

  // Reset to default
  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
  }, [x, y, scale]);

  // Get current values (for event handlers)
  const getTransform = useCallback(
    () => ({
      x: x.get(),
      y: y.get(),
      scale: scale.get(),
    }),
    [x, y, scale]
  );

  return {
    x,
    y,
    scale,
    springX,
    springY,
    springScale,
    pan,
    setZoom,
    zoomToPoint,
    reset,
    getTransform,
  };
}
```

**Lines: ~115** ✅

---

### Step 2: Create `hooks/canvas/use-coordinates.ts`

```typescript
/**
 * Coordinate Conversion Hook
 *
 * Converts between screen space and world space coordinates.
 */

"use client";

import { useCallback, type RefObject } from "react";
import type { MotionValue } from "framer-motion";

// ============================================
// TYPES
// ============================================

interface UseCoordinatesOptions {
  containerRef: RefObject<HTMLDivElement>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface UseCoordinatesReturn {
  /** Convert screen coordinates to world coordinates */
  screenToWorld: (screenX: number, screenY: number) => Coordinates;
  /** Convert world coordinates to screen coordinates */
  worldToScreen: (worldX: number, worldY: number) => Coordinates;
}

// ============================================
// HOOK
// ============================================

export function useCoordinates({
  containerRef,
  x,
  y,
  scale,
}: UseCoordinatesOptions): UseCoordinatesReturn {
  /**
   * Convert screen coordinates to world coordinates.
   * Used when: clicking to create notes, handling mouse events.
   *
   * Formula: worldPos = (screenPos - pan) / scale
   */
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Coordinates => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Position relative to container
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // Convert to world space
      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      return { x: worldX, y: worldY };
    },
    [containerRef, scale, x, y]
  );

  /**
   * Convert world coordinates to screen coordinates.
   * Used when: positioning UI elements relative to world objects.
   *
   * Formula: screenPos = (worldPos * scale) + pan
   */
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Coordinates => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      const screenX = worldX * currentScale + currentX + rect.left;
      const screenY = worldY * currentScale + currentY + rect.top;

      return { x: screenX, y: screenY };
    },
    [containerRef, scale, x, y]
  );

  return { screenToWorld, worldToScreen };
}
```

**Lines: ~90** ✅

---

### Step 3: Create `hooks/canvas/use-wheel-handler.ts`

```typescript
/**
 * Wheel Event Handler Hook
 *
 * Handles mouse wheel events for pan and zoom.
 */

"use client";

import { useEffect, type RefObject } from "react";

// ============================================
// TYPES
// ============================================

interface UseWheelHandlerOptions {
  containerRef: RefObject<HTMLDivElement>;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (screenX: number, screenY: number, scaleDelta: number) => void;
  enabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const ZOOM_SENSITIVITY = 0.008;

// ============================================
// HOOK
// ============================================

export function useWheelHandler({
  containerRef,
  onPan,
  onZoom,
  enabled = true,
}: UseWheelHandlerOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom: ctrl+scroll or trackpad pinch
        // deltaY > 0 means zoom out, < 0 means zoom in
        const scaleDelta = -e.deltaY * ZOOM_SENSITIVITY;
        onZoom(e.clientX, e.clientY, scaleDelta);
      } else {
        // Pan: regular scroll
        onPan(-e.deltaX, -e.deltaY);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, onPan, onZoom, enabled]);
}
```

**Lines: ~60** ✅

---

### Step 4: Create `hooks/canvas/use-touch-handler.ts`

```typescript
/**
 * Touch Event Handler Hook
 *
 * Handles touch events for single-finger pan and pinch-to-zoom.
 */

"use client";

import { useEffect, useRef, type RefObject } from "react";

// ============================================
// TYPES
// ============================================

interface UseTouchHandlerOptions {
  containerRef: RefObject<HTMLDivElement>;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (centerX: number, centerY: number, newScale: number) => void;
  getCurrentScale: () => number;
  enabled?: boolean;
}

interface TouchState {
  initialDistance: number;
  initialScale: number;
  initialCenter: { x: number; y: number };
  lastX: number;
  lastY: number;
}

// ============================================
// HELPERS
// ============================================

function getDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

// ============================================
// HOOK
// ============================================

export function useTouchHandler({
  containerRef,
  onPan,
  onZoom,
  getCurrentScale,
  enabled = true,
}: UseTouchHandlerOptions): void {
  const touchStateRef = useRef<TouchState | null>(null);
  const singleTouchRef = useRef<{ lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore if touching a note
      const target = e.target as HTMLElement;
      if (target.closest(".note-card")) return;

      if (e.touches.length === 2) {
        // Two-finger pinch
        e.preventDefault();
        singleTouchRef.current = null;
        touchStateRef.current = {
          initialDistance: getDistance(e.touches),
          initialScale: getCurrentScale(),
          initialCenter: getCenter(e.touches),
          lastX: 0,
          lastY: 0,
        };
      } else if (e.touches.length === 1) {
        // Single finger pan
        const touch = e.touches[0];
        singleTouchRef.current = {
          lastX: touch.clientX,
          lastY: touch.clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".note-card")) return;

      if (e.touches.length === 2 && touchStateRef.current) {
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const distanceRatio =
          currentDistance / touchStateRef.current.initialDistance;
        const newScale = touchStateRef.current.initialScale * distanceRatio;

        const center = getCenter(e.touches);
        onZoom(center.x, center.y, newScale);
      } else if (e.touches.length === 1 && singleTouchRef.current) {
        e.preventDefault();

        const touch = e.touches[0];
        const deltaX = touch.clientX - singleTouchRef.current.lastX;
        const deltaY = touch.clientY - singleTouchRef.current.lastY;

        onPan(deltaX, deltaY);

        singleTouchRef.current = {
          lastX: touch.clientX,
          lastY: touch.clientY,
        };
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current = null;
      singleTouchRef.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef, onPan, onZoom, getCurrentScale, enabled]);
}
```

**Lines: ~130** - Slightly over but manages complex touch logic.

---

### Step 5: Create Main `hooks/canvas/use-canvas-transform.ts`

This composes all the smaller hooks:

```typescript
/**
 * Canvas Transform Hook
 *
 * Composes pan/zoom, wheel, touch, and coordinate hooks
 * into a single, easy-to-use hook.
 */

"use client";

import { useRef, useCallback } from "react";
import { usePanZoom, MIN_SCALE, MAX_SCALE } from "./use-pan-zoom";
import { useCoordinates } from "./use-coordinates";
import { useWheelHandler } from "./use-wheel-handler";
import { useTouchHandler } from "./use-touch-handler";

// ============================================
// TYPES
// ============================================

export interface UseCanvasTransformReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement>;

  // Motion values for rendering
  springX: ReturnType<typeof usePanZoom>["springX"];
  springY: ReturnType<typeof usePanZoom>["springY"];
  springScale: ReturnType<typeof usePanZoom>["springScale"];

  // Raw values for calculations
  x: ReturnType<typeof usePanZoom>["x"];
  y: ReturnType<typeof usePanZoom>["y"];
  scale: ReturnType<typeof usePanZoom>["scale"];

  // Actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;

  // Coordinate conversion
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };

  // Current state getter
  getTransform: () => { x: number; y: number; scale: number };
}

// ============================================
// CONSTANTS
// ============================================

const ZOOM_STEP = 0.15;

// ============================================
// HOOK
// ============================================

export function useCanvasTransform(): UseCanvasTransformReturn {
  const containerRef = useRef<HTMLDivElement>(null);

  // Core pan/zoom state
  const {
    x,
    y,
    scale,
    springX,
    springY,
    springScale,
    pan,
    zoomToPoint,
    reset,
    getTransform,
  } = usePanZoom();

  // Coordinate conversion
  const { screenToWorld, worldToScreen } = useCoordinates({
    containerRef,
    x,
    y,
    scale,
  });

  // Wheel handler
  useWheelHandler({
    containerRef,
    onPan: pan,
    onZoom: (screenX, screenY, scaleDelta) => {
      const currentScale = scale.get();
      const newScale = currentScale * (1 + scaleDelta);
      zoomToPoint(screenX, screenY, newScale);
    },
  });

  // Touch handler
  useTouchHandler({
    containerRef,
    onPan: pan,
    onZoom: zoomToPoint,
    getCurrentScale: () => scale.get(),
  });

  // Zoom in/out buttons
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, scale.get() + ZOOM_STEP);
  }, [scale, zoomToPoint]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, scale.get() - ZOOM_STEP);
  }, [scale, zoomToPoint]);

  return {
    containerRef,
    springX,
    springY,
    springScale,
    x,
    y,
    scale,
    zoomIn,
    zoomOut,
    resetView: reset,
    screenToWorld,
    worldToScreen,
    getTransform,
  };
}

// Re-export constants
export { MIN_SCALE, MAX_SCALE };
```

**Lines: ~125** ✅

---

### Step 6: Create `hooks/canvas/index.ts`

```typescript
/**
 * Canvas Hooks Index
 *
 * Re-exports all canvas-related hooks.
 */

export {
  useCanvasTransform,
  MIN_SCALE,
  MAX_SCALE,
} from "./use-canvas-transform";
export type { UseCanvasTransformReturn } from "./use-canvas-transform";

export { usePanZoom } from "./use-pan-zoom";
export type {
  PanZoomState,
  PanZoomActions,
  UsePanZoomReturn,
} from "./use-pan-zoom";

export { useCoordinates } from "./use-coordinates";
export type { Coordinates, UseCoordinatesReturn } from "./use-coordinates";

export { useWheelHandler } from "./use-wheel-handler";
export { useTouchHandler } from "./use-touch-handler";
```

---

### Step 7: Refactor `hooks/use-socket.ts`

```typescript
/**
 * Socket.io Connection Hook
 *
 * Manages real-time socket connection and events.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomEventPayload,
} from "@/types";
import { useUserStore } from "@/store/use-user-store";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface UseSocketOptions {
  roomId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}

interface UseSocketReturn {
  /** Emit a cursor position update */
  emitCursorMove: (x: number, y: number) => void;
  /** Check if socket is connected */
  isConnected: boolean;
}

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

// ============================================
// CONSTANTS
// ============================================

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// ============================================
// HOOK
// ============================================

export function useSocket({
  roomId,
  userId,
  userName,
  enabled = true,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<SocketType | null>(null);
  const isConnectedRef = useRef(false);

  const upsertOtherUser = useUserStore((s) => s.upsertOtherUser);
  const removeOtherUser = useUserStore((s) => s.removeOtherUser);

  // Setup socket connection
  useEffect(() => {
    if (!enabled || !userId || !roomId) return;

    // Create socket connection
    const socket: SocketType = io(SOCKET_URL);
    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("🔌 Socket connected");
      isConnectedRef.current = true;

      // Join the room
      const payload: RoomEventPayload = { userId, roomId, userName };
      socket.emit("join_room", payload);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      isConnectedRef.current = false;
    });

    // Room events
    socket.on("user_joined", (data) => {
      upsertOtherUser(data.userId, {
        userName: data.userName,
        x: 0,
        y: 0,
        color: generateUserColor(data.userId),
      });
      toast.success(`${data.userName} joined the room`);
    });

    socket.on("user_left", (data) => {
      removeOtherUser(data.userId);
      toast.info(`${data.userName} left the room`);
    });

    socket.on("mouse_update", (data) => {
      upsertOtherUser(data.userId, { x: data.x, y: data.y });
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    };
  }, [enabled, userId, roomId, userName, upsertOtherUser, removeOtherUser]);

  // Emit cursor position
  const emitCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit("mouse_move", { x, y });
  }, []);

  return {
    emitCursorMove,
    isConnected: isConnectedRef.current,
  };
}

// ============================================
// HELPERS
// ============================================

function generateUserColor(userId: string): string {
  const colors = [
    "#ff4757",
    "#2ed573",
    "#1e90ff",
    "#ffa502",
    "#9c88ff",
    "#ff6b81",
    "#00d2d3",
    "#ff9ff3",
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
```

**Lines: ~125** ✅

---

## 🧠 Hook Design Principles

### 1. Single Responsibility

```typescript
// ❌ Bad - Hook does too much
function useEverything() {
  // state management
  // API calls
  // event handlers
  // animations
  // 500 lines...
}

// ✅ Good - Focused hooks
function usePanZoom() {
  /* pan/zoom logic */
}
function useCoordinates() {
  /* coordinate conversion */
}
function useWheelHandler() {
  /* wheel events */
}
```

### 2. Composition Over Inheritance

```typescript
// ✅ Compose small hooks into bigger ones
function useCanvasTransform() {
  const panZoom = usePanZoom();
  const coords = useCoordinates({ ...panZoom });
  const wheel = useWheelHandler({ ...panZoom });

  return { ...panZoom, ...coords };
}
```

### 3. Options Object for Many Parameters

```typescript
// ❌ Bad - Too many positional parameters
function useSocket(roomId, userId, userName, enabled, onConnect) {}

// ✅ Good - Options object
function useSocket(options: UseSocketOptions) {}
```

### 4. Return Object for Multiple Values

```typescript
// ❌ Bad - Array return (React useState style)
function useToggle(): [boolean, () => void] {}

// ✅ Good - Object return (named values)
function useToggle(): { isOn: boolean; toggle: () => void } {}
```

---

## ✅ Verification Checklist

After refactoring:

- [ ] Each hook file is under 150 lines
- [ ] `useCanvasTransform` works as before
- [ ] Pan with mouse scroll works
- [ ] Zoom with ctrl+scroll works
- [ ] Touch pan works on mobile
- [ ] Pinch-to-zoom works
- [ ] Socket connects and shows other users
- [ ] Cursor positions update in real-time

---

## 📚 What You Learned

1. **Hook Composition** - Building complex hooks from simple ones
2. **Separation of Concerns** - Each hook does one thing
3. **Options Object Pattern** - Clean API for hooks with many options
4. **Event Handler Hooks** - Managing DOM events in React
5. **Ref Management** - Using refs for mutable state that doesn't trigger re-renders
6. **Cleanup Functions** - Properly cleaning up effects

---

## ⏭️ Next Step

Now that all code is refactored, move on to:
**[07-FINAL-CHECKLIST.md](./07-FINAL-CHECKLIST.md)** - Final verification

---

## 🔗 Resources

- [Building Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [useEffect Guide](https://react.dev/learn/synchronizing-with-effects)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)

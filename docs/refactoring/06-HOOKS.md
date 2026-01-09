# 06 - Hooks Refactoring

## 🎯 Goal

Split the 591-line `useCanvasTransform.ts` into smaller, focused hooks.

**Why?**

- 591 lines is too much for one hook
- Different concerns are mixed together
- Hard to test individual parts
- Hard to reuse specific functionality

---

## Current Problem Analysis

`useCanvasTransform.ts` currently handles:

| Lines   | Responsibility                                           |
| ------- | -------------------------------------------------------- |
| 1-75    | Documentation, types, constants                          |
| 76-145  | Hook setup, motion values                                |
| 146-180 | Coordinate conversion (`screenToWorld`, `worldToScreen`) |
| 181-230 | Zoom helpers (`zoomToPoint`)                             |
| 231-260 | Public controls (`zoomIn`, `zoomOut`, `resetView`)       |
| 261-485 | Wheel, touch, and mouse event handlers                   |
| 486-580 | Keyboard controls                                        |
| 581-591 | Return statement                                         |

**That's 5 different areas!** Let's split them.

---

## The Solution: Split Into Focused Hooks

### New Structure:

```
hooks/
├── canvas/
│   ├── index.ts               # Re-exports
│   ├── useCanvasTransform.ts  # Main hook (slim orchestrator)
│   ├── useCanvasGestures.ts   # Touch/mouse gestures
│   ├── useCanvasKeyboard.ts   # Keyboard controls
│   ├── useCoordinates.ts      # Coordinate conversion
│   └── types.ts               # Shared types
│
├── useSocket.ts               # (keep, already small)
└── useCanvasTransform.ts      # DEPRECATED - redirect to canvas/
```

---

## Step 1: Create Shared Types

```typescript
// hooks/canvas/types.ts

import type { MotionValue, SpringOptions } from "framer-motion";

// ============================================================================
// CONSTANTS
// ============================================================================

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3.0;
export const ZOOM_SENSITIVITY = 0.008;
export const ZOOM_BUTTON_STEP = 0.15;
export const PAN_SPEED = 50;

export const SPRING_CONFIG: SpringOptions = {
  stiffness: 400,
  damping: 35,
  mass: 0.3,
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw transform values (immediate updates)
 */
export interface TransformValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

/**
 * Spring-animated transform values (smooth updates)
 */
export interface SpringTransformValues {
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  springScale: MotionValue<number>;
}

/**
 * Zoom control functions
 */
export interface ZoomControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  zoomToPoint: (screenX: number, screenY: number, newScale: number) => void;
}

/**
 * Coordinate conversion functions
 */
export interface CoordinateConverters {
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  getTransform: () => { x: number; y: number; scale: number };
}

/**
 * Complete return type for useCanvasTransform
 */
export interface UseCanvasTransformReturn
  extends TransformValues,
    SpringTransformValues,
    ZoomControls,
    CoordinateConverters {
  containerRef: React.RefObject<HTMLDivElement>;
}
```

### Why These Types?

1. **`TransformValues`** - Groups related motion values
2. **`SpringTransformValues`** - Spring versions for rendering
3. **`ZoomControls`** - All zoom-related functions
4. **`CoordinateConverters`** - All coordinate conversion functions

---

## Step 2: Create `useCoordinates.ts`

### Why This Hook?

Coordinate conversion is pure math, completely separate from gestures.

```typescript
// hooks/canvas/useCoordinates.ts
"use client";

import { useCallback } from "react";
import type { MotionValue } from "framer-motion";
import type { CoordinateConverters } from "./types";

interface UseCoordinatesOptions {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for coordinate conversion between screen and world space
 *
 * COORDINATE SYSTEM:
 * - Screen Space: Pixels relative to viewport (e.clientX, e.clientY)
 * - World Space: Coordinates in the infinite canvas
 *
 * FORMULAS:
 * - Screen → World: worldX = (screenX - panX) / scale
 * - World → Screen: screenX = (worldX * scale) + panX
 */
export function useCoordinates({
  x,
  y,
  scale,
  containerRef,
}: UseCoordinatesOptions): CoordinateConverters {
  /**
   * Convert screen coordinates to world coordinates
   * Used when: placing notes, handling clicks
   */
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Position relative to container
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // Undo transform: worldPos = (screenPos - pan) / scale
      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      return { x: worldX, y: worldY };
    },
    [scale, x, y, containerRef]
  );

  /**
   * Convert world coordinates to screen coordinates
   * Used when: positioning UI relative to world objects
   */
  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Apply transform: screenPos = (worldPos * scale) + pan
      const screenX = worldX * currentScale + currentX + rect.left;
      const screenY = worldY * currentScale + currentY + rect.top;

      return { x: screenX, y: screenY };
    },
    [scale, x, y, containerRef]
  );

  /**
   * Get current transform values (non-reactive, for event handlers)
   */
  const getTransform = useCallback(() => {
    return { x: x.get(), y: y.get(), scale: scale.get() };
  }, [x, y, scale]);

  return {
    screenToWorld,
    worldToScreen,
    getTransform,
  };
}
```

### What's Better:

1. **Focused** - Only does coordinate math
2. **Documented** - Explains the formulas
3. **Testable** - Easy to unit test
4. **~70 lines** instead of buried in 591

---

## Step 3: Create `useCanvasGestures.ts`

### Why This Hook?

All mouse/touch gesture handling in one place.

```typescript
// hooks/canvas/useCanvasGestures.ts
"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { MIN_SCALE, MAX_SCALE, ZOOM_SENSITIVITY } from "./types";

interface UseCanvasGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  zoomToPoint: (screenX: number, screenY: number, newScale: number) => void;
}

/**
 * Hook to handle canvas gestures:
 * - Wheel: Pan (scroll) / Zoom (ctrl+scroll)
 * - Touch: Single-finger pan / Pinch-to-zoom
 * - Middle mouse: Drag to pan
 */
export function useCanvasGestures({
  containerRef,
  x,
  y,
  scale,
  zoomToPoint,
}: UseCanvasGesturesOptions): void {
  // Touch state for pinch-to-zoom
  const touchState = useRef<{
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialPan: { x: number; y: number };
  } | null>(null);

  // Single finger pan state
  const singleTouchState = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    velocityX: number;
    velocityY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  } | null>(null);

  // Middle mouse pan state
  const middleMouseState = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // =========================================
    // WHEEL: Pan + Zoom
    // =========================================
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom with ctrl+wheel
        const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = scale.get() * (1 + zoomDelta);
        zoomToPoint(e.clientX, e.clientY, newScale);
      } else {
        // Pan with wheel
        x.set(x.get() - e.deltaX);
        y.set(y.get() - e.deltaY);
      }
    };

    // =========================================
    // TOUCH HELPERS
    // =========================================
    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touches: TouchList) => {
      if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    // =========================================
    // TOUCH START
    // =========================================
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) return;

      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        singleTouchState.current = null;
        touchState.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scale.get(),
          initialCenter: getCenter(e.touches),
          initialPan: { x: x.get(), y: y.get() },
        };
      } else if (e.touches.length === 1) {
        // Pan start
        const touch = e.touches[0];
        singleTouchState.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startPanX: x.get(),
          startPanY: y.get(),
          lastX: touch.clientX,
          lastY: touch.clientY,
          velocityX: 0,
          velocityY: 0,
          lastTime: Date.now(),
        };
      }
    };

    // =========================================
    // TOUCH MOVE
    // =========================================
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) return;

      if (e.touches.length === 2 && touchState.current) {
        // Pinch move
        e.preventDefault();
        handlePinchMove(e.touches);
      } else if (e.touches.length === 1 && singleTouchState.current) {
        // Pan move
        e.preventDefault();
        handlePanMove(e.touches[0]);
      }
    };

    const handlePinchMove = (touches: TouchList) => {
      if (!touchState.current) return;

      const currentDistance = getDistance(touches);
      const currentCenter = getCenter(touches);

      // Calculate new scale
      const ratio = currentDistance / touchState.current.initialDistance;
      const newScale = touchState.current.initialScale * ratio;
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      // Calculate pan offset
      const panDeltaX = currentCenter.x - touchState.current.initialCenter.x;
      const panDeltaY = currentCenter.y - touchState.current.initialCenter.y;

      // Apply zoom toward pinch center
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = touchState.current.initialCenter.x - rect.left;
      const centerY = touchState.current.initialCenter.y - rect.top;

      const worldX =
        (centerX - touchState.current.initialPan.x) /
        touchState.current.initialScale;
      const worldY =
        (centerY - touchState.current.initialPan.y) /
        touchState.current.initialScale;

      const newX = centerX - worldX * clampedScale + panDeltaX;
      const newY = centerY - worldY * clampedScale + panDeltaY;

      scale.set(clampedScale);
      x.set(newX);
      y.set(newY);
    };

    const handlePanMove = (touch: Touch) => {
      if (!singleTouchState.current) return;

      const now = Date.now();
      const dt = now - singleTouchState.current.lastTime;

      // Track velocity for momentum
      if (dt > 0) {
        singleTouchState.current.velocityX =
          (touch.clientX - singleTouchState.current.lastX) / dt;
        singleTouchState.current.velocityY =
          (touch.clientY - singleTouchState.current.lastY) / dt;
      }

      singleTouchState.current.lastX = touch.clientX;
      singleTouchState.current.lastY = touch.clientY;
      singleTouchState.current.lastTime = now;

      // Apply pan
      const deltaX = touch.clientX - singleTouchState.current.startX;
      const deltaY = touch.clientY - singleTouchState.current.startY;

      x.set(singleTouchState.current.startPanX + deltaX);
      y.set(singleTouchState.current.startPanY + deltaY);
    };

    // =========================================
    // TOUCH END (with momentum)
    // =========================================
    const handleTouchEnd = (e: TouchEvent) => {
      if (singleTouchState.current && e.touches.length === 0) {
        const { velocityX, velocityY } = singleTouchState.current;
        const momentum = 150;

        if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
          x.set(x.get() + velocityX * momentum);
          y.set(y.get() + velocityY * momentum);
        }
      }

      touchState.current = null;
      singleTouchState.current = null;
    };

    // =========================================
    // MIDDLE MOUSE PAN
    // =========================================
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        middleMouseState.current = {
          startX: e.clientX,
          startY: e.clientY,
          startPanX: x.get(),
          startPanY: y.get(),
        };
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!middleMouseState.current) return;
      const deltaX = e.clientX - middleMouseState.current.startX;
      const deltaY = e.clientY - middleMouseState.current.startY;
      x.set(middleMouseState.current.startPanX + deltaX);
      y.set(middleMouseState.current.startPanY + deltaY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && middleMouseState.current) {
        middleMouseState.current = null;
        container.style.cursor = "";
      }
    };

    // =========================================
    // ATTACH LISTENERS
    // =========================================
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp as EventListener);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener(
        "mouseleave",
        handleMouseUp as EventListener
      );
    };
  }, [containerRef, x, y, scale, zoomToPoint]);
}
```

---

## Step 4: Create `useCanvasKeyboard.ts`

### Why This Hook?

Keyboard controls are completely separate from mouse/touch.

```typescript
// hooks/canvas/useCanvasKeyboard.ts
"use client";

import { useEffect } from "react";
import type { MotionValue } from "framer-motion";
import { PAN_SPEED } from "./types";

interface UseCanvasKeyboardOptions {
  x: MotionValue<number>;
  y: MotionValue<number>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

/**
 * Hook for keyboard controls:
 * - Arrow keys / WASD: Pan
 * - Ctrl++ / Ctrl+-: Zoom
 * - Ctrl+0: Reset view
 */
export function useCanvasKeyboard({
  x,
  y,
  zoomIn,
  zoomOut,
  resetView,
}: UseCanvasKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Pan with arrow keys / WASD
      let dx = 0;
      let dy = 0;

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          dy = PAN_SPEED;
          break;
        case "arrowdown":
        case "s":
          dy = -PAN_SPEED;
          break;
        case "arrowleft":
        case "a":
          dx = PAN_SPEED;
          break;
        case "arrowright":
        case "d":
          dx = -PAN_SPEED;
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          return;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          return;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetView();
          }
          return;
        default:
          return;
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        x.set(x.get() + dx);
        y.set(y.get() + dy);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [x, y, zoomIn, zoomOut, resetView]);
}
```

---

## Step 5: Create Main `useCanvasTransform.ts`

Now the main hook just orchestrates:

```typescript
// hooks/canvas/useCanvasTransform.ts
"use client";

import { useCallback, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

import {
  SPRING_CONFIG,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_BUTTON_STEP,
  type UseCanvasTransformReturn,
} from "./types";
import { useCoordinates } from "./useCoordinates";
import { useCanvasGestures } from "./useCanvasGestures";
import { useCanvasKeyboard } from "./useCanvasKeyboard";

/**
 * Main hook for canvas pan/zoom functionality
 *
 * Features:
 * - Smooth spring animations
 * - Mouse wheel pan & zoom
 * - Touch gestures (pinch, pan)
 * - Keyboard controls
 * - Coordinate conversion
 */
export function useCanvasTransform(): UseCanvasTransformReturn {
  const containerRef = useRef<HTMLDivElement>(null);

  // Raw motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Spring-animated values
  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);
  const springScale = useSpring(scale, SPRING_CONFIG);

  // Coordinate conversion
  const { screenToWorld, worldToScreen, getTransform } = useCoordinates({
    x,
    y,
    scale,
    containerRef,
  });

  // Zoom toward point helper
  const zoomToPoint = useCallback(
    (targetScreenX: number, targetScreenY: number, newScale: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      const relativeX = targetScreenX - rect.left;
      const relativeY = targetScreenY - rect.top;

      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      const newX = relativeX - worldX * clampedScale;
      const newY = relativeY - worldY * clampedScale;

      scale.set(clampedScale);
      x.set(newX);
      y.set(newY);
    },
    [scale, x, y]
  );

  // Zoom controls
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomToPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      scale.get() + ZOOM_BUTTON_STEP
    );
  }, [scale, zoomToPoint]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomToPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      scale.get() - ZOOM_BUTTON_STEP
    );
  }, [scale, zoomToPoint]);

  const resetView = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
  }, [x, y, scale]);

  // Initialize gesture and keyboard handlers
  useCanvasGestures({ containerRef, x, y, scale, zoomToPoint });
  useCanvasKeyboard({ x, y, zoomIn, zoomOut, resetView });

  return {
    x,
    y,
    scale,
    springX,
    springY,
    springScale,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    zoomToPoint,
    screenToWorld,
    worldToScreen,
    getTransform,
  };
}
```

---

## Step 6: Create Index File

```typescript
// hooks/canvas/index.ts

export { useCanvasTransform } from "./useCanvasTransform";
export { useCoordinates } from "./useCoordinates";
export { useCanvasGestures } from "./useCanvasGestures";
export { useCanvasKeyboard } from "./useCanvasKeyboard";
export * from "./types";
```

---

## Step 7: Update Import in Page

```typescript
// Before
import { useCanvasTransform } from "@/hooks/useCanvasTransform";

// After
import { useCanvasTransform } from "@/hooks/canvas";
```

---

## 📊 Before vs After

| Metric               | Before | After |
| -------------------- | ------ | ----- |
| Lines in main hook   | 591    | ~90   |
| Number of files      | 1      | 6     |
| Testable units       | 1      | 4     |
| Lines per file (avg) | 591    | ~100  |

### File Sizes After:

| File                    | Lines | Responsibility       |
| ----------------------- | ----- | -------------------- |
| `types.ts`              | ~60   | Types & constants    |
| `useCoordinates.ts`     | ~70   | Coordinate math      |
| `useCanvasGestures.ts`  | ~200  | Mouse/touch handling |
| `useCanvasKeyboard.ts`  | ~60   | Keyboard controls    |
| `useCanvasTransform.ts` | ~90   | Orchestration        |
| `index.ts`              | ~10   | Exports              |

**Total: ~490 lines** (but organized into logical units)

---

## 🎓 What You Learned

### 1. Hook Composition Pattern

```typescript
// Main hook composes smaller hooks
export function useCanvasTransform() {
  // Setup motion values
  const x = useMotionValue(0);
  // ...

  // Compose other hooks
  const coords = useCoordinates({ x, y, scale });
  useCanvasGestures({ x, y, scale }); // Side-effect hook
  useCanvasKeyboard({ x, y }); // Side-effect hook

  return { x, y, ...coords };
}
```

### 2. Side-Effect Hooks vs Return-Value Hooks

```typescript
// Side-effect hook: Doesn't return anything, just sets up listeners
export function useCanvasGestures(options) {
  useEffect(() => {
    // Set up event listeners
    return () => { /* cleanup */ };
  }, []);
  // No return!
}

// Return-value hook: Returns computed values/functions
export function useCoordinates(options) {
  const screenToWorld = useCallback(...);
  return { screenToWorld };
}
```

### 3. Dependency Injection for Hooks

```typescript
// ❌ Hook creates its own dependencies
function useCanvasGestures() {
  const x = useMotionValue(0); // Creates its own!
}

// ✅ Hook receives dependencies
function useCanvasGestures({ x, y, scale }) {
  // Uses passed-in values
}
```

**Why?** The main hook can control all the motion values and share them between sub-hooks.

---

## ✅ Verification Checklist

```bash
# 1. All files exist
ls hooks/canvas/

# 2. TypeScript check
npx tsc --noEmit

# 3. Test all features
# - Wheel scroll pans canvas
# - Ctrl+scroll zooms
# - Pinch-to-zoom on mobile
# - Arrow keys pan
# - Ctrl++/- zooms
# - Notes position correctly after zoom
```

---

**Next: [07-FINAL-CHECKLIST.md](./07-FINAL-CHECKLIST.md)** - Final validation!

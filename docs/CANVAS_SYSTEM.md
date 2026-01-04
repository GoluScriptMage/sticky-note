# Sticky Verse Canvas System - Technical Documentation

## Overview

This document explains the core concepts behind the infinite canvas implementation in Sticky Verse. Understanding these concepts is essential for maintaining and extending the canvas functionality.

---

## 1. Coordinate Systems

### Screen Space vs World Space

The canvas operates in two coordinate systems:

| Coordinate System | Description                                                                            | Example                          |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| **Screen Space**  | Pixels relative to the browser viewport. `(0,0)` is the top-left of the visible screen | `e.clientX`, `e.clientY`         |
| **World Space**   | Coordinates in the infinite canvas. Notes are positioned here                          | Note positions: `x: 500, y: 300` |

### Why Two Systems?

When the canvas is panned or zoomed, the same **world coordinate** appears at different **screen positions**. For example:

- At 100% zoom with no pan: World (500, 300) → Screen (500, 300)
- At 200% zoom with no pan: World (500, 300) → Screen (1000, 600)
- At 100% zoom panned right by 200px: World (500, 300) → Screen (700, 300)

### Conversion Formulas

```typescript
// Screen → World (used when clicking to create notes)
worldX = (screenX - panX) / scale;
worldY = (screenY - panY) / scale;

// World → Screen (used for positioning UI relative to world objects)
screenX = worldX * scale + panX;
screenY = worldY * scale + panY;
```

### Implementation

See `hooks/useCanvasTransform.ts`:

```typescript
const screenToWorld = (screenX: number, screenY: number) => {
  const rect = containerRef.current.getBoundingClientRect();
  const currentScale = scale.get();
  const currentX = x.get();
  const currentY = y.get();

  // Get position relative to container
  const relativeX = screenX - rect.left;
  const relativeY = screenY - rect.top;

  // Undo transform to get world position
  const worldX = (relativeX - currentX) / currentScale;
  const worldY = (relativeY - currentY) / currentScale;

  return { x: worldX, y: worldY };
};
```

---

## 2. Precision Dragging (The Offset Fix)

### The Problem

Without offset correction, when you click on a note to drag it, the note's top-left corner snaps to the cursor position. This feels jarring and imprecise.

### The Solution

We store the **offset** between the click position and the note's top-left corner when dragging starts, then maintain that offset during the drag.

```
┌─────────────────┐
│   Note         │
│     ╳ ← click  │  ← User clicks HERE (inside the note)
│                │
└─────────────────┘
   ↑
   Note's top-left position (x, y)

offset.x = clickWorld.x - noteX
offset.y = clickWorld.y - noteY
```

### Implementation

**On Mouse Down (drag start):**

```typescript
const handleNoteDragStart = (noteId, e, noteX, noteY) => {
  // Convert click to world coordinates
  const clickWorld = screenToWorld(e.clientX, e.clientY);

  // Calculate offset from click point to note's top-left corner
  dragOffsetRef.current = {
    x: clickWorld.x - noteX,
    y: clickWorld.y - noteY,
  };
};
```

**On Mouse Move (dragging):**

```typescript
const handleMouseMove = (e) => {
  // Convert current cursor position to world space
  const worldPos = screenToWorld(e.clientX, e.clientY);

  // Apply offset so note stays "grabbed" at same point
  const newX = worldPos.x - dragOffsetRef.current.x;
  const newY = worldPos.y - dragOffsetRef.current.y;

  updateNote(noteId, { x: newX, y: newY });
};
```

---

## 3. Zoom Toward Point (Figma-like Zoom)

### The Problem

If we simply change the scale, the canvas expands/contracts from its origin (0,0). This makes the area under your cursor fly away when zooming.

### The Solution

When zooming, we adjust the pan so that the point under the cursor stays fixed on screen.

### The Math

Given:

- `targetScreen` = cursor position on screen
- `targetWorld` = world position under cursor (before zoom)
- `oldScale`, `newScale` = scale values
- `oldPan`, `newPan` = pan values

The world position under the cursor should stay at the same screen position:

```
targetScreen = targetWorld * newScale + newPan
newPan = targetScreen - targetWorld * newScale
```

### Implementation

```typescript
const zoomToPoint = (targetScreenX, targetScreenY, newScale) => {
  const rect = container.getBoundingClientRect();
  const currentScale = scale.get();
  const currentX = x.get();
  const currentY = y.get();

  // Clamp scale to limits
  const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

  // Get position relative to container
  const relativeX = targetScreenX - rect.left;
  const relativeY = targetScreenY - rect.top;

  // Calculate world position of zoom target
  const worldX = (relativeX - currentX) / currentScale;
  const worldY = (relativeY - currentY) / currentScale;

  // Calculate new pan to keep world position at same screen position
  const newX = relativeX - worldX * clampedScale;
  const newY = relativeY - worldY * clampedScale;

  // Apply changes
  scale.set(clampedScale);
  x.set(newX);
  y.set(newY);
};
```

---

## 4. Background Synchronization

### The Challenge

The dotted background should zoom and pan with the canvas, but we can't just put it inside the transform layer (it would get pixelated and cause performance issues).

### The Solution

We use a separate background layer that stays fixed, but we bind its `background-size` and `background-position` to the transform values.

```typescript
// Background size scales with zoom
const bgSize = useTransform(springScale, (s) => `${20 * s}px ${20 * s}px`);

// Background position follows pan
const bgPosition = useMotionTemplate`${springX}px ${springY}px`;
```

### Visual Result

- At 100% zoom: dots are 20px apart
- At 200% zoom: dots appear 40px apart (because bgSize = 40px)
- When panning: dots move with the pan (because bgPosition follows x, y)

---

## 5. UI Layer Separation

### Architecture

The canvas has three layers with different behaviors:

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: Fixed UI (z-50)                                │
│ - Logo (top-left)                                       │
│ - User badge (top-right)                                │
│ - Zoom controls (bottom-right)                          │
│ - Note form modal (centered)                            │
│ Position: fixed, NOT affected by zoom/pan               │
├─────────────────────────────────────────────────────────┤
│ LAYER 2: Canvas Container                               │
│ - Receives wheel/touch events                           │
│ - Position: absolute inset-0                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ LAYER 1: Transform Layer (motion.div)               │ │
│ │ - Notes                                             │ │
│ │ - Cursors                                           │ │
│ │ - Welcome text                                      │ │
│ │ Transform: translate(x, y) scale(s)                 │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ LAYER 0: Background (motion.div)                        │
│ - Dotted pattern                                        │
│ - pointer-events: none                                  │
│ - Synced background-size/position with transform        │
└─────────────────────────────────────────────────────────┘
```

### Why This Matters

1. **Fixed UI stays readable** at any zoom level
2. **Note form doesn't get scaled** and maintains usability
3. **Background performs well** without being re-rendered on every frame
4. **Notes can be zoomed/panned** while remaining interactive

---

## 6. Animation System

### Motion Values vs Spring Values

We use two sets of values:

| Type                            | Purpose           | Behavior                   |
| ------------------------------- | ----------------- | -------------------------- |
| `x, y, scale`                   | Raw motion values | Instant updates            |
| `springX, springY, springScale` | Spring-animated   | Smooth 60fps interpolation |

### Why Springs?

```typescript
const SPRING_CONFIG = {
  stiffness: 300, // How "snappy" the animation is
  damping: 30, // How quickly it settles
  mass: 0.5, // Affects inertia
};

const springX = useSpring(x, SPRING_CONFIG);
```

- **Input:** Raw wheel delta or pan gesture
- **Output:** Smooth, physics-based animation
- **Result:** Butter-smooth 60fps performance

---

## 7. Touch Support (Mobile)

### Overview

Mobile touch support is critical for a good user experience on tablets and phones. The canvas supports three main touch interactions:

1. **Single-finger pan** - Drag to move around the canvas
2. **Two-finger pinch zoom** - Pinch to zoom in/out
3. **Single-finger note drag** - Drag notes to reposition them

### Single-Finger Panning

The most common mobile interaction. When the user drags with one finger, the canvas pans:

```typescript
// Track single finger touch state
const singleTouchState = useRef<{
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
} | null>(null);

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    // Single finger - prepare for panning
    singleTouchState.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startPanX: x.get(),
      startPanY: y.get(),
    };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 1 && singleTouchState.current) {
    e.preventDefault();

    // Calculate how far finger moved
    const deltaX = e.touches[0].clientX - singleTouchState.current.startX;
    const deltaY = e.touches[0].clientY - singleTouchState.current.startY;

    // Apply delta to initial pan position
    x.set(singleTouchState.current.startPanX + deltaX);
    y.set(singleTouchState.current.startPanY + deltaY);
  }
};
```

### Why We Track Initial Values

Instead of accumulating deltas on each move (which causes drift), we:

1. Store the **initial** touch position and pan position on touchstart
2. Calculate total delta from initial position on each move
3. Apply delta to initial pan value

This approach is more stable and prevents "floating point drift".

### Pinch-to-Zoom

When two fingers are detected, we switch to zoom mode:

```typescript
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2 && touchState.current) {
    // Calculate distance between fingers
    const currentDistance = getDistance(e.touches);

    // Scale ratio = new distance / initial distance
    const distanceRatio = currentDistance / initialDistance;
    const newScale = initialScale * distanceRatio;

    // Zoom toward the center point between fingers
    const center = getCenter(e.touches);
    zoomToPoint(center.x, center.y, newScale);
  }
};
```

### Two-Finger Pan + Zoom (Simultaneous)

While pinching, we also track the center point movement to enable simultaneous panning:

```typescript
const panDeltaX = currentCenter.x - initialCenter.x;
const panDeltaY = currentCenter.y - initialCenter.y;

// Apply both zoom and pan
const newX = centerX - worldX * clampedScale + panDeltaX;
const newY = centerY - worldY * clampedScale + panDeltaY;
```

### Touch Event Configuration

Important: We use `passive: false` to allow `preventDefault()`:

```typescript
container.addEventListener("touchstart", handleTouchStart, { passive: false });
container.addEventListener("touchmove", handleTouchMove, { passive: false });
container.addEventListener("touchend", handleTouchEnd);
```

This prevents the browser's default scroll/zoom behavior from interfering.

### CSS Requirements

The canvas container needs `touch-none` to disable browser touch actions:

```tsx
<div className="... touch-none">
```

### Note Dragging on Touch

Notes have their own touch handler that converts touch to mouse events:

```typescript
const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    // Create synthetic mouse event
    const syntheticEvent = {
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as React.MouseEvent;
    onDragStart(id, syntheticEvent, x, y);
  }
};
```

---

## 8. File Structure

```
app/room/[id]/
├── page.tsx           # Main canvas component
├── sticky-note.tsx    # Individual note component
├── note-form.tsx      # Note creation/edit form
├── cursor.tsx         # Remote user cursor

hooks/
├── useCanvasTransform.ts  # 🎯 Core canvas hook
├── useSocket.ts           # WebSocket connection

store/
├── useStickyStore.ts      # Zustand state management
```

---

## 9. Common Issues & Solutions

### Issue: Notes appearing in wrong position when zoomed

**Cause:** Using screen coordinates instead of world coordinates
**Solution:** Always use `screenToWorld()` before storing note positions

### Issue: Note jumps to corner when dragging

**Cause:** Not calculating drag offset
**Solution:** Store offset on mousedown, apply during drag

### Issue: Background doesn't zoom with canvas

**Cause:** Background in wrong layer or not bound to transform
**Solution:** Use motion values for `backgroundSize` and `backgroundPosition`

### Issue: Zoom feels jerky

**Cause:** Direct state updates without spring animation
**Solution:** Use `useSpring()` for all transform values

---

## 10. Performance Considerations

1. **Use motion values, not React state** for transforms
2. **Keep background in separate layer** with CSS patterns
3. **Use `will-change: transform`** on transform layer (framer-motion does this)
4. **Throttle cursor broadcasts** to prevent socket flooding
5. **Use `passive: false`** on wheel events to prevent default scrolling

---

## 11. UI Components

### Recent Rooms List (Dashboard)

The recent rooms component shows a paginated list of user's rooms with smart defaults:

**Features:**

- Shows only the 4 most recent rooms by default
- "Show more" button expands to show all rooms
- Copy button to share room ID via clipboard
- Toast notification confirms copy action

**Implementation:**

```typescript
const INITIAL_DISPLAY_COUNT = 4;
const [showAll, setShowAll] = useState(false);

// Slice the array based on showAll state
const displayedRooms = showAll
  ? recentRooms
  : recentRooms.slice(0, INITIAL_DISPLAY_COUNT);

// Copy to clipboard with feedback
const handleCopyId = async (roomId: string) => {
  await navigator.clipboard.writeText(roomId);
  toast.success("Room ID copied to clipboard!");
};
```

**Why limit to 4?**

1. Prevents overwhelming the UI on mobile
2. Keeps the dashboard focused on quick actions
3. Most users only need their recent rooms
4. Expandable for power users who need full history

---

## Quick Reference

```typescript
// Convert click to world position
const worldPos = screenToWorld(e.clientX, e.clientY);

// Zoom toward a point
zoomToPoint(e.clientX, e.clientY, scale.get() * 1.1);

// Get current transform values
const { x, y, scale } = getTransform();

// Position a note (world coordinates)
updateNote(id, { x: worldX, y: worldY });
```

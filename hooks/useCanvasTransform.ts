"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useMotionValue,
  useSpring,
  type MotionValue,
  type SpringOptions,
} from "framer-motion";

// =============================================================================
// COORDINATE SYSTEM DOCUMENTATION
// =============================================================================
/**
 * SCREEN SPACE vs WORLD SPACE
 *
 * Screen Space: Pixels relative to the browser viewport (0,0 is top-left of screen)
 *   - e.clientX, e.clientY give us screen space coordinates
 *
 * World Space: Coordinates in the infinite canvas world
 *   - Notes are positioned using world space coordinates (as percentages)
 *   - When zoomed/panned, the same world coordinate appears at different screen positions
 *
 * CONVERSION FORMULAS:
 *   Screen → World: worldX = (screenX - panX) / scale
 *   World → Screen: screenX = (worldX * scale) + panX
 *
 * WHY THIS MATTERS:
 *   - When user clicks at screen position (500, 300) on a zoomed-out canvas,
 *     we need to find the actual world position to place the note
 *   - Without conversion, notes appear at wrong positions when zoomed
 */

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export interface Transform {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

export interface UseCanvasTransformReturn {
  // Motion values for smooth animations
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  // Spring-animated versions for rendering
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  springScale: MotionValue<number>;
  // Ref to attach to the canvas container
  containerRef: React.RefObject<HTMLDivElement>;
  // Imperative controls
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  // Coordinate conversion utilities
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  // Get current values (non-reactive, for event handlers)
  getTransform: () => { x: number; y: number; scale: number };
}

const MIN_SCALE = 0.25; // 25% minimum zoom
const MAX_SCALE = 3.0; // 300% maximum zoom
const ZOOM_SENSITIVITY = 0.008; // Increased for smoother trackpad zoom
const ZOOM_BUTTON_STEP = 0.15; // For +/- buttons
const PAN_SPEED = 50; // For keyboard panning

// Spring config for buttery smooth 60fps animations
const SPRING_CONFIG: SpringOptions = {
  stiffness: 400,
  damping: 35,
  mass: 0.3,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useCanvasTransform(): UseCanvasTransformReturn {
  const containerRef = useRef<HTMLDivElement>(null);

  // Raw motion values (instant updates)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Spring-animated versions (smooth interpolation for rendering)
  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);
  const springScale = useSpring(scale, SPRING_CONFIG);

  // Track touch state for pinch-to-zoom and single finger pan
  const touchState = useRef<{
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialPan: { x: number; y: number };
  } | null>(null);

  // Track single finger pan state
  const singleTouchState = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    lastX: number;
    lastY: number;
    velocityX: number;
    velocityY: number;
    lastTime: number;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // COORDINATE CONVERSION
  // ---------------------------------------------------------------------------

  /**
   * Convert screen coordinates to world coordinates
   * Used when: clicking to create notes, double-clicking, etc.
   */
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Step 1: Get position relative to container (screen space within container)
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // Step 2: Undo the transform to get world space
      // Formula: worldPos = (screenPos - pan) / scale
      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      return { x: worldX, y: worldY };
    },
    [scale, x, y]
  );

  /**
   * Convert world coordinates to screen coordinates
   * Used when: positioning UI elements relative to world objects
   */
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): { x: number; y: number } => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Formula: screenPos = (worldPos * scale) + pan
      const screenX = worldX * currentScale + currentX + rect.left;
      const screenY = worldY * currentScale + currentY + rect.top;

      return { x: screenX, y: screenY };
    },
    [scale, x, y]
  );

  const getTransform = useCallback(() => {
    return { x: x.get(), y: y.get(), scale: scale.get() };
  }, [x, y, scale]);

  // ---------------------------------------------------------------------------
  // ZOOM HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Zoom toward a specific point (keeps that point stationary on screen)
   * This is the key to Figma-like zoom behavior!
   *
   * MATH EXPLANATION:
   * When we zoom, we want the point under the cursor to stay fixed.
   * If we just change scale, the canvas expands/contracts from origin (0,0).
   * To fix this, we adjust pan so the target point stays in place.
   *
   * Formula: newPan = targetScreen - (targetWorld * newScale)
   */
  const zoomToPoint = useCallback(
    (targetScreenX: number, targetScreenY: number, newScale: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Clamp the new scale
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      // Get position relative to container
      const relativeX = targetScreenX - rect.left;
      const relativeY = targetScreenY - rect.top;

      // Calculate world position of the zoom target
      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      // Calculate new pan to keep world position at same screen position
      const newX = relativeX - worldX * clampedScale;
      const newY = relativeY - worldY * clampedScale;

      // Update values
      scale.set(clampedScale);
      x.set(newX);
      y.set(newY);
    },
    [scale, x, y]
  );

  // ---------------------------------------------------------------------------
  // PUBLIC CONTROLS
  // ---------------------------------------------------------------------------

  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, scale.get() + ZOOM_BUTTON_STEP);
  }, [scale, zoomToPoint]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    zoomToPoint(centerX, centerY, scale.get() - ZOOM_BUTTON_STEP);
  }, [scale, zoomToPoint]);

  const resetView = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
  }, [x, y, scale]);

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // -------------------------------------------------------------------------
    // WHEEL EVENT: Pan (scroll) + Zoom (ctrl/pinch on trackpad)
    // -------------------------------------------------------------------------
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // ZOOM: ctrl+scroll or trackpad pinch
        // deltaY > 0 means zoom out, deltaY < 0 means zoom in
        const zoomDelta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = scale.get() * (1 + zoomDelta);
        zoomToPoint(e.clientX, e.clientY, newScale);
      } else {
        // PAN: regular scroll
        x.set(x.get() - e.deltaX);
        y.set(y.get() - e.deltaY);
      }
    };

    // -------------------------------------------------------------------------
    // TOUCH EVENTS: Single-finger pan + Pinch-to-zoom
    // -------------------------------------------------------------------------
    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Check if touching a note (ignore class)
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) {
        return; // Let the note handle its own touch
      }

      if (e.touches.length === 2) {
        // Two-finger pinch/zoom
        e.preventDefault();
        singleTouchState.current = null; // Cancel single touch
        touchState.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scale.get(),
          initialCenter: getCenter(e.touches),
          initialPan: { x: x.get(), y: y.get() },
        };
      } else if (e.touches.length === 1) {
        // Single finger pan
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

    const handleTouchMove = (e: TouchEvent) => {
      // Check if touching a note
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) {
        return;
      }

      if (e.touches.length === 2 && touchState.current) {
        // Two-finger pinch/zoom
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const currentCenter = getCenter(e.touches);

        // Calculate new scale based on pinch distance
        const distanceRatio =
          currentDistance / touchState.current.initialDistance;
        const newScale = touchState.current.initialScale * distanceRatio;
        const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

        // Calculate pan offset from finger movement
        const panDeltaX = currentCenter.x - touchState.current.initialCenter.x;
        const panDeltaY = currentCenter.y - touchState.current.initialCenter.y;

        // Apply zoom toward the pinch center
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const centerX = touchState.current.initialCenter.x - rect.left;
          const centerY = touchState.current.initialCenter.y - rect.top;

          // World position at initial center
          const worldX =
            (centerX - touchState.current.initialPan.x) /
            touchState.current.initialScale;
          const worldY =
            (centerY - touchState.current.initialPan.y) /
            touchState.current.initialScale;

          // New pan to keep world position fixed + add pan delta
          const newX = centerX - worldX * clampedScale + panDeltaX;
          const newY = centerY - worldY * clampedScale + panDeltaY;

          scale.set(clampedScale);
          x.set(newX);
          y.set(newY);
        }
      } else if (e.touches.length === 1 && singleTouchState.current) {
        // Single finger pan
        e.preventDefault();

        const touch = e.touches[0];
        const now = Date.now();
        const dt = now - singleTouchState.current.lastTime;

        // Calculate velocity for momentum
        if (dt > 0) {
          singleTouchState.current.velocityX =
            (touch.clientX - singleTouchState.current.lastX) / dt;
          singleTouchState.current.velocityY =
            (touch.clientY - singleTouchState.current.lastY) / dt;
        }

        // Update last position
        singleTouchState.current.lastX = touch.clientX;
        singleTouchState.current.lastY = touch.clientY;
        singleTouchState.current.lastTime = now;

        // Calculate pan delta from start position
        const deltaX = touch.clientX - singleTouchState.current.startX;
        const deltaY = touch.clientY - singleTouchState.current.startY;

        // Apply pan
        x.set(singleTouchState.current.startPanX + deltaX);
        y.set(singleTouchState.current.startPanY + deltaY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Apply momentum on single finger release
      if (singleTouchState.current && e.touches.length === 0) {
        const { velocityX, velocityY } = singleTouchState.current;
        const momentum = 150; // Momentum multiplier

        // Only apply momentum if velocity is significant
        if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
          const currentX = x.get();
          const currentY = y.get();
          x.set(currentX + velocityX * momentum);
          y.set(currentY + velocityY * momentum);
        }
      }

      touchState.current = null;
      singleTouchState.current = null;
    };

    // Attach listeners with passive: false to allow preventDefault
    // -------------------------------------------------------------------------
    // MIDDLE MOUSE DRAG: Alternative pan method
    // -------------------------------------------------------------------------
    let middleMouseState: {
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
    } | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Middle mouse button (button === 1)
      if (e.button === 1) {
        e.preventDefault();
        middleMouseState = {
          startX: e.clientX,
          startY: e.clientY,
          startPanX: x.get(),
          startPanY: y.get(),
        };
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (middleMouseState) {
        const deltaX = e.clientX - middleMouseState.startX;
        const deltaY = e.clientY - middleMouseState.startY;
        x.set(middleMouseState.startPanX + deltaX);
        y.set(middleMouseState.startPanY + deltaY);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && middleMouseState) {
        middleMouseState = null;
        container.style.cursor = "";
      }
    };

    // Attach listeners with passive: false to allow preventDefault
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
  }, [x, y, scale, zoomToPoint]);

  // ---------------------------------------------------------------------------
  // KEYBOARD CONTROLS: Arrow keys and WASD for panning
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't pan if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dy = PAN_SPEED;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dy = -PAN_SPEED;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dx = PAN_SPEED;
          break;
        case "ArrowRight":
        case "d":
        case "D":
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
    screenToWorld,
    worldToScreen,
    getTransform,
  };
}

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

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const ZOOM_SENSITIVITY = 0.002; // For wheel zoom
const ZOOM_BUTTON_STEP = 0.25; // For +/- buttons

// Spring config for buttery smooth 60fps animations
const SPRING_CONFIG: SpringOptions = {
  stiffness: 300,
  damping: 30,
  mass: 0.5,
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

  // Track touch state for pinch-to-zoom
  const touchState = useRef<{
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialPan: { x: number; y: number };
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
    // TOUCH EVENTS: Pinch-to-zoom + Two-finger pan
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
      if (e.touches.length === 2) {
        e.preventDefault();
        touchState.current = {
          initialDistance: getDistance(e.touches),
          initialScale: scale.get(),
          initialCenter: getCenter(e.touches),
          initialPan: { x: x.get(), y: y.get() },
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.current) {
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
      }
    };

    const handleTouchEnd = () => {
      touchState.current = null;
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

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [x, y, scale, zoomToPoint]);

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

"use client";

import { useRef } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";
import { useCoordinates } from "./canvas/useCoordinates";
import { useCanvasGestures } from "./canvas/useCanvasGestures";
import { useCanvasKeyboard } from "./canvas/useCanvasKeyboard";
import { SPRING_CONFIG } from "./canvas/types";

// =============================================================================
// TYPES
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
  containerRef: React.RefObject<HTMLDivElement | null>;
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

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Unified canvas transform hook that composes sub-hooks for:
 * - Coordinate conversion (screen <-> world space)
 * - Gesture handling (wheel, touch, mouse)
 * - Keyboard controls (arrow keys, WASD, zoom shortcuts)
 *
 * @example
 * ```tsx
 * const {
 *   containerRef,
 *   springX, springY, springScale,
 *   screenToWorld,
 *   zoomIn, zoomOut, resetView
 * } = useCanvasTransform();
 *
 * return (
 *   <div ref={containerRef}>
 *     <motion.div style={{ x: springX, y: springY, scale: springScale }}>
 *       {children}
 *     </motion.div>
 *   </div>
 * );
 * ```
 */
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

  // Coordinate conversion utilities
  const { screenToWorld, worldToScreen, getTransform } = useCoordinates({
    containerRef,
    x,
    y,
    scale,
  });

  // Gesture handling (wheel, touch, mouse)
  useCanvasGestures({
    containerRef,
    x,
    y,
    scale,
  });

  // Keyboard controls
  const { zoomIn, zoomOut, resetView } = useCanvasKeyboard({
    containerRef,
    x,
    y,
    scale,
  });

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

"use client";

import { useCallback } from "react";
import type { MotionValue } from "framer-motion";

interface UseCoordinatesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

/**
 * Coordinate conversion utilities for canvas transformations
 * 
 * Screen Space: Pixels relative to the browser viewport
 * World Space: Coordinates in the infinite canvas world
 */
export function useCoordinates({ containerRef, x, y, scale }: UseCoordinatesOptions) {
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

      // Get position relative to container
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;

      // Undo the transform to get world space
      // Formula: worldPos = (screenPos - pan) / scale
      const worldX = (relativeX - currentX) / currentScale;
      const worldY = (relativeY - currentY) / currentScale;

      return { x: worldX, y: worldY };
    },
    [containerRef, scale, x, y]
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
    [containerRef, scale, x, y]
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

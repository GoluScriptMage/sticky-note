"use client";

import { useEffect, useCallback } from "react";
import type { MotionValue } from "framer-motion";
import { MIN_SCALE, MAX_SCALE, ZOOM_BUTTON_STEP, PAN_SPEED } from "./types";

interface UseCanvasKeyboardOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

/**
 * Keyboard controls for canvas navigation
 * 
 * Controls:
 * - Arrow keys / WASD: Pan the canvas
 * - Ctrl/Cmd + Plus: Zoom in
 * - Ctrl/Cmd + Minus: Zoom out
 * - Ctrl/Cmd + 0: Reset view
 */
export function useCanvasKeyboard({
  containerRef,
  x,
  y,
  scale,
}: UseCanvasKeyboardOptions) {
  /**
   * Zoom toward center of canvas
   */
  const zoomToCenter = useCallback(
    (newScale: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const currentScale = scale.get();
      const currentX = x.get();
      const currentY = y.get();

      // Clamp the new scale
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      // Calculate world position at center
      const worldX = (centerX - currentX) / currentScale;
      const worldY = (centerY - currentY) / currentScale;

      // Calculate new pan to keep center fixed
      const newX = centerX - worldX * clampedScale;
      const newY = centerY - worldY * clampedScale;

      scale.set(clampedScale);
      x.set(newX);
      y.set(newY);
    },
    [containerRef, scale, x, y]
  );

  const zoomIn = useCallback(() => {
    zoomToCenter(scale.get() + ZOOM_BUTTON_STEP);
  }, [scale, zoomToCenter]);

  const zoomOut = useCallback(() => {
    zoomToCenter(scale.get() - ZOOM_BUTTON_STEP);
  }, [scale, zoomToCenter]);

  const resetView = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
  }, [x, y, scale]);

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
    zoomIn,
    zoomOut,
    resetView,
  };
}

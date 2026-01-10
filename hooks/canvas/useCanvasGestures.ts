"use client";

import { useEffect, useRef, useCallback } from "react";
import type { MotionValue } from "framer-motion";
import { MIN_SCALE, MAX_SCALE, ZOOM_SENSITIVITY } from "./types";

interface UseCanvasGesturesOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
}

/**
 * Canvas gesture handlers for wheel, touch, and mouse interactions
 * 
 * Handles:
 * - Wheel scroll for panning
 * - Ctrl+wheel for zooming
 * - Pinch-to-zoom on touch devices
 * - Single finger pan on touch devices
 * - Middle mouse button drag for panning
 */
export function useCanvasGestures({
  containerRef,
  x,
  y,
  scale,
}: UseCanvasGesturesOptions) {
  // Track touch state for pinch-to-zoom
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

  // Track middle mouse drag state
  const middleMouseState = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  /**
   * Zoom toward a specific point (keeps that point stationary on screen)
   * This is the key to Figma-like zoom behavior!
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
    [containerRef, scale, x, y]
  );

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
    // TOUCH HELPERS
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

    // -------------------------------------------------------------------------
    // TOUCH EVENTS: Single-finger pan + Pinch-to-zoom
    // -------------------------------------------------------------------------
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) {
        return; // Let the note handle its own touch
      }

      if (e.touches.length === 2) {
        // Two-finger pinch/zoom
        e.preventDefault();
        singleTouchState.current = null;
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
      const target = e.target as HTMLElement;
      if (target.closest(".ignore")) {
        return;
      }

      if (e.touches.length === 2 && touchState.current) {
        // Two-finger pinch/zoom
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const currentCenter = getCenter(e.touches);

        const distanceRatio = currentDistance / touchState.current.initialDistance;
        const newScale = touchState.current.initialScale * distanceRatio;
        const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

        const panDeltaX = currentCenter.x - touchState.current.initialCenter.x;
        const panDeltaY = currentCenter.y - touchState.current.initialCenter.y;

        const rect = container.getBoundingClientRect();
        const centerX = touchState.current.initialCenter.x - rect.left;
        const centerY = touchState.current.initialCenter.y - rect.top;

        const worldX = (centerX - touchState.current.initialPan.x) / touchState.current.initialScale;
        const worldY = (centerY - touchState.current.initialPan.y) / touchState.current.initialScale;

        const newX = centerX - worldX * clampedScale + panDeltaX;
        const newY = centerY - worldY * clampedScale + panDeltaY;

        scale.set(clampedScale);
        x.set(newX);
        y.set(newY);
      } else if (e.touches.length === 1 && singleTouchState.current) {
        // Single finger pan
        e.preventDefault();

        const touch = e.touches[0];
        const now = Date.now();
        const dt = now - singleTouchState.current.lastTime;

        if (dt > 0) {
          singleTouchState.current.velocityX = (touch.clientX - singleTouchState.current.lastX) / dt;
          singleTouchState.current.velocityY = (touch.clientY - singleTouchState.current.lastY) / dt;
        }

        singleTouchState.current.lastX = touch.clientX;
        singleTouchState.current.lastY = touch.clientY;
        singleTouchState.current.lastTime = now;

        const deltaX = touch.clientX - singleTouchState.current.startX;
        const deltaY = touch.clientY - singleTouchState.current.startY;

        x.set(singleTouchState.current.startPanX + deltaX);
        y.set(singleTouchState.current.startPanY + deltaY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Apply momentum on single finger release
      if (singleTouchState.current && e.touches.length === 0) {
        const { velocityX, velocityY } = singleTouchState.current;
        const momentum = 150;

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

    // -------------------------------------------------------------------------
    // MIDDLE MOUSE DRAG
    // -------------------------------------------------------------------------
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
      if (middleMouseState.current) {
        const deltaX = e.clientX - middleMouseState.current.startX;
        const deltaY = e.clientY - middleMouseState.current.startY;
        x.set(middleMouseState.current.startPanX + deltaX);
        y.set(middleMouseState.current.startPanY + deltaY);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && middleMouseState.current) {
        middleMouseState.current = null;
        container.style.cursor = "";
      }
    };

    // Attach listeners
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
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
      container.removeEventListener("mouseleave", handleMouseUp as EventListener);
    };
  }, [containerRef, x, y, scale, zoomToPoint]);

  return { zoomToPoint };
}

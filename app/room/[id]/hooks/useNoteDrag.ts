"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { StickyNote } from "@/types";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types";

interface UseNoteDragOptions {
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  updateNote: (id: string, data: Partial<StickyNote>) => void;
  socket: React.RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null>;
  onDragEnd?: (noteId: string) => void;
}

export function useNoteDrag({ 
  screenToWorld, 
  updateNote, 
  socket,
  onDragEnd 
}: UseNoteDragOptions) {
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse and touch move handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingNoteId) return;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const newX = worldPos.x - dragOffsetRef.current.x;
      const newY = worldPos.y - dragOffsetRef.current.y;
      updateNote(draggingNoteId, { x: newX, y: newY });
      
      // Emit real-time position to socket
      socket.current?.emit("note_move", { 
        noteId: draggingNoteId, 
        x: newX, 
        y: newY 
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingNoteId || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      const newX = worldPos.x - dragOffsetRef.current.x;
      const newY = worldPos.y - dragOffsetRef.current.y;
      updateNote(draggingNoteId, { x: newX, y: newY });
      
      socket.current?.emit("note_move", { 
        noteId: draggingNoteId, 
        x: newX, 
        y: newY 
      });
    };

    const handleMouseUp = () => {
      if (draggingNoteId) {
        onDragEnd?.(draggingNoteId);
      }
      setDraggingNoteId(null);
      dragOffsetRef.current = { x: 0, y: 0 };
    };

    const handleTouchEnd = () => {
      if (draggingNoteId) {
        onDragEnd?.(draggingNoteId);
      }
      setDraggingNoteId(null);
      dragOffsetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [draggingNoteId, screenToWorld, updateNote, socket, onDragEnd]);

  const handleDragStart = useCallback(
    (noteId: string, e: React.MouseEvent, noteX: number, noteY: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingNoteId(noteId);
      const clickWorld = screenToWorld(e.clientX, e.clientY);
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

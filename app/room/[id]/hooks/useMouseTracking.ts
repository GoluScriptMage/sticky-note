"use client";

import { useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, CursorPayload } from "@/types/index";

interface UseMouseTrackingOptions {
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  socket: React.RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null>;
  userId: string;
  throttleDelay?: number;
}

export function useMouseTracking({
  screenToWorld,
  socket,
  userId,
  throttleDelay = 50,
}: UseMouseTrackingOptions) {
  const throttleRef = useRef(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - throttleRef.current < throttleDelay) return;
      throttleRef.current = now;

      const worldPos = screenToWorld(e.clientX, e.clientY);
      const payload: CursorPayload = {
        x: worldPos.x,
        y: worldPos.y,
        noteId: "",
        userId,
        timeStamp: now,
      };
      socket.current?.emit("mouse_move", payload);
    },
    [screenToWorld, socket, userId, throttleDelay]
  );

  return { handleMouseMove };
}

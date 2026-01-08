"use client";

import React, { useCallback } from "react";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";

interface RoomActionProps {
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

export const RoomAction = ({ screenToWorld }: RoomActionProps) => {
  const { setStore } = useStickyStore(
    useShallow((state) => ({
      setStore: state.setStore,
    }))
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest(".ignore");
      if (target) {
        const noteId = target.getAttribute("data-note-id");
        if (noteId) setStore({ selectNoteId: noteId });
        return;
      }
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setStore({
        coordinates: { x: worldPos.x, y: worldPos.y },
        showForm: true,
        selectNoteId: null,
      });
    },
    [screenToWorld, setStore]
  );

  return { handleDoubleClick };
};

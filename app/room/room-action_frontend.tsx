"use client";

import React, { useCallback } from "react";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";

interface RoomActionProps {
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
}

export const RoomAction = ({ screenToWorld }: RoomActionProps) => {
  const { setState, openNoteForm, selectNote } = useStickyStore(
    useShallow((state) => ({
      setState: state.setState,
      openNoteForm: state.openNoteForm,
      selectNote: state.selectNote,
    }))
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest(".ignore");
      if (target) {
        const noteId = target.getAttribute("data-note-id");
        if (noteId) selectNote(noteId);
        return;
      }
      const worldPos = screenToWorld(e.clientX, e.clientY);
      openNoteForm({ x: worldPos.x, y: worldPos.y });
    },
    [screenToWorld, openNoteForm, selectNote]
  );

  return { handleDoubleClick };
};

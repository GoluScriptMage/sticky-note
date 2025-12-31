"use client";

// Imports
import NoteForm from "./note-form";
import { useStickyStore } from "@/store/useStickyStore";
import { useSocket } from "@/hooks/useSocket";

// Interfaces
import { useShallow } from "zustand/shallow";
import StickyNoteComponent from "./sticky-note";
import React, { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Cursor from "./cursor";

export default function CanvasPage() {
  // ** States Management **

  const isDraggingRef = useRef<boolean>(false);
  const draggingNoteIdRef = useRef<string | null>(null);

  const {
    notes,
    showForm,
    selectNoteId,
    setStore,
    userData,
    otherUsers,
    updateNote,
    offSet,
    addDummyNotes,
  } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      showForm: state.showForm,
      selectNoteId: state.selectNoteId,
      setStore: state.setStore,
      userData: state.userData,
      otherUsers: state.otherUsers,
      updateNote: state.updateNote,
      offSet: state.offSet,
      addDummyNotes: state.addDummyNotes,
    }))
  );

  const params: { id: string } = useParams();

  const userId = userData?.userId || "";
  const userName = userData?.userName || "";
  const roomId = params.id;

  const throttlingDelay = 50;
  const delayRef = useRef(0);
  const count = useRef(0);

  // Adding dummy data - only runs once on mount
  useEffect(() => {
    addDummyNotes(); // The function itself checks if notes exist
  }, [addDummyNotes]);

  // UseEffect to handle mouseMove events
  useEffect(() => {
    console.log("isDraggingRef changed:", isDraggingRef.current);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current && !draggingNoteIdRef.current) return;

      // Calculate canvas height and width
      const canvasHeight = window.innerHeight;
      const canvasWidth = window.innerWidth;

      // calc new x, y
      const newX = ((e.clientX - offSet?.x) / canvasWidth) * 100;
      const newY = ((e.clientY - offSet?.y) / canvasHeight) * 100;
      console.log("OffsetX and OffsetY:", offSet);
      console.log("New X and Y:", newX, newY);
      updateNote(draggingNoteIdRef.current, { x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false;
      draggingNoteIdRef.current = null;
      setStore({
        offSet: null,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [offSet, updateNote, setStore]);

  

  //  CALL THE PHONE (Initialize Socket)
  const socket = useSocket(roomId, userId, userName);

  // Double click handler for canvas actions
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const target = (e.target as HTMLElement).closest(".ignore");

    // If double-clicked on a sticky note
    if (target) {
      const noteId = target.getAttribute("data-note-id");
      if (noteId) {
        setStore({ selectNoteId: noteId });
      }
      return;
    }

    // If double-clicked on empty space - create new note
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setStore({ coordinates: { x, y }, showForm: true, selectNoteId: null });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Throttling Logic
    if (now - delayRef.current < throttlingDelay) {
      return;
    }
    delayRef.current = now;

    // For updating mouse movements
    socket.current?.emit("mouse_move", { x, y });
    count.current += 1;
  };

  return userData ? (
    <div
      onDoubleClick={handleDoubleClick}
      onClick={() => {
        // Option 1: Simple & Sweet
        if (!isDraggingRef) setStore({ selectNoteId: null });
      }}
      onMouseMove={(e) => handleMouseMove(e)}
      className="relative w-full h-screen p-[3vh]"
    >
      {/* Header */}
      <div className="text-center mb-[5vh]">
        <h1
          className="text-[4vw] md:text-[3vw] lg:text-[2.5vw] font-bold text-amber-900 
                       drop-shadow-sm tracking-tight"
        >
          Welcome to Sticky (-_-) Verse
        </h1>
      </div>

      {showForm && <NoteForm />}
      {notes &&
        // eslint-disable-next-line react-hooks/refs
        notes.map((note) => (
          <StickyNoteComponent
            key={note.id}
            isDraggingRef={isDraggingRef}
            draggingNoteIdRef={draggingNoteIdRef}
            {...note}
            showButtons={selectNoteId === note.id && !isDraggingRef.current}
          />
        ))}
      {/* Render other users' cursors */}
      {Object.entries(otherUsers).map(([id, data]) => {
        console.log("Rendering cursor for user:", id, data);
        return (
          <Cursor
            key={id}
            x={data.x || 0}
            y={data.y || 0}
            userName={data.userName || "Unknown"}
            color={data.color || "#ff0000"}
          />
        );
      })}
      <div className="fixed top-20 left-4 bg-black text-white p-2 rounded text-xs z-50">
        Other Users: {Object.keys(otherUsers).length}
      </div>
    </div>
  ) : (
    <div className="flex h-screen items-center justify-center circuit-canvas text-gray-400">
      Please set up your user Identity first.
      <button
        onClick={() => {
          window.location.href = "/";
        }}
        className="ml-4 px-4 py-2 bg-black text-white rounded hover:opacity-90 transition"
      >
        Go to Home
      </button>
    </div>
  );
}

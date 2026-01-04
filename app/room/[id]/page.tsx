"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useShallow } from "zustand/shallow";
import {
  motion,
  useMotionTemplate,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Plus, Minus, RotateCcw, Maximize2, Menu, X } from "lucide-react";

import NoteForm from "./note-form";
import StickyNoteComponent from "./sticky-note";
import Cursor from "./cursor";
import { useStickyStore } from "@/store/useStickyStore";
import { useSocket } from "@/hooks/useSocket";
import { useCanvasTransform } from "@/hooks/useCanvasTransform";

export interface StickyNote {
  id: string;
  noteName: string;
  content: string;
  createdBy?: string;
  x: number;
  y: number;
}

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
  scale: number;
}

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  scale,
}: ZoomControlsProps) {
  const scalePercent = Math.round(scale * 100);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      {/* Desktop Controls */}
      <div className="fixed bottom-4 right-4 z-50 hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg shadow-black/10 border border-gray-200/80 p-1.5">
        <button
          onClick={onZoomOut}
          className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150 active:scale-95"
          title="Zoom Out (Ctrl + Scroll Down)"
        >
          <Minus className="w-4 h-4 text-gray-700" />
        </button>

        <button
          onClick={onReset}
          className="px-3 py-2 min-w-[4.5rem] text-sm font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150"
          title="Click to Reset to 100%"
        >
          {scalePercent}%
        </button>

        <button
          onClick={onZoomIn}
          className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150 active:scale-95"
          title="Zoom In (Ctrl + Scroll Up)"
        >
          <Plus className="w-4 h-4 text-gray-700" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={onFitToScreen}
          className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150 active:scale-95"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4 text-gray-700" />
        </button>

        <button
          onClick={onReset}
          className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150 active:scale-95"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Mobile Controls - Touch Friendly */}
      <div className="fixed bottom-6 right-4 z-50 sm:hidden">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="flex flex-col gap-2 mb-3"
            >
              <button
                onClick={onZoomIn}
                className="w-14 h-14 flex items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-black/15 border border-gray-200/80 active:scale-90 active:bg-gray-100 transition-all duration-150"
                title="Zoom In"
              >
                <Plus className="w-6 h-6 text-gray-700" />
              </button>

              <button
                onClick={onReset}
                className="w-14 h-14 flex items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-black/15 border border-gray-200/80 active:scale-90 active:bg-gray-100 transition-all duration-150"
                title="Reset"
              >
                <span className="text-xs font-bold text-gray-700">
                  {scalePercent}%
                </span>
              </button>

              <button
                onClick={onZoomOut}
                className="w-14 h-14 flex items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-black/15 border border-gray-200/80 active:scale-90 active:bg-gray-100 transition-all duration-150"
                title="Zoom Out"
              >
                <Minus className="w-6 h-6 text-gray-700" />
              </button>

              <button
                onClick={onFitToScreen}
                className="w-14 h-14 flex items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-black/15 border border-gray-200/80 active:scale-90 active:bg-gray-100 transition-all duration-150"
                title="Fit Screen"
              >
                <Maximize2 className="w-5 h-5 text-gray-700" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 flex items-center justify-center bg-gray-900 rounded-2xl shadow-xl shadow-black/25 active:scale-90 transition-all duration-150"
        >
          {isExpanded ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </>
  );
}

export default function CanvasPage() {
  const {
    springX,
    springY,
    springScale,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    screenToWorld,
    x,
    y,
    scale,
  } = useCanvasTransform();

  // Drag state - use useState for draggingNoteId to trigger re-renders
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track current scale
  const [currentScale, setCurrentScale] = useState(1);
  useEffect(() => {
    const unsubscribe = springScale.on("change", (v) => setCurrentScale(v));
    return unsubscribe;
  }, [springScale]);

  // Fit to screen - center all notes
  const fitToScreen = useCallback(() => {
    if (typeof window === "undefined") return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Center the canvas
    x.set(viewportWidth / 2 - 200);
    y.set(viewportHeight / 2 - 100);
    scale.set(0.8);
  }, [x, y, scale]);

  const {
    notes,
    showForm,
    selectNoteId,
    setStore,
    userData,
    otherUsers,
    updateNote,
    addDummyNotes,
    coordinates,
  } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      showForm: state.showForm,
      selectNoteId: state.selectNoteId,
      setStore: state.setStore,
      userData: state.userData,
      otherUsers: state.otherUsers,
      updateNote: state.updateNote,
      addDummyNotes: state.addDummyNotes,
      coordinates: state.coordinates,
    }))
  );

  const params: { id: string } = useParams();
  const { userId } = useAuth();
  const userName = userData?.userName || "";
  const roomId = params.id;

  const socket = useSocket(roomId, userId, userName);
  const throttleRef = useRef(0);
  const THROTTLE_DELAY = 50;

  // Background dots: maintain minimum 15px spacing for visibility at low zoom
  const bgSize = useTransform(springScale, (s) => {
    const baseSize = 20;
    const size = Math.max(15, baseSize * s); // Minimum 15px spacing
    return `${size}px ${size}px`;
  });
  const bgPosition = useMotionTemplate`${springX}px ${springY}px`;

  useEffect(() => {
    addDummyNotes();
  }, [addDummyNotes]);

  // Drag handlers - both mouse and touch
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingNoteId) return;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const newX = worldPos.x - dragOffsetRef.current.x;
      const newY = worldPos.y - dragOffsetRef.current.y;
      updateNote(draggingNoteId, { x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingNoteId || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      const newX = worldPos.x - dragOffsetRef.current.x;
      const newY = worldPos.y - dragOffsetRef.current.y;
      updateNote(draggingNoteId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setDraggingNoteId(null);
      dragOffsetRef.current = { x: 0, y: 0 };
    };

    const handleTouchEnd = () => {
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
  }, [draggingNoteId, screenToWorld, updateNote]);

  const handleNoteDragStart = useCallback(
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_DELAY) return;
      throttleRef.current = now;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      socket.current?.emit("mouse_move", { x: worldPos.x, y: worldPos.y });
    },
    [screenToWorld, socket]
  );

  const handleCanvasClick = useCallback(() => {
    if (!draggingNoteId) setStore({ selectNoteId: null });
  }, [draggingNoteId, setStore]);

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center">
          <p className="mb-4">Please set up your user identity first.</p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="px-6 py-2 bg-black text-white rounded-lg hover:opacity-90 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50 touch-none">
      {/* Fixed UI - Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
          {/* Back Button */}
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
            title="Back to Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
            Sticky<span className="text-amber-600">Verse</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <div className="bg-gray-900 text-white text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 rounded-full font-medium shadow-md">
            👥 {Object.keys(otherUsers).length + 1}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFitToScreen={fitToScreen}
        scale={currentScale}
      />

      {/* Background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#d1d5db 1px, transparent 1px)",
          backgroundSize: bgSize,
          backgroundPosition: bgPosition,
        }}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onDoubleClick={handleDoubleClick}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="absolute origin-top-left"
          style={{
            x: springX,
            y: springY,
            scale: springScale,
            width: "10000px",
            height: "10000px",
          }}
        >
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
            <h2 className="text-4xl font-bold text-amber-900/80 tracking-tight whitespace-nowrap">
              Welcome to Sticky (-_-) Verse
            </h2>
            <p className="text-gray-500 mt-2">
              Double-click anywhere to create a note
            </p>
          </div>

          {notes?.map((note) => (
            <StickyNoteComponent
              key={note.id}
              {...note}
              isDragging={draggingNoteId === note.id}
              showButtons={selectNoteId === note.id && !draggingNoteId}
              onDragStart={handleNoteDragStart}
            />
          ))}

          {Object.entries(otherUsers).map(([id, data]) => (
            <Cursor
              key={id}
              x={data.x || 0}
              y={data.y || 0}
              userName={data.userName || "Unknown"}
              color={data.color || "#ff0000"}
            />
          ))}
        </motion.div>
      </div>

      {/* Form Modal */}
      {showForm && coordinates && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={() => setStore({ showForm: false, editNote: null })}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <NoteForm />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

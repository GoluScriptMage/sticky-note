"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useShallow } from "zustand/shallow";
import { motion, useMotionTemplate, useTransform } from "framer-motion";
import { Loader2 } from "lucide-react";

import NoteForm from "./note-form";
import StickyNoteComponent from "./sticky-note";
import Cursor from "./cursor";
import { useStickyStore } from "@/store/useStickyStore";
import { useSocket } from "@/hooks/useSocket";
import { useCanvasTransform } from "@/hooks/useCanvasTransform";
import { ZoomControls } from "./zoom-controls";
import { updateNotePosition } from "@/lib/actions/note-actions";
import { getUserData } from "@/lib/actions/user-action";

// Auto-save interval for dirty notes (10 seconds)
const AUTO_SAVE_INTERVAL = 10000;

export default function CanvasPage() {
  const router = useRouter();
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

  // Drag state
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dirty notes tracking - notes that need position saved to DB
  const [dirtyNotes, setDirtyNotes] = useState<Set<string>>(new Set());

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

    x.set(viewportWidth / 2 - 200);
    y.set(viewportHeight / 2 - 100);
    scale.set(0.8);
  }, [x, y, scale]);

  const {
    notes,
    isFormOpen,
    selectedNoteId,
    setState,
    userData,
    remoteCursors,
    updateNote,
    formPosition,
    openNoteForm,
    closeNoteForm,
    setUserData,
  } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      isFormOpen: state.isFormOpen,
      selectedNoteId: state.selectedNoteId,
      setState: state.setState,
      userData: state.userData,
      remoteCursors: state.remoteCursors,
      updateNote: state.updateNote,
      formPosition: state.formPosition,
      openNoteForm: state.openNoteForm,
      closeNoteForm: state.closeNoteForm,
      setUserData: state.setUserData,
    }))
  );

  const params: { id: string } = useParams();
  const { userId, isLoaded } = useAuth();
  const userName = userData?.userName || "";
  const roomId = params.id;

  // State for loading user data
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Fetch and set user data if not available
  useEffect(() => {
    async function fetchAndSetUserData() {
      if (!userId || !isLoaded) return;

      // If userData is already loaded from localStorage, skip
      if (userData?.userName) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const result = await getUserData({ username: true }, userId);
        if (result.data?.username) {
          setUserData(result.data.username as unknown as string, roomId);
        }
      } catch (err) {
        console.error("Error fetching username:", err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    fetchAndSetUserData();
  }, [userId, isLoaded, userData?.userName, setUserData, roomId]);

  // Show loading state while Clerk auth is loading
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
          <p className="mt-3 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not logged in (after loading completes)
  if (!userId) {
    router.push("/sign-in");
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  const socket = useSocket({
    userId: userId!,
    roomId,
    userName,
    cursorColor: userData?.cursorColor || "#000000",
  });

  const throttleRef = useRef(0);
  const THROTTLE_DELAY = 50;

  // Background dots
  const bgSize = useTransform(springScale, (s) => {
    const baseSize = 20;
    const size = Math.max(15, baseSize * s);
    return `${size}px ${size}px`;
  });
  const bgPosition = useMotionTemplate`${springX}px ${springY}px`;

  // Note: Removed addDummyNotes - notes should be loaded from room DB

  // =========================================================================
  // DIRTY NOTES AUTO-SAVE
  // =========================================================================

  // Save dirty notes to DB when drag ends
  useEffect(() => {
    if (draggingNoteId === null && dirtyNotes.size > 0) {
      // Drag ended, save all dirty notes
      const saveNotes = async () => {
        const notesToSave = Array.from(dirtyNotes);
        setDirtyNotes(new Set()); // Clear dirty notes

        for (const noteId of notesToSave) {
          const note = notes.find((n) => n.id === noteId);
          if (note) {
            const result = await updateNotePosition(noteId, note.x, note.y);
            if (result.error) {
              console.error(
                `Failed to save note ${noteId} position:`,
                result.error
              );
            }
          }
        }
      };
      saveNotes();
    }
  }, [draggingNoteId, dirtyNotes, notes]);

  // Auto-save interval for any remaining dirty notes
  useEffect(() => {
    const interval = setInterval(async () => {
      if (dirtyNotes.size > 0 && !draggingNoteId) {
        const notesToSave = Array.from(dirtyNotes);
        setDirtyNotes(new Set());

        for (const noteId of notesToSave) {
          const note = notes.find((n) => n.id === noteId);
          if (note) {
            await updateNotePosition(noteId, note.x, note.y);
          }
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [dirtyNotes, draggingNoteId, notes]);

  // =========================================================================
  // DRAG HANDLERS
  // =========================================================================

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
        y: newY,
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
        y: newY,
      });
    };

    const handleMouseUp = () => {
      if (draggingNoteId) {
        // Mark note as dirty for DB save
        setDirtyNotes((prev) => new Set(prev).add(draggingNoteId));
      }
      setDraggingNoteId(null);
      dragOffsetRef.current = { x: 0, y: 0 };
    };

    const handleTouchEnd = () => {
      if (draggingNoteId) {
        setDirtyNotes((prev) => new Set(prev).add(draggingNoteId));
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
  }, [draggingNoteId, screenToWorld, updateNote, socket]);

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

  // Double-click to create note
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      openNoteForm({ x: worldPos.x, y: worldPos.y });
    },
    [screenToWorld, openNoteForm]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_DELAY) return;
      throttleRef.current = now;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      socket.current?.emit("mouse_move", {
        x: worldPos.x,
        y: worldPos.y,
        noteId: "",
        userId: userId!,
        timeStamp: now,
      });
    },
    [screenToWorld, socket, userId]
  );

  const handleCanvasClick = useCallback(() => {
    if (!draggingNoteId) setState({ selectedNoteId: null });
  }, [draggingNoteId, setState]);

  // Show loading while fetching user data
  if (isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
          <p className="mt-3 text-gray-500">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  // Show setup prompt only if user has no username set
  if (!userData?.userName) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center">
          <p className="mb-4">Please set up your username first.</p>
          <button
            onClick={() => router.push("/")}
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
            👥 {Object.keys(remoteCursors).length + 1}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Zoom Controls */}
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
              showButtons={selectedNoteId === note.id && !draggingNoteId}
              socket={socket}
              onDragStart={handleNoteDragStart}
              onSelect={(noteId) => setState({ selectedNoteId: noteId })}
            />
          ))}

          {Object.entries(remoteCursors).map(([id, data]) => (
            <Cursor
              key={id}
              x={data.x || 0}
              y={data.y || 0}
              userName={data.userName || "Unknown"}
              color={data.cursorColor || "#ff0000"}
            />
          ))}
        </motion.div>
      </div>

      {/* Form Modal */}
      {isFormOpen && formPosition && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-9998"
            onClick={closeNoteForm}
          />
          <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <NoteForm socket={socket} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

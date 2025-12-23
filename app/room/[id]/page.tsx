"use client";

// Imports
import NoteForm from "./note-form";
import { useStickyStore } from "@/store/useStickyStore";
import { useSocket } from "@/hooks/useSocket";

// Interfaces
import { useShallow } from "zustand/shallow";
import StickyNoteComponent from "./sticky-note";
import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function CanvasPage() {
  // useEffect(() => {

  // })

  // ** States Management **
  const { notes, showForm, selectNoteId, setStore, userData } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      showForm: state.showForm,
      selectNoteId: state.selectNoteId,
      setStore: state.setStore,
      userData: state.userData,
    }))
  );

  const params = useParams();

 const userId = userData?.userId || "";
  const userName = userData?.userName || "";
  const roomId = params.id;

  // 📞 CALL THE PHONE (Initialize Socket)
  useSocket(roomId, userId, userName);

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

  return userData ? (
    <div
      onDoubleClick={handleDoubleClick}
      onClick={() => setStore({ selectNoteId: null })}
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
        notes.map((note) => (
          <StickyNoteComponent
            key={note.id}
            {...note}
            showButtons={selectNoteId === note.id}
          />
        ))}
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

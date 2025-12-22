"use client";

// Imports
import NoteForm from "./note-form";
import { useStickyStore } from "@/store/useStickyStore";

// Interfaces
import { useShallow } from "zustand/shallow";
import StickyNoteComponent from "./sticky-note";

export default function CanvasPage() {
  // ** States Management **

  const { notes, showForm, selectNoteId, setStore } = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      showForm: state.showForm,
      selectNoteId: state.selectNoteId,
      setStore: state.setStore,
    }))
  );

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

  return (
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
  );
}

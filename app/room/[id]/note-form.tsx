import React, { useState } from "react";
import { StickyNote } from "./page";
import { useStickyStore, type StickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { v4 as uuidv4 } from "uuid";

export default function  NoteForm() {
  // Getting things out from store
  const {
    setStore,
    coordinates,
    editNote,
    updateExistingNote,
    addNote,
  }: StickyStore = useStickyStore(
    useShallow((state) => ({
      coordinates: state.coordinates,
      editNote: state.editNote,
      setStore: state.setStore,
      updateExistingNote: state.updateExistingNote,
      addNote: state.addNote,
      handleNoteEdit: state.handleNoteEdit,
    }))
  );

  // Local State For note Inputs Data
  const [note, setNote] = useState<Partial<StickyNote>>({
    noteName: editNote?.noteName || "",
    content: editNote?.content || "",
    createdBy: editNote?.createdBy || "Anonymous",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Edit Note Data Cleared", note, editNote);
    console.log("Form submitted");

    if (editNote?.id) {
      updateExistingNote({
        id: editNote.id,
        noteName: note.noteName,
        content: note.content,
      });
    } else {
      // Create new note with all required fields
      const newNote: StickyNote = {
        id: uuidv4().split("-")[0],
        noteName: note.noteName,
        content: note.content || "",
        createdBy: note.createdBy || "Anonymous",
        x: coordinates.x,
        y: coordinates.y,
      };
      addNote(newNote);
    }
    console.log("Note saved:", note);
    setStore({ showForm: false, editNote: null });
  };

  // Fn to update on every Key Stroke
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNote({
      ...note,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-9998"
        onClick={() => setStore({ showForm: false })}
      ></div>

      {/* Form positioned at click location */}
      <form
        style={{
          left: `${coordinates.x}%`,
          top: `${coordinates.y}%`,
        }}
        className="absolute z-9999 ignore
                   bg-green-200 border-green-300 border-t-8 border-l border-r border-b
                   w-[18vw] min-w-62.5 max-w-87.5
                   min-h-[30vh] max-h-[50vh]
                   rounded-sm shadow-2xl p-[2.5vh]
                   flex flex-col gap-[1.5vh]
                   -rotate-1
                   hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                   transition-shadow duration-300"
        onSubmit={(e) => handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top tape decoration */}
        <div className="absolute top-0 left-[40%] w-[20%] h-2 bg-white/50 rounded-sm shadow-inner"></div>

        {/* Close button */}
        <button
          type="button"
          onClick={() => setStore({ showForm: false })}
          className="absolute -top-[1vh] -right-[1vh] w-[3vh] h-[3vh] 
                     flex items-center justify-center
                     text-gray-700 hover:text-white 
                     bg-white hover:bg-red-500 rounded-full
                     transition-all duration-200 text-lg font-bold
                     shadow-md z-10"
        >
          ×
        </button>

        {/* Title input - looks like handwriting on note */}
        <input
          type="text"
          id="noteName"
          name="noteName"
          placeholder="Note Title..."
          required
          autoComplete="off"
          autoFocus
          onChange={(e) => handleChange(e)}
          value={note.noteName}
          className="w-full bg-transparent border-none outline-none
                     text-[2vh] font-bold text-gray-900 placeholder:text-gray-600/50
                     pb-[0.8vh] border-b-2 border-gray-700/20
                     focus:border-gray-700/40 focus:bg-transparent
                     [-webkit-autofill]:bg-transparent
                     [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(187,247,208)]
                     transition-colors"
        />

        {/* Content textarea - auto-grows */}
        <textarea
          value={note.content}
          id="content"
          name="content"
          placeholder="Write your note here..."
          required
          autoComplete="off"
          rows={4}
          onChange={(e) => handleChange(e)}
          className="w-full bg-transparent border-none outline-none resize-y
                     text-[1.7vh] text-gray-800 placeholder:text-gray-600/50
                     focus:bg-transparent
                     leading-relaxed
                     min-h-[15vh] max-h-[35vh]"
        />

        {/* Bottom section with submit button */}
        <div className="flex items-center justify-between pt-[1vh] border-t border-gray-700/15 mt-auto">
          <small className="text-[1.3vh] text-gray-700 italic font-medium">
            {`✍️ ${note.createdBy || "Anonymous"}`}
          </small>

          <button
            type="submit"
            className="px-[2vh] py-[0.8vh] 
                       bg-green-600 hover:bg-green-700 
                       text-white font-semibold text-[1.5vh]
                       rounded shadow-md hover:shadow-lg
                       transition-all duration-200
                       active:scale-95"
          >
            Done
          </button>
        </div>
      </form>
    </>
  );
}

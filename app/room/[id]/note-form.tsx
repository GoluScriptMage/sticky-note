import React, { useState } from "react";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { v4 as uuidv4 } from "uuid";
import type { StickyNote } from "@/types/types";
import { motion } from "framer-motion";

import { useParams } from "next/navigation";
import { updateNote, createNote } from "@/lib/actions/note-actions";

export default function NoteForm() {
  const {
    setStore,
    userData,
    coordinates,
    editNote,
    updateExistingNote,
    addNote,
  } = useStickyStore(
    useShallow((state) => ({
      coordinates: state.coordinates,
      editNote: state.editNote,
      setStore: state.setStore,
      updateExistingNote: state.updateExistingNote,
      addNote: state.addNote,
      userDatat: state.userData,
    }))
  );

  const { id }: { id: string } = useParams();

  const [note, setNote] = useState<Partial<StickyNote>>({
    noteName: editNote?.noteName || "",
    content: editNote?.content || "",
    createdBy: editNote?.createdBy || "Anonymous",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editNote?.id) {
      updateExistingNote({
        id: editNote.id,
        noteName: note.noteName,
        content: note.content,
      });
      await updateNote(editNote.id, {
        noteName: note.noteName,
        content: note.content,
      });
    } else {
      const noteId = `${uuidv4().split("-")[0]}_${id?.split("-")[0]}`;

      const newNote: StickyNote = {
        id: noteId,
        noteName: note.noteName || "Untitled",
        content: note.content || "",
        createdBy: userData?.userName || "Anonymous",
        x: coordinates?.x ?? 400,
        y: coordinates?.y ?? 300,
      };
      addNote(newNote);
      createNote(newNote, id);
    }

    setStore({ showForm: false, editNote: null });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNote({
      ...note,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    setStore({ showForm: false, editNote: null });
  };

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-amber-50 border-2 border-amber-200 w-[90vw] max-w-sm min-h-72 rounded-2xl shadow-2xl shadow-black/20 p-5 flex flex-col gap-4 relative overflow-hidden"
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Decorative header */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-amber-100 to-transparent pointer-events-none" />

      {/* Tape effect */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-6 bg-amber-200/60 rounded-b-lg shadow-sm" />

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white bg-white/80 hover:bg-red-500 rounded-full transition-all duration-200 text-lg font-bold shadow-md z-10 active:scale-90"
      >
        ×
      </button>

      {/* Title */}
      <div className="pt-4">
        <label className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5 block">
          Title
        </label>
        <input
          type="text"
          id="noteName"
          name="noteName"
          placeholder="Give your note a title..."
          required
          autoComplete="off"
          autoFocus
          onChange={handleChange}
          value={note.noteName}
          className="w-full bg-white/60 border border-amber-200 rounded-xl px-4 py-3 text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <label className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5 block">
          Content
        </label>
        <textarea
          value={note.content}
          id="content"
          name="content"
          placeholder="Write your thoughts here..."
          required
          autoComplete="off"
          rows={4}
          onChange={handleChange}
          className="w-full bg-white/60 border border-amber-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none min-h-28 max-h-48 leading-relaxed"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 mt-auto">
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-medium">
            {(note.createdBy || "A").charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{note.createdBy || "Anonymous"}</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 active:scale-95"
          >
            {editNote?.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

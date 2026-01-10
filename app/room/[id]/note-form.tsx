import React, { useState, RefObject } from "react";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { v4 as uuidv4 } from "uuid";
import type {
  StickyNote,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import {
  updateNote as updateNoteInDb,
  createNote,
} from "@/lib/actions/note-actions";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";

interface NoteFormProps {
  socket?: RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null>;
}

export default function NoteForm({ socket }: NoteFormProps) {
  const {
    closeNoteForm,
    userData,
    formPosition,
    editingNote,
    addNote,
    updateNote,
    deleteNote,
  } = useStickyStore(
    useShallow((state) => ({
      formPosition: state.formPosition,
      editingNote: state.editingNote,
      closeNoteForm: state.closeNoteForm,
      addNote: state.addNote,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
      userData: state.userData,
    }))
  );

  const { id: roomId }: { id: string } = useParams();

  const [note, setNote] = useState<Partial<StickyNote>>({
    noteName: editingNote?.noteName || "",
    content: editingNote?.content || "",
    createdBy: editingNote?.createdBy || userData?.userName || "Anonymous",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (editingNote?.id) {
        // Update existing note - optimistic update
        updateNote(editingNote.id, {
          noteName: note.noteName ?? "",
          content: note.content ?? "",
        });

        // Save to DB
        const result = await updateNoteInDb({
          id: editingNote.id,
          noteName: note.noteName ?? "",
          content: note.content ?? "",
        });

        if (result.error) {
          // Rollback on failure - revert to original
          updateNote(editingNote.id, {
            noteName: editingNote.noteName,
            content: editingNote.content,
          });
          toast.error("Failed to update note", { description: result.error });
        } else {
          toast.success("Note updated!");
        }
      } else {
        // Create new note - optimistic update with temp ID
        const tempId = `temp_${uuidv4().split("-")[0]}_${
          roomId?.split("-")[0]
        }`;
        const newNote: StickyNote = {
          id: tempId,
          noteName: note.noteName ?? "Untitled",
          content: note.content ?? "",
          createdBy: userData?.userName ?? "Anonymous",
          x: formPosition?.x ?? 400,
          y: formPosition?.y ?? 300,
        };

        // Add to store instantly (optimistic)
        addNote(newNote);

        // Emit to socket for real-time sync
        socket?.current?.emit("note_create", newNote);

        // Save to DB
        const result = await createNote(newNote, roomId);

        if (result.error) {
          // Rollback - remove the temp note
          deleteNote(tempId);
          // Emit rollback to socket
          socket?.current?.emit("note_rollback", {
            tempId,
            error: result.error,
          });
          toast.error("Failed to create note", { description: result.error });
        } else if (result.data) {
          // Success - replace temp ID with real ID
          updateNote(tempId, { id: result.data.id });
          toast.success("Note created!");

          // Emit confirmation to socket
          socket?.current?.emit("note_confirm", {
            tempId,
            realId: result.data.id,
          });
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error("Note submission error:", error);
    } finally {
      setIsSubmitting(false);
      closeNoteForm();
    }
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
    closeNoteForm();
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
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-600 font-medium text-sm rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : editingNote?.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </motion.form>
  );
}

import { useStickyStore, type StickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import type { StickyNote } from "@/types/types";
import React from "react";
import { motion } from "framer-motion";
import { deleteNote } from "@/lib/actions/note-actions";

interface StickyNoteProps extends StickyNote {
  showButtons?: boolean;
  isDragging?: boolean;
  onDragStart?: (
    noteId: string,
    e: React.MouseEvent,
    noteX: number,
    noteY: number
  ) => void;
}

const NOTE_WIDTH = 260;
const NOTE_MIN_HEIGHT = 160;

const COLORS = [
  {
    bg: "bg-amber-100",
    border: "border-amber-300",
    header: "bg-amber-200/60",
    accent: "from-amber-200 to-amber-100",
    text: "text-amber-900",
    shadow: "shadow-amber-200/50",
  },
  {
    bg: "bg-rose-100",
    border: "border-rose-300",
    header: "bg-rose-200/60",
    accent: "from-rose-200 to-rose-100",
    text: "text-rose-900",
    shadow: "shadow-rose-200/50",
  },
  {
    bg: "bg-sky-100",
    border: "border-sky-300",
    header: "bg-sky-200/60",
    accent: "from-sky-200 to-sky-100",
    text: "text-sky-900",
    shadow: "shadow-sky-200/50",
  },
  {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    header: "bg-emerald-200/60",
    accent: "from-emerald-200 to-emerald-100",
    text: "text-emerald-900",
    shadow: "shadow-emerald-200/50",
  },
  {
    bg: "bg-violet-100",
    border: "border-violet-300",
    header: "bg-violet-200/60",
    accent: "from-violet-200 to-violet-100",
    text: "text-violet-900",
    shadow: "shadow-violet-200/50",
  },
  {
    bg: "bg-orange-100",
    border: "border-orange-300",
    header: "bg-orange-200/60",
    accent: "from-orange-200 to-orange-100",
    text: "text-orange-900",
    shadow: "shadow-orange-200/50",
  },
];

function getStyleIndex(str: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % length;
}

export default function StickyNoteComponent({
  showButtons = false,
  isDragging = false,
  id,
  noteName,
  createdBy,
  content,
  x,
  y,
  onDragStart,
}: StickyNoteProps) {
  const { handleNoteEdit, handleNoteDelete }: StickyStore = useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      setStore: state.setStore,
      handleNoteEdit: state.handleNoteEdit,
      handleNoteDelete: state.handleNoteDelete,
    }))
  );

  const colorStyle =
    COLORS[getStyleIndex(noteName + (createdBy || ""), COLORS.length)];
  const rotation = (getStyleIndex(id, 5) - 2) * 1.5; // -3 to +3 degrees

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showButtons) return;
    if (onDragStart) {
      onDragStart(id, e, x, y);
    }
  };

  // Touch handler for mobile drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showButtons) return;
    if (onDragStart && e.touches.length === 1) {
      const touch = e.touches[0];
      // Create a synthetic mouse event
      const syntheticEvent = {
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent;
      onDragStart(id, syntheticEvent, x, y);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.05 : 1,
        y: 0,
        rotate: isDragging ? 0 : rotation,
        zIndex: isDragging ? 1000 : showButtons ? 100 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        scale: { duration: 0.15 },
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-note-id={id}
      style={{
        left: x,
        top: y,
        width: NOTE_WIDTH,
        minHeight: NOTE_MIN_HEIGHT,
      }}
      className={`
        ${colorStyle.bg} ${colorStyle.border} ignore absolute rounded-xl 
        border-2 overflow-hidden
        ${
          isDragging
            ? "shadow-2xl shadow-black/25 cursor-grabbing"
            : "shadow-lg hover:shadow-xl cursor-grab"
        }
        group touch-none select-none
      `}
    >
      {/* Header tape effect */}
      <div
        className={`${colorStyle.header} px-4 py-2.5 border-b ${colorStyle.border}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-sm font-semibold ${colorStyle.text} line-clamp-2 flex-1 leading-tight`}
          >
            {noteName}
          </h3>

          {/* Action buttons */}
          {showButtons && (
            <div className="flex gap-1 -mt-0.5 -mr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNoteEdit(id);
                }}
                className="w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-blue-500 text-gray-600 hover:text-white rounded-lg shadow-sm hover:shadow transition-all duration-150 active:scale-90"
                title="Edit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNoteDelete(id);
                  console.log("Deleting noteId:", id);
                  deleteNote(id);
                }}
                className="w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-red-500 text-gray-600 hover:text-white rounded-lg shadow-sm hover:shadow transition-all duration-150 active:scale-90"
                title="Delete"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex-1 overflow-auto">
        <p
          className={`text-sm ${colorStyle.text} opacity-80 leading-relaxed whitespace-pre-wrap break-words`}
        >
          {content}
        </p>
      </div>

      {/* Footer */}
      {createdBy && (
        <div className={`px-4 py-2 border-t ${colorStyle.border} bg-white/30`}>
          <div className="flex items-center gap-1.5 text-xs opacity-60">
            <span className="w-4 h-4 rounded-full bg-gray-400/30 flex items-center justify-center text-[10px]">
              {createdBy.charAt(0).toUpperCase()}
            </span>
            <span className={`${colorStyle.text} font-medium truncate`}>
              {createdBy}
            </span>
          </div>
        </div>
      )}

      {/* Corner fold effect */}
      <div className="absolute bottom-0 right-0 w-5 h-5 overflow-hidden pointer-events-none">
        <div
          className={`absolute bottom-0 right-0 w-7 h-7 bg-gradient-to-br ${colorStyle.accent} transform rotate-45 translate-x-3.5 translate-y-3.5 shadow-inner`}
        />
      </div>
    </motion.div>
  );
}

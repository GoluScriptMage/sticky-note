import { useStickyStore, type StickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import type { StickyNote } from "@/types/types";

// Interfacesz-

interface Actions extends StickyNote {
  showButtons?: boolean;
  key?: string;
}

export default function StickyNoteComponent({
  showButtons = false,
  id,
  noteName,
  createdBy,
  content,
  x,
  y,
}: Actions) {
  // Getting things out from store
  const { handleNoteEdit, handleNoteDelete }: Partial<StickyStore> =
    useStickyStore(
      useShallow((state) => ({
        notes: state.notes,
        handleNoteEdit: state.handleNoteEdit,
        handleNoteDelete: state.handleNoteDelete,
        setStore: state.setStore,
      }))
    );

  // Use hash of noteName for consistent styling per note
  const getStyleIndex = (str: string, length: number) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % length;
  };

  // Rotation classes for that authentic sticky note feel
  const rotations = [
    "rotate-[-2deg]",
    "rotate-[1deg]",
    "rotate-[-1deg]",
    "rotate-[2deg]",
  ];
  const rotation = rotations[getStyleIndex(noteName, rotations.length)];

  // Color variations
  const colors = [
    "bg-yellow-200 border-yellow-300 shadow-yellow-400/20",
    "bg-pink-200 border-pink-300 shadow-pink-400/20",
    "bg-blue-200 border-blue-300 shadow-blue-400/20",
    "bg-green-200 border-green-300 shadow-green-400/20",
    "bg-purple-200 border-purple-300 shadow-purple-400/20",
  ];
  const color =
    colors[getStyleIndex(noteName + (createdBy || ""), colors.length)];

  return (
    <div
      data-note-id={id}
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
      className={`${color} ${rotation} ignore
                     absolute w-[18vw] min-w-62.5 h-[30vh] min-h-50
                     rounded-sm border-t-8 border-l border-r border-b
                     shadow-lg hover:shadow-2xl
                     transition-all duration-300 ease-in-out
                     hover:scale-105 hover:rotate-0 hover:z-10
                     cursor-pointer group p-[3vh]
                     flex flex-col justify-between
                     overflow-hidden`}
    >
      {/* Top decoration - tape effect */}
      <div
        className="absolute top-0 left-[40%] w-[20%] h-2 bg-white/40 
                      rounded-sm shadow-inner"
      ></div>

      {/* Edit and Delete Buttons - shown when note is selected */}
      {showButtons && (
        <div className="absolute top-[1.5vh] right-[1.5vh] flex gap-[0.5vh] z-20">
          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log("Edit note:", id);
              // Edit functionality will be added later
              handleNoteEdit(id);
            }}
            className="w-[3vh] h-[3vh] p-[0.5vh]
                       flex items-center justify-center
                       bg-white/90 hover:bg-blue-500 
                       text-gray-700 hover:text-white rounded
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       active:scale-90"
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
              className="w-full h-full"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              // e.stopPropagation();
              console.log("Delete note:", id);
              // Delete functionality will be added later
              handleNoteDelete(id);
            }}
            className="w-[3vh] h-[3vh] p-[0.5vh]
                       flex items-center justify-center
                       bg-white/90 hover:bg-red-500 
                       text-gray-700 hover:text-white rounded
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       active:scale-90"
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
              className="w-full h-full"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <h3
          className="text-[2vh] md:text-[2.2vh] font-bold text-gray-800 mb-[1.5vh] 
                       tracking-tight line-clamp-2 group-hover:text-gray-900"
        >
          {noteName}
        </h3>

        <p
          className="text-[1.6vh] md:text-[1.8vh] text-gray-700 leading-relaxed 
                      whitespace-pre-wrap wrap-break-word"
        >
          {content}
        </p>
      </div>

      {/* Footer with creator */}
      {createdBy && (
        <div className="mt-[2vh] pt-[1vh] border-t border-gray-300/40">
          <small className="text-[1.4vh] text-gray-600 italic font-light flex items-center gap-1">
            <span className="opacity-60">✍️</span>
            <span>{createdBy}</span>
          </small>
        </div>
      )}

      {/* Corner fold effect */}
      <div
        className="absolute bottom-0 right-0 w-[15%] h-[15%] 
                      bg-linear-to-br from-transparent via-black/5 to-black/10
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      ></div>
    </div>
  );
}

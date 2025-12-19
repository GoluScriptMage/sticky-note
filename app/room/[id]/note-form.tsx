import React, { useState } from "react";
import { StickyPageProps, type NoteCoordinates } from "./page";

export default function NoteForm({
  coordinates,
  hideForm,
  updateNoteData,
}: {
  coordinates: NoteCoordinates;
  hideForm: () => void;
  updateNoteData: StickyPageProps;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
    hideForm();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <form
        className="relative bg-green-200 border-green-300 border-t-8 border-l border-r border-b
                   w-[25vw] min-w-75 max-w-100 h-[40vh] min-h-75
                   rounded-sm shadow-2xl p-[3vh]
                   flex flex-col gap-[2vh]
                   -rotate-1"
        onSubmit={(e) => handleSubmit(e)}
      >
        {/* Top tape decoration */}
        <div className="absolute top-0 left-[40%] w-[20%] h-2 bg-white/50 rounded-sm shadow-inner"></div>

        {/* Close button */}
        <button
          type="button"
          onClick={hideForm}
          className="absolute top-[2vh] right-[2vh] w-[3.5vh] h-[3.5vh] 
                     flex items-center justify-center
                     text-gray-700 hover:text-gray-900 
                     bg-white/30 hover:bg-white/60 rounded-full
                     transition-all duration-200 text-xl font-bold
                     shadow-sm"
        >
          ×
        </button>

        {/* Title input - looks like handwriting on note */}
        <input
          type="text"
          id="notename"
          name="notename"
          placeholder="Note Title..."
          required
          autoComplete="off"
          className="w-full bg-transparent border-none outline-none
                     text-[2.5vh] font-bold text-gray-900 placeholder:text-gray-600/50
                     pb-[1vh] border-b-2 border-gray-700/20
                     focus:border-gray-700/40 focus:bg-transparent
                     [-webkit-autofill]:bg-transparent
                     [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(187,247,208)]
                     transition-colors"
        />

        {/* Content textarea - blends into note */}
        <textarea
          id="content"
          name="content"
          placeholder="Write your note here..."
          required
          autoComplete="off"
          rows={6}
          className="flex-1 w-full bg-transparent border-none outline-none resize-none
                     text-[1.9vh] text-gray-800 placeholder:text-gray-600/50
                     focus:bg-transparent
                     leading-relaxed"
        />

        {/* Bottom section with submit button */}
        <div className="flex items-center justify-between pt-[1vh] border-t border-gray-700/15">
          <small className="text-[1.5vh] text-gray-700 italic font-medium">
            ✍️ New sticky note
          </small>

          <button
            type="submit"
            className="px-[2.5vh] py-[1.2vh] 
                       bg-green-600 hover:bg-green-700 
                       text-white font-semibold text-[1.7vh]
                       rounded shadow-md hover:shadow-lg
                       transition-all duration-200
                       active:scale-95"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

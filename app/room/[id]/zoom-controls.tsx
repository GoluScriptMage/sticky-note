import { Plus, Minus, RotateCcw, Maximize2, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ZoomControlsProps } from "./room-types";
import { useState} from "react";


export function ZoomControls({
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
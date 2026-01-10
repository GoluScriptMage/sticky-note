// app/room/[id]/cursor.tsx
import React from "react";

interface CursorProps {
  x: number;
  y: number;
  userName: string;
  color: string;
}

export default function Cursor({ x, y, userName, color }: CursorProps) {
  return (
    <div
      style={{
        transform: `translate(${x}px, ${y}px)`, // Use pixels in world space
      }}
      className="absolute top-0 left-0 pointer-events-none transition-transform duration-75 ease-out z-50"
    >
      {/* The Mouse Icon (SVG) - Bigger and more visible */}
      <svg
        width="32"
        height="48"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      {/* The Name Tag - More visible */}
      <div
        className="absolute left-5 top-6 px-3 py-1.5 rounded-full text-sm font-bold text-white whitespace-nowrap shadow-lg"
        style={{ 
          backgroundColor: color,
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}
      >
        {userName}
      </div>
    </div>
  );
}

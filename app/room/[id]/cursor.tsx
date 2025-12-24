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
        transform: `translate(${x}vw, ${y}vh)`, // Use vw/vh for screen scaling
      }}
      className="absolute top-0 left-0 pointer-events-none transition-transform duration-100 ease-linear z-50"
    >
      {/* The Mouse Icon (SVG) */}
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
        />
      </svg>

      {/* The Name Tag */}
      <div
        className="absolute left-4 top-4 px-2 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  );
}

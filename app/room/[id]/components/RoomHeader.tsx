"use client";

import { UserButton } from "@clerk/nextjs";

interface RoomHeaderProps {
  userCount: number;
}

export function RoomHeader({ userCount }: RoomHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 pointer-events-none">
      <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
        {/* Back Button */}
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
          title="Back to Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
          Sticky<span className="text-amber-600">Verse</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        <div className="bg-gray-900 text-white text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 rounded-full font-medium shadow-md">
          👥 {userCount}
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { useAuth } from "@clerk/nextjs";
import CreateRoomDisplay from "./create-room";
import RoomsListDisplay from "./rooms-list";
import { motion } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Users,
  Sparkles,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [roomInput, setRoomInput] = useState("");
  const router = useRouter();

  const { userData } = useStickyStore(
    useShallow((state) => ({
      userData: state.userData,
    }))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-10 h-10 border-3 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12"
        >
          <div className="space-y-1">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-gray-400 font-medium">
              Dashboard
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Your Workspace
            </h1>
            <p className="text-sm sm:text-base text-gray-500">
              Create, search, or rejoin existing rooms
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:shadow hover:bg-gray-50 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </button>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Search / Join Room */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Find a room</p>
                    <p className="text-sm text-gray-500">
                      Search or enter room ID to join
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter room ID or search..."
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition-all focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!userId) {
                        router.push("/sign-in");
                        return;
                      }
                      if (roomInput) {
                        router.push(`/room/${roomInput}`);
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all active:scale-95"
                  >
                    Join room
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* User Status Card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 sm:px-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">Your Status</p>
                </div>
              </div>

              <div className="grid gap-px bg-gray-100 sm:grid-cols-3">
                <div className="bg-white px-5 py-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                    Signed in as
                  </p>
                  <p className="font-semibold text-gray-900 truncate">
                    {userData?.userName ?? "Anonymous"}
                  </p>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                    Current room
                  </p>
                  <p className="font-medium text-gray-700 truncate">
                    {userData?.roomId ?? "Not in a room"}
                  </p>
                </div>
                <div className="bg-white px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm text-gray-600">
                      Live presence active
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    ID: {userId?.slice(0, 16) ?? "not signed in"}...
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Start */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">Quick Start</p>
                </div>
              </div>
              <div className="px-5 py-5">
                {userId ? (
                  <CreateRoomDisplay username={userData?.userName} />
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Sign in to create or join rooms
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => router.push("/sign-in")}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => router.push("/sign-up")}
                        className="w-full rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 transition-all active:scale-95"
                      >
                        Sign up
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <p className="font-semibold text-gray-900 mb-3">💡 Tips</p>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Create a room and share the URL with teammates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Double-click anywhere on the canvas to add notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Pinch or Ctrl+scroll to zoom the canvas</span>
                </li>
              </ul>
            </div>

            {/* Recent Rooms */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900">Recent Rooms</p>
                </div>
              </div>
              <div className="px-5 py-4">
                <RoomsListDisplay />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

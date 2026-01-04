"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import UserNameDisplay from "./user-name-display";
import { motion } from "framer-motion";
import {
  Users,
  Zap,
  MousePointerClick,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">
          {/* Left - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 lg:w-1/2"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Real-time collaboration</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-gray-900">
                Bring ideas together on a{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  shared canvas
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed">
                Create rooms, drop sticky notes, and collaborate live with your
                team. A clean, focused workspace that stays fast.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 mb-3">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-gray-900">Live cursors</p>
                <p className="text-sm text-gray-500 mt-1">
                  See teammates move and collaborate in real-time
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25 mb-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-gray-900">Instant rooms</p>
                <p className="text-sm text-gray-500 mt-1">
                  Create or join a room in seconds
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right - Auth Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:w-5/12"
          >
            <div className="rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
              {/* Card Header */}
              <div className="border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <MousePointerClick className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Get Started</p>
                    <p className="text-sm text-gray-500">
                      Join the collaboration
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-6">
                {userId ? (
                  <UserNameDisplay />
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Sign in to create or join collaborative rooms
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => router.push("/sign-in")}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98]"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => router.push("/sign-up")}
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 hover:shadow-xl transition-all active:scale-[0.98]"
                      >
                        Create free account
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>Features included</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Features */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">
                      Autosave
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Notes persist instantly
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">
                      Live sync
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      See changes in real-time
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

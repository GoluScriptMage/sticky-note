"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createRoom } from "@/lib/actions/room-actions";
import { Plus, Loader2 } from "lucide-react";

export default function CreateRoomDisplay({
  username,
}: {
  username: string | undefined;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const { userId } = useAuth();
  const router = useRouter();

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.info("Please sign in to continue");
      router.push("/sign-in");
      return;
    }
    setLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const roomName = formData.get("roomName") as string;

    try {
      const result = await createRoom(roomName);
      setLoading(false);
      if (result.data) {
        router.push(`/room/${result.data}`);
      } else {
        toast.error(result.error || "Failed to create room");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Failed to create room");
      console.log("Can't Create new room at this moment", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
          {(username || "A").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-gray-500">Welcome back,</p>
          <p className="font-semibold text-gray-900">{username ?? "Friend"}</p>
        </div>
      </div>

      <form onSubmit={onSubmitHandler} className="space-y-3">
        <input
          type="text"
          required
          placeholder="Enter room name..."
          name="roomName"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Room
            </>
          )}
        </button>
      </form>
    </div>
  );
}

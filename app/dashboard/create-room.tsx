"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createRoom } from "@/lib/actions/user-action";

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

    // Check the userId
    if (!userId) {
      toast.info("Please sign in to continue");
      router.push("/sign-in");
      return;
    }
    setLoading(true);

    // Get the roomName
    const roomName = new FormData(e.currentTarget).get("roomName") as string;

    try {
      // Call the createRoom Fn
      const newRoomId: string = await createRoom(roomName);
      setLoading(false);

      // get the room Id and set it
      router.push(`/room/${newRoomId}`);
    } catch (error) {
      console.log("Can't Create new room at this moment", error);
    }
  };

  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-foreground/70">Welcome back,</p>
      <p className="text-lg font-semibold text-foreground">
        {username ?? "Unnamed"}
      </p>
      <form onSubmit={(e) => onSubmitHandler(e)}>
        <input
          type="text"
          required={true}
          placeholder="Enter Room Name"
          name="roomName"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}

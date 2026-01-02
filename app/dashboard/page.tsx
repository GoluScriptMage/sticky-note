"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { createRoom } from "@/lib/actions/user-action";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [roomInput, setRoomInput] = useState("");
  const router = useRouter();

  const recentRooms = [
    { id: "team-sync", label: "Team Sync", lastActive: "2h ago" },
    { id: "design-sprint", label: "Design Sprint", lastActive: "yesterday" },
    { id: "retro-notes", label: "Retro Notes", lastActive: "3d ago" },
  ];

  const { userData } = useStickyStore(
    useShallow((state) => ({
      userData: state.userData,
    }))
  );

  useEffect(() => {
    // Step 1: Set timer and change loading states
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const navigateToRoom = async () => {
    if (!userId) {
      toast.info("Please sign in to continue");
      router.push("/sign-in");
      return;
    }

    const newRoom = await createRoom(roomInput || "New Room");
    router.push(`/room/${newRoom.id}`);
    toast.success("Room created", {
      description: "You have joined a room",
      duration: 1200,
    });
  };

  // STAGE 1: Nothing happens for 2 seconds
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Initializing Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-foreground/60">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Rooms & collaboration
            </h1>
            <p className="text-foreground/60">
              Create, search, or jump back into an existing room.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={navigateToRoom}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create room
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-foreground/10 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/5"
            >
              Back to home
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-foreground/10 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-foreground/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Find a room
                  </p>
                  <p className="text-sm text-foreground/60">
                    Search by room ID to jump back in.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <input
                    type="text"
                    placeholder="Search or enter room ID"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="w-full rounded-lg border border-foreground/10 bg-white px-3 py-3 text-sm outline-none ring-2 ring-transparent transition focus:ring-foreground/20 sm:w-72"
                  />
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
                    className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Join room
                  </button>
                </div>
              </div>

              <div className="grid gap-px bg-foreground/5">
                <div className="grid gap-4 bg-white px-6 py-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Signed in
                    </p>
                    <p className="text-sm text-foreground/60">
                      {userData?.userName ?? "Anonymous"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Active room
                    </p>
                    <p className="text-sm text-foreground/60">
                      {userData?.roomId ?? "Not set yet"}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center gap-1 text-sm text-foreground/60">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-green-500" />
                      Live presence enabled
                    </div>
                    <p className="truncate text-xs text-foreground/50">
                      Clerk ID: {userId ?? "not signed in"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-foreground/60">
                Quick start
              </p>
              {userId ? (
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-foreground/70">Welcome back,</p>
                  <p className="text-lg font-semibold text-foreground">
                    {userData?.userName ?? "Unnamed"}
                  </p>
                  <button
                    onClick={navigateToRoom}
                    className="mt-3 w-full rounded-lg bg-black px-4 py-3 text-white transition hover:opacity-90"
                  >
                    Create & enter a room
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-foreground/70">
                    Sign in to create or join rooms.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => router.push("/sign-in")}
                      className="w-full rounded-lg border border-foreground/10 bg-white px-4 py-3 font-medium text-foreground transition hover:bg-foreground/5"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => router.push("/sign-up")}
                      className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-foreground">Tips</p>
              <ul className="mt-3 space-y-2 text-sm text-foreground/60">
                <li>• Create a room, then share the URL with teammates.</li>
                <li>• Use the search box to rejoin existing rooms.</li>
                <li>• Everything saves automatically while you collaborate.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-foreground">
                Recent rooms
              </p>
              <div className="mt-3 space-y-2 text-sm text-foreground/70">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {room.label}
                      </p>
                      <p className="text-xs text-foreground/50">{room.id}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/room/${room.id}`)}
                      className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Rejoin
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

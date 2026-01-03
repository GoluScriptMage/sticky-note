"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { createRoom } from "@/lib/actions/user-action";
import { useAuth, useUser } from "@clerk/nextjs";
import UserNameDisplay from "./user-name-display";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { userId } = useAuth();
  const [userName, setUserName] = useState("");

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

  // Create a fn for getting user name
  // After that also make field

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
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-6 lg:w-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-4 py-2 text-sm text-foreground/80">
            <span className="size-2 rounded-full bg-foreground/50" />
            Real-time sticky notes, multiplayer ready
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Bring ideas together on a{" "}
              <span className="underline decoration-foreground/30">
                shared canvas
              </span>
              .
            </h1>
            <p className="max-w-2xl text-lg text-foreground/70">
              Create rooms, drop sticky notes, and collaborate live with
              teammates. No clutter, just a clean black-and-white workspace that
              stays fast and focused.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-foreground/70 sm:grid-cols-2">
            <div className="rounded-lg border border-foreground/10 bg-white/60 p-4 shadow-sm backdrop-blur">
              <p className="font-medium text-foreground">
                Live cursors & notes
              </p>
              <p className="mt-1">
                Watch teammates move, type, and brainstorm in real-time.
              </p>
            </div>
            <div className="rounded-lg border border-foreground/10 bg-white/60 p-4 shadow-sm backdrop-blur">
              <p className="font-medium text-foreground">Instant rooms</p>
              <p className="mt-1">
                Create or join a room in seconds—no extra steps.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:w-5/12">
          <div className="rounded-2xl border border-foreground/10 bg-white shadow-xl shadow-foreground/5">
            <div className="border-b border-foreground/10 px-6 py-4">
              <p className="text-sm uppercase tracking-[0.2em] text-foreground/60">
                Get started
              </p>
            </div>

            <div className="space-y-6 px-6 py-6">
              {userId ? (
                // <div className="space-y-4">
                //   <div className="rounded-lg border border-foreground/10 bg-foreground text-background px-4 py-3 text-sm">
                //     <p className="text-foreground/80">Signed in as</p>
                //     <p className="text-lg font-semibold text-white">
                //       {userData?.userName ?? "Unnamed"}
                //     </p>
                //   </div>

                //   <div className="space-y-3">
                //     <button
                //       onClick={navigateToRoom}
                //       className="w-full rounded-lg bg-black px-4 py-3 text-white transition hover:opacity-90"
                //     >
                //       Create & enter a room
                //     </button>

                //     <div className="flex flex-col gap-3 sm:flex-row">
                //       <input
                //         type="text"
                //         placeholder="Enter room ID"
                //         value={roomInput}
                //         onChange={(e) => setRoomInput(e.target.value)}
                //         className="w-full rounded-lg border border-foreground/10 bg-white px-3 py-3 text-sm outline-none ring-2 ring-transparent transition focus:ring-foreground/20"
                //       />
                //       <button
                //         type="button"
                //         onClick={() => {
                //           if (!userId) {
                //             router.push("/sign-in");
                //             return;
                //           }
                //           if (roomInput) {
                //             router.push(`/room/${roomInput}`);
                //           }
                //         }}
                //         className="shrink-0 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black ring-1 ring-foreground/15 transition hover:bg-black hover:text-white"
                //       >
                //         Join
                //       </button>
                //     </div>
                //   </div>
                // </div>
                <UserNameDisplay />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-foreground/70">
                    Please sign in to create or join rooms.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => router.push("/sign-in")}
                      className="w-full rounded-lg border border-foreground/10 bg-white px-4 py-3 text-sm font-medium text-foreground transition hover:bg-foreground/5"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => router.push("/sign-up")}
                      className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-foreground/60">
                <div className="h-px flex-1 bg-foreground/10" />
                <span>Collaboration ready</span>
                <div className="h-px flex-1 bg-foreground/10" />
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-foreground/10 bg-white px-4 py-3">
                  <p className="font-medium text-foreground">Autosave</p>
                  <p className="mt-1 text-foreground/60">
                    Notes are persisted instantly.
                  </p>
                </div>
                <div className="rounded-lg border border-foreground/10 bg-white px-4 py-3">
                  <p className="font-medium text-foreground">Live presence</p>
                  <p className="mt-1 text-foreground/60">
                    See teammates join in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

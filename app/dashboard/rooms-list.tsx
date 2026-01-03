import { getUserData } from "@/lib/actions/user-action";
import { useAuth } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RoomItem {
  id: string;
  roomName: string;
}

export default function RoomsListDisplay() {
  const { userId } = useAuth();
  const router = useRouter();
  const [recentRooms, setRecentRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch user joined rooms data
    const fetchRooms = async () => {
      try {
        if (!userId) return;
        const data = await getUserData(userId, {
          rooms: {
            select: {
              id: true,
              roomName: true,
            },
          },
        });
        if (!data) return;
        setRecentRooms(data.rooms ?? []);
      } catch (error) {
        console.log("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [userId]);

  if(loading){
    return (
        <p className="text-foreground/70 text-sm">Loading...</p>
    )
  }

  return (
    <div className="mt-3 space-y-2 text-sm text-foreground/70">
      {recentRooms.length === 0 ? (
        <p>No recent rooms found.</p>
      ) : (
        recentRooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2"
          >
            <div>
              <p className="font-medium text-foreground">{room.roomName}</p>
              <p className="text-xs text-foreground/50">{room.id}</p>
            </div>
            <button
              onClick={() => router.push(`/room/${room.id}`)}
              className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Rejoin
            </button>
          </div>
        ))
      )}
    </div>
  );
}

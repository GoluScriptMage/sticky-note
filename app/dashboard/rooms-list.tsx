import { getUserData } from "@/lib/actions/user-action";
import { useAuth } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderOpen, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface RoomItem {
  id: string;
  roomName: string;
}

export default function RoomsListDisplay() {
  const { userId } = useAuth();
  const router = useRouter();
  const [recentRooms, setRecentRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
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

  const handleCopyId = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedId(roomId);
      toast.success("Room ID copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (recentRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <FolderOpen className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No rooms yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Create your first room above
        </p>
      </div>
    );
  }

  const ROOM_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
  const ROOM_COLORS_DARK = [
    "#1d4ed8",
    "#7c3aed",
    "#db2777",
    "#d97706",
    "#059669",
  ];

  return (
    <div className="space-y-2">
      {recentRooms.map((room, index) => (
        <div
          key={room.id}
          className="group flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 px-4 py-3 transition-all cursor-pointer"
          onClick={() => router.push(`/room/${room.id}`)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${
                  ROOM_COLORS[index % 5]
                }, ${ROOM_COLORS_DARK[index % 5]})`,
              }}
            >
              {room.roomName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate text-sm">
                {room.roomName}
              </p>
              <p className="text-xs text-gray-400 truncate">{room.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={(e) => handleCopyId(room.id, e)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-90 ${
                copiedId === room.id
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }`}
              title="Copy room ID"
            >
              {copiedId === room.id ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Join Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/room/${room.id}`);
              }}
              className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-800 active:scale-95"
            >
              Join
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

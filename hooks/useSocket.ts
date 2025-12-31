import { useEffect, useRef, RefObject } from "react";
import { io, Socket } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  DataPayload,
} from "@/types/socketTypes";
import { useStickyStore } from "@/store/useStickyStore";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";

export const useSocket = (
  userId: string,
  roomId: string,
  userName: string
): RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null> => {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const { deleteOtherUsers, updateOtherUsers } = useStickyStore(
    useShallow((state) => ({
      deleteOtherUsers: state.deleteOtherUsers,
      updateOtherUsers: state.updateOtherUsers,
    }))
  );

  const isUserNameSavedRef = useRef<boolean>(false);

  useEffect(() => {
    // Step 1: Create Socket connection
    // This will only runs once when component mounts
    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://192.168.29.22:3001"
    );

    // Data to send to server
    const data: DataPayload = {
      userId,
      roomId,
      userName,
    };

    // Listening for connection success
    socketRef.current?.on("connect", () => {
      console.log("Connected to socket server");
    });

    // Step 2: Telling server to join Room
    socketRef.current?.emit("join_room", data);

    //  Step 3: Listen for server Events
    const socket = socketRef.current;

    // User Joined
    socket?.on("user_joined", (data: DataPayload) => {
      updateOtherUsers(data.userId, {
        userName: data.userName,
        color: "#ff4757",
        x: 0,
        y: 0,
      });
      isUserNameSavedRef.current = true;
      toast.success("User Joined", {
        description: `${data.userName} has joined the room`,
      });
      console.log(`✅ Added user to otherUsers: ${data.userName}`);
    });

    // For Mouse updates
    socket?.on("mouse_update", (data) => {
      if (!isUserNameSavedRef.current) return;
      console.log(`🖱️ Mouse Update Received:`, data);
      updateOtherUsers(data.userId, { x: data.x, y: data.y });
    });

    // User Left
    socket?.on("user_left", (data: DataPayload) => {
      toast.error("User Left", {
        description: `${data.userName} has left the room`,
      });
      deleteOtherUsers(data.userId);
      console.log(`User Left Room: ${data.userName}`);
    });

    // Important Step: Cleanup fn
    return () => {
      socket?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roomId, userName]);

  return socketRef;
};

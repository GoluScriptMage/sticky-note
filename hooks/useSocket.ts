import { useEffect, useRef, RefObject } from "react";
import { io, Socket } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  UserPayload,
  CursorPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from "@/types/index";
import { useShallow } from "zustand/shallow";
import { useStickyStore } from "../store/useStickyStore";
import { toast } from "sonner";
import type { User } from "@clerk/nextjs/dist/types/server";

export const useSocket = (
  userPayload: UserPayload
): RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null> => {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const { removeOtherUser, updateOtherUser } = useStickyStore(
    useShallow((state) => ({
      updateOtherUser: state.updateOtherUser,
      removeOtherUser: state.removeOtherUser,
    }))
  );

  const isUserNameSavedRef = useRef<boolean>(false);

  useEffect(() => {
    // Step 1: Create Socket connection
    // This will only runs once when component mounts
    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://192.168.1.64:3001"
    );

    // Data to send to server
    const data: UserPayload = {
      userId: userPayload.userId,
      roomId: userPayload.roomId,
      userName: userPayload.userName,
      cursorColor: userPayload.cursorColor,
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
    socket?.on("user_joined", (data: UserJoinedPayload) => {
      updateOtherUser(data.userId, {
        userId: data.userId,
        cursorColor: data.cursorColor,
        x: data.x,
        y: data.y,
      });
      isUserNameSavedRef.current = true;
      toast.success("User Joined", {
        description: `${data.userName} has joined the room`,
      });
      console.log(`✅ Added user to otherUsers: ${data.userName}`);
    });

    // For Mouse updates
    socket?.on(
      "mouse_update",
      (data: { x: number; y: number; userId: string }) => {
        if (!isUserNameSavedRef.current) return;
        console.log(`🖱️ Mouse Update Received:`, data);
        updateOtherUser(data.userId, { x: data.x, y: data.y });
      }
    );

    // User Left
    socket?.on("user_left", (data: UserLeftPayload) => {
      toast.error("User Left", {
        description: `${data.userName} has left the room`,
      });
      removeOtherUser(data.userId);
      console.log(`User Left Room: ${data.userName}`);
    });

    // Important Step: Cleanup fn
    return () => {
      socket?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPayload.userName, userPayload.roomId, userPayload.userId]);

  return socketRef;
};

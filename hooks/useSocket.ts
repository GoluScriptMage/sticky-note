import { useEffect, useRef, RefObject } from "react";
import { io, Socket } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  DataPayload,
} from "@/types/socketTypes";

export const useSocket = (
  userId: string,
  roomId: string,
  userName: string
): RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null> => {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  useEffect(() => {
    // Step 1: Create Socket connection
    // This will only runs once when component mounts
    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
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
      console.log(`User Joined Room: ${data.userName}`);
    });

    // User Left
    socket?.on("user_left", (data: DataPayload) => {
      console.log(`User Left Room: ${data.userName}`);
    });

    // Important Step: Cleanup fn
    return () => {
      socket?.disconnect();
    };
  }, [userId, roomId, userName]);

  return socketRef;
};

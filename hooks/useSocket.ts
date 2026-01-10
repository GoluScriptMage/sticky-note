import { useEffect, useRef, RefObject } from "react";
import { io, Socket } from "socket.io-client";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  UserPayload,
  CursorPayload,
  UserJoinedPayload,
  UserLeftPayload,
  NoteConfirmedPayload,
  NoteRollbackPayload,
  StickyNote,
  NoteMovedPayload,
} from "@/types/index";
import { useShallow } from "zustand/shallow";
import { useStickyStore } from "../store/useStickyStore";
import { toast } from "sonner";

export const useSocket = (
  userPayload: UserPayload
): RefObject<Socket<ServerToClientEvents, ClientToServerEvents> | null> => {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const {
    removeRemoteCursor,
    updateRemoteCursor,
    addNote,
    updateNote,
    deleteNote,
  } = useStickyStore(
    useShallow((state) => ({
      updateRemoteCursor: state.updateRemoteCursor,
      removeRemoteCursor: state.removeRemoteCursor,
      addNote: state.addNote,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
    }))
  );

  const isUserNameSavedRef = useRef<boolean>(false);

  useEffect(() => {
    // Step 1: Create Socket connection
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

    // Step 3: Listen for server Events
    const socket = socketRef.current;

    // =========================================================================
    // USER EVENTS
    // =========================================================================

    // User Joined
    socket?.on("user_joined", (data: UserJoinedPayload) => {
      updateRemoteCursor(data.userId, {
        cursorColor: data.cursorColor,
        x: data.x,
        y: data.y,
        userName: data.userName,
      });
      isUserNameSavedRef.current = true;
      toast.success("User Joined", {
        description: `${data.userName} has joined the room`,
      });
      console.log(`✅ Added user to remoteCursors: ${data.userName}`);
    });

    // For Mouse updates
    socket?.on("mouse_update", (data: CursorPayload) => {
      if (!isUserNameSavedRef.current) return;
      updateRemoteCursor(data.userId, { x: data.x, y: data.y });
    });

    // User Left
    socket?.on("user_left", (data: UserLeftPayload) => {
      toast.error("User Left", {
        description: `${data.userName} has left the room`,
      });
      removeRemoteCursor(data.userId);
      console.log(`User Left Room: ${data.userName}`);
    });

    // =========================================================================
    // NOTE EVENTS - Real-time sync from other users
    // =========================================================================

    // Note created by another user
    socket?.on("note_created", (note: StickyNote) => {
      console.log("📝 Remote note created:", note.id);
      addNote(note);
    });

    // Note updated by another user
    socket?.on("note_update", (data: Partial<StickyNote>) => {
      if (data.id) {
        console.log("📝 Remote note updated:", data.id);
        updateNote(data.id, data);
      }
    });

    // Note deleted by another user
    socket?.on("note_deleted", (noteId: string) => {
      console.log("🗑️ Remote note deleted:", noteId);
      deleteNote(noteId);
    });

    // Note moved by another user (real-time drag sync)
    socket?.on("note_moved", (data: NoteMovedPayload) => {
      console.log("📍 Remote note moved:", data.noteId);
      updateNote(data.noteId, { x: data.x, y: data.y });
    });

    // =========================================================================
    // OPTIMISTIC UPDATE CONFIRMATIONS
    // =========================================================================

    // Note confirmed - replace temp ID with real ID from DB
    socket?.on("note_confirmed", (data: NoteConfirmedPayload) => {
      console.log("✅ Note confirmed:", data.tempId, "→", data.realId);
      updateNote(data.tempId, { id: data.realId });
    });

    // Note rollback - remove temp note on failure
    socket?.on("note_rollback", (data: NoteRollbackPayload) => {
      console.log("⚠️ Note rollback:", data.tempId, data.error);
      deleteNote(data.tempId);
      toast.error("Failed to save note", {
        description: data.error || "Please try again",
      });
    });

    // Important Step: Cleanup fn
    return () => {
      socket?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPayload.userName, userPayload.roomId, userPayload.userId]);

  return socketRef;
};

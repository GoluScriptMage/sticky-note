import { createServer } from "node:http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

// Types for socket events
interface UserPayload {
  userId: string;
  userName: string;
  roomId: string;
  cursorColor: string;
}

interface CursorPayload {
  x: number;
  y: number;
  noteId?: string;
  userId?: string;
  timeStamp?: number;
}

interface StickyNote {
  id: string;
  noteName: string;
  content: string | number;
  createdBy: string | null;
  x: number;
  y: number;
  color?: string;
  z?: number;
}

interface NoteMovedPayload {
  noteId: string;
  x: number;
  y: number;
}

interface NoteConfirmedPayload {
  tempId: string;
  realId: string;
}

interface NoteRollbackPayload {
  tempId: string;
  error?: string;
}

interface UserJoinedPayload {
  userId: string;
  userName: string;
  cursorColor: string;
  x: number;
  y: number;
}

interface UserLeftPayload {
  userId: string;
  userName: string;
  roomId: string;
}

interface ClientToServerEvents {
  join_room: (data: UserPayload) => void;
  leave_room: (data: UserPayload) => void;
  get_room_data: (data: Partial<UserPayload>) => void;
  mouse_move: (data: CursorPayload) => void;
  note_create: (note: StickyNote) => void;
  note_update: (note: Partial<StickyNote>) => void;
  note_delete: (noteId: string, roomId: string) => void;
  note_move: (data: NoteMovedPayload) => void;
  note_confirm: (data: NoteConfirmedPayload) => void;
  note_rollback: (data: NoteRollbackPayload) => void;
}

interface ServerToClientEvents {
  user_joined: (data: UserJoinedPayload) => void;
  user_left: (data: UserLeftPayload) => void;
  room_data: (data: Partial<UserPayload>) => void;
  mouse_update: (data: CursorPayload & { userId: string }) => void;
  note_created: (data: StickyNote) => void;
  note_update: (data: Partial<StickyNote>) => void;
  note_deleted: (noteId: string) => void;
  note_moved: (data: NoteMovedPayload) => void;
  note_confirmed: (data: NoteConfirmedPayload) => void;
  note_rollback: (data: NoteRollbackPayload) => void;
}

interface SocketData {
  userId: string;
  roomId: string;
  userName: string;
  cursorColor: string;
}

const app = express();
const httpServer = createServer(app);
app.use(cors());

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://192.168.29.22:3000",
      "http://192.168.1.64:3000",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // =========================================================================
  // ROOM MANAGEMENT
  // =========================================================================

  socket.on("join_room", (data: UserPayload) => {
    // Save user info to socket data
    socket.data.userId = data.userId || socket.id;
    socket.data.roomId = data.roomId;
    socket.data.userName = data.userName;
    socket.data.cursorColor = data.cursorColor;

    // Join the room
    socket.join(socket.data.roomId);
    console.log(`👤 User ${data.userName} joined room ${socket.data.roomId}`);

    // Notify others in the room
    const joinData: UserJoinedPayload = {
      userId: socket.data.userId,
      userName: data.userName,
      cursorColor: data.cursorColor,
      x: 0,
      y: 0,
    };
    socket.to(socket.data.roomId).emit("user_joined", joinData);
  });

  // =========================================================================
  // CURSOR TRACKING
  // =========================================================================

  socket.on("mouse_move", (data: CursorPayload) => {
    const { roomId, userId } = socket.data;
    if (!roomId) return;

    // Broadcast cursor position to others in room
    socket.to(roomId).emit("mouse_update", {
      ...data,
      userId: userId || socket.id,
    });
  });

  // =========================================================================
  // NOTE CRUD OPERATIONS
  // =========================================================================

  // Note created - broadcast to others
  socket.on("note_create", (note: StickyNote) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    console.log(`📝 Note created in room ${roomId}:`, note.id);
    socket.to(roomId).emit("note_created", note);
  });

  // Note updated - broadcast to others
  socket.on("note_update", (note: Partial<StickyNote>) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    console.log(`✏️ Note updated in room ${roomId}:`, note.id);
    socket.to(roomId).emit("note_update", note);
  });

  // Note deleted - broadcast to others
  socket.on("note_delete", (noteId: string, _roomId: string) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    console.log(`🗑️ Note deleted in room ${roomId}:`, noteId);
    socket.to(roomId).emit("note_deleted", noteId);
  });

  // Note moved (drag) - broadcast to others for real-time sync
  socket.on("note_move", (data: NoteMovedPayload) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    // Broadcast to others (excluding sender)
    socket.to(roomId).emit("note_moved", data);
  });

  // =========================================================================
  // OPTIMISTIC UPDATE SYNC
  // =========================================================================

  // Confirm note creation - broadcast to sync temp ID → real ID
  socket.on("note_confirm", (data: NoteConfirmedPayload) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    console.log(
      `✅ Note confirmed in room ${roomId}:`,
      data.tempId,
      "→",
      data.realId
    );
    socket.to(roomId).emit("note_confirmed", data);
  });

  // Rollback note - broadcast to remove failed note
  socket.on("note_rollback", (data: NoteRollbackPayload) => {
    const { roomId } = socket.data;
    if (!roomId) return;

    console.log(`⚠️ Note rollback in room ${roomId}:`, data.tempId);
    socket.to(roomId).emit("note_rollback", data);
  });

  // =========================================================================
  // DISCONNECT
  // =========================================================================

  socket.on("disconnect", () => {
    const { userName, userId, roomId } = socket.data;
    if (roomId && userId && userName) {
      const data: UserLeftPayload = {
        userId,
        roomId,
        userName,
      };

      socket.to(roomId).emit("user_left", data);
      console.log(`👋 User ${userName} left room ${roomId}`);
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running at:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://192.168.1.64:${PORT}`);
});

import { createServer } from "node:http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  type DataPayload,
} from "../types/socketTypes";
import { Socket } from "socket.io";

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
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Listen To join room
  socket.on("join_room", (data: DataPayload) => {
    // Saving the current user info so not have to ask again
    socket.data.userId = socket.id;
    socket.data.roomId = "bf64";
    socket.data.userName = data.userName;

    // Join the room
    socket.join(socket.data.roomId);
    console.log(`User ${data.userName} joined room ${socket.data.roomId}`);

    // Tell others that a user joined room (with SOCKET.ID as userId)
    const joinData = {
      userId: socket.id,
      roomId: socket.data.roomId,
      userName: data.userName,
    };
    socket.to(socket.data.roomId).emit("user_joined", joinData);
    console.log(
      `📤 Emitting user_joined to room ${socket.data.roomId}:`,
      joinData
    );
  });

  // handle For mouse Mouse move event
  socket.on("mouse_move", (data) => {
    const { x, y } = data;
    const { roomId } = socket.data;

    // Tell others in the room about this user's mouse movement
    const moveData = { userId: socket.id, x, y };
    socket.to(roomId).emit("mouse_update", moveData);
    console.log(`📤 Emitting mouse_update to room ${roomId}:`, moveData);
  });

  // Listen to leave room or disconnect
  socket.on("disconnect", () => {
    const { userName, userId, roomId } = socket.data;
    if (roomId && userId && userName) {
      const data: DataPayload = {
        userId,
        roomId,
        userName,
      };

      socket.to(roomId).emit("user_left", data);
      console.log(`User: ${userName} left room: ${roomId}`);
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, (req, res) => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

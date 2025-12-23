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
    socket.data.roomId = data.roomId;
    socket.data.userName = data.userName;

    // Join the room
    socket.join(data.roomId);
    console.log(`User ${data.userName} joined room ${data.roomId}`);

    // Tell others that a user joined room
    socket.to(data.roomId).emit("user_joined", data);
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

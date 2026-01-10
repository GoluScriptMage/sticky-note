"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const httpServer = (0, node_http_1.createServer)(app);
app.use((0, cors_1.default)());
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "http://192.168.29.22:3000", "http://192.168.1.64:3000"],
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);
    // ============================================
    // ROOM MANAGEMENT
    // ============================================
    // Listen To join room
    socket.on("join_room", (data) => {
        // Saving the current user info
        socket.data.userId = socket.id;
        socket.data.roomId = data.roomId;
        socket.data.userName = data.userName;
        socket.data.cursorColor = data.cursorColor;
        // Join the room
        socket.join(socket.data.roomId);
        console.log(`✅ User ${data.userName} joined room ${socket.data.roomId}`);
        // Tell others that a user joined room
        const joinData = {
            userId: socket.id,
            userName: data.userName,
            cursorColor: data.cursorColor,
            x: 0,
            y: 0,
        };
        socket.to(socket.data.roomId).emit("user_joined", joinData);
        console.log(`📤 Emitting user_joined to room ${socket.data.roomId}:`, joinData);
    });
    // ============================================
    // MOUSE/CURSOR EVENTS
    // ============================================
    // Handle mouse move event
    socket.on("mouse_move", (data) => {
        const { x, y } = data;
        const { roomId } = socket.data;
        if (!roomId)
            return;
        // Tell others in the room about this user's mouse movement
        const moveData = { userId: socket.id, x, y };
        socket.to(roomId).emit("mouse_update", moveData);
    });
    // ============================================
    // NOTE EVENTS - Real-time sync
    // ============================================
    // Note Created - broadcast to others in room
    socket.on("note_create", (note) => {
        const { roomId, userName } = socket.data;
        if (!roomId)
            return;
        console.log(`📝 Note created by ${userName}:`, note.noteName);
        // Broadcast to others in the room (not sender)
        socket.to(roomId).emit("note_created", note);
    });
    // Note Updated - broadcast to others in room
    socket.on("note_update", (note) => {
        const { roomId, userName } = socket.data;
        if (!roomId)
            return;
        console.log(`✏️ Note updated by ${userName}:`, note.id);
        // Broadcast to others in the room
        socket.to(roomId).emit("note_update", note);
    });
    // Note Deleted - broadcast to others in room
    socket.on("note_delete", (noteId, roomId) => {
        const { userName } = socket.data;
        const targetRoom = socket.data.roomId || roomId;
        if (!targetRoom)
            return;
        console.log(`🗑️ Note deleted by ${userName}:`, noteId);
        // Broadcast to others in the room
        socket.to(targetRoom).emit("note_deleted", noteId);
    });
    // Note Moved/Dragged - broadcast to others in room (real-time drag sync)
    socket.on("note_move", (data) => {
        const { roomId } = socket.data;
        if (!roomId)
            return;
        // Broadcast to others in the room for live drag updates
        socket.to(roomId).emit("note_moved", data);
    });
    // ============================================
    // DISCONNECT
    // ============================================
    // Listen to leave room or disconnect
    socket.on("disconnect", () => {
        const { userName, roomId } = socket.data;
        if (roomId && userName) {
            const data = {
                userId: socket.id,
                userName,
                roomId,
            };
            socket.to(roomId).emit("user_left", data);
            console.log(`👋 User: ${userName} left room: ${roomId}`);
        }
    });
});
const PORT = 3001;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Socket.IO Server is running at:`);
    console.log(`  - Local:   http://localhost:${PORT}`);
    console.log(`  - Network: http://0.0.0.0:${PORT}`);
});
//# sourceMappingURL=index.js.map
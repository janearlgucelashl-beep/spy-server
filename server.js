const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allows your GitHub Pages site to connect
        methods: ["GET", "POST"]
    }
});

// This object stores all active game rooms
let activeRooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. Send the current lobby list to the new player
    socket.emit('update-lobby-list', Object.values(activeRooms));

    // 2. Create a Room
    socket.on('create-room', (data) => {
        const roomId = `room-${socket.id}`;
        const newRoom = {
            id: roomId,
            hostName: data.hostName,
            playerCount: 1,
            maxPlayers: 5,
            status: 'waiting'
        };
        
        activeRooms[roomId] = newRoom;
        socket.join(roomId);
        
        // Tell everyone a new lobby exists
        io.emit('update-lobby-list', Object.values(activeRooms));
        socket.emit('room-created', roomId);
    });

    // 3. Join a Room
    socket.on('join-room', (roomId) => {
        const room = activeRooms[roomId];
        if (room && room.playerCount < room.maxPlayers) {
            socket.join(roomId);
            room.playerCount++;
            
            // Update the list for everyone
            io.emit('update-lobby-list', Object.values(activeRooms));
            io.to(roomId).emit('player-joined', { id: socket.id });
        }
    });

    // 4. Cleanup when someone leaves
    socket.on('disconnect', () => {
        const roomId = `room-${socket.id}`;
        if (activeRooms[roomId]) {
            delete activeRooms[roomId]; // Close room if host leaves
            io.emit('update-lobby-list', Object.values(activeRooms));
        }
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
      

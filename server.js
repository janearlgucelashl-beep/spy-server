const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let activeRooms = {};

io.on('connection', (socket) => {
    socket.emit('update-lobby-list', Object.values(activeRooms));

    socket.on('create-room', (data) => {
        const roomId = `room-${socket.id}`;
        activeRooms[roomId] = {
            id: roomId,
            hostName: data.hostName,
            playerCount: 1,
            maxPlayers: data.maxPlayers || 5,
            status: 'waiting',
            players: [data.hostName]
        };
        socket.join(roomId);
        // Update everyone's lobby list
        io.emit('update-lobby-list', Object.values(activeRooms));
    });

    socket.on('join-room', (data) => {
        const room = activeRooms[data.roomId];
        if (room && room.playerCount < room.maxPlayers) {
            socket.join(data.roomId);
            room.playerCount++;
            room.players.push(data.playerName);
            
            // FIX: This line makes the "1/5" update for everyone!
            io.emit('update-lobby-list', Object.values(activeRooms)); 
            
            // Tell the room a new human arrived
            io.to(data.roomId).emit('receive-message', { 
                name: "SYSTEM", 
                text: `${data.playerName} has joined the match!`, 
                system: true 
            });
        }
    });

    // Handle Chat Messages
    socket.on('send-message', (data) => {
        io.to(data.roomId).emit('receive-message', data);
    });

    // Handle Game Start (Triggered by Host)
    socket.on('start-multiplayer-game', (data) => {
        io.to(data.roomId).emit('sync-game-start', data);
        io.to(data.roomId).emit('sync-phase-trigger', 'game');
    });

    socket.on('disconnect', () => {
        const roomId = `room-${socket.id}`;
        if (activeRooms[roomId]) {
            delete activeRooms[roomId];
            io.emit('update-lobby-list', Object.values(activeRooms));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
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
      

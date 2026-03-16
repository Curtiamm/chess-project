const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Flat structure: everything is in the same directory
const staticRoot = __dirname;
app.use(express.static(staticRoot));

// Explicit route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map(); // roomCode -> { players: [id1, id2], gameState: ... }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', () => {
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Initialize ready object for the host immediately
        rooms.set(roomCode, { 
            players: [socket.id], 
            white: socket.id,
            ready: { [socket.id]: false } 
        });
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, color: 'white' });
        console.log(`Room ${roomCode} created by ${socket.id}`);
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms.get(roomCode);
        if (room) {
            if (room.players.length < 2) {
                room.players.push(socket.id);
                room.black = socket.id;
                room.ready[socket.id] = false; // Add black player to ready tracking
                socket.join(roomCode);
                
                io.to(roomCode).emit('playerJoined', { roomCode });
                socket.emit('roomJoined', { roomCode, color: 'black' });
                
                // Also send current ready state to the joining player
                socket.emit('readyUpdate', {
                    whiteReady: room.ready[room.white],
                    blackReady: room.ready[room.black]
                });
                
                console.log(`User ${socket.id} joined room ${roomCode}`);
            } else {
                socket.emit('error', 'Phòng đã đầy!');
            }
        } else {
            socket.emit('error', 'Không tìm thấy phòng!');
        }
    });

    socket.on('playerReady', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (room && room.ready) {
            room.ready[socket.id] = true;
            
            // Tell everyone who is ready
            io.to(roomCode).emit('readyUpdate', {
                whiteReady: room.ready[room.white],
                blackReady: room.ready[room.black]
            });

            // Start if both ready
            if (room.ready[room.white] && room.ready[room.black]) {
                io.to(roomCode).emit('startGame', { white: room.white, black: room.black });
            }
        }
    });

    socket.on('makeMove', ({ roomCode, move }) => {
        socket.to(roomCode).emit('moveMade', move);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Handle player leaving... simplify for now
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Chess server running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// rooms: { roomCode: { players: [socket1, socket2], state: {} } }
const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create_room', () => {
    const code = generateRoomCode();
    rooms[code] = { players: [socket.id], sockets: { [socket.id]: socket }, ready: {} };
    socket.join(code);
    socket.roomCode = code;
    socket.playerIndex = 0;
    socket.emit('room_created', { code, playerIndex: 0 });
    console.log(`Room ${code} created by ${socket.id}`);
  });

  socket.on('join_room', ({ code }) => {
    const room = rooms[code];
    if (!room) {
      socket.emit('join_error', { message: 'Room not found' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('join_error', { message: 'Room is full' });
      return;
    }
    room.players.push(socket.id);
    room.sockets[socket.id] = socket;
    socket.join(code);
    socket.roomCode = code;
    socket.playerIndex = 1;
    socket.emit('room_joined', { code, playerIndex: 1 });
    io.to(code).emit('player_joined', { playerCount: room.players.length });
    console.log(`${socket.id} joined room ${code}`);
  });

  socket.on('select_character', ({ characterId }) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.ready = room.ready || {};
    room.ready[socket.playerIndex] = characterId;
    io.to(code).emit('character_selected', { playerIndex: socket.playerIndex, characterId });

    if (Object.keys(room.ready).length === 2) {
      io.to(code).emit('game_start', {
        p1Character: room.ready[0],
        p2Character: room.ready[1]
      });
    }
  });

  socket.on('game_input', (data) => {
    const code = socket.roomCode;
    if (!code) return;
    socket.to(code).emit('opponent_input', { ...data, playerIndex: socket.playerIndex });
  });

  socket.on('game_state_update', (data) => {
    const code = socket.roomCode;
    if (!code) return;
    socket.to(code).emit('game_state_sync', data);
  });

  socket.on('rematch_request', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.rematchVotes = (room.rematchVotes || 0) + 1;
    io.to(code).emit('rematch_vote', { votes: room.rematchVotes });
    if (room.rematchVotes >= 2) {
      room.ready = {};
      room.rematchVotes = 0;
      io.to(code).emit('rematch_start');
    }
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      io.to(code).emit('player_disconnected');
      delete rooms[code];
    }
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Battle Arena server running on http://localhost:${PORT}`);
});

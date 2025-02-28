const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Game state
const players = {};
const gameState = {
  scores: {}
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Add new player
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 1.6, z: 0 },
    rotation: 0,
    health: 100,
    score: 0
  };
  
  // Send current players to the new player
  socket.emit('currentPlayers', players);
  
  // Notify everyone about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  // Handle player movement
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: data.position
      });
    }
  });
  
  // Handle score updates
  socket.on('scoreUpdate', (data) => {
    if (players[socket.id]) {
      players[socket.id].score = data.score;
      gameState.scores[socket.id] = data.score;
      io.emit('leaderboardUpdate', gameState.scores);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files if needed (e.g., your client HTML/JS)
app.use(express.static('./'));
let users = []
// We'll use this variable to store a waiting player
let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  users.push(socket.id)

  // If no one is waiting, assign a random color to this player and store them.
  if (!waitingPlayer) {
    // Assign a random color (0 or 1)
    let color = Math.floor(Math.random() * 2);
    waitingPlayer = { socket, color };
    
    // Inform the player of their color and that they're waiting
    socket.emit('color', color);
    socket.emit('message', 'Waiting for an opponent...');
    
  } else {
    // A waiting player exists, so pair this new player with them.
    const firstPlayer = waitingPlayer;
    waitingPlayer = null; // Clear waiting player for future connections
    
    // The second player's color is the opposite of the first player's color.
    let color = firstPlayer.color === 1 ? 0 : 1;
    socket.emit('color', color);
    
    // Notify both players that the game is starting.
    socket.emit('message', 'Opponent found! Game starts.');
    firstPlayer.socket.emit('message', 'Opponent found! Game starts.');
    
    // (Optional) Create a game room for both players
    const roomName = `game-${firstPlayer.socket.id}-${socket.id}`;
    firstPlayer.socket.join(roomName);
    socket.join(roomName);
    
    // (Optional) Emit an event to start the game with room info
    io.to(roomName).emit('startGame', { room: roomName });
  }

  // Clean up if a player disconnects.
  socket.on('move',(msg) => {
    console.log(socket.id + " Made a move ",msg)
    for (let i = 0; i < users.length; i++) {
      if (users[i] !== socket.id) {
        socket.to(users[i]).emit("move",msg)
      }
    }
  })
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // If the disconnected socket was the waiting player, clear waitingPlayer.
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

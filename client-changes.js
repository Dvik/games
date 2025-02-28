// Add to your index.html:
// <script src="/socket.io/socket.io.js"></script>

// Add to the top of your game.js:
const socket = io();

// Define a container for other players
const otherPlayers = {};

// When connected to server
socket.on('connect', () => {
  console.log('Connected to game server!');
});

// Handle receiving current players
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id) {
      addOtherPlayer(players[id]);
    }
  });
});

// When new player joins
socket.on('newPlayer', (playerInfo) => {
  addOtherPlayer(playerInfo);
});

// When a player moves
socket.on('playerMoved', (playerInfo) => {
  if (otherPlayers[playerInfo.id]) {
    otherPlayers[playerInfo.id].position.set(
      playerInfo.position.x,
      playerInfo.position.y,
      playerInfo.position.z
    );
  }
});

// When a player disconnects
socket.on('playerDisconnected', (playerId) => {
  removeOtherPlayer(playerId);
});

// Function to add other player visuals
function addOtherPlayer(playerInfo) {
  // Create a mesh for the other player
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const playerMesh = new THREE.Mesh(geometry, material);
  
  playerMesh.position.set(
    playerInfo.position.x,
    playerInfo.position.y,
    playerInfo.position.z
  );
  
  scene.add(playerMesh);
  otherPlayers[playerInfo.id] = playerMesh;
}

function removeOtherPlayer(playerId) {
  scene.remove(otherPlayers[playerId]);
  delete otherPlayers[playerId];
}

// Add to your animate function to send position updates
// Inside your animation loop where player movement is handled:
if (state.playing && document.pointerLockElement === renderer.domElement) {
  // Your existing movement code...
  
  // Send position update to server
  socket.emit('playerMovement', {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    }
  });
}

// In checkEnemyHits function, add:
if (isKilled) {
  // Your existing code...
  
  // Send score update to server
  socket.emit('scoreUpdate', {
    score: state.score
  });
}

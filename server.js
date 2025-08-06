require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(helmet());
app.use(helmet.noCache());
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'PHP 7.4.3');
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(require.resolve('socket.io-client/dist/socket.io.js'), {
        headers: {
            'Content-Type': 'application/javascript'
        }
    });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;
const gameWidth = 800;
const gameHeight = 600;
let players = {};
let collectible = getRandomPosition(gameWidth, gameHeight);

const moveSpeed = 5;
const collectibleSize = 15;

function getRandomPosition(maxX, maxY) {
  return {
    x: Math.floor(Math.random() * maxX),
    y: Math.floor(Math.random() * maxY)
  };
}

function checkCollision(player, item) {
  const playerSize = 20; // from Player.mjs
  const itemSize = collectibleSize;
  return (
    player.x < item.x + itemSize &&
    player.x + playerSize > item.x &&
    player.y < item.y + itemSize &&
    player.y + playerSize > item.y
  );
}

function getPlayerRanks() {
    const playersArray = Object.values(players);
    playersArray.sort((a, b) => b.score - a.score);
    return playersArray.map(player => ({
        id: player.id,
        score: player.score,
        color: player.color
    }));
}

setInterval(() => {
    const ranks = getPlayerRanks();
    io.emit('rankUpdate', ranks);
}, 1000);


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  // Initialize player
  const playerId = socket.id;
  const initialpos = getRandomPosition(gameWidth, gameHeight);
  players[playerId] = {
    id: socket.id,
    x: initialpos.x,
    y: initialpos.y,
    score: 0,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    isMoving: { up: false, down: false, left: false, right: false }
  };

  socket.emit('currentPlayers', players);
  socket.emit('collectibleUpdate', collectible);
  socket.broadcast.emit('newPlayer', players[playerId]);

  socket.on('playerMove', (move) => {
    // SECURITY: Validate input
    if (!players[playerId] || !move || typeof move.direction !== 'string') {
      return; // Ignore invalid requests
    }

    // Get the player's current state
    const player = players[playerId];
    let newX = player.x;
    let newY = player.y;

    // Determine the new position based on the move request
    switch (move.direction) {
      case 'up':
        newY = Math.max(0, player.y - moveSpeed);
        break;
      case 'down':
        newY = Math.min(gameHeight - 20, player.y + moveSpeed); // Subtracting player size (20)
        break;
      case 'left':
        newX = Math.max(0, player.x - moveSpeed);
        break;
      case 'right':
        newX = Math.min(gameWidth - 20, player.x + moveSpeed);
        break;
      default:
        return; // Ignore invalid directions
    }

    // Update the player's authoritative position
    player.x = newX;
    player.y = newY;

    // Check for collision with the collectible
    if (checkCollision(player, collectible)) {
      player.score += 10;
      collectible = getRandomPosition(gameWidth, gameHeight);

      io.emit('scoreUpdate', { id: playerId, score: player.score });
      io.emit('collectibleUpdate', collectible);
    }

    // Broadcast the updated position to all clients
    io.emit('playerMoved', {
      id: playerId,
      x: player.x,
      y: player.y
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });

});

// Set up server and tests
const server = http.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

module.exports = app; // For testing

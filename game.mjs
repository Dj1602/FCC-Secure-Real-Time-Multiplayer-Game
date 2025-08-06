// public/game.mjs
import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

let players = {};
let collectible = null;
let localPlayerId = null;
let playerRanks = [];

const keyState = { up: false, down: false, left: false, right: false };

socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    localPlayerId = socket.id;
});

// A flag to ensure the game loop starts only once
let gameLoopStarted = false;

socket.on('currentPlayers', (serverPlayers) => {
    console.log('Current players:', serverPlayers);
    for (let id in serverPlayers) {
        const p = serverPlayers[id];
        players[id] = new Player({
            x: p.x,
            y: p.y,
            score: p.score,
            id: p.id,
            color: p.color
        });
    }

    // Start the game loop and movement listeners only after we get the initial state
    if (!gameLoopStarted) {
        drawGame();
        startMovementLoop();
        gameLoopStarted = true;
    }
});

socket.on('newPlayer', (playerData) => {
    console.log('New player joined:', playerData);
    players[playerData.id] = new Player({
        x: playerData.x,
        y: playerData.y,
        score: playerData.score,
        id: playerData.id,
        color: playerData.color
    });
});

socket.on('playerDisconnected', (playerId) => {
    console.log('Player disconnected:', playerId);
    delete players[playerId];
});

socket.on('playerMoved', (playerData) => {
    const player = players[playerData.id];
    if (player) {
        player.x = playerData.x;
        player.y = playerData.y;
    }
});

socket.on('scoreUpdate', (data) => {
    const player = players[data.id];
    if (player) {
        player.score = data.score;
    }
});

socket.on('collectibleUpdate', (itemData) => {
    collectible = new Collectible({ x: itemData.x, y: itemData.y });
});

socket.on('rankUpdate', (ranks) => {
    playerRanks = ranks;
});

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (collectible) {
        collectible.draw(ctx);
    }
    for (let id in players) {
        players[id].draw(ctx);
    }
    drawLeaderboard();
    requestAnimationFrame(drawGame);
}

function drawLeaderboard() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 200, 0, 200, 200);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Leaderboard', canvas.width - 180, 20);
    ctx.font = '12px Arial';
    
    playerRanks.forEach((rank, index) => {
        const yPos = 40 + index * 20;
        const local = (rank.id === localPlayerId) ? ' (You)' : '';
        ctx.fillStyle = rank.color;
        ctx.fillText(`Rank ${index + 1}: ${rank.score}${local}`, canvas.width - 180, yPos);
    });
}

function startMovementLoop() {
    setInterval(() => {
        const localPlayer = players[localPlayerId];
        if (!localPlayer) return;

        if (keyState.up) {
            socket.emit('playerMove', { direction: 'up' });
        }
        if (keyState.down) {
            socket.emit('playerMove', { direction: 'down' });
        }
        if (keyState.left) {
            socket.emit('playerMove', { direction: 'left' });
        }
        if (keyState.right) {
            socket.emit('playerMove', { direction: 'right' });
        }
    }, 1000 / 60);
}

window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            keyState.up = true;
            break;
        case 'ArrowDown':
        case 's':
            keyState.down = true;
            break;
        case 'ArrowLeft':
        case 'a':
            keyState.left = true;
            break;
        case 'ArrowRight':
        case 'd':
            keyState.right = true;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            keyState.up = false;
            break;
        case 'ArrowDown':
        case 's':
            keyState.down = false;
            break;
        case 'ArrowLeft':
        case 'a':
            keyState.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            keyState.right = false;
            break;
    }
});

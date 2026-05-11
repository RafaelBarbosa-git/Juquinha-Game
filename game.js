const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const spriteSheet = new Image();
spriteSheet.src = "img/sprisheet.png";

// Imagem do player (cobra)
const playerImage = new Image();
playerImage.src = "img/cobra.png";
// Imagem do preá (player com animação)
const preaImage = new Image();
preaImage.src = "img/prea.png";
// Imagem do inimigo
const enemyImage = new Image();
enemyImage.src = "img/prea.png";

// --- CONFIGURAÇÕES GERAIS ---
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED = 5;

// --- ESTADO DO JOGO ---
let gameActive = false;
let score = 0;
let animationId;

// --- CÂMERA ---
let cameraX = 0;

// --- ESTADO DAS TECLAS ---
const keys = { right: false, left: false, up: false };

// --- MAPA EXPANDIDO (Caatinga) ---
// 0: Vazio, 1: Chão (Terra), 2: Bloco ?, 3: Bloco Batido, 4: Mandacaru
const map = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,0,2,3,2,0,0,0,0,0,0,0,2,3,2,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0], 
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,4,0,0,0,0,4,0,0,0,0,4,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5]
];

// --- CLASSES ---

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 100;
        this.y = 200;
        this.width = 32;
        this.height = 55;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.isBig = false;
        this.color = "#4CAF50";
        this.facing = 1; // 1 = direita, -1 = esquerda
    }

    update() {
        // Movimentação lateral
        if (keys.right) {
            this.vx = SPEED;
            this.facing = 1;
        } else if (keys.left) {
            this.vx = -SPEED;
            this.facing = -1;
        } else {
            this.vx = 0;
        }

        // Pulo
        if (keys.up && this.onGround) {
            this.vy = JUMP_FORCE;
            this.onGround = false;
        }

        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = 0; // Limite esquerdo

        this.checkCollisions();

        // Queda no abismo
        if (this.y > canvas.height) gameOver();
    }

    checkCollisions() {
        this.onGround = false;
        
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                let tile = map[row][col];
                if (tile !== 0) {
                    let tx = col * TILE_SIZE;
                    let ty = row * TILE_SIZE;

                    // Detecção AABB
                    if (this.x < tx + TILE_SIZE && this.x + this.width > tx &&
                        this.y < ty + TILE_SIZE && this.y + this.height > ty) {
                        
                        // Bater a cabeça (Baixo para cima)
                        if (this.vy < 0 && this.y > ty + TILE_SIZE / 2) {
                            this.vy = 0;
                            this.y = ty + TILE_SIZE;
                            if (tile === 2) { 
                                score += 100;
                                map[row][col] = 3; 
                                this.isBig = true; // Efeito "Cogumelo"
                            }
                        } 
                        // Cair no chão (Cima para baixo)
                        else if (this.vy > 0 && this.y + this.height < ty + TILE_SIZE / 2 + 10) {
                            this.vy = 0;
                            this.y = ty - this.height;
                            this.onGround = true;
                        }
                        // Empurrão lateral
                        else {
                            if (this.vx > 0) this.x = tx - this.width;
                            if (this.vx < 0) this.x = tx + TILE_SIZE;
                        }
                    }
                }
            }
        }
    }

    draw() {
        let drawHeight = this.isBig ? this.height * 1.3 : this.height;
        let drawY = this.isBig ? this.y - (this.height * 0.3) : this.y;

        if (playerImage.complete && playerImage.naturalWidth !== 0) {
            ctx.save();
            if (this.facing < 0) {
                ctx.translate(this.x - cameraX + this.width, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(playerImage, 0, 0, this.width, drawHeight);
            } else {
                ctx.drawImage(playerImage, this.x - cameraX, drawY, this.width, drawHeight);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - cameraX, drawY, this.width, drawHeight);
        }
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 30;
        this.vx = -2;
        this.color = "#8D6E63";
        this.facing = -1; // -1 = esquerda (inicial), 1 = direita
    }

    update() {
        this.x += this.vx;
        // Inverte direção se sair muito do mapa
        if (this.x < 0) {
            this.vx = 2;
            this.facing = 1;
        } else if (this.x > map[0].length * TILE_SIZE - this.width) {
            this.vx = -2;
            this.facing = -1;
        }
    }

    draw() {
        if (enemyImage.complete && enemyImage.naturalWidth !== 0) {
            ctx.save();
            if (this.facing < 0) {
                ctx.translate(this.x - cameraX + this.width, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(enemyImage, 0, 0, this.width, this.height);
            } else {
                ctx.drawImage(enemyImage, this.x - cameraX, this.y, this.width, this.height);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
        }
    }
}

// --- INSTÂNCIAS ---
const player = new Player();
let enemies = [];

function initEnemies() {
    enemies = [
        new Enemy(600, 370), 
        new Enemy(1200, 370), 
        new Enemy(1800, 370)
    ];
}

// --- LÓGICA PRINCIPAL ---

function drawMap() {
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            let tile = map[row][col];
            if (tile === 0) continue;

            let tx = col * TILE_SIZE;
            let ty = row * TILE_SIZE;
            
            if (tx - cameraX > -TILE_SIZE && tx - cameraX < canvas.width) {
                
                if (tile === 1) { 
                    // Chão 
                    ctx.drawImage(spriteSheet, 100, 0, 40, 40, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === 2) { 
                    // Bloco "?"
                    ctx.drawImage(spriteSheet, 140, 0, 40, 40, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === 3) { 
                    // Bloco batido
                    ctx.drawImage(spriteSheet, 180, 0, 40, 40, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === 4) { 
                    // Mandacaru
                    ctx.drawImage(spriteSheet, 220, 0, 40, 80, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }
}

function update() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sistema de Câmera
    if (player.x > canvas.width / 2) {
        cameraX = player.x - canvas.width / 2;
    }

    drawMap();
    player.update();
    player.draw();

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();

        // Colisão Player x Inimigo
        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
            
            // Pular em cima do inimigo mata ele
            if (player.vy > 0 && player.y < enemy.y) {
                enemies.splice(index, 1);
                player.vy = JUMP_FORCE / 1.5;
                score += 200;
            } else {
                gameOver();
            }
        }
    });

    // Interface (Score)
    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`JUQUINHA PONTOS: ${score}`, 20, 40);

    animationId = requestAnimationFrame(update);
}

// --- CONTROLES ---
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowUp' || e.key === ' ') keys.up = true;
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowUp' || e.key === ' ') keys.up = false;
});

// --- SISTEMA DE TELAS ---
function startGame() {
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    player.reset();
    initEnemies();
    score = 0;
    cameraX = 0;
    gameActive = true;
    
    if (animationId) cancelAnimationFrame(animationId);
    update(); 
}

function gameOver() {
    gameActive = false;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() {
    // Recarrega o estado inicial
    location.reload(); 
}

// Vincula a função ao botão globalmente
window.startGame = startGame;
window.restartGame = restartGame;
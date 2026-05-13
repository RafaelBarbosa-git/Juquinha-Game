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
// Imagem do power-up (vida extra)
const powerUpImage = new Image();
powerUpImage.src = "img/powerup.png";
// Imagem do bloco de tijolos
const brickTileImage = new Image();
brickTileImage.src = "img/brick_tile.png";
// Imagem do bloco da sorte
const luckBlockImage = new Image();
luckBlockImage.src = "img/luck_block.png";
// Imagem do bloco da sorte batido
const luckBlockBeatenImage = new Image();
luckBlockBeatenImage.src = "img/luck_block_beaten.png";
// Imagem do bloco de tijolos batido
const brickTileBeatenImage = new Image();
brickTileBeatenImage.src = "img/brick_tile_beaten.png";

// --- CONFIGURAÇÕES GERAIS ---
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED = 2.5; // Reduzido de 5 para mais controle

// --- ESTADO DO JOGO ---
let gameActive = false;
let score = 0;
let animationId;
let powerUps = []; // Array de power-ups ativos no mapa

// --- CÂMERA ---
let cameraX = 0;

// --- ESTADO DAS TECLAS ---
const keys = { right: false, left: false, up: false };

// --- MAPA EXPANDIDO (Caatinga) ---
// 0: Vazio, 1: Chão (Terra), 2: Bloco Tijolos, 3: Bloco Tijolos Batido, 4: Mandacaru, 5: Bloco Sorte, 6: Bloco Sorte Batido
const map = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,0,5,3,2,0,0,0,0,0,0,0,2,3,5,0,0,0,0,0,0,0,2,2,5,0,0,0,0,0,0,0], 
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
        this.lives = 1; // Começa com 1 vida
        this.hasPowerUp = false; // Flag se tem power-up ativo
        this.invulnerableTimer = 0;
    }

    update() {
        // Diminui o tempo de invencibilidade a cada frame
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

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
                        
                        // Bater a cabeça (Baixo para cima) - APENAS se o personagem está abaixo e bate para cima
                        // Personagem tem height ~55, TILE_SIZE é 40, então condição rigorosa: deve estar bem abaixo
                        if (this.vy < 0 && this.y + this.height > ty + TILE_SIZE * 0.8) {
                            this.vy = 0;
                            this.y = ty + TILE_SIZE;
                            
                            // Bloco de tijolos
                            if (tile === 2) { 
                                score += 100;
                                map[row][col] = 3; 
                                // NÃO crescer aqui! Crescimento só ocorre ao coletar power-up
                            }
                            // Bloco da sorte
                            else if (tile === 5) {
                                score += 150;
                                map[row][col] = 6; // Marca como batido
                                
                                // 35% de chance de gerar power-up
                                if (Math.random() < 0.35) {
                                    powerUps.push(new PowerUp(tx, ty));
                                }
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
        // Efeito piscando quando está invencível (pisca a cada 10 frames)
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return; // Pula o desenho neste frame para criar o efeito de piscar
        }

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
        this.vx = -1; // Reduzido de -2 para mais lentidão
        this.color = "#8D6E63";
        this.facing = -1; // -1 = esquerda (inicial), 1 = direita
    }

    update() {
        this.x += this.vx;
        // Inverte direção se sair muito do mapa
        if (this.x < 0) {
            this.vx = 1; // Reduzido de 2 para mais lentidão
            this.facing = 1;
        } else if (this.x > map[0].length * TILE_SIZE - this.width) {
            this.vx = -1; // Reduzido de -2 para mais lentidão
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

class PowerUp {
    constructor(x, y) {
        this.x = x + TILE_SIZE / 2 - 15; // Centraliza horizontalmente
        this.y = y - TILE_SIZE; // Aparece acima do bloco
        this.width = 30;
        this.height = 30;
        this.vy = 0; // Velocidade vertical (cai)
        this.color = "#FFD700"; // Cor dourada
    }

    update() {
        // Física simples - cai devagar
        this.vy += 0.3;
        this.y += this.vy;
        
        // Colisão com blocos - power-up não atravessa
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                let tile = map[row][col];
                if (tile !== 0) {
                    let tx = col * TILE_SIZE;
                    let ty = row * TILE_SIZE;
                    
                    // Detecção AABB com bloco
                    if (this.x < tx + TILE_SIZE && this.x + this.width > tx &&
                        this.y < ty + TILE_SIZE && this.y + this.height > ty) {
                        
                        // Se vindo de cima, pousa no bloco
                        if (this.vy > 0 && this.y + this.height / 2 < ty + TILE_SIZE / 2) {
                            this.vy = 0;
                            this.y = ty - this.height;
                        }
                        // Se vindo de baixo, bate a cabeça
                        else if (this.vy < 0 && this.y + this.height / 2 > ty + TILE_SIZE / 2) {
                            this.vy = 0;
                            this.y = ty + TILE_SIZE;
                        }
                    }
                }
            }
        }
    }

    draw() {
        if (powerUpImage.complete && powerUpImage.naturalWidth !== 0) {
            ctx.drawImage(powerUpImage, this.x - cameraX, this.y, this.width, this.height);
        } else {
            // Desenho padrão se a imagem não carregar
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
            ctx.fillStyle = "black";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("★", this.x - cameraX + this.width / 2, this.y + this.height / 2 + 5);
            ctx.textAlign = "left";
        }
    }

    checkCollision(player) {
        return player.x < this.x + this.width && 
               player.x + player.width > this.x &&
               player.y < this.y + this.height && 
               player.y + player.height > this.y;
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
    powerUps = []; // Reseta power-ups ao iniciar
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
                    // Chão - sempre usa spriteSheet para consistência
                    ctx.drawImage(spriteSheet, 100, 0, 40, 40, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === 2) { 
                    // Bloco Tijolos (intacto) - tenta usar textura customizada
                    if (brickTileImage.complete && brickTileImage.naturalWidth !== 0) {
                        ctx.drawImage(brickTileImage, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback: desenha padrão temporário enquanto imagem carrega
                        ctx.fillStyle = "#A0522D";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#8B4513";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    }
                }
                else if (tile === 3) { 
                    // Bloco Tijolos (batido) - usa imagem customizada
                    if (brickTileBeatenImage.complete && brickTileBeatenImage.naturalWidth !== 0) {
                        ctx.drawImage(brickTileBeatenImage, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback: desenha padrão temporário
                        ctx.fillStyle = "#A9A9A9";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#666666";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    }
                }
                else if (tile === 4) { 
                    // Mandacaru
                    ctx.drawImage(spriteSheet, 220, 0, 40, 80, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (tile === 5) {
                    // Bloco da Sorte (intacto) - sempre tenta usar textura
                    if (luckBlockImage.complete && luckBlockImage.naturalWidth !== 0) {
                        ctx.drawImage(luckBlockImage, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback: desenha padrão temporário
                        ctx.fillStyle = "#FFD700";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#FFA500";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = "#FF6347";
                        ctx.font = "bold 20px Arial";
                        ctx.textAlign = "center";
                        ctx.fillText("★", tx - cameraX + TILE_SIZE / 2, ty + TILE_SIZE / 2 + 6);
                        ctx.textAlign = "left";
                    }
                }
                else if (tile === 6) {
                    // Bloco da Sorte (batido) - tenta usar textura
                    if (luckBlockBeatenImage.complete && luckBlockBeatenImage.naturalWidth !== 0) {
                        ctx.drawImage(luckBlockBeatenImage, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback: desenha padrão temporário
                        ctx.fillStyle = "#D3D3D3";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#999999";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    }
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

    // Atualizar e desenhar power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update();
        powerUps[i].draw();

        // Remover power-up se caiu muito
        if (powerUps[i].y > canvas.height + 100) {
            powerUps.splice(i, 1);
        } 
        // Verificar colisão com player
        else if (powerUps[i].checkCollision(player)) {
            // Só coleta o power-up se não tem um ativo
            if (!player.hasPowerUp) {
                player.hasPowerUp = true;
                player.isBig = true; // Crescer quando coleta power-up
                score += 500; // Bônus por pegar power-up
            }
            powerUps.splice(i, 1);
        }
    }

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
            } 
            // NOVO: Só toma dano se NÃO estiver invencível
            else if (player.invulnerableTimer <= 0) { 
                
                // Se tem power-up, perde ele
                if (player.hasPowerUp) {
                    player.hasPowerUp = false;
                    player.isBig = false; // Volta a ficar pequena!
                    player.invulnerableTimer = 60; // Fica invencível por 60 frames (~1 segundo)
                    
                    // Dá um pequeno pulinho para trás para desgrudar do inimigo
                    player.vy = -5;
                } else {
                    // Sem power-up, morre
                    player.lives--;
                    if (player.lives <= 0) {
                        gameOver();
                    } else {
                        // Reinicializa o player mantendo pontos e vidas
                        player.x = 100;
                        player.y = 200;
                        player.vx = 0;
                        player.vy = 0;
                        player.onGround = false;
                        player.isBig = false;
                        player.invulnerableTimer = 60; // Fica invencível ao renascer também!
                    }
                }
            }
        }
    });

    // Interface (Score e Vidas)
    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`JUQUINHA PONTOS: ${score}`, 20, 40);
    
    // Mostrar vidas
    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`VIDAS: ${player.lives}`, 20, 70);
    
    // Mostrar se tem power-up ativo
    if (player.hasPowerUp) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 18px Arial";
        ctx.fillText("⭐ PROTEGIDO", canvas.width - 200, 40);
    }

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
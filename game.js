const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// SpriteSheet
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
// Imagem para obstáculo flutuante (mandacaru com textura)
const obstacleImage = new Image();
obstacleImage.src = "img/obstacle.png";
// Imagem para cacto (novo)
const cactusImage = new Image();
cactusImage.src = "img/cactus.svg";
// Imagem da bandeira
const flagImage = new Image();
flagImage.src = "img/flag.png";
// Imagem da estrutura Python (cobra estilizada)
const pythonStructureImage = new Image();
pythonStructureImage.src = "img/python_structure.png";

// --- CONFIGURAÇÕES GERAIS ---
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const JUMP_HOLD_FRAMES = 12;
const SPEED = 2.5; // Reduzido de 5 para mais controle

// --- ESTADO DO JOGO ---
let gameActive = false;
let gameWon = false; // controla se o player venceu
let score = 0;
let animationId;
let powerUps = []; // Array de power-ups ativos no mapa
let cacti = []; // Array de cactos (objetos separados)

// --- CÂMERA ---
let cameraX = 0;

// --- ESTADO DAS TECLAS ---
const keys = { right: false, left: false, up: false };

// --- TIPOS DE BLOCOS ---
// 0: Vazio
// 1: Chão (Terra)
// 2: Bloco Tijolos (intacto)
// 3: Bloco Tijolos (batido)
// 4: Mandacaru (obstáculo flutuante)
// 5: Bloco Sorte (intacto)
// 6: Bloco Sorte (batido)
// 7: Bandeira (vitória)
// 8+: Estruturas grandes (suporte e Python)

// --- MAPA GERADO PROCEDURALMENTE ---
let map = [];

function generateMap() {
    const mapWidth = 300;
    const mapHeight = 14;
    cacti = [];
    powerUps = [];
    map = [];
    
    // Inicializa com céu vazio
    for (let row = 0; row < mapHeight; row++) {
        map[row] = new Array(mapWidth).fill(0);
    }
    
    // SEÇÃO INICIAL SEGURA (colunas 0-50): Chão sólido com plataformas progressivas
    for (let col = 0; col < 50; col++) {
        map[10][col] = 1;
        map[11][col] = 1;
        
        // Plataformas flutuantes simples e próximas para encher o cenário
        if (col > 15 && col < 48) {
            if (col % 9 === 0) {
                map[7][col] = 2;
                map[7][col + 1] = 2;
            }
            if (col % 10 === 3) {
                map[8][col] = 2;
                map[8][col + 1] = 2;
            }
            if (col % 7 === 2 && Math.random() < 0.45) {
                map[6][col] = 5;
            }
        }
    }
    
    // SEÇÃO FÁCIL-MÉDIA (colunas 50-150): Progressão constante
    for (let col = 50; col < 150; col++) {
        const sectionProg = (col - 50) / 100; // 0 a 1
        
        // Chão: começa contínuo, vai ficando com mais buracos
        const groundChance = 0.9 - sectionProg * 0.4; // 90% -> 50%
        if (Math.random() < groundChance) {
            map[10][col] = 1;
            map[11][col] = 1;
        }
        
        // Plataformas flutuantes em SEQUÊNCIAS PRÓXIMAS
        // A cada 12-15 colunas, colocar um grupo de plataformas
        const groupPeriod = 12;
        const colInGroup = (col - 50) % groupPeriod;
        
        if (colInGroup === 0 && Math.random() < 0.8) {
            // Grupo de 3-4 blocos flutuantes próximos
            const groupSize = 3;
            const startRow = Math.random() < 0.5 ? 7 : 8;
            
            for (let i = 0; i < groupSize; i++) {
                if (col + i < 150 && !map[startRow][col + i]) {
                    const tileType = Math.random() < 0.2 ? 5 : 2;
                    map[startRow][col + i] = tileType;
                    
                    // Adicionar um bloco intermediário para criar "escada"
                    if (i > 0 && startRow > 6 && Math.random() < 0.4) {
                        const intermediateRow = startRow + 1;
                        if (!map[intermediateRow][col + i - 1]) {
                            map[intermediateRow][col + i - 1] = 2;
                        }
                    }
                }
            }
        }
        
        // Mandacaru ocasional (ou cacto como objeto)
        if (col % 18 === 0 && Math.random() < 0.64) {
            if (Math.random() < 0.48) {
                map[9][col] = 4;
            } else {
                createGroundCactus(col);
            }
        }
        if (col % 11 === 5 && Math.random() < 0.45) {
            map[8][col] = 2;
        }
        if (col % 13 === 2 && Math.random() < 0.34) {
            map[7][col] = 5;
        }
        if (col % 9 === 4 && Math.random() < 0.33 && !map[6][col]) {
            map[6][col] = 2;
        }
    }
    
    // SEÇÃO MÉDIA-DIFÍCIL (colunas 150-240): Mais desafio
    for (let col = 150; col < 240; col++) {
        const sectionProg = (col - 150) / 90; // 0 a 1
        
        // Chão com mais buracos: 50% -> 30%
        const groundChance = 0.50 - sectionProg * 0.2;
        if (Math.random() < groundChance) {
            map[10][col] = 1;
            map[11][col] = 1;
        }
        
        // Plataformas flutuantes MAIS FREQUENTES
        const groupPeriod = 10;
        const colInGroup = (col - 150) % groupPeriod;
        
        if (colInGroup === 0 && Math.random() < 0.85) {
            const groupSize = 3;
            const startRow = 6 + Math.floor(Math.random() * 3); // Variar altura
            
            for (let i = 0; i < groupSize; i++) {
                if (col + i < 240 && !map[startRow][col + i]) {
                    const tileType = Math.random() < 0.25 ? 5 : 2;
                    map[startRow][col + i] = tileType;
                    
                    // IMPORTANTE: Adicionar blocos intermediários para criar "escada"
                    if (i > 0 && startRow > 6) {
                        const intermediateRow = startRow + 1;
                        if (!map[intermediateRow][col + i - 1] && Math.random() < 0.6) {
                            map[intermediateRow][col + i - 1] = 2;
                        }
                    }
                }
            }
        }
        
        // Mandacaru frequente (ou cacto como objeto)
        if (Math.random() < 0.18) {
            if (Math.random() < 0.65) {
                map[9][col] = 4;
            } else {
                createGroundCactus(col);
            }
        }
        if (col % 7 === 0 && Math.random() < 0.42) {
            map[6][col] = 2;
        }
        if (col % 10 === 4 && Math.random() < 0.38) {
            map[8][col] = 5;
        }
        if (col % 8 === 2 && Math.random() < 0.28) {
            map[7][col] = 2;
        }
    }
    
    // SEÇÃO FINAL (colunas 240-300): Preparação para objetivo
    for (let col = 240; col < 270; col++) {
        // Chão ocasional mais preenchida e com blocos extras
        if (Math.random() < 0.65) {
            map[10][col] = 1;
            map[11][col] = 1;
        }
        
        if (col % 5 === 0 && Math.random() < 0.76) {
            map[8][col] = Math.random() < 0.45 ? 5 : 2;
        }
        
        if (col % 9 === 3 && Math.random() < 0.52) {
            map[7][col] = 2;
        }
        
        if (col % 11 === 6 && Math.random() < 0.35) {
            map[9][col] = 4;
        }
        
        if (col % 6 === 1 && Math.random() < 0.28) {
            map[6][col] = 2;
        }
    }
    
    // Recta final reta para a bandeira (colunas 270-290)
    for (let col = 270; col < 290; col++) {
        map[10][col] = 1;
        map[11][col] = 1;
    }
    
    // Estrutura Final: Bandeira e Python
    const flagCol = 290;
    const flagRow = 9;

    // Bandeira NO TOPO
    map[flagRow][flagCol] = 7;
    // Chão abaixo
    map[flagRow + 1][flagCol] = 1;
    
    // Estrutura Python grande
    const pythonCol = flagCol + 5;
    const pythonHeight = 5;
    const pythonWidth = 8;
    
    for (let py = 0; py < pythonHeight; py++) {
        for (let px = 0; px < pythonWidth; px++) {
            if (flagRow + 1 + py < mapHeight && pythonCol + px < mapWidth) {
                map[flagRow + 1 + py][pythonCol + px] = 20;
            }
        }
    }
    
    // Suporte grande abaixo
    const supportRow = flagRow + pythonHeight + 1;
    for (let sx = -8; sx < 15; sx++) {
        if (flagCol + sx >= 0 && flagCol + sx < mapWidth && supportRow < mapHeight) {
            map[supportRow][flagCol + sx] = 21;
        }
    }

    fixMapPassability(mapWidth);

    // Adiciona alguns cactos garantidos em colunas de teste (facilita verificação)
    const guaranteedCactusCols = [10, 25, 50, 70, 90, 170, 220];
    for (const ccol of guaranteedCactusCols) {
        if (ccol >= 0 && ccol < mapWidth) {
            createGroundCactus(ccol);
        }
    }
}

function fixMapPassability(mapWidth) {
    let holeCount = 0;
    for (let col = 0; col < mapWidth; col++) {
        const hasGround = map[10][col] || map[11][col];
        if (!hasGround) {
            holeCount++;
        } else {
            if (holeCount > 2) {
                for (let fix = 1; fix <= holeCount; fix++) {
                    const fixCol = col - fix;
                    map[11][fixCol] = 1;
                }
            }
            holeCount = 0;
        }
    }
    if (holeCount > 2) {
        for (let fix = 1; fix <= holeCount; fix++) {
            const fixCol = mapWidth - fix;
            map[11][fixCol] = 1;
        }
    }

    for (let col = 0; col < mapWidth; col++) {
        let solidCount = 0;
        for (let row = 0; row < map.length; row++) {
            if (map[row][col] !== 0 && map[row][col] !== 7) solidCount++;
        }
        if (solidCount >= 3) {
            for (let row = 6; row <= 10; row++) {
                if (map[row][col] !== 0) {
                    map[row][col] = 0;
                    break;
                }
            }
        }
    }
}

function startLevel(level) {
    generateMap();
    initEnemies();
    player.reset(true);
    cameraX = 0;
    gameWon = false;
    if (animationId) cancelAnimationFrame(animationId);
    gameActive = true;
    update();
}

const cloudTemplates = [
    { x: 130, y: 80, scale: 1.1 },
    { x: 340, y: 60, scale: 0.9 },
    { x: 620, y: 90, scale: 1.0 },
    { x: 880, y: 70, scale: 0.8 }
];

function createGroundCactus(col) {
    const groundRow = 10;
    if (groundRow >= 0 && groundRow < map.length) {
        map[groundRow][col] = 1;
    }
    if (groundRow + 1 >= 0 && groundRow + 1 < map.length) {
        map[groundRow + 1][col] = 1;
    }
    cacti.push(new Cactus(col, groundRow));
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#79c7ff');
    gradient.addColorStop(0.3, '#bce6ff');
    gradient.addColorStop(0.6, '#f3e3b1');
    gradient.addColorStop(1, '#e4b476');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sol no lado direito
    ctx.save();
    const sunX = canvas.width - 120;
    const sunY = 90;
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 102, 0.25)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Montanhas ao fundo
    ctx.fillStyle = '#b7a070';
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(180, 170);
    ctx.lineTo(320, 240);
    ctx.lineTo(460, 165);
    ctx.lineTo(620, 250);
    ctx.lineTo(820, 210);
    ctx.lineTo(820, 480);
    ctx.lineTo(0, 480);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#c8b385';
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.lineTo(140, 210);
    ctx.lineTo(260, 280);
    ctx.lineTo(420, 210);
    ctx.lineTo(550, 300);
    ctx.lineTo(740, 240);
    ctx.lineTo(820, 260);
    ctx.lineTo(820, 480);
    ctx.lineTo(0, 480);
    ctx.closePath();
    ctx.fill();

    // Dunas no horizonte
    ctx.fillStyle = '#e6be7a';
    ctx.beginPath();
    ctx.moveTo(0, 330);
    ctx.quadraticCurveTo(180, 310, 360, 340);
    ctx.quadraticCurveTo(520, 360, 660, 330);
    ctx.quadraticCurveTo(760, 310, 820, 340);
    ctx.lineTo(820, 480);
    ctx.lineTo(0, 480);
    ctx.closePath();
    ctx.fill();

    // Dunas mais próximas
    ctx.fillStyle = '#d8a45c';
    ctx.beginPath();
    ctx.moveTo(0, 390);
    ctx.quadraticCurveTo(120, 360, 240, 395);
    ctx.quadraticCurveTo(360, 430, 500, 400);
    ctx.quadraticCurveTo(620, 375, 700, 405);
    ctx.quadraticCurveTo(760, 430, 820, 405);
    ctx.lineTo(820, 480);
    ctx.lineTo(0, 480);
    ctx.closePath();
    ctx.fill();

    // Rochas e arbustos decorativos
    const decor = [
        {x: 110, y: 400, w: 70, h: 45, color: '#8a6f55'},
        {x: 280, y: 410, w: 55, h: 36, color: '#9d7e61'},
        {x: 520, y: 395, w: 90, h: 50, color: '#8f7057'},
        {x: 700, y: 415, w: 60, h: 34, color: '#95745b'}
    ];
    decor.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, item.w, item.h, -0.18, 0, Math.PI * 2);
        ctx.fill();
    });

    // Pássaros no céu
    const birds = [
        {x: 140, y: 100},
        {x: 220, y: 75},
        {x: 320, y: 95},
        {x: 470, y: 70}
    ];
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    birds.forEach(b => {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + 10, b.y - 8, b.x + 20, b.y);
        ctx.quadraticCurveTo(b.x + 26, b.y - 5, b.x + 34, b.y);
        ctx.stroke();
    });

    function drawCloud(cx, cy, scale) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.93)';
        ctx.beginPath();
        ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 28 * scale, cy - 6 * scale, 24 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 52 * scale, cy, 22 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 24 * scale, cy + 10 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    cloudTemplates.forEach(cloud => drawCloud(cloud.x, cloud.y, cloud.scale));
}

// --- CLASSES ---

class Player {
    constructor() {
        this.reset();
    }

    reset(keepLives = false) {
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
        if (!keepLives) {
            this.lives = 1; // Começa com 1 vida
        }
        this.hasPowerUp = false; // Flag se tem power-up ativo
        this.invulnerableTimer = 0;
        this.jumpHoldTimer = 0;
        this.walkTimer = 0;
        this.bobOffset = 0;
        this.distanceTraveled = 0; // acumula distância para pontuação por caminhada
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
            this.jumpHoldTimer = JUMP_HOLD_FRAMES;
        }

        if (this.vy < 0) {
            if (keys.up && this.jumpHoldTimer > 0) {
                this.jumpHoldTimer--;
                this.vy += GRAVITY * 0.28; // mantém impulso por mais tempo
            } else {
                this.vy += GRAVITY * 1.6; // gravidade maior ao soltar o botão
            }
        } else {
            this.vy += GRAVITY;
        }
        this.x += this.vx;
        if (this.vx > 0) {
            this.distanceTraveled += this.vx;
            if (this.distanceTraveled >= 24) {
                const points = Math.floor(this.distanceTraveled / 24);
                score += points;
                this.distanceTraveled -= points * 24;
            }
        }

        // Animação de caminhada/bob
        if (this.onGround && this.vx !== 0) {
            this.walkTimer += 0.24;
            this.bobOffset = Math.sin(this.walkTimer * Math.PI) * 3;
        } else {
            this.walkTimer = 0;
            this.bobOffset = this.onGround ? 0 : Math.sin(Date.now() / 140) * 2;
        }

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
                        
                        // BANDEIRA - detecta vitória sem bloquear movimento
                                            if (tile === 7) {
                            score += 500; // Bônus final
                            winGame();
                            return; // Sai da função
                        }

                        const overlapX = Math.min(this.x + this.width, tx + TILE_SIZE) - Math.max(this.x, tx);
                        const overlapY = Math.min(this.y + this.height, ty + TILE_SIZE) - Math.max(this.y, ty);

                        if (overlapX <= 0 || overlapY <= 0) continue;
                        
                        // Resolva por menor overlap para evitar ficar preso entre dois blocos
                        if (overlapY < overlapX) {
                            // Colisão vertical
                            if (this.y + this.height / 2 <= ty + TILE_SIZE / 2 && this.vy > 0) {
                                // Cair no chão
                                this.vy = 0;
                                this.y = ty - this.height;
                                this.onGround = true;
                            } else if (this.vy < 0) {
                                // Bater a cabeça
                                this.vy = 0;
                                this.y = ty + TILE_SIZE;
                                if (tile === 2) {
                                    score += 50;
                                    map[row][col] = 3;
                                }
                                else if (tile === 5) {
                                    score += 80;
                                    map[row][col] = 6;
                                    powerUps.push(new PowerUp(tx, ty));
                                }
                            }
                        } else {
                            // Colisão horizontal
                            if (tile !== 7 && tile !== 9) {
                                if (this.x + this.width / 2 <= tx + TILE_SIZE / 2) {
                                    this.x = tx - this.width;
                                } else {
                                    this.x = tx + TILE_SIZE;
                                }
                            }
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
        drawY += this.bobOffset;

        let scaleX = 1;
        let scaleY = 1;
        if (!this.onGround) {
            if (this.vy < 0) {
                // Estica durante a subida
                scaleX = 0.92;
                scaleY = 1.12;
            } else {
                // Apertar ao cair
                scaleX = 1.04;
                scaleY = 0.96;
            }
        } else {
            const walkScale = 1 + Math.abs(Math.sin(this.walkTimer * Math.PI)) * 0.04;
            scaleX = walkScale;
            scaleY = walkScale;
        }

        if (playerImage.complete && playerImage.naturalWidth !== 0) {
            ctx.save();
            const posX = this.x - cameraX + this.width / 2;
            const posY = drawY + drawHeight / 2;
            ctx.translate(posX, posY);
            ctx.scale(this.facing * scaleX, scaleY);
            ctx.drawImage(playerImage, -this.width / 2, -drawHeight / 2, this.width, drawHeight);
            ctx.restore();
        } else {
            ctx.save();
            const posX = this.x - cameraX + this.width / 2;
            const posY = drawY + drawHeight / 2;
            ctx.translate(posX, posY);
            ctx.scale(this.facing * scaleX, scaleY);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -drawHeight / 2, this.width, drawHeight);
            ctx.restore();
        }
    }
}

class Enemy {
    constructor(x, y, speed = -1) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 30;
        this.vx = speed;
        this.color = "#8D6E63";
        this.facing = this.vx < 0 ? -1 : 1;
        this.walkTimer = 0;
        this.bobOffset = 0;
    }

    update() {
        this.x += this.vx;

        this.walkTimer += 0.12;
        this.bobOffset = Math.sin(this.walkTimer * Math.PI) * 3;
        
        // Verifica colisão com blocos
        this.checkBlockCollisions();
        
        // Inverte direção se sair muito do mapa
        if (this.x < 0) {
            this.vx = Math.abs(this.vx);
            this.facing = 1;
        } else if (this.x > map[0].length * TILE_SIZE - this.width) {
            this.vx = -Math.abs(this.vx);
            this.facing = -1;
        }
    }
    
    checkBlockCollisions() {
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                let tile = map[row][col];
                if (tile !== 0) {
                    let tx = col * TILE_SIZE;
                    let ty = row * TILE_SIZE;
                    
                    // Detecção AABB
                    if (this.x < tx + TILE_SIZE && this.x + this.width > tx &&
                        this.y < ty + TILE_SIZE && this.y + this.height > ty) {
                        
                        // Empurrão lateral - inimigo não atravessa blocos
                        if (this.vx > 0) {
                            this.x = tx - this.width;
                            this.vx = -1;
                            this.facing = -1;
                        } else if (this.vx < 0) {
                            this.x = tx + TILE_SIZE;
                            this.vx = 1;
                            this.facing = 1;
                        }
                    }
                }
            }
        }
    }

    draw() {
        const drawY = this.y + this.bobOffset;
        const scaleAnim = 1 + Math.abs(Math.sin(this.walkTimer * Math.PI)) * 0.05;

        if (enemyImage.complete && enemyImage.naturalWidth !== 0) {
            ctx.save();
            const posX = this.x - cameraX + this.width / 2;
            const posY = drawY + this.height / 2;
            ctx.translate(posX, posY);
            ctx.scale(this.facing * scaleAnim, scaleAnim);
            ctx.drawImage(enemyImage, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else {
            ctx.save();
            const posX = this.x - cameraX + this.width / 2;
            const posY = drawY + this.height / 2;
            ctx.translate(posX, posY);
            ctx.scale(this.facing * scaleAnim, scaleAnim);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
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

class Cactus {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.width = TILE_SIZE * 0.8;
        this.height = TILE_SIZE * 2.2;
        this.x = col * TILE_SIZE;
        this.y = row * TILE_SIZE - (this.height - TILE_SIZE);
        this.drawX = this.x + (TILE_SIZE - this.width) / 2;
        this.drawY = this.y;
        this.color = "#2E8B57";
        this.vx = 0;
        this.speed = 0.8; // velocidade do cacto andando
    }

    draw() {
        if (cactusImage.complete && cactusImage.naturalWidth !== 0) {
            ctx.drawImage(cactusImage, this.drawX - cameraX, this.drawY, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.drawX - cameraX + this.width * 0.15, this.drawY + this.height * 0.18, this.width * 0.7, this.height * 0.64);
            ctx.fillRect(this.drawX - cameraX - this.width * 0.12, this.drawY + this.height * 0.34, this.width * 0.28, this.height * 0.14);
            ctx.fillRect(this.drawX - cameraX + this.width * 0.84, this.drawY + this.height * 0.38, this.width * 0.28, this.height * 0.14);
            ctx.fillStyle = "#14502F";
            for (let i = 0; i < 5; i++) {
                const sx = this.drawX - cameraX + this.width * 0.2 + i * (this.width * 0.12);
                const sy = this.drawY + this.height * (0.25 + (i % 2) * 0.12);
                ctx.fillRect(sx, sy, Math.max(2, Math.floor(this.width * 0.06)), Math.max(4, Math.floor(this.height * 0.06)));
            }
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.beginPath();
            ctx.ellipse(this.drawX - cameraX + this.width / 2, this.drawY + this.height * 0.95, this.width * 0.6, TILE_SIZE * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    checkCollision(player) {
        return player.x < this.drawX + this.width &&
               player.x + player.width > this.drawX &&
               player.y < this.drawY + this.height &&
               player.y + player.height > this.drawY;
    }

    shouldDamage(player) {
        const playerBottom = player.y + player.height;
        const cactusTop = this.drawY;
        const overlapX = Math.min(player.x + player.width, this.drawX + this.width) - Math.max(player.x, this.drawX);
        const overlapY = Math.min(playerBottom, this.drawY + this.height) - Math.max(player.y, this.drawY);

        // Menor área de dano: exige contato significativo e não apenas passar perto do topo
        const isAboveSafe = playerBottom <= cactusTop + 18;
        const hasHorizontalContact = overlapX > Math.min(this.width, player.width) * 0.35;
        const hasVerticalContact = overlapY > 12;

        return !isAboveSafe && hasHorizontalContact && hasVerticalContact;
    }

    onHit(player) {
        if (!this.shouldDamage(player)) return;
        if (player.invulnerableTimer > 0) return;

        if (player.hasPowerUp) {
            player.hasPowerUp = false;
            player.isBig = false;
            player.invulnerableTimer = 60;
            player.vy = -5;
        } else {
            player.lives--;
            if (player.lives <= 0) {
                gameOver();
                return;
            } else {
                player.x = 100;
                player.y = 200;
                player.vx = 0;
                player.vy = 0;
                player.onGround = false;
                player.isBig = false;
                player.invulnerableTimer = 60;
            }
        }

        // Empurra o jogador para fora do cacto
        if (player.x + player.width / 2 < this.drawX + this.width / 2) {
            player.x = this.drawX - player.width;
        } else {
            player.x = this.drawX + this.width;
        }
    }

    update(player) {
        // Cacto estático: não se move, apenas mantém sua posição de desenho.
        this.drawX = this.x + (TILE_SIZE - this.width) / 2;
        this.drawY = this.y;
    }
}

// --- INSTÂNCIAS ---
const player = new Player();
let enemies = [];

function initEnemies() {
    enemies = [];
    powerUps = []; // Reseta power-ups ao iniciar
    const enemyY = 370;
    const baseX = 600;
    const spacing = 700;
    const enemyCount = 4;

    for (let i = 0; i < enemyCount; i++) {
        const speed = -1.2 - Math.random() * 0.4;
        const x = baseX + i * spacing + (Math.random() * 250 - 125);
        enemies.push(new Enemy(x, enemyY, speed));
    }
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
                    // Chão - tenta usar spriteSheet, senão fallback
                    if (spriteSheet.complete && spriteSheet.naturalWidth !== 0) {
                        ctx.drawImage(spriteSheet, 100, 0, 40, 40, tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    } else {
                        // Fallback: desenha padrão de terra
                        ctx.fillStyle = "#8B7355";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#654321";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        // Textura simples
                        ctx.fillStyle = "rgba(0,0,0,0.1)";
                        for (let i = 0; i < 3; i++) {
                            ctx.fillRect(tx - cameraX + Math.random() * TILE_SIZE, ty + Math.random() * TILE_SIZE, 5, 5);
                        }
                    }
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
                    // Mandacaru - melhorado com textura customizada
                    if (obstacleImage.complete && obstacleImage.naturalWidth !== 0) {
                        ctx.drawImage(obstacleImage, tx - cameraX, ty - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
                    } else {
                        // Fallback: desenho verde (mandacaru)
                        ctx.fillStyle = "#228B22";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        // Picos do mandacaru
                        ctx.fillStyle = "#006400";
                        for (let i = 0; i < 4; i++) {
                            ctx.fillRect(tx - cameraX + i * 10, ty - 5, 5, 10);
                        }
                    }
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
                else if (tile === 7) {
                    // Bandeira (objetivo final) - desenha mastro e bandeira ACIMA do bloco
                    if (flagImage.complete && flagImage.naturalWidth !== 0) {
                        ctx.drawImage(flagImage, tx - cameraX, ty - TILE_SIZE * 2.5, TILE_SIZE, TILE_SIZE * 3);
                    } else {
                        // Fallback: desenha bandeira com cores
                        // Mastro
                        ctx.fillStyle = "#8B7355";
                        ctx.fillRect(tx - cameraX + TILE_SIZE / 2 - 3, ty - TILE_SIZE * 2, 6, TILE_SIZE * 2);
                        // Bandeira vermelha
                        ctx.fillStyle = "#FF0000";
                        ctx.fillRect(tx - cameraX + TILE_SIZE / 2 + 3, ty - TILE_SIZE * 2 + 5, 15, 10);
                        ctx.strokeStyle = "#CC0000";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX + TILE_SIZE / 2 + 3, ty - TILE_SIZE * 2 + 5, 15, 10);
                    }
                }
                else if (tile === 20) {
                    // ESTRUTURA GRANDE PYTHON - espaço para textura customizada
                    // Desenha bordas e fundo colorido
                    ctx.fillStyle = "#2d5016"; // Verde escuro de cobra
                    ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = "#1a3009";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    
                    // Texto indicativo (será sobrescrito pela textura)
                    ctx.fillStyle = "#90EE90";
                    ctx.font = "10px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("🐍", tx - cameraX + TILE_SIZE / 2, ty + TILE_SIZE / 2 + 3);
                    ctx.textAlign = "left";
                }
                else if (tile === 21) {
                    // BLOCO DE SUPORTE GRANDE - espaço para textura customizada
                    // Desenha bloco grande para receber textura
                    ctx.fillStyle = "#8B6914"; // Ouro/bronze
                    ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = "#654321";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    
                    // Padrão de suporte
                    ctx.fillStyle = "#654321";
                    for (let i = 0; i < 3; i++) {
                        ctx.fillRect(tx - cameraX + 2, ty + 5 + i * 10, TILE_SIZE - 4, 2);
                    }
                }
            }
        }
    }
}

function update() {
    if (!gameActive) return;
    if (gameWon) return; // Pausa se ganhou
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    // Sistema de Câmera
    if (player.x > canvas.width / 2) {
        cameraX = player.x - canvas.width / 2;
    }

    drawMap();
    player.update();
    player.draw();

    // Atualizar, desenhar cactos e checar colisão somente com o player
    for (let i = cacti.length - 1; i >= 0; i--) {
        cacti[i].update(player);
        cacti[i].draw();
        if (cacti[i].checkCollision(player)) {
            cacti[i].onHit(player);
        }
    }

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
                score += 300; // Bônus por pegar power-up
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
                score += 150;
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

    // Fundo do HUD para garantir legibilidade
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(10, 10, 340, 130);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 340, 130);

    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`PONTOS: ${score}`, 22, 38);
    ctx.fillText(`VIDAS: ${player.lives}`, 22, 70);
    ctx.fillText(`OBJETIVO: PEGUE A BANDEIRA`, 22, 102);

    if (player.hasPowerUp) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 18px Arial";
        ctx.fillText("⭐ PROTEGIDO", canvas.width - 230, 40);
    }

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "16px Arial";
    ctx.fillText("CONTROLES: A/D = mover, W = pular", 20, canvas.height - 20);

    animationId = requestAnimationFrame(update);
}

// --- CONTROLES ---
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = true;
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = false;
});

// --- SISTEMA DE TELAS ---
function startGame() {
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    const winScreen = document.getElementById('win-screen');
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');

    score = 0;
    player.reset(false);
    generateMap(); // Gera o mapa proceduralmente
    initEnemies();
    cameraX = 0;
    gameActive = true;
    gameWon = false; // Reset da flag de vitória
    
    if (animationId) cancelAnimationFrame(animationId);
    update(); 
}

function gameOver() {
    gameActive = false;
    document.getElementById('game-over').classList.remove('hidden');
}

function winGame() {
    gameActive = false;
    gameWon = true;
    document.getElementById('final-score').textContent = `Pontuação Final: ${score}`;
    document.getElementById('win-screen').classList.remove('hidden');
}

function restartGame() {
    // Recarrega o estado inicial
    location.reload(); 
}

// Vincula a função ao botão globalmente
window.startGame = startGame;
window.restartGame = restartGame;

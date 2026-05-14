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
// Imagem da bandeira
const flagImage = new Image();
flagImage.src = "img/flag.png";
// Imagem da estrutura Python (cobra estilizada)
const pythonStructureImage = new Image();
pythonStructureImage.src = "img/python_structure.png";

// --- CONFIGURAÇÕES GERAIS ---
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SPEED = 2.5; // Reduzido de 5 para mais controle

// --- ESTADO DO JOGO ---
let gameActive = false;
let gameWon = false; // Novo: controla se o player venceu
let score = 0;
let animationId;
let powerUps = []; // Array de power-ups ativos no mapa

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
    map = [];
    
    // Inicializa com céu vazio
    for (let row = 0; row < mapHeight; row++) {
        map[row] = new Array(mapWidth).fill(0);
    }
    
    // SEÇÃO INICIAL SEGURA (colunas 0-50): Chão sólido com plataformas progressivas
    for (let col = 0; col < 50; col++) {
        map[10][col] = 1;
        map[11][col] = 1;
        
        // Plataformas flutuantes simples e próximas
        if (col > 20 && col < 45) {
            if (col % 10 === 0) {
                map[7][col] = 2;
                map[7][col + 1] = 2;
            }
            if (col % 10 === 3) {
                map[8][col] = 2;
                map[8][col + 1] = 2;
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
        
        // Mandacaru ocasional
        if (col % 18 === 0 && Math.random() < 0.6) {
            map[9][col] = 4;
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
        
        // Mandacaru frequente
        if (Math.random() < 0.15) {
            map[9][col] = 4;
        }
    }
    
    // SEÇÃO FINAL (colunas 240-300): Preparação para objetivo
    for (let col = 240; col < 270; col++) {
        // Chão ocasional
        if (Math.random() < 0.45) {
            map[10][col] = 1;
            map[11][col] = 1;
        }
        
        // Muitas plataformas flutuantes MUITO PRÓXIMAS
        if (col % 8 === 0 && Math.random() < 0.8) {
            const groupSize = 3;
            const startRow = 6 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < groupSize; i++) {
                if (col + i < 270 && !map[startRow][col + i]) {
                    map[startRow][col + i] = Math.random() < 0.3 ? 5 : 2;
                    
                    // Escadas bem definidas
                    if (i > 0 && startRow > 6 && Math.random() < 0.7) {
                        const intermediateRow = startRow + 1;
                        if (!map[intermediateRow][col + i - 1]) {
                            map[intermediateRow][col + i - 1] = 2;
                        }
                    }
                }
            }
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
}

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
                        
                        // BANDEIRA - detecta vitória sem bloquear movimento
                        if (tile === 7) {
                            score += 1000; // Bônus final
                            winGame();
                            return; // Sai da função
                        }
                        
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
                                
                                // 50% de chance de gerar power-up - aumentado de 35%
                                if (Math.random() < 0.50) {
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
                        // Empurrão lateral - NÃO bloqueia bandeira (7) nem estrutura Python (9)
                        else if (tile !== 7 && tile !== 9) {
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
        
        // Verifica colisão com blocos
        this.checkBlockCollisions();
        
        // Inverte direção se sair muito do mapa
        if (this.x < 0) {
            this.vx = 1;
            this.facing = 1;
        } else if (this.x > map[0].length * TILE_SIZE - this.width) {
            this.vx = -1;
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
        new Enemy(1800, 370), 
        new Enemy(3200, 370),
        new Enemy(4500, 370)
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
    const winScreen = document.getElementById('win-screen');
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');

    generateMap(); // Gera o mapa proceduralmente
    player.reset();
    initEnemies();
    score = 0;
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
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
// Imagem do power-up de vida extra
const extraLifePowerUpImage = new Image();
extraLifePowerUpImage.src = "img/vida-extra.png";
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
const SPEED = 2.0; // Reduzido para velocidade mais controlada

// --- ESTADO DO JOGO ---
let gameActive = false;
let gameWon = false; // controla se o player venceu
let score = 0;
let animationId;
let powerUps = []; // Array de power-ups ativos no mapa
let cacti = []; // Array de cactos (objetos separados)
let confetti = []; // Array de partículas confete para celebração
let flagAnimationTime = 0; // Tempo para animação da bandeira
let zooBuildingAnimation = 0; // Tempo para animação do zoológico
let currentLevel = 1; // Nível atual

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
// 20: Estrutura Zoológico (Python)
// 21: Base Zoológico

// --- MAPA GERADO PROCEDURALMENTE ---
let map = [];

// --- CONFIGURAÇÃO DE NÍVEIS ---
const LEVEL_CONFIG = {
    1: {
        mapWidth: 300,
        sections: [
            { name: "Inicial", range: [0, 50], groundChance: 0.9, platformChance: 0.8, platformDensity: 0.82 },
            { name: "Fácil-Média", range: [50, 150], groundChance: 0.9, platformChance: 0.8, platformDensity: 0.65 },
            { name: "Média-Difícil", range: [150, 240], groundChance: 0.5, platformChance: 0.85, platformDensity: 0.35 },
            { name: "Final", range: [240, 285], groundChance: 0.65, platformChance: 0.76, platformDensity: 0.28 }
        ],
        finalBlockCount: 15
    },
    2: {
        mapWidth: 350,
        sections: [
            { name: "Inicial", range: [0, 60], groundChance: 0.85, platformChance: 0.72, platformDensity: 0.73 },
            { name: "Fácil-Média", range: [60, 170], groundChance: 0.81, platformChance: 0.72, platformDensity: 0.585 },
            { name: "Média-Difícil", range: [170, 280], groundChance: 0.4, platformChance: 0.765, platformDensity: 0.315 },
            { name: "Final", range: [280, 330], groundChance: 0.585, platformChance: 0.684, platformDensity: 0.252 }
        ],
        finalBlockCount: 15
    },
    3: {
        mapWidth: 400,
        sections: [
            { name: "Inicial", range: [0, 70], groundChance: 0.81, platformChance: 0.648, platformDensity: 0.657 },
            { name: "Fácil-Média", range: [70, 190], groundChance: 0.729, platformChance: 0.648, platformDensity: 0.527 },
            { name: "Média-Difícil", range: [190, 320], groundChance: 0.3, platformChance: 0.6885, platformDensity: 0.283 },
            { name: "Final", range: [320, 380], groundChance: 0.5265, platformChance: 0.6156, platformDensity: 0.2268 }
        ],
        finalBlockCount: 15
    }
};

function generateMap(level = 1) {
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
    const mapWidth = config.mapWidth;
    const mapHeight = 14;
    cacti = [];
    powerUps = [];
    map = [];
    
    // Inicializa com céu vazio
    for (let row = 0; row < mapHeight; row++) {
        map[row] = new Array(mapWidth).fill(0);
    }
    
    // SEÇÃO SEGURA INICIAL (0-80): Totalmente segura para o jogador começar
    for (let col = 0; col < 80; col++) {
        // Chão sólido contínuo - sem buracos
        map[10][col] = 1;
        map[11][col] = 1;
        
        // Plataformas simples APENAS a partir de col 40
        if (col > 40 && col < 75) {
            if (col % 9 === 0 && !map[8][col]) {
                map[8][col] = 2;
                map[8][col + 1] = 2;
            }
            if (col % 7 === 3 && !map[7][col]) {
                if (isValidHighBlockPlacement(col, 7)) {
                    map[7][col] = 2;
                }
            }
        }
    }
    
    // Processar seções de dificuldade (começando depois da zona segura)
    for (const section of config.sections) {
        const [startCol, endCol] = section.range;
        
        // Pular seção segura inicial
        const actualStart = Math.max(startCol, 80);
        if (actualStart >= endCol) continue;
        
        for (let col = actualStart; col < endCol; col++) {
            const sectionProg = (col - actualStart) / (endCol - actualStart); // 0 a 1 dentro da seção
            
            // Chão com progressão - NÃO sobrescrever se já existe
            const groundChance = section.groundChance - sectionProg * 0.15;
            if (Math.random() < groundChance && !map[10][col] && !map[11][col]) {
                map[10][col] = 1;
                map[11][col] = 1;
            }
            
            // Plataformas flutuantes em grupos - evitar overlap
            const groupPeriod = 12;
            const colInGroup = (col - actualStart) % groupPeriod;
            
            if (colInGroup === 0 && Math.random() < section.platformChance) {
                const groupSize = 3;
                const startRow = Math.random() < 0.5 ? 7 : 8;
                
                for (let i = 0; i < groupSize; i++) {
                    if (col + i < endCol && !map[startRow][col + i]) {
                        // Validar blocos altos (row 7) antes de colocar
                        if (startRow === 7 && !isValidHighBlockPlacement(col + i, 7)) {
                            continue;
                        }
                        
                        const tileType = Math.random() < 0.2 ? 5 : 2;
                        map[startRow][col + i] = tileType;
                        
                        // Blocos intermediários para criar "escada"
                        if (i > 0 && startRow > 6 && Math.random() < 0.6) {
                            const intermediateRow = startRow + 1;
                            if (!map[intermediateRow][col + i - 1]) {
                                map[intermediateRow][col + i - 1] = 2;
                            }
                        }
                    }
                }
            }
            
            // Mandacaru ocasional - começar a partir de col 50, NÃO colocar se já tem algo
            if (col > 50 && col % 18 === 0 && Math.random() < section.platformDensity && !map[8][col]) {
                // Verificar se há buraco pequeno abaixo do mandacaru
                const hasSmallHole = !map[10][col] && !map[11][col];
                
                if (Math.random() < 0.48 && !hasSmallHole) {
                    // Mandacaru AÉREO - garantir que fica no ar (row 8) e não há buraco pequeno
                    map[8][col] = 4;
                } else if (col > 80 && isValidCactusPlacement(col)) {
                    // Cactos no chão - com validação
                    createGroundCactus(col);
                }
            }
            
            // Blocos extras - NÃO colocar se já existe bloco
            if (col % 11 === 5 && Math.random() < section.platformDensity * 0.7 && !map[8][col]) {
                if (isValidBlockPlacement(col, 8)) {
                    map[8][col] = 2;
                }
            }
            if (col % 13 === 2 && Math.random() < section.platformDensity * 0.3 && !map[6][col]) {
                if (isValidBlockPlacement(col, 6) && isValidHighBlockPlacement(col, 6)) {
                    map[6][col] = 5;
                }
            }
            if (col % 9 === 4 && Math.random() < section.platformDensity * 0.45 && !map[6][col]) {
                if (isValidBlockPlacement(col, 6) && isValidHighBlockPlacement(col, 6)) {
                    map[6][col] = 2;
                }
            }
        }
    }
    
    // SEÇÃO FINAL - com exatamente 15 blocos (LÓGICA SEPARADA E LIMPA)
    const finalConfig = config.sections[config.sections.length - 1];
    const [finalStart, finalEnd] = finalConfig.range;
    const finalLength = finalEnd - finalStart;
    let blocksPlaced = 0;
    const targetBlocks = config.finalBlockCount;
    const spacing = Math.floor(finalLength / targetBlocks);
    
    // Limpar APENAS a seção final de blocos de chão conflitantes
    for (let col = finalStart; col < finalEnd; col++) {
        // NÃO limpar se é zona de bandeira/zoológico
        if (col >= finalEnd - 20) continue;
        map[10][col] = 0;
        map[11][col] = 0;
    }
    
    // Colocar exatamente 15 blocos espaçados na seção final
    for (let col = finalStart; col < finalEnd && blocksPlaced < targetBlocks; col += spacing) {
        if (col < finalEnd - 20) { // Não colocar na zona da bandeira
            map[10][col] = 1;
            map[11][col] = 1;
            blocksPlaced++;
        }
    }
    
    // BANDEIRA E ZOOLÓGICO - zona reservada e clara
    const flagCol = finalEnd - 15;
    const flagRow = 10;

    // Bandeira em nível de plataforma final
    map[flagRow][flagCol] = 7;
    map[flagRow + 1][flagCol] = 1;

    // Garantir chão contínuo no final (zona de bandeira protegida)
    for (let col = flagCol - 2; col <= flagCol + 3; col++) {
        if (col < mapWidth) {
            map[11][col] = 1;
            if (col >= flagCol - 2 && col <= flagCol + 3) {
                map[10][col] = map[10][col] || 2;
            }
        }
    }

    // Estrutura Final: Zoológico (Python)
    const pythonCol = flagCol + 4;
    const pythonHeight = 3;
    const pythonWidth = 6;

    for (let py = 0; py < pythonHeight; py++) {
        for (let px = 0; px < pythonWidth; px++) {
            const row = flagRow + 1 + py;
            if (row < mapHeight && pythonCol + px < mapWidth) {
                map[row][pythonCol + px] = 20;
            }
        }
    }

    // Chão extra sob o zoológico
    for (let col = pythonCol - 2; col < pythonCol + pythonWidth + 2; col++) {
        if (col >= 0 && col < mapWidth) {
            map[12][col] = 1;
            map[13][col] = 1;
        }
    }

    const supportRow = mapHeight - 1;
    for (let sx = -4; sx < pythonWidth + 4; sx++) {
        const col = pythonCol + sx;
        if (col >= 0 && col < mapWidth) {
            map[supportRow][col] = 21;
        }
    }

    fixMapPassability(mapWidth);
    
    // Adicionar mais cactos garantidos no caminho com validação
    const guaranteedCactusCols = [30, 50, 70, 90, 110, 140, 170, 200, 230, 260];
    for (const ccol of guaranteedCactusCols) {
        if (ccol >= 0 && ccol < mapWidth && !cacti.find(c => c.col === ccol)) {
            // Usar validação para garantir que cacto não bloqueia passagem
            if (isValidCactusPlacement(ccol)) {
                createGroundCactus(ccol);
            } else {
                // Se a coluna não é válida, tentar próximas colunas (±1, ±2, ±3)
                let placed = false;
                for (let offset = 1; offset <= 3 && !placed; offset++) {
                    if (ccol + offset < mapWidth && isValidCactusPlacement(ccol + offset)) {
                        createGroundCactus(ccol + offset);
                        placed = true;
                    } else if (ccol - offset >= 0 && isValidCactusPlacement(ccol - offset)) {
                        createGroundCactus(ccol - offset);
                        placed = true;
                    }
                }
            }
        }
    }
    
    // Criar instância do zoológico
    zoo = new ZooBuilding(pythonCol, flagRow + 1);
}

// Validar se um bloco pode ser colocado sem bloquear passagem
function isValidBlockPlacement(col, row) {
    // Não colocar bloco imediatamente acima (distância 1) de outro bloco
    if (row < 11 && map[row + 1][col] && map[row + 1][col] !== 0) {
        return false;
    }
    
    // Verificação especial para blocos a 1 do chão (row 9)
    if (row === 9) {
        // Verificar se há um bloco com 3-4 blocos de distância ANTES (col-1 apenas)
        if (col > 0) {
            let prevBlockHeight = null;
            for (let r = 6; r <= 10; r++) {
                if (map[r][col - 1] && map[r][col - 1] !== 0) {
                    prevBlockHeight = 10 - r; // Distância do chão
                    break;
                }
            }
            
            // Se bloco anterior tem 3-4 de distância, verificar se há trampolim para escalar
            if (prevBlockHeight && (prevBlockHeight === 3 || prevBlockHeight === 4)) {
                // Procurar bloco em row 7 (3 blocos de distância) nos 1-3 tiles ANTES
                let hasClimbablePlatform = false;
                
                for (let checkCol = Math.max(0, col - 3); checkCol < col; checkCol++) {
                    if (map[7][checkCol] && map[7][checkCol] !== 0) {
                        // Há um bloco em row 7 que pode servir de trampolim
                        // Verificar se há caminho livre entre row 7 e row 9
                        let pathClear = true;
                        
                        // Verificar se há obstáculos bloqueando (apenas row 8 pode bloquear)
                        for (let checkPathCol = checkCol; checkPathCol <= col; checkPathCol++) {
                            if (map[8][checkPathCol] && map[8][checkPathCol] !== 0) {
                                pathClear = false;
                                break;
                            }
                        }
                        
                        if (pathClear) {
                            hasClimbablePlatform = true;
                            break;
                        }
                    }
                }
                
                // Se há bloco alto ANTES mas não tem trampolim escalável, bloqueia
                if (!hasClimbablePlatform) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Validar se um bloco alto pode ser colocado sem bloquear buraco grande
function isValidHighBlockPlacement(col, row) {
    // Apenas verificar para blocos altos (row 6-7, altura 3-4)
    if (row !== 6 && row !== 7) {
        return true; // Blocos baixos podem ser colocados normalmente
    }
    
    // Verificar se há um buraco grande (>3 blocos) abaixo deste bloco
    const largeHoleSize = countLargeBelowBlock(col);
    
    if (largeHoleSize > 3) {
        // Há buraco grande abaixo. Verificar se há trampolim (row 8) nos 1-2 tiles ANTES
        let hasClimbablePlatformBefore = false;
        
        for (let checkCol = Math.max(0, col - 2); checkCol < col; checkCol++) {
            if (map[8][checkCol] && map[8][checkCol] !== 0) {
                // Verificar se row 8 é realmente um bloco de plataforma (tipo 2, 5, ou 4)
                // e não é um mandacaru aéreo
                hasClimbablePlatformBefore = true;
                break;
            }
        }
        
        // Se não tem trampolim antes de um bloco alto sobre buraco grande, bloqueia
        if (!hasClimbablePlatformBefore) {
            return false;
        }
    }
    
    return true;
}

// Contar tamanho do buraco abaixo de uma coluna
function countLargeBelowBlock(col) {
    let holeSize = 0;
    let inHole = false;
    
    for (let checkCol = col; checkCol < Math.min(col + 5, map[0].length); checkCol++) {
        const hasGround = map[10][checkCol] || map[11][checkCol];
        
        if (!hasGround) {
            holeSize++;
            inHole = true;
        } else {
            if (inHole) {
                break; // Fim do buraco
            }
        }
    }
    
    return holeSize;
}

// Validar se um cacto pode ser colocado sem bloquear passagem
function isValidCactusPlacement(col) {
    // Não colocar cacto se há mandacaru (tipo 4) na coluna
    for (let row = 0; row < map.length; row++) {
        if (map[row][col] === 4) {
            return false;
        }
    }
    
    // Não colocar cacto se há outro cacto muito perto (menos de 3 colunas)
    for (const cactus of cacti) {
        if (Math.abs(cactus.col - col) < 3) {
            return false;
        }
    }
    
    // Não colocar cacto próximo a buraco pequeno (1-2 blocos)
    // Verificar 2 colunas antes e depois
    for (let checkCol = Math.max(0, col - 2); checkCol <= Math.min(map[0].length - 1, col + 2); checkCol++) {
        if (checkCol === col) continue;
        
        const hasGround = map[10][checkCol] || map[11][checkCol];
        if (!hasGround) {
            // Há um buraco nesta coluna. Contar o tamanho do buraco
            let holeSize = 1;
            for (let holeCheck = checkCol + 1; holeCheck < map[0].length; holeCheck++) {
                if (!map[10][holeCheck] && !map[11][holeCheck]) {
                    holeSize++;
                } else {
                    break;
                }
            }
            
            // Se buraco é pequeno (1-2 blocos) e está próximo, bloqueia
            if (holeSize <= 2 && Math.abs(checkCol - col) <= 1) {
                return false;
            }
        }
    }
    
    // Não colocar cacto em frente a plataforma muito alta sem espaço
    // Verificar se há bloco a 3-4 de distância muito perto sem passar
    for (let checkCol = Math.max(0, col - 1); checkCol <= Math.min(map[0].length - 1, col + 1); checkCol++) {
        let highBlockFound = false;
        for (let row = 6; row <= 8; row++) {
            if (map[row][checkCol] && map[row][checkCol] !== 0) {
                const blockHeight = 10 - row;
                if (blockHeight >= 3) {
                    highBlockFound = true;
                    break;
                }
            }
        }
        
        // Se há bloco alto muito perto sem espaço, bloqueia
        if (highBlockFound && checkCol === col) {
            return false;
        }
    }
    
    return true;
}

function fixMapPassability(mapWidth) {
    // Apenas corrigir buracos MUITO grandes (mais de 3 blocos), não destruir design intencional
    let holeCount = 0;
    let holeStart = 0;
    
    for (let col = 0; col < mapWidth; col++) {
        const hasGround = map[10][col] || map[11][col];
        if (!hasGround) {
            if (holeCount === 0) holeStart = col;
            holeCount++;
        } else {
            // Preencher apenas buracos MUITO grandes (>4 blocos)
            if (holeCount > 4) {
                for (let fix = 1; fix <= holeCount; fix++) {
                    const fixCol = col - fix;
                    if (fixCol >= holeStart && !map[10][fixCol] && !map[11][fixCol]) {
                        map[11][fixCol] = 1;
                    }
                }
            }
            holeCount = 0;
        }
    }
    
    // Não remover plataformas intermediárias - elas fazem parte do design!
    // A verificação antiga removia plataformas intencionais
}

function startLevel(level = 1) {
    currentLevel = level;
    generateMap(level);
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
            this.animationOffset = 0;
        this.height = 55;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.isBig = false;
        this.color = "#4CAF50";
        this.facing = 1; // 1 = direita, -1 = esquerda
        if (!keepLives) {
            this.lives = 3; // Começa com 1 vida
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

        this.prevX = this.x;
        this.prevY = this.y;

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
        const prevX = typeof this.prevX === 'number' ? this.prevX : this.x;
        const prevY = typeof this.prevY === 'number' ? this.prevY : this.y;
        
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

                        const fromAbove = prevY + this.height <= ty;
                        const fromBelow = prevY >= ty + TILE_SIZE;
                        const fromLeft = prevX + this.width <= tx;
                        const fromRight = prevX >= tx + TILE_SIZE;
                        
                        if (overlapY <= overlapX || fromAbove || fromBelow) {
                            // Colisão vertical
                            if (fromAbove && this.vy >= 0) {
                                this.vy = 0;
                                this.y = ty - this.height;
                                this.onGround = true;
                            } else if (fromBelow && this.vy <= 0) {
                                this.vy = 0;
                                this.y = ty + TILE_SIZE;
                                if (tile === 2) {
                                    score += 50;
                                    map[row][col] = 3;
                                } else if (tile === 5) {
                                    score += 80;
                                    map[row][col] = 6;
                                    const dropType = Math.random() < 0.7 ? "growth" : "extraLife";
                                    powerUps.push(new PowerUp(tx, ty, dropType));
                                }
                            } else if (fromLeft || fromRight) {
                                if (fromLeft) {
                                    this.x = tx - this.width;
                                } else if (fromRight) {
                                    this.x = tx + TILE_SIZE;
                                }
                            }
                        } else {
                            // Colisão horizontal
                            if (tile !== 7) {
                                if (fromLeft) {
                                    this.x = tx - this.width;
                                } else if (fromRight) {
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
        this.vy = 0; // Velocidade vertical
        this.color = "#8D6E63";
        this.facing = this.vx < 0 ? -1 : 1;
        this.walkTimer = 0;
        this.bobOffset = 0;
        this.onGround = false; // Se está em uma plataforma
    }

    update() {
        // Aplicar gravidade
        this.vy += GRAVITY;
        
        // Atualizar posição
        this.x += this.vx;
        this.y += this.vy;

        this.walkTimer += 0.12;
        this.bobOffset = Math.sin(this.walkTimer * Math.PI) * 3;
        
        // Verificar colisão com blocos
        this.checkBlockCollisions();
        
        // Inverte direção se sair do mapa
        if (this.x < 0) {
            this.vx = Math.abs(this.vx);
            this.facing = 1;
        } else if (this.x > map[0].length * TILE_SIZE - this.width) {
            this.vx = -Math.abs(this.vx);
            this.facing = -1;
        }
        
        // Matar inimigo se cair muito
        if (this.y > canvas.height + 100) {
            this.isDead = true;
        }
    }
    
    checkBlockCollisions() {
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
                        
                        const overlapX = Math.min(this.x + this.width, tx + TILE_SIZE) - Math.max(this.x, tx);
                        const overlapY = Math.min(this.y + this.height, ty + TILE_SIZE) - Math.max(this.y, ty);

                        if (overlapX <= 0 || overlapY <= 0) continue;

                        // Colisão vertical (chão)
                        if (this.vy >= 0 && this.y + this.height / 2 < ty + TILE_SIZE / 2) {
                            this.vy = 0;
                            this.y = ty - this.height;
                            this.onGround = true;
                        }
                        // Colisão vertical (teto)
                        else if (this.vy < 0 && this.y + this.height / 2 > ty + TILE_SIZE / 2) {
                            this.vy = 0;
                            this.y = ty + TILE_SIZE;
                        }
                        // Colisão horizontal (blocos)
                        else if (overlapX < overlapY) {
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
    constructor(x, y, type = "growth") {
        this.x = x + TILE_SIZE / 2 - 15; // Centraliza horizontalmente
        this.y = y - TILE_SIZE; // Aparece acima do bloco
        this.width = 30;
        this.height = 30;
        this.vy = 0; // Velocidade vertical (cai)
        this.type = type; // "growth" ou "extraLife"
        
        // Cores diferentes para cada tipo
        if (type === "extraLife") {
            this.color = "#FF1493"; // Rosa/Magenta para vida extra
        } else {
            this.color = "#FFD700"; // Cor dourada padrão
        }
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
        if (this.type === "extraLife") {
            // Desenho para power-up de vida extra
            if (extraLifePowerUpImage.complete && extraLifePowerUpImage.naturalWidth !== 0) {
                ctx.drawImage(extraLifePowerUpImage, this.x - cameraX, this.y, this.width, this.height);
            } else {
                // Fallback: desenho com coração
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - cameraX, this.y, this.width, this.height);
                ctx.fillStyle = "black";
                ctx.font = "bold 16px Arial";
                ctx.textAlign = "center";
                ctx.fillText("❤️", this.x - cameraX + this.width / 2, this.y + this.height / 2 + 5);
                ctx.textAlign = "left";
            }
        } else {
            // Power-up de crescimento padrão
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

// Classe para Partículas de Confete - celebração de vitória
class Confetti {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = Math.random() * (-6) - 3;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.width = Math.random() * 12 + 8;
        this.height = Math.random() * 8 + 4;
        this.color = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FCBAD3"][Math.floor(Math.random() * 7)];
        this.life = 120; // Frames até desaparecer
        this.maxLife = 120;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // Gravidade
        this.rotation += this.rotationSpeed;
        this.life--;
        this.vx *= 0.98; // Resistência do ar
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x - cameraX, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

// Classe para estrutura do Zoológico - visual melhorado
class ZooBuilding {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE;
        this.y = row * TILE_SIZE;
        this.animationTime = 0;
        this.roofHeight = 8;
    }

    drawZoo() {
        const baseX = this.x - cameraX;
        const baseY = this.y - TILE_SIZE * 3;

        // Estrutura principal - paredes de madeira
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(baseX, baseY, TILE_SIZE * 4, TILE_SIZE * 3);
        
        // Parede destacada
        ctx.fillStyle = "#A0522D";
        ctx.fillRect(baseX, baseY, TILE_SIZE * 4, TILE_SIZE * 2.5);
        
        // Decoração em madeira - ripas verticais
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(baseX + i * TILE_SIZE, baseY);
            ctx.lineTo(baseX + i * TILE_SIZE, baseY + TILE_SIZE * 2.5);
            ctx.stroke();
        }

        // Telhado - estrutura triangular
        ctx.fillStyle = "#D2691E";
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(baseX + TILE_SIZE * 2, baseY - TILE_SIZE * 0.8);
        ctx.lineTo(baseX + TILE_SIZE * 4, baseY);
        ctx.fill();

        // Telhas no telhado
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(baseX + i * TILE_SIZE * 0.8, baseY - TILE_SIZE * 0.8 + i * 8);
            ctx.lineTo(baseX + TILE_SIZE * 4, baseY + (i * 8));
            ctx.stroke();
        }

        // Janelas do zoológico
        const windowColor = "#87CEEB";
        for (let w = 0; w < 3; w++) {
            const winX = baseX + TILE_SIZE * 0.5 + w * TILE_SIZE * 1.2;
            const winY = baseY + TILE_SIZE * 0.8;
            // Moldura
            ctx.fillStyle = "#654321";
            ctx.fillRect(winX, winY, TILE_SIZE * 0.7, TILE_SIZE * 0.7);
            // Vidro
            ctx.fillStyle = windowColor;
            ctx.fillRect(winX + 2, winY + 2, TILE_SIZE * 0.7 - 4, TILE_SIZE * 0.7 - 4);
            // Reflexo
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fillRect(winX + 4, winY + 4, TILE_SIZE * 0.3, TILE_SIZE * 0.3);
        }

        // Porta do zoológico
        ctx.fillStyle = "#654321";
        ctx.fillRect(baseX + TILE_SIZE * 1.6, baseY + TILE_SIZE * 1.5, TILE_SIZE * 0.8, TILE_SIZE);
        ctx.fillStyle = "#DAA520";
        ctx.fillRect(baseX + TILE_SIZE * 1.7, baseY + TILE_SIZE * 1.6, TILE_SIZE * 0.6, TILE_SIZE * 0.8);
        // Maçaneta
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(baseX + TILE_SIZE * 2.2, baseY + TILE_SIZE * 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Placa do zoológico no topo
        ctx.fillStyle = "#DAA520";
        ctx.fillRect(baseX + TILE_SIZE * 1, baseY - TILE_SIZE * 0.5, TILE_SIZE * 2, TILE_SIZE * 0.35);
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX + TILE_SIZE * 1, baseY - TILE_SIZE * 0.5, TILE_SIZE * 2, TILE_SIZE * 0.35);
        
        // Texto na placa
        ctx.fillStyle = "#8B4513";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("ZOO", baseX + TILE_SIZE * 2, baseY - TILE_SIZE * 0.22);
        ctx.textAlign = "left";
    }

    drawBase() {
        const baseX = this.x - cameraX;
        const baseY = this.y - TILE_SIZE * 3;

        // Base/Suporte em pedra
        ctx.fillStyle = "#696969";
        ctx.fillRect(baseX - TILE_SIZE, baseY + TILE_SIZE * 2.5, TILE_SIZE * 6, TILE_SIZE * 0.8);
        
        // Padrão de pedras
        ctx.fillStyle = "#808080";
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(baseX - TILE_SIZE + i * TILE_SIZE, baseY + TILE_SIZE * 2.5, TILE_SIZE * 0.9, TILE_SIZE * 0.8);
        }

        // Sombra realista
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.ellipse(baseX + TILE_SIZE * 1.5, baseY + TILE_SIZE * 3.5, TILE_SIZE * 3, TILE_SIZE * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- INSTÂNCIAS ---
const player = new Player();
let enemies = [];
let zoo = null; // Instância do zoológico para renderização coordenada

function initEnemies() {
    enemies = [];
    powerUps = []; // Reseta power-ups ao iniciar
    const enemyY = 370;
    const baseX = 600;
    const spacing = 700;
    const enemyCount = 4;

    for (let i = 0; i < enemyCount; i++) {
        const speed = -0.95 - Math.random() * 0.35; // Reduzido de -1.2 para mais controle
        let x = baseX + i * spacing + (Math.random() * 250 - 125);
        
        // Evitar spawnar inimigos em colunas com obstáculos aéreos (tipo 4 - mandacaru)
        const col = Math.floor(x / TILE_SIZE);
        for (let row = 0; row < map.length; row++) {
            if (map[row][col] === 4) {
                // Há obstáculo aéreo, mover inimigo para lado seguro
                x += TILE_SIZE * 3;
                break;
            }
        }
        
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
                    // Bandeira (objetivo final) - com animação flutuante
                    const sway = Math.sin(Date.now() / 150 + tx) * 3;
                    const bobbing = Math.cos(Date.now() / 300 + tx) * 2;
                    
                    if (flagImage.complete && flagImage.naturalWidth !== 0) {
                        ctx.drawImage(flagImage, tx - cameraX + sway, ty - TILE_SIZE * 2.5 + bobbing, TILE_SIZE, TILE_SIZE * 3);
                    } else {
                        // Mastro da bandeira com brilho
                        ctx.fillStyle = "#654321";
                        ctx.fillRect(tx - cameraX + TILE_SIZE / 2 - 4, ty - TILE_SIZE * 2.2, 8, TILE_SIZE * 2.2);
                        
                        // Sombra do mastro
                        ctx.fillStyle = "rgba(0,0,0,0.2)";
                        ctx.fillRect(tx - cameraX + TILE_SIZE / 2 - 2, ty - TILE_SIZE * 2.2, 3, TILE_SIZE * 2.2);
                        
                        // Bandeira vermelha flutuando
                        ctx.save();
                        ctx.translate(tx - cameraX + TILE_SIZE / 2 + sway, ty - TILE_SIZE * 1.8 + bobbing);
                        
                        // Efeito ondulante
                        const waveAmount = Math.sin(Date.now() / 200) * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(20 + waveAmount, -5);
                        ctx.lineTo(20 + waveAmount * 0.5, 8);
                        ctx.lineTo(0, 8);
                        ctx.closePath();
                        
                        // Gradiente para bandeira
                        const gradient = ctx.createLinearGradient(0, -5, 20, 8);
                        gradient.addColorStop(0, "#FF4444");
                        gradient.addColorStop(1, "#CC0000");
                        ctx.fillStyle = gradient;
                        ctx.fill();
                        
                        // Borda da bandeira
                        ctx.strokeStyle = "#990000";
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        ctx.restore();
                    }
                }
                else if (tile === 20) {
                    // ESTRUTURA ZOO - renderizada como um todo pelo objeto zoo
                    // Fallback: bloco de suporte simples se zoo não existir
                    if (!zoo) {
                        ctx.fillStyle = "#2d5016";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#1a3009";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    }
                }
                else if (tile === 21) {
                    // BASE ZOO - renderizada como um todo pelo objeto zoo
                    // Fallback: bloco de base simples se zoo não existir
                    if (!zoo) {
                        ctx.fillStyle = "#8B6914";
                        ctx.fillRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = "#654321";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(tx - cameraX, ty, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }
    
    // Renderizar zoológico se existir
    if (zoo) {
        zoo.drawZoo();
        zoo.drawBase();
    }
}


function update() {

    // efeito de câmera suave
    canvas.style.transform = `translateY(${Math.sin(Date.now() * 0.003) * 1.5}px)`;

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
            if (powerUps[i].type === "extraLife") {
                // Power-up de vida extra
                if (player.lives < 3) {
                    player.lives++;
                    score += 250; // Bônus por pegar vida extra
                } else {
                    score += 250; // Mesmo assim ganha pontos
                }
            } else {
                // Power-up de crescimento (padrão)
                if (!player.hasPowerUp) {
                    player.hasPowerUp = true;
                    player.isBig = true; // Crescer quando coleta power-up
                    score += 300; // Bônus por pegar power-up
                }
            }
            powerUps.splice(i, 1);
        }
    }
    
    // Atualizar e desenhar confete (celebração de vitória)
    for (let i = confetti.length - 1; i >= 0; i--) {
        confetti[i].update();
        confetti[i].draw();
        
        // Remover confete morto
        if (!confetti[i].isAlive()) {
            confetti.splice(i, 1);
        }
    }

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        
        // Remover inimigo se caiu
        if (enemy.isDead) {
            enemies.splice(index, 1);
            return;
        }

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

    
    // HUD Remasterizado
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(12, 12, 360, 100);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12,12,360,100);

    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`PONTOS: ${score}`, 28, 42);

    ctx.font = "bold 20px Arial";
    ctx.fillText("VIDA:", 28, 76);

    const hearts = "❤️".repeat(player.lives) + "🖤".repeat(3-player.lives);
    ctx.font = "24px Arial";
    ctx.fillText(hearts, 110, 78);

    if (player.hasPowerUp) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 18px Arial";
        ctx.fillText("⭐ POWER-UP ATIVO", canvas.width - 250, 40);
    }

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "16px Arial";
    ctx.fillText("A/D mover  •  W pular", 20, canvas.height - 20);


    animationId = requestAnimationFrame(update);
}

// --- CONTROLES ---
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = true;
    
    // Atalho para ir ao final do jogo (DEBUG) - Pressione 'E'
    if ((e.key === 'e' || e.key === 'E') && gameActive) {
        player.x = 290 * TILE_SIZE - 100;
        player.vx = 0;
        player.vy = 0;
        player.y = 11 * TILE_SIZE - player.height;
        player.onGround = true;
    }
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
    currentLevel = 1; // Começar no nível 1
    player.reset(false);
    generateMap(currentLevel); // Gera o mapa do nível 1
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
    
    // Criar explosão de confete
    for (let i = 0; i < 80; i++) {
        const x = player.x - cameraX + Math.random() * 50 - 25;
        const y = player.y + Math.random() * 30;
        confetti.push(new Confetti(x, y));
    }
    
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

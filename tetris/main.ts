import './style.css';

const canvas = document.getElementById('tetris-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const nextCanvas = document.getElementById('next-piece-canvas') as HTMLCanvasElement;
const nextCtx = nextCanvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const gameOverScreen = document.getElementById('game-over')!;
const restartBtn = document.getElementById('restart-btn')!;

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Kuromi colors for pieces
const COLORS = [
  'transparent',
  '#ff66a3', // Pink
  '#a67cff', // Purple
  '#ffffff', // White
  '#5c5266', // Grey-purple
  '#ff99c2', // Light Pink
  '#cba6ff', // Light Purple
  '#ff4d94'  // Darker Pink
];

// Tetromino definitions
const SHAPES = [
  [],
  [[1, 1, 1, 1]], // I
  [[2, 0, 0], [2, 2, 2]], // J
  [[0, 0, 3], [3, 3, 3]], // L
  [[4, 4], [4, 4]], // O
  [[0, 5, 5], [5, 5, 0]], // S
  [[0, 6, 0], [6, 6, 6]], // T
  [[7, 7, 0], [0, 7, 7]]  // Z
];

let grid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let isGameOver = false;

let piece = createPiece();
let nextPiece = createPiece();

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function drawBlock(context: CanvasRenderingContext2D, x: number, y: number, colorId: number) {
  if (colorId === 0) return;
  
  // Fill square
  context.fillStyle = COLORS[colorId];
  context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  
  // Subtle border
  context.strokeStyle = 'rgba(0,0,0,0.5)';
  context.lineWidth = 1;
  context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  
  // Kuromi "glass/gloss" highlight effect
  context.fillStyle = 'rgba(255,255,255,0.3)';
  context.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE / 3);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid base
  ctx.strokeStyle = 'rgba(255, 102, 163, 0.1)';
  for (let y = 0; y < canvas.height; y += BLOCK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for(let x = 0; x < canvas.width; x += BLOCK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw landed blocks
  grid.forEach((row, y) => {
    row.forEach((value, x) => {
      drawBlock(ctx, x, y, value);
    });
  });

  // Draw active piece
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      drawBlock(ctx, piece.pos.x + x, piece.pos.y + y, value);
    });
  });
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  
  // Center piece in the next viewport
  const pWidth = nextPiece.matrix[0].length * BLOCK_SIZE;
  const pHeight = nextPiece.matrix.length * BLOCK_SIZE;
  const offsetX = (nextCanvas.width - pWidth) / 2 / BLOCK_SIZE;
  const offsetY = (nextCanvas.height - pHeight) / 2 / BLOCK_SIZE;

  // Temporary adjust scale if piece is I-shape
  nextPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      drawBlock(nextCtx, offsetX + x, offsetY + y, value);
    });
  });
}

function collide(testGrid: number[][], testPiece: { matrix: number[][], pos: { x: number, y: number } }) {
  const m = testPiece.matrix;
  const o = testPiece.pos;
  
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (testGrid[y + o.y] && testGrid[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(targetGrid: number[][], srcPiece: { matrix: number[][], pos: { x: number, y: number } }) {
  srcPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        targetGrid[y + srcPiece.pos.y][x + srcPiece.pos.x] = value;
      }
    });
  });
}

function createPiece() {
  const id = Math.floor(Math.random() * 7) + 1;
  const matrix = SHAPES[id];
  return {
    matrix,
    pos: { x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2), y: 0 }
  };
}

function rotatePiece(matrix: number[][]) {
  // Transpose and reverse rows (clockwise rotation)
  const result = matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
  return result;
}

function playerDrop() {
  piece.pos.y++;
  if (collide(grid, piece)) {
    piece.pos.y--;
    merge(grid, piece);
    resetPiece();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(offset: number) {
  piece.pos.x += offset;
  if (collide(grid, piece)) {
    piece.pos.x -= offset;
  }
}

function playerRotate() {
  const pos = piece.pos.x;
  let offset = 1;
  const originalMatrix = piece.matrix;
  
  piece.matrix = rotatePiece(piece.matrix);
  
  // Wall kick validation
  while (collide(grid, piece)) {
    piece.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > piece.matrix[0].length) {
      piece.matrix = originalMatrix; // rotate back if it fails fundamentally
      piece.pos.x = pos;
      return;
    }
  }
}

function resetPiece() {
  piece = nextPiece;
  nextPiece = createPiece();
  drawNext();
  if (collide(grid, piece)) {
    isGameOver = true;
    gameOverScreen.classList.add('active');
  }
}

function arenaSweep() {
  let rowCount = 0;
  
  outer: for (let y = grid.length - 1; y >= 0; --y) {
    // Check if row is fully populated
    for (let x = 0; x < grid[y].length; ++x) {
      if (grid[y][x] === 0) {
        continue outer;
      }
    }
    
    // Valid full row found -> clear it and push empty row on top
    const row = grid.splice(y, 1)[0].fill(0);
    grid.unshift(row);
    ++y;
    rowCount++;
  }
  
  if (rowCount > 0) {
    score += rowCount * 100 * rowCount; // Bonus scaling for multi-lines
    scoreElement.innerText = score.toString();
    
    // Increase speed per clear
    dropInterval = Math.max(150, dropInterval - (rowCount * 30));
  }
}

function playerHardDrop() {
  while (!collide(grid, piece)) {
    piece.pos.y++;
  }
  piece.pos.y--;
  merge(grid, piece);
  resetPiece();
  arenaSweep();
  dropCounter = 0;
}

function update(time = 0) {
  if (isGameOver) return;
  
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  
  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
  if (isGameOver) return;
  
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); // Prevent page scrolling
  }

  switch (event.key) {
    case 'ArrowLeft': playerMove(-1); break;
    case 'ArrowRight': playerMove(1); break;
    case 'ArrowDown': playerDrop(); break;
    case 'ArrowUp': playerRotate(); break;
    case ' ': playerHardDrop(); break;
  }
});

restartBtn.addEventListener('click', () => {
  grid.forEach(row => row.fill(0));
  score = 0;
  scoreElement.innerText = '0';
  dropInterval = 1000;
  isGameOver = false;
  gameOverScreen.classList.remove('active');
  piece = createPiece();
  nextPiece = createPiece();
  drawNext();
  
  lastTime = performance.now();
  update();
});

drawNext();
lastTime = performance.now();
update();

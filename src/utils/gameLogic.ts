/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TetrominoType, Tetromino, PlayerState, UnoCard, UnoCardType, GameMessage } from '../types';
import { COLS, ROWS, TETROMINOES, UNO_CARDS } from '../constants';

// Unique message id helper
const generateId = () => Math.random().toString(36).substring(2, 9);

// Create an empty grid (10 cols x 20 rows)
export const createEmptyGrid = (): (string | null)[][] => {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
};

// Bag of 7 randomizer to ensure fair piece distribution
export class PieceBag {
  private bag: TetrominoType[] = [];

  constructor() {
    this.refill();
  }

  private refill() {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    this.bag = types;
  }

  getNext(): Tetromino {
    if (this.bag.length === 0) {
      this.refill();
    }
    const type = this.bag.pop()!;
    return { ...TETROMINOES[type] };
  }
}

// Generate a random Uno Card
export const drawUnoCard = (): UnoCard => {
  const types: UnoCardType[] = ['COLOUR_SWITCH', 'BOMB', 'SLOW_DOWN', 'CLEAR_ROW', 'SHUFFLE'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const config = UNO_CARDS[randomType];

  return {
    id: generateId(),
    type: randomType,
    title: config.title,
    description: config.description,
    color: config.color as any
  };
};

// Check if a move is valid
export const checkCollision = (
  shape: number[][],
  grid: (string | null)[][],
  posX: number,
  posY: number
): boolean => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const nextX = posX + c;
        const nextY = posY + r;

        // Border bounds
        if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
          return true;
        }

        // Lock grid cell collision
        if (nextY >= 0 && grid[nextY][nextX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
};

// Create a new initial player state
export const createInitialPlayer = (id: 'p1' | 'p2', name: string, bag: PieceBag): PlayerState => {
  return {
    id,
    name,
    grid: createEmptyGrid(),
    score: 0,
    linesCleared: 0,
    level: 1,
    currentPiece: null, // assigned during game start
    nextPiece: bag.getNext(),
    holdPiece: null,
    hasHeldThisTurn: false,
    hand: [],
    isGameOver: false,
    slowDownTimeRemaining: 0,
    isShaking: false,
    shakeTimeRemaining: 0,
    flashRows: [],
    lastActionMessage: '',
    messages: []
  };
};

// Add a HUD notification message
export const addGameMessage = (
  player: PlayerState,
  text: string,
  type: GameMessage['type'] = 'info'
) => {
  const newMessage: GameMessage = {
    id: generateId(),
    text,
    type,
    timestamp: Date.now()
  };
  player.messages = [newMessage, ...player.messages.slice(0, 19)];
};

// Apply CARD: Colour Switch
export const applyColourSwitch = (player: PlayerState) => {
  const neonColors = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316'];
  
  // Scramble the placed grid colors
  let blockCount = 0;
  const newGrid = player.grid.map((row) =>
    row.map((cell) => {
      if (cell !== null) {
        blockCount++;
        return neonColors[Math.floor(Math.random() * neonColors.length)];
      }
      return null;
    })
  );

  player.grid = newGrid;

  // Also swap active falling piece color if present
  if (player.currentPiece) {
    player.currentPiece.color = neonColors[Math.floor(Math.random() * neonColors.length)];
  }

  player.lastActionMessage = 'Colour Switch Activated!';
  addGameMessage(player, `🎨 Colour Switch scrambled all cells!`, 'info');
};

// Apply CARD: Bomb (detonates a 3x3 region at the highest stacked region)
export const applyBomb = (player: PlayerState): { cx: number; cy: number } | null => {
  // Find the highest locked block in the middle columns (to make the bomb effective)
  let highestX = 5;
  let highestY = ROWS - 1;
  let found = false;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (player.grid[r][c] !== null) {
        highestY = r;
        highestX = c;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // Choose center point
  const cy = Math.max(1, Math.min(ROWS - 2, highestY + 1));
  const cx = Math.max(1, Math.min(COLS - 2, highestX));

  // Explode 3x3 region centered at (cx, cy)
  let blocksDestroyed = 0;
  for (let r = cy - 1; r <= cy + 1; r++) {
    for (let c = cx - 1; c <= cx + 1; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (player.grid[r][c] !== null) {
          player.grid[r][c] = null;
          blocksDestroyed++;
        }
      }
    }
  }

  // Trigger grid shake
  player.isShaking = true;
  player.shakeTimeRemaining = 400;

  player.lastActionMessage = 'Bomb Explosion Triggered!';
  addGameMessage(player, `💣 Bomb detonated! Wiped out ${blocksDestroyed} blocks!`, 'danger');

  return { cx, cy };
};

// Apply CARD: Shuffle (scrambles cells horizontally in each occupied row)
export const applyShuffle = (player: PlayerState) => {
  const newGrid = player.grid.map((row) => {
    // Collect non-empty cells
    const blocks = row.filter((cell) => cell !== null);
    if (blocks.length === 0 || blocks.length === COLS) {
      return row; // leave empty or fully complete rows alone
    }

    // Create a new shuffled row with the same amount of blocks
    const shuffledRow = Array(COLS).fill(null);
    const indices = Array.from({ length: COLS }, (_, i) => i);
    
    // Simple modern shuffle for indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Place blocks in the shuffled index slots
    for (let k = 0; k < blocks.length; k++) {
      shuffledRow[indices[k]] = blocks[k];
    }

    return shuffledRow;
  });

  player.grid = newGrid;
  player.isShaking = true;
  player.shakeTimeRemaining = 250;

  player.lastActionMessage = 'Grid Row Shuffle!';
  addGameMessage(player, `🔀 Shuffle mixed up placed row layout!`, 'warning');
};

// Apply CARD: Slow Down
export const applySlowDown = (player: PlayerState) => {
  player.slowDownTimeRemaining = 12000; // 12 seconds of slow down
  player.lastActionMessage = 'Slow-Mo Activated!';
  addGameMessage(player, `⏳ Slow Down reduced dropping speed for 12s!`, 'info');
};

// Apply CARD: Clear Row (Vaporizes the bottom-most row)
export const applyClearRow = (player: PlayerState) => {
  // Check if bottom row is empty. If so, find the lowest row with blocks.
  let rowToClear = ROWS - 1;
  for (let r = ROWS - 1; r >= 0; r--) {
    const hasBlocks = player.grid[r].some((cell) => cell !== null);
    if (hasBlocks) {
      rowToClear = r;
      break;
    }
  }

  // Clear that row and shift everything above down
  const newGrid = player.grid.filter((_, idx) => idx !== rowToClear);
  newGrid.unshift(Array(COLS).fill(null)); // push empty row to top

  player.grid = newGrid;
  player.isShaking = true;
  player.shakeTimeRemaining = 200;

  player.lastActionMessage = 'Bottom Row Cleared!';
  addGameMessage(player, `🧹 Clear Row vaporized a solid block row!`, 'success');
};

// Add solid garbage lines with a random gap at the bottom
export const addGarbageLines = (player: PlayerState, count: number) => {
  if (count <= 0) return;

  const neonColors = ['#06b6d4', '#eab308', '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#f97316'];
  const garbageRows: (string | null)[][] = [];

  for (let i = 0; i < count; i++) {
    // Generate row with grey or dark blocks, leaving one slot empty
    const gapIndex = Math.floor(Math.random() * COLS);
    const row = Array(COLS)
      .fill(null)
      .map((_, idx) => (idx === gapIndex ? null : '#475569')); // Slate-600 grey for garbage blocks
    garbageRows.push(row);
  }

  // Check if top rows contain blocks that would overflow (causing game over)
  let willOverflow = false;
  for (let r = 0; r < count; r++) {
    const hasBlocks = player.grid[r].some((cell) => cell !== null);
    if (hasBlocks) {
      willOverflow = true;
      break;
    }
  }

  // Drop rows from top, append garbage to bottom
  const trimmedGrid = player.grid.slice(count);
  player.grid = [...trimmedGrid, ...garbageRows];

  // Force game over if garbage pushed blocks off screen
  if (willOverflow) {
    player.isGameOver = true;
    addGameMessage(player, `💀 Garbage lines overflowed your board! Game Over!`, 'danger');
  } else {
    player.isShaking = true;
    player.shakeTimeRemaining = 300;
    addGameMessage(player, `⚠️ Received ${count} garbage lines from opponent!`, 'danger');
  }
};

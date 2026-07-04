/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TetrominoType, Tetromino, UnoCardType, UnoCard } from './types';

export const COLS = 10;
export const ROWS = 20;

// Bright, high-contrast neon colors
export const TETROMINOES: Record<TetrominoType, Tetromino> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06b6d4', // Cyan
    type: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#eab308', // Yellow
    type: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a855f7', // Purple
    type: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#22c55e', // Green
    type: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#ef4444', // Red
    type: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#3b82f6', // Blue
    type: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f97316', // Orange
    type: 'L'
  }
};

export const UNO_CARDS: Record<UnoCardType, Omit<UnoCard, 'id'>> = {
  COLOUR_SWITCH: {
    type: 'COLOUR_SWITCH',
    title: 'Colour Switch',
    description: 'Scrambles colors of placed blocks on the target board!',
    color: 'wild'
  },
  BOMB: {
    type: 'BOMB',
    title: 'Bomb',
    description: 'Triggers a massive 3x3 explosion centered on the densest row.',
    color: 'red'
  },
  SLOW_DOWN: {
    type: 'SLOW_DOWN',
    title: 'Slow Down',
    description: 'Slows the falling speed to 25% on the target board for 12s.',
    color: 'blue'
  },
  CLEAR_ROW: {
    type: 'CLEAR_ROW',
    title: 'Clear Row',
    description: 'Instantly vaporizes the bottom row of blocks.',
    color: 'green'
  },
  SHUFFLE: {
    type: 'SHUFFLE',
    title: 'Shuffle',
    description: 'Shuffles placed blocks horizontally, introducing chaos or saves!',
    color: 'yellow'
  }
};

// Map card types to specific color themes for rendering
export const CARD_BG_COLORS = {
  red: 'from-[#EF4444] to-[#991B1B] text-white shadow-red-500/20',
  blue: 'from-[#3B82F6] to-[#1E40AF] text-white shadow-blue-500/20',
  green: 'from-[#22C55E] to-[#166534] text-white shadow-emerald-500/20',
  yellow: 'from-[#EAB308] to-[#854D0E] text-white shadow-yellow-500/20',
  wild: 'from-[#ef4444] via-[#3b82f6] via-[#22c55e] to-[#eab308] text-white shadow-pink-500/20'
};

// Keyboard controls help dictionary
export const CONTROLS_INFO = {
  p1: {
    move: 'A / D',
    rotate: 'W',
    softDrop: 'S',
    hardDrop: 'Space',
    hold: 'Shift (Left)',
    useSelf: 'Q',
    useOpponent: 'E'
  },
  p2: {
    move: '← / →',
    rotate: '↑',
    softDrop: '↓',
    hardDrop: 'Enter',
    hold: 'Control (Right) / 0',
    useSelf: 'K',
    useOpponent: 'L'
  }
};

export const INITIAL_SPEED = 800; // milliseconds per step
export const SLOW_DOWN_SPEED_MULTIPLIER = 4; // slow down by 4x (e.g. 800ms -> 3200ms)

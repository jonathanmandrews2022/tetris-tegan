/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface Tetromino {
  shape: number[][];
  color: string;
  type: TetrominoType;
}

export type UnoCardType = 'COLOUR_SWITCH' | 'BOMB' | 'SLOW_DOWN' | 'CLEAR_ROW' | 'SHUFFLE';

export interface UnoCard {
  id: string;
  type: UnoCardType;
  title: string;
  description: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'wild';
}

export interface PlayerEffect {
  type: 'SLOW_DOWN' | 'SHAKE' | 'FLASH';
  durationRemaining: number; // in milliseconds
  startTime: number;
}

export interface GridCell {
  color: string | null;
  isLocked: boolean;
  isFlashing?: boolean;
}

export interface GameMessage {
  id: string;
  text: string;
  type: 'success' | 'danger' | 'info' | 'warning';
  timestamp: number;
}

export interface PlayerState {
  id: 'p1' | 'p2';
  name: string;
  grid: (string | null)[][]; // 10 columns x 20 rows
  score: number;
  linesCleared: number;
  level: number;
  currentPiece: {
    shape: number[][];
    x: number;
    y: number;
    color: string;
    type: TetrominoType;
  } | null;
  nextPiece: Tetromino;
  holdPiece: Tetromino | null;
  hasHeldThisTurn: boolean;
  hand: UnoCard[];
  isGameOver: boolean;
  slowDownTimeRemaining: number; // in milliseconds
  isShaking: boolean;
  shakeTimeRemaining: number;
  flashRows: number[]; // rows currently undergoing clear flash animation
  lastActionMessage: string;
  messages: GameMessage[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  lines: number;
  mode: 'Solo' | 'Versus';
  date: string;
}

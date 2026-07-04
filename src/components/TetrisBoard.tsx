/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COLS, ROWS } from '../constants';
import { PlayerState, Tetromino } from '../types';

interface TetrisBoardProps {
  player: PlayerState;
  showGhost?: boolean;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({ player, showGhost = true }) => {
  const { grid, currentPiece, flashRows, isGameOver, slowDownTimeRemaining, isShaking } = player;

  // Calculate where the piece would land (ghost piece)
  const getGhostY = () => {
    if (!currentPiece) return 0;
    let ghostY = currentPiece.y;
    while (isValidMove(currentPiece.shape, currentPiece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  };

  // Check if a move is valid
  const isValidMove = (shape: number[][], posX: number, posY: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nextX = posX + c;
          const nextY = posY + r;

          // Out of bounds horizontally or bottom
          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return false;
          }

          // Collides with existing locked block (ignore negative y bounds for spawns)
          if (nextY >= 0 && grid[nextY][nextX] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const ghostY = getGhostY();

  // Helper to check if a specific grid cell should render the active piece
  const getActivePieceCellColor = (r: number, c: number): string | null => {
    if (!currentPiece) return null;
    const { shape, x, y, color } = currentPiece;
    const shapeRow = r - y;
    const shapeCol = c - x;

    if (
      shapeRow >= 0 &&
      shapeRow < shape.length &&
      shapeCol >= 0 &&
      shapeCol < shape[shapeRow].length
    ) {
      if (shape[shapeRow][shapeCol]) {
        return color;
      }
    }
    return null;
  };

  // Helper to check if a specific grid cell should render the ghost piece
  const isGhostCell = (r: number, c: number): boolean => {
    if (!currentPiece || !showGhost) return false;
    const { shape, x } = currentPiece;
    const shapeRow = r - ghostY;
    const shapeCol = c - x;

    if (
      shapeRow >= 0 &&
      shapeRow < shape.length &&
      shapeCol >= 0 &&
      shapeCol < shape[shapeRow].length
    ) {
      // Don't draw ghost on top of the actual falling piece
      if (shape[shapeRow][shapeCol] && getActivePieceCellColor(r, c) === null) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-[280px] sm:max-w-[320px]">
      {/* Slow down overlay effect */}
      <AnimatePresence>
        {slowDownTimeRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-2 bg-blue-500 rounded-2xl blur-md pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Main Grid Wrapper */}
      <motion.div
        animate={isShaking ? {
          x: [-6, 6, -5, 5, -3, 3, 0],
          y: [-2, 2, -1, 1, 0]
        } : {}}
        transition={{ duration: 0.4 }}
        className={`relative z-10 w-full aspect-[1/2] bg-white/[0.03] border-2 rounded-lg p-1.5 flex flex-col justify-between transition-all duration-300 ${
          slowDownTimeRemaining > 0
            ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-500/[0.01]'
            : isGameOver
            ? 'border-red-950 shadow-[0_0_15px_rgba(239,68,68,0.05)] grayscale bg-white/[0.01]'
            : 'border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Render 20 Rows */}
        <div className="grid gap-[2px] h-full" style={{ gridTemplateRows: 'repeat(20, minmax(0, 1fr))' }}>
          {Array.from({ length: ROWS }).map((_, r) => {
            const isRowFlashing = flashRows.includes(r);

            return (
              <div key={r} className="grid grid-cols-10 gap-[2px] h-full">
                {Array.from({ length: COLS }).map((_, c) => {
                  const lockedColor = grid[r][c];
                  const activeColor = getActivePieceCellColor(r, c);
                  const isGhost = isGhostCell(r, c);

                  let cellColor = lockedColor || activeColor;
                  let style = {};
                  let blockExtraClass = '';

                  if (cellColor) {
                    // Match "Sophisticated Dark" block specifications
                    switch (cellColor) {
                      case '#ef4444': // Red / Z
                        style = { background: 'linear-gradient(135deg, #EF4444, #991B1B)' };
                        blockExtraClass = 'border border-[#F87171] shadow-[0_0_8px_rgba(239,68,68,0.45)]';
                        break;
                      case '#3b82f6': // Blue / J
                        style = { background: 'linear-gradient(135deg, #3B82F6, #1E40AF)' };
                        blockExtraClass = 'border border-[#60A5FA] shadow-[0_0_8px_rgba(59,130,246,0.45)]';
                        break;
                      case '#eab308': // Yellow / O
                        style = { background: 'linear-gradient(135deg, #EAB308, #854D0E)' };
                        blockExtraClass = 'border border-[#FACC15] shadow-[0_0_8px_rgba(234,179,8,0.45)]';
                        break;
                      case '#22c55e': // Green / S
                        style = { background: 'linear-gradient(135deg, #22C55E, #166534)' };
                        blockExtraClass = 'border border-[#4ADE80] shadow-[0_0_8px_rgba(34,197,94,0.45)]';
                        break;
                      case '#06b6d4': // Cyan / I
                        style = { background: 'linear-gradient(135deg, #06B6D4, #0891B2)' };
                        blockExtraClass = 'border border-[#22D3EE] shadow-[0_0_8px_rgba(6,182,212,0.45)]';
                        break;
                      case '#a855f7': // Purple / T
                        style = { background: 'linear-gradient(135deg, #A855F7, #7E22CE)' };
                        blockExtraClass = 'border border-[#C084FC] shadow-[0_0_8px_rgba(168,85,247,0.45)]';
                        break;
                      case '#f97316': // Orange / L
                        style = { background: 'linear-gradient(135deg, #F97316, #C2410C)' };
                        blockExtraClass = 'border border-[#FB923C] shadow-[0_0_8px_rgba(249,115,22,0.45)]';
                        break;
                      default:
                        style = { background: `linear-gradient(135deg, ${cellColor}, #1e1e1f)` };
                        blockExtraClass = 'border border-white/20';
                        break;
                    }
                  }

                  return (
                    <div
                      key={c}
                      className={`relative aspect-square rounded-[2px] transition-all duration-75 flex items-center justify-center ${
                        isRowFlashing
                          ? 'bg-white shadow-[0_0_12px_#ffffff] scale-95 z-20'
                          : !cellColor && !isGhost
                          ? 'bg-white/[0.02] border-[1px] border-white/[0.04]'
                          : blockExtraClass
                      }`}
                      style={style}
                    >
                      {/* Ghost cell rendering */}
                      {isGhost && currentPiece && (
                        <div
                          className="absolute inset-0 border-2 rounded-[2px]"
                          style={{
                            borderColor: currentPiece.color,
                            opacity: 0.5,
                            boxShadow: `inset 0 0 4px ${currentPiece.color}`
                          }}
                        />
                      )}

                      {/* Small visual accent for locked blocks */}
                      {lockedColor && !isRowFlashing && (
                        <div className="absolute top-[3px] left-[3px] w-[3px] h-[3px] rounded-full bg-white/25 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Game Over Screen Overlay */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 rounded-lg flex flex-col items-center justify-center p-4 text-center z-30"
            >
              <span className="text-rose-500 font-extrabold text-2xl tracking-widest uppercase mb-1 drop-shadow-md">
                GAME OVER
              </span>
              <span className="text-slate-400 text-xs mb-4">
                No legal moves remaining
              </span>
              <div className="bg-white/[0.02] rounded-lg p-3 border border-white/10 w-full max-w-[200px]">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Score:</span>
                  <span className="font-bold text-white">{player.score}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Rows:</span>
                  <span className="font-bold text-white">{player.linesCleared}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slow down activation visual state icon overlay */}
        {slowDownTimeRemaining > 0 && (
          <div className="absolute top-3 right-3 bg-blue-500/80 border border-blue-400 text-white font-mono px-2 py-0.5 rounded-md text-[10px] animate-pulse flex items-center gap-1 z-20 shadow-md">
            <span>Slow-Mo</span>
            <span className="font-bold">{(slowDownTimeRemaining / 1000).toFixed(1)}s</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

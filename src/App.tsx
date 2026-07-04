/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Gauge,
  Crown,
  Pause,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Cpu,
  RotateCw,
  ChevronsDown
} from 'lucide-react';

import { PlayerState, LeaderboardEntry, TetrominoType } from './types';
import { COLS, ROWS, TETROMINOES, SLOW_DOWN_SPEED_MULTIPLIER, INITIAL_SPEED } from './constants';
import { TetrisBoard } from './components/TetrisBoard';
import { UnoCard } from './components/UnoCard';
import { Leaderboard } from './components/Leaderboard';
import { Instructions } from './components/Instructions';
import {
  PieceBag,
  createEmptyGrid,
  createInitialPlayer,
  checkCollision,
  addGameMessage,
  applyColourSwitch,
  applyBomb,
  applySlowDown,
  applyClearRow,
  applyShuffle,
  addGarbageLines
} from './utils/gameLogic';
import { audio } from './utils/audio';
import {
  createLobby,
  findQuickMatch,
  joinLobby,
  listenToLobby,
  setPlayerReady,
  startMultiplayerGame,
  updatePlayerStateInLobby,
  queueSpellOnOpponent,
  clearPendingSpells,
  setGameOverInLobby,
  leaveLobby
} from './utils/onlineDb';

type GameState = 'MENU' | 'GAME_SOLO' | 'GAME_VERSUS' | 'GAME_AI' | 'GAME_ONLINE' | 'LEADERBOARD' | 'INSTRUCTIONS';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // References for generating bags of randomized fair pieces
  const pBag = useRef<PieceBag>(new PieceBag());

  // Player States
  const [p1, setP1] = useState<PlayerState>(() => createInitialPlayer('p1', 'PLAYER 1', pBag.current));
  const [p2, setP2] = useState<PlayerState>(() => createInitialPlayer('p2', 'PLAYER 2', pBag.current));

  // State to check if a new high score was registered during Solo mode
  const [showScoreSubmit, setShowScoreSubmit] = useState(false);

  // Quit Confirmation States
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [wasPausedBeforeQuit, setWasPausedBeforeQuit] = useState(false);

  // AI Target tracking for Solo vs AI mode
  const aiTargetRef = useRef<{
    pieceType: TetrominoType;
    spawnY: number;
    targetX: number;
    rotationsNeeded: number;
  } | null>(null);

  // Online Multiplayer States
  const [onlineRole, setOnlineRole] = useState<'p1' | 'p2' | null>(null);
  const [onlineLobbyId, setOnlineLobbyId] = useState<string | null>(null);
  const [onlineLobbyData, setOnlineLobbyData] = useState<any | null>(null);
  const [onlineNickname, setOnlineNickname] = useState<string>(() => {
    const saved = localStorage.getItem('uno_tetris_nickname');
    if (saved) return saved;
    const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
    return `Challenger_${randomSuffix}`;
  });
  const [localUserId] = useState<string>(() => {
    const saved = localStorage.getItem('uno_tetris_user_id');
    if (saved) return saved;
    const newId = 'usr_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('uno_tetris_user_id', newId);
    return newId;
  });
  const [isSearching, setIsSearching] = useState(false);
  const [lobbyCodeInput, setLobbyCodeInput] = useState('');
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);

  // Toggle Mute handler
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    audio.isMuted = !isMuted;
  };

  // Virtual controls for touch & mouse users
  const renderVirtualControls = (playerId: 'p1' | 'p2') => {
    return (
      <div className="w-full max-w-[320px] bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex flex-col gap-2 mt-2">
        {/* Row 1: Hold, Rotate, Hard Drop */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleHold(playerId)}
            className="py-2 px-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 active:scale-95 transition-all text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
            title="Hold current piece"
          >
            <span className="text-[9px] text-zinc-400">HOLD</span>
            <span className="text-zinc-500 font-normal leading-none text-[8px]">Shift</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleRotate(playerId)}
            className="py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 active:bg-indigo-500/25 border border-indigo-500/20 active:scale-95 transition-all text-indigo-300 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
            title="Rotate piece"
          >
            <RotateCw size={12} className="text-indigo-400" />
            <span className="text-[8px] text-indigo-400/70">ROTATE</span>
          </button>

          <button
            type="button"
            onClick={() => handleHardDrop(playerId)}
            className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/25 border border-amber-500/20 active:scale-95 transition-all text-amber-300 rounded-xl text-[9px] font-black font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
            title="Hard Drop piece"
          >
            <ChevronsDown size={12} className="text-amber-400 animate-bounce" />
            <span className="text-[8px] text-amber-400/70 font-black">DROP</span>
          </button>
        </div>

        {/* Row 2: Directional Controls */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleMoveLeft(playerId)}
            className="py-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 active:scale-95 transition-all text-white rounded-xl flex items-center justify-center cursor-pointer select-none"
            title="Move left"
          >
            <ArrowLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleSoftDrop(playerId)}
            className="py-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 active:scale-95 transition-all text-white rounded-xl flex flex-col items-center justify-center cursor-pointer select-none"
            title="Soft drop"
          >
            <ArrowDown size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleMoveRight(playerId)}
            className="py-3.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 active:scale-95 transition-all text-white rounded-xl flex items-center justify-center cursor-pointer select-none"
            title="Move right"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Reset/Start solo game
  const startSoloGame = () => {
    pBag.current = new PieceBag();
    const activeBag = pBag.current;

    const initialP1 = createInitialPlayer('p1', 'PLAYER 1', activeBag);
    
    // Assign first piece
    const firstPiece = activeBag.getNext();
    const spawnX = Math.floor((COLS - firstPiece.shape[0].length) / 2);
    
    initialP1.currentPiece = {
      shape: firstPiece.shape,
      x: spawnX,
      y: 0,
      color: firstPiece.color,
      type: firstPiece.type
    };

    setP1(initialP1);
    setIsPaused(false);
    setShowScoreSubmit(false);
    setGameState('GAME_SOLO');
    addGameMessage(initialP1, '🎮 Solo game started! Clear rows to draw Uno Cards!', 'info');
  };

  // Reset/Start 1v1 Local Versus game
  const startVersusGame = () => {
    pBag.current = new PieceBag();
    const activeBag = pBag.current;

    // Build fresh players
    const initialP1 = createInitialPlayer('p1', 'PLAYER 1', activeBag);
    const initialP2 = createInitialPlayer('p2', 'PLAYER 2', activeBag);

    // Spawn first pieces
    const f1 = activeBag.getNext();
    const f1X = Math.floor((COLS - f1.shape[0].length) / 2);
    initialP1.currentPiece = {
      shape: f1.shape,
      x: f1X,
      y: 0,
      color: f1.color,
      type: f1.type
    };

    const f2 = activeBag.getNext();
    const f2X = Math.floor((COLS - f2.shape[0].length) / 2);
    initialP2.currentPiece = {
      shape: f2.shape,
      x: f2X,
      y: 0,
      color: f2.color,
      type: f2.type
    };

    setP1(initialP1);
    setP2(initialP2);
    setIsPaused(false);
    setGameState('GAME_VERSUS');
    addGameMessage(initialP1, '⚔️ Versus Battle started! Clear lines to attack each other!', 'info');
    addGameMessage(initialP2, '⚔️ Versus Battle started! Clear lines to attack each other!', 'info');
  };

  // Reset/Start Solo vs AI game
  const startAiGame = () => {
    pBag.current = new PieceBag();
    const activeBag = pBag.current;

    // Build fresh players
    const initialP1 = createInitialPlayer('p1', 'PLAYER 1', activeBag);
    const initialP2 = createInitialPlayer('p2', 'AI CHALLENGER', activeBag);

    // Spawn first pieces
    const f1 = activeBag.getNext();
    const f1X = Math.floor((COLS - f1.shape[0].length) / 2);
    initialP1.currentPiece = {
      shape: f1.shape,
      x: f1X,
      y: 0,
      color: f1.color,
      type: f1.type
    };

    const f2 = activeBag.getNext();
    const f2X = Math.floor((COLS - f2.shape[0].length) / 2);
    initialP2.currentPiece = {
      shape: f2.shape,
      x: f2X,
      y: 0,
      color: f2.color,
      type: f2.type
    };

    setP1(initialP1);
    setP2(initialP2);
    setIsPaused(false);
    if (aiTargetRef.current) aiTargetRef.current = null;
    setGameState('GAME_AI');
    addGameMessage(initialP1, '🤖 AI Battle started! Face the AI Challenger in direct combat!', 'info');
    addGameMessage(initialP2, '🤖 AI Battle started! Face the AI Challenger in direct combat!', 'info');
  };

  // Resolve row clears, update level, handle Uno draws & versus garbage attacks
  const resolveRowClears = (playerId: 'p1' | 'p2', rowsToClear: number[]) => {
    audio.playLineClear();
    const isP1 = playerId === 'p1';
    const setPlayer = isP1 ? setP1 : setP2;
    const setOpponent = isP1 ? setP2 : setP1;

    setPlayer(prev => {
      // Shift cleared rows
      const cleanGrid = prev.grid.filter((_, idx) => !rowsToClear.includes(idx));
      const emptyCount = rowsToClear.length;
      for (let i = 0; i < emptyCount; i++) {
        cleanGrid.unshift(Array(COLS).fill(null));
      }

      // Calculations
      const scoreAdditions = [0, 100, 300, 500, 800];
      const basePoints = scoreAdditions[Math.min(4, emptyCount)] || 100;
      const pointsAdded = basePoints * prev.level;
      const nextScore = prev.score + pointsAdded;
      const nextLines = prev.linesCleared + emptyCount;
      const nextLevel = Math.floor(nextLines / 10) + 1;

      // Uno Action Card Draw logic (max 3 cards)
      const updatedHand = [...prev.hand];
      let msgDrawn = '';
      if (updatedHand.length < 3) {
        const drawnCard = {
          id: Math.random().toString(36).substring(2, 9),
          type: ['COLOUR_SWITCH', 'BOMB', 'SLOW_DOWN', 'CLEAR_ROW', 'SHUFFLE'][Math.floor(Math.random() * 5)] as any,
          title: '',
          description: '',
          color: 'wild' as any
        };

        // Populate card info
        if (drawnCard.type === 'COLOUR_SWITCH') {
          drawnCard.title = 'Colour Switch';
          drawnCard.description = 'Scrambles cell colors of placed blocks!';
          drawnCard.color = 'wild';
        } else if (drawnCard.type === 'BOMB') {
          drawnCard.title = 'Bomb';
          drawnCard.description = 'Detonates a 3x3 explosion on the highest stack.';
          drawnCard.color = 'red';
        } else if (drawnCard.type === 'SLOW_DOWN') {
          drawnCard.title = 'Slow Down';
          drawnCard.description = 'Cuts falling block speed to 25% for 12 seconds.';
          drawnCard.color = 'blue';
        } else if (drawnCard.type === 'CLEAR_ROW') {
          drawnCard.title = 'Clear Row';
          drawnCard.description = 'Instantly clears the bottom block row.';
          drawnCard.color = 'green';
        } else if (drawnCard.type === 'SHUFFLE') {
          drawnCard.title = 'Shuffle';
          drawnCard.description = 'Shuffles placed row blocks horizontally.';
          drawnCard.color = 'yellow';
        }

        updatedHand.push(drawnCard);
        audio.playDrawCard();
        msgDrawn = `Drew: ${drawnCard.title}!`;
      } else {
        msgDrawn = 'Hand full (max 3 cards).';
      }

      // Spawn next tetromino
      const nextPieceFromBag = pBag.current.getNext();
      const spawnX = Math.floor((COLS - nextPieceFromBag.shape[0].length) / 2);
      const isSpawnBlocked = checkCollision(nextPieceFromBag.shape, cleanGrid, spawnX, 0);

      const nextState: PlayerState = {
        ...prev,
        grid: cleanGrid,
        flashRows: [],
        score: nextScore,
        linesCleared: nextLines,
        level: nextLevel,
        hand: updatedHand,
        hasHeldThisTurn: false,
        currentPiece: isSpawnBlocked ? null : {
          shape: nextPieceFromBag.shape,
          x: spawnX,
          y: 0,
          color: nextPieceFromBag.color,
          type: nextPieceFromBag.type
        },
        nextPiece: pBag.current.getNext(),
        isGameOver: isSpawnBlocked ? true : prev.isGameOver
      };

      if (isSpawnBlocked) {
        audio.playGameOver();
        addGameMessage(nextState, `💀 Spawn locked! Game Over!`, 'danger');
      } else {
        addGameMessage(nextState, `🎉 Completed ${emptyCount} Row${emptyCount > 1 ? 's' : ''}! +${pointsAdded} pts!`, 'success');
        if (msgDrawn) addGameMessage(nextState, `🃏 ${msgDrawn}`, 'info');
      }

      // Send Garbage Lines to Opponent in Versus Mode
      if (gameState === 'GAME_VERSUS' || gameState === 'GAME_AI') {
        let linesToSend = 0;
        if (emptyCount === 2) linesToSend = 1;
        else if (emptyCount === 3) linesToSend = 2;
        else if (emptyCount === 4) linesToSend = 4; // Tetris blast!

        if (linesToSend > 0) {
          setOpponent(opp => {
            if (opp.isGameOver) return opp;
            const updatedOpp = { ...opp };
            addGarbageLines(updatedOpp, linesToSend);
            return updatedOpp;
          });
        }
      } else if (gameState === 'GAME_ONLINE' && onlineLobbyId && onlineRole) {
        let linesToSend = 0;
        if (emptyCount === 2) linesToSend = 1;
        else if (emptyCount === 3) linesToSend = 2;
        else if (emptyCount === 4) linesToSend = 4; // Tetris blast!

        if (linesToSend > 0) {
          const opponentRole = onlineRole === 'p1' ? 'p2' : 'p1';
          queueSpellOnOpponent(onlineLobbyId, opponentRole, {
            id: Math.random().toString(36).substring(2, 9),
            type: 'GARBAGE',
            title: `Garbage Attack (${linesToSend} Lines)`,
            color: 'red',
            count: linesToSend
          } as any);
        }
      }

      return nextState;
    });
  };

  // Lock tetromino block sequence
  const lockPiece = (player: PlayerState): PlayerState => {
    if (!player.currentPiece) return player;
    const { shape, x, y, color } = player.currentPiece;
    const newGrid = player.grid.map(row => [...row]);

    // Burn piece into grid canvas
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gridY = y + r;
          const gridX = x + c;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            newGrid[gridY][gridX] = color;
          }
        }
      }
    }

    audio.playLock();

    // Check full rows
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    const nextPieceFromBag = pBag.current.getNext();

    if (fullRows.length > 0) {
      // Row flash animation triggered
      setTimeout(() => {
        resolveRowClears(player.id, fullRows);
      }, 200);

      return {
        ...player,
        grid: newGrid,
        flashRows: fullRows,
        currentPiece: null // Hide piece during flashing delay
      };
    } else {
      // Direct spawn
      const spawnX = Math.floor((COLS - nextPieceFromBag.shape[0].length) / 2);
      const isSpawnBlocked = checkCollision(nextPieceFromBag.shape, newGrid, spawnX, 0);

      if (isSpawnBlocked) {
        audio.playGameOver();
      }

      return {
        ...player,
        grid: newGrid,
        hasHeldThisTurn: false,
        currentPiece: isSpawnBlocked ? null : {
          shape: nextPieceFromBag.shape,
          x: spawnX,
          y: 0,
          color: nextPieceFromBag.color,
          type: nextPieceFromBag.type
        },
        nextPiece: pBag.current.getNext(),
        isGameOver: isSpawnBlocked ? true : player.isGameOver
      };
    }
  };

  // Player controls
  const handleMoveLeft = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused) return prev;
      const nextX = prev.currentPiece.x - 1;
      if (!checkCollision(prev.currentPiece.shape, prev.grid, nextX, prev.currentPiece.y)) {
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, x: nextX }
        };
      }
      return prev;
    });
  };

  const handleMoveRight = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused) return prev;
      const nextX = prev.currentPiece.x + 1;
      if (!checkCollision(prev.currentPiece.shape, prev.grid, nextX, prev.currentPiece.y)) {
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, x: nextX }
        };
      }
      return prev;
    });
  };

  const handleRotate = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused) return prev;

      const shape = prev.currentPiece.shape;
      const n = shape.length;
      
      // Rotate 90 degrees clockwise
      const rotated = Array.from({ length: n }, () => Array(n).fill(0));
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          rotated[c][n - 1 - r] = shape[r][c];
        }
      }

      // Try offset positions (Wall Kick: 0, +1, -1, +2, -2)
      const kicks = [0, 1, -1, 2, -2];
      for (const offset of kicks) {
        const nextX = prev.currentPiece.x + offset;
        if (!checkCollision(rotated, prev.grid, nextX, prev.currentPiece.y)) {
          return {
            ...prev,
            currentPiece: {
              ...prev.currentPiece,
              shape: rotated,
              x: nextX
            }
          };
        }
      }

      return prev;
    });
  };

  const handleSoftDrop = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused) return prev;
      const nextY = prev.currentPiece.y + 1;
      if (!checkCollision(prev.currentPiece.shape, prev.grid, prev.currentPiece.x, nextY)) {
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, y: nextY },
          score: prev.score + 1
        };
      }
      return prev;
    });
  };

  const handleHardDrop = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused) return prev;

      let targetY = prev.currentPiece.y;
      while (!checkCollision(prev.currentPiece.shape, prev.grid, prev.currentPiece.x, targetY + 1)) {
        targetY++;
      }

      const dropDistance = targetY - prev.currentPiece.y;
      const updatedState = {
        ...prev,
        score: prev.score + (dropDistance * 2),
        currentPiece: {
          ...prev.currentPiece,
          y: targetY
        }
      };

      return lockPiece(updatedState);
    });
  };

  const handleHold = (playerId: 'p1' | 'p2') => {
    const setPlayer = playerId === 'p1' ? setP1 : setP2;
    setPlayer(prev => {
      if (!prev.currentPiece || prev.isGameOver || isPaused || prev.hasHeldThisTurn) return prev;

      const currentHeld = prev.holdPiece;
      const nextPieceFromBag = pBag.current.getNext();

      if (!currentHeld) {
        // Hold slot was empty
        const spawnX = Math.floor((COLS - nextPieceFromBag.shape[0].length) / 2);
        return {
          ...prev,
          holdPiece: {
            shape: TETROMINOES[prev.currentPiece.type].shape,
            color: TETROMINOES[prev.currentPiece.type].color,
            type: prev.currentPiece.type
          },
          hasHeldThisTurn: true,
          currentPiece: {
            shape: nextPieceFromBag.shape,
            x: spawnX,
            y: 0,
            color: nextPieceFromBag.color,
            type: nextPieceFromBag.type
          },
          nextPiece: pBag.current.getNext()
        };
      } else {
        // Swap existing held piece
        const spawnX = Math.floor((COLS - currentHeld.shape[0].length) / 2);
        return {
          ...prev,
          holdPiece: {
            shape: TETROMINOES[prev.currentPiece.type].shape,
            color: TETROMINOES[prev.currentPiece.type].color,
            type: prev.currentPiece.type
          },
          hasHeldThisTurn: true,
          currentPiece: {
            shape: currentHeld.shape,
            x: spawnX,
            y: 0,
            color: currentHeld.color,
            type: currentHeld.type
          }
        };
      }
    });
  };

  // Use card effect
  const handleUseCard = (playerId: 'p1' | 'p2', index: number, targetId: 'p1' | 'p2') => {
    const user = playerId === 'p1' ? p1 : p2;
    if (user.hand.length <= index || isPaused) return;

    const card = user.hand[index];
    audio.playPowerUp();

    // 1. Remove card from sender's hand
    const setSender = playerId === 'p1' ? setP1 : setP2;
    setSender(prev => ({
      ...prev,
      hand: prev.hand.filter((_, idx) => idx !== index)
    }));

    if (gameState === 'GAME_ONLINE' && onlineLobbyId && onlineRole) {
      if (targetId === onlineRole) {
        // Apply card on self locally
        setSender(prev => {
          const updated = { ...prev };
          if (card.type === 'COLOUR_SWITCH') {
            applyColourSwitch(updated);
          } else if (card.type === 'BOMB') {
            applyBomb(updated);
            audio.playBomb();
          } else if (card.type === 'SLOW_DOWN') {
            applySlowDown(updated);
          } else if (card.type === 'CLEAR_ROW') {
            applyClearRow(updated);
          } else if (card.type === 'SHUFFLE') {
            applyShuffle(updated);
          }
          addGameMessage(updated, `🃏 Used [${card.title}] on yourself!`, 'info');
          return updated;
        });
      } else {
        // Apply card on opponent -> Queue spell on Firestore
        queueSpellOnOpponent(onlineLobbyId, targetId, {
          id: Math.random().toString(36).substring(2, 9),
          type: card.type,
          title: card.title,
          color: card.color
        });
        setSender(prev => {
          const updated = { ...prev };
          addGameMessage(updated, `⚡ Cast [${card.title}] on opponent!`, 'warning');
          return updated;
        });
      }
      return;
    }

    // 2. Apply on receiver (local games)
    const setReceiver = targetId === 'p1' ? setP1 : setP2;
    setReceiver(prev => {
      const updated = { ...prev };
      if (card.type === 'COLOUR_SWITCH') {
        applyColourSwitch(updated);
      } else if (card.type === 'BOMB') {
        applyBomb(updated);
        audio.playBomb();
      } else if (card.type === 'SLOW_DOWN') {
        applySlowDown(updated);
      } else if (card.type === 'CLEAR_ROW') {
        applyClearRow(updated);
      } else if (card.type === 'SHUFFLE') {
        applyShuffle(updated);
      }
      return updated;
    });

    // 3. Log messages
    const senderLabel = playerId === 'p1' ? p1.name : p2.name;
    const receiverLabel = targetId === 'p1' ? p1.name : p2.name;
    const targetLabel = playerId === targetId ? 'themselves' : receiverLabel;

    if (gameState === 'GAME_VERSUS' || gameState === 'GAME_AI') {
      const announcement = `📢 ${senderLabel} used [${card.title}] on ${targetLabel}!`;
      setP1(p => {
        const u = { ...p };
        addGameMessage(u, announcement, 'warning');
        return u;
      });
      setP2(p => {
        const u = { ...p };
        addGameMessage(u, announcement, 'warning');
        return u;
      });
    } else {
      setP1(p => {
        const u = { ...p };
        addGameMessage(u, `🃏 Used [${card.title}]!`, 'info');
        return u;
      });
    }
  };

   // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'GAME_SOLO' && gameState !== 'GAME_VERSUS' && gameState !== 'GAME_AI' && gameState !== 'GAME_ONLINE') return;
      if (isPaused) return;

      const key = e.key.toLowerCase();
      const code = e.code;

      // Prevent window scroll/scars for standard controls
      const activeKeys = [
        'space', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'a', 's', 'd', 'w', 'q', 'e', 'k', 'l', 'shiftleft', 'shiftright'
      ];
      if (activeKeys.includes(key) || activeKeys.includes(code.toLowerCase())) {
        e.preventDefault();
      }

      // If playing online, route inputs to the active role
      if (gameState === 'GAME_ONLINE') {
        if (!onlineRole) return;
        const myPlayer = onlineRole === 'p1' ? p1 : p2;
        if (myPlayer.isGameOver) return;

        // Allow BOTH WASD and Arrow key layouts for player comfort
        if (key === 'a' || key === 'arrowleft') handleMoveLeft(onlineRole);
        else if (key === 'd' || key === 'arrowright') handleMoveRight(onlineRole);
        else if (key === 's' || key === 'arrowdown') handleSoftDrop(onlineRole);
        else if (key === 'w' || key === 'arrowup') handleRotate(onlineRole);
        else if (code === 'Space' || key === 'enter') handleHardDrop(onlineRole);
        else if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'c') handleHold(onlineRole);
        else if (key === 'q' || key === 'k') {
          handleUseCard(onlineRole, 0, onlineRole); // Self
        } else if (key === 'e' || key === 'l') {
          const opponentRole = onlineRole === 'p1' ? 'p2' : 'p1';
          handleUseCard(onlineRole, 0, opponentRole); // Opponent
        }
        return;
      }

      // ----------------- PLAYER 1 (Solo controls or Versus Left) -----------------
      if (!p1.isGameOver) {
        if (key === 'a') handleMoveLeft('p1');
        else if (key === 'd') handleMoveRight('p1');
        else if (key === 's') handleSoftDrop('p1');
        else if (key === 'w') handleRotate('p1');
        else if (code === 'Space') handleHardDrop('p1');
        else if (code === 'ShiftLeft') handleHold('p1');
        else if (key === 'q') {
          // Play card on Self
          handleUseCard('p1', 0, 'p1');
        } else if (key === 'e') {
          // Play card on Opponent (In Solo, loops to self)
          handleUseCard('p1', 0, (gameState === 'GAME_VERSUS' || gameState === 'GAME_AI') ? 'p2' : 'p1');
        }
      }

      // ----------------- PLAYER 2 (Versus right only) -----------------
      if (gameState === 'GAME_VERSUS' && !p2.isGameOver) {
        if (key === 'arrowleft') handleMoveLeft('p2');
        else if (key === 'arrowright') handleMoveRight('p2');
        else if (key === 'arrowdown') handleSoftDrop('p2');
        else if (key === 'arrowup') handleRotate('p2');
        else if (key === 'enter') handleHardDrop('p2');
        else if (code === 'ShiftRight' || key === '0' || key === 'c') handleHold('p2');
        else if (key === 'k') {
          handleUseCard('p2', 0, 'p2');
        } else if (key === 'l') {
          handleUseCard('p2', 0, 'p1');
        }
      }

      // Alternate solo controls (allows arrow keys for single player comfort)
      if ((gameState === 'GAME_SOLO' || gameState === 'GAME_AI') && !p1.isGameOver) {
        if (key === 'arrowleft') handleMoveLeft('p1');
        else if (key === 'arrowright') handleMoveRight('p1');
        else if (key === 'arrowdown') handleSoftDrop('p1');
        else if (key === 'arrowup') handleRotate('p1');
        else if (key === 'enter') handleHardDrop('p1');
        else if (key === 'c') handleHold('p1');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, isPaused, p1, p2]);

  // Player 1 Tick Clock Timer Loop
  useEffect(() => {
    if (gameState !== 'GAME_SOLO' && gameState !== 'GAME_VERSUS' && gameState !== 'GAME_AI' && (gameState !== 'GAME_ONLINE' || onlineRole !== 'p1' || onlineLobbyData?.status !== 'playing')) return;
    if (isPaused) return;
    if (p1.isGameOver) return;
    if (p1.flashRows.length > 0) return; // Delay tick during full row clearances

    const levelSpeed = Math.max(150, INITIAL_SPEED - (p1.level * 50));
    const finalSpeed = levelSpeed * (p1.slowDownTimeRemaining > 0 ? SLOW_DOWN_SPEED_MULTIPLIER : 1);

    const timer = setInterval(() => {
      setP1(prev => {
        if (!prev.currentPiece || prev.isGameOver || prev.flashRows.length > 0) return prev;
        const nextY = prev.currentPiece.y + 1;
        if (!checkCollision(prev.currentPiece.shape, prev.grid, prev.currentPiece.x, nextY)) {
          return {
            ...prev,
            currentPiece: { ...prev.currentPiece, y: nextY }
          };
        } else {
          return lockPiece(prev);
        }
      });
    }, finalSpeed);

    return () => clearInterval(timer);
  }, [gameState, isPaused, p1.isGameOver, p1.level, p1.slowDownTimeRemaining, p1.flashRows, onlineRole, onlineLobbyData?.status]);

  // Player 2 Tick Clock Timer Loop (Versus mode only)
  useEffect(() => {
    if (gameState !== 'GAME_VERSUS' && gameState !== 'GAME_AI' && (gameState !== 'GAME_ONLINE' || onlineRole !== 'p2' || onlineLobbyData?.status !== 'playing')) return;
    if (isPaused) return;
    if (p2.isGameOver) return;
    if (p2.flashRows.length > 0) return;

    const levelSpeed = Math.max(150, INITIAL_SPEED - (p2.level * 50));
    const finalSpeed = levelSpeed * (p2.slowDownTimeRemaining > 0 ? SLOW_DOWN_SPEED_MULTIPLIER : 1);

    const timer = setInterval(() => {
      setP2(prev => {
        if (!prev.currentPiece || prev.isGameOver || prev.flashRows.length > 0) return prev;
        const nextY = prev.currentPiece.y + 1;
        if (!checkCollision(prev.currentPiece.shape, prev.grid, prev.currentPiece.x, nextY)) {
          return {
            ...prev,
            currentPiece: { ...prev.currentPiece, y: nextY }
          };
        } else {
          return lockPiece(prev);
        }
      });
    }, finalSpeed);

    return () => clearInterval(timer);
  }, [gameState, isPaused, p2.isGameOver, p2.level, p2.slowDownTimeRemaining, p2.flashRows, onlineRole, onlineLobbyData?.status]);

  // Clock ticks for active powers (slow-down, screen shake multipliers)
  useEffect(() => {
    if (gameState !== 'GAME_SOLO' && gameState !== 'GAME_VERSUS' && gameState !== 'GAME_AI' && gameState !== 'GAME_ONLINE') return;
    if (isPaused) return;

    const interval = setInterval(() => {
      const step = 100;

      if (gameState !== 'GAME_ONLINE' || onlineRole === 'p1') {
        setP1(p => {
          const nextSlow = Math.max(0, p.slowDownTimeRemaining - step);
          const nextShake = Math.max(0, p.shakeTimeRemaining - step);
          return {
            ...p,
            slowDownTimeRemaining: nextSlow,
            shakeTimeRemaining: nextShake,
            isShaking: nextShake > 0
          };
        });
      }

      if (gameState !== 'GAME_ONLINE' || onlineRole === 'p2') {
        setP2(p => {
          const nextSlow = Math.max(0, p.slowDownTimeRemaining - step);
          const nextShake = Math.max(0, p.shakeTimeRemaining - step);
          return {
            ...p,
            slowDownTimeRemaining: nextSlow,
            shakeTimeRemaining: nextShake,
            isShaking: nextShake > 0
          };
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, isPaused, onlineRole]);

  // AI Challenger Controller Loop
  useEffect(() => {
    if (gameState !== 'GAME_AI' || isPaused || p2.isGameOver || !p2.currentPiece) return;

    const timer = setTimeout(() => {
      const curPiece = p2.currentPiece;
      if (!curPiece) return;

      // 1. Calculate target if null or if it's a new piece
      if (
        !aiTargetRef.current || 
        aiTargetRef.current.pieceType !== curPiece.type || 
        curPiece.y < aiTargetRef.current.spawnY
      ) {
        const spawnShape = TETROMINOES[curPiece.type].shape;
        const uniqueRotations: number[][][] = [];
        let currentShape = spawnShape;
        for (let rot = 0; rot < 4; rot++) {
          uniqueRotations.push(currentShape);
          // Rotate shape clockwise
          const n = currentShape.length;
          const rotated = Array.from({ length: n }, () => Array(n).fill(0));
          for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
              rotated[c][n - 1 - r] = currentShape[r][c];
            }
          }
          currentShape = rotated;
        }

        let bestScore = -Infinity;
        let bestX = curPiece.x;
        let bestRot = 0;

        // Simulation scoring helper
        const getSimulationScore = (shape: number[][], posX: number, posY: number) => {
          const heights = Array(COLS).fill(0);
          let holes = 0;

          for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
              let isFilled = p2.grid[r][c] !== null;
              if (!isFilled) {
                const pieceR = r - posY;
                const pieceC = c - posX;
                if (pieceR >= 0 && pieceR < shape.length && pieceC >= 0 && pieceC < shape[0].length) {
                  if (shape[pieceR][pieceC]) {
                    isFilled = true;
                  }
                }
              }
              if (isFilled) {
                heights[c] = ROWS - r;
                break;
              }
            }
          }

          for (let c = 0; c < COLS; c++) {
            let hasBlockAbove = false;
            for (let r = 0; r < ROWS; r++) {
              let isFilled = p2.grid[r][c] !== null;
              if (!isFilled) {
                const pieceR = r - posY;
                const pieceC = c - posX;
                if (pieceR >= 0 && pieceR < shape.length && pieceC >= 0 && pieceC < shape[0].length) {
                  if (shape[pieceR][pieceC]) {
                    isFilled = true;
                  }
                }
              }
              if (isFilled) {
                hasBlockAbove = true;
              } else if (hasBlockAbove) {
                holes++;
              }
            }
          }

          let bumpiness = 0;
          for (let c = 0; c < COLS - 1; c++) {
            bumpiness += Math.abs(heights[c] - heights[c + 1]);
          }

          const maxHeight = Math.max(...heights);
          const aggregateHeight = heights.reduce((a, b) => a + b, 0);

          let linesCleared = 0;
          for (let r = 0; r < ROWS; r++) {
            let isRowFull = true;
            for (let c = 0; c < COLS; c++) {
              let isFilled = p2.grid[r][c] !== null;
              if (!isFilled) {
                const pieceR = r - posY;
                const pieceC = c - posX;
                if (pieceR >= 0 && pieceR < shape.length && pieceC >= 0 && pieceC < shape[0].length) {
                  if (shape[pieceR][pieceC]) {
                    isFilled = true;
                  }
                }
              }
              if (!isFilled) {
                isRowFull = false;
                break;
              }
            }
            if (isRowFull) {
              linesCleared++;
            }
          }

          return (linesCleared * 250) - (aggregateHeight * 3.5) - (holes * 40.0) - (bumpiness * 2.0) - (maxHeight * 5.0);
        };

        // Find the best move
        for (let rot = 0; rot < uniqueRotations.length; rot++) {
          const shape = uniqueRotations[rot];
          for (let x = -3; x < COLS + 1; x++) {
            if (!checkCollision(shape, p2.grid, x, curPiece.y)) {
              let landingY = curPiece.y;
              while (!checkCollision(shape, p2.grid, x, landingY + 1)) {
                landingY++;
              }
              const score = getSimulationScore(shape, x, landingY);
              if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestRot = rot;
              }
            }
          }
        }

        aiTargetRef.current = {
          pieceType: curPiece.type,
          spawnY: curPiece.y,
          targetX: bestX,
          rotationsNeeded: bestRot
        };
      }

      // 2. Perform one step towards target
      const target = aiTargetRef.current;
      if (!target) return;

      if (target.rotationsNeeded > 0) {
        handleRotate('p2');
        target.rotationsNeeded--;
      } else {
        const curX = curPiece.x;
        if (curX < target.targetX) {
          handleMoveRight('p2');
        } else if (curX > target.targetX) {
          handleMoveLeft('p2');
        } else {
          // Correct column and rotation reached! Hard drop!
          handleHardDrop('p2');
          aiTargetRef.current = null; // target met, reset for next piece
        }
      }
    }, p2.slowDownTimeRemaining > 0 ? 800 : 400); // AI action speed: 400ms normal, 800ms when slowed down

    return () => clearTimeout(timer);
  }, [gameState, isPaused, p2.currentPiece, p2.isGameOver, p2.grid, p2.slowDownTimeRemaining]);

  // AI Card Player Loop
  useEffect(() => {
    if (gameState !== 'GAME_AI' || isPaused || p2.isGameOver) return;

    const cardTimer = setInterval(() => {
      setP2(prev => {
        if (prev.isGameOver || prev.hand.length === 0 || isPaused) return prev;

        const cardIndex = 0;
        const card = prev.hand[cardIndex];

        // Decide target: attack cards are targeted to P1, utility/helper cards targeted to P2
        const targetId: 'p1' | 'p2' = (card.type === 'BOMB' || card.type === 'SLOW_DOWN' || card.type === 'SHUFFLE') ? 'p1' : 'p2';

        setTimeout(() => {
          handleUseCard('p2', cardIndex, targetId);
        }, 10);

        return prev;
      });
    }, 8000); // Check and play cards every 8 seconds

    return () => clearInterval(cardTimer);
  }, [gameState, isPaused, p2.hand, p2.isGameOver]);

  // Online Multiplayer Handlers and Sync Effects
  const handleLeaveOnlineLobby = async () => {
    if (onlineLobbyId && onlineRole) {
      await leaveLobby(onlineLobbyId, onlineRole);
    }
    setOnlineLobbyId(null);
    setOnlineLobbyData(null);
    setOnlineRole(null);
    setIsSearching(false);
    setMatchmakingError(null);
    setGameState('MENU');
  };

  const handleQuickMatch = async () => {
    setIsSearching(true);
    setMatchmakingError(null);
    try {
      const matchedId = await findQuickMatch(localUserId, onlineNickname);
      if (matchedId) {
        setOnlineRole('p2');
        setOnlineLobbyId(matchedId);
        setIsSearching(false);
        return;
      }

      const newId = await createLobby(localUserId, onlineNickname, 'quick');
      setOnlineRole('p1');
      setOnlineLobbyId(newId);
      setIsSearching(false);
    } catch (err: any) {
      console.error(err);
      setMatchmakingError('Multiplayer service unreachable. Try again in a moment.');
      setIsSearching(false);
    }
  };

  const handleCreateCustomRoom = async () => {
    setIsSearching(true);
    setMatchmakingError(null);
    try {
      const newId = await createLobby(localUserId, onlineNickname, 'custom');
      setOnlineRole('p1');
      setOnlineLobbyId(newId);
      setIsSearching(false);
    } catch (err: any) {
      console.error(err);
      setMatchmakingError('Could not initialize custom room.');
      setIsSearching(false);
    }
  };

  const handleJoinCustomRoom = async () => {
    if (!lobbyCodeInput.trim()) {
      setMatchmakingError('Enter a 4-digit room code.');
      return;
    }
    setIsSearching(true);
    setMatchmakingError(null);
    try {
      const res = await joinLobby(lobbyCodeInput.trim(), localUserId, onlineNickname);
      if (res.error) {
        setMatchmakingError(res.error);
        setIsSearching(false);
        return;
      }
      setOnlineRole(res.role);
      setOnlineLobbyId(lobbyCodeInput.trim());
      setIsSearching(false);
    } catch (err: any) {
      console.error(err);
      setMatchmakingError('Lobby lookup failed.');
      setIsSearching(false);
    }
  };

  const handleToggleReady = async () => {
    if (!onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    const currentReady = onlineRole === 'p1' ? onlineLobbyData.p1Ready : onlineLobbyData.p2Ready;
    await setPlayerReady(onlineLobbyId, onlineRole, !currentReady);
  };

  const handleStartOnlineMatch = async () => {
    if (!onlineLobbyId || onlineRole !== 'p1') return;
    await startMultiplayerGame(onlineLobbyId);
  };

  const handleSaveNickname = (val: string) => {
    const clean = val.trim().substring(0, 16);
    if (clean) {
      setOnlineNickname(clean);
      localStorage.setItem('uno_tetris_nickname', clean);
    }
  };

  // 1. Subscribe to Lobby stream
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId) return;

    const unsubscribe = listenToLobby(onlineLobbyId, (data) => {
      setOnlineLobbyData(data);
    });

    return () => {
      unsubscribe();
    };
  }, [gameState, onlineLobbyId]);

  // 2. Initialize local board when gameplay begins
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    if (onlineLobbyData.status !== 'playing') return;

    const myState = onlineRole === 'p1' ? p1 : p2;
    // Only initialize once on status match transition
    if (myState.score === 0 && myState.linesCleared === 0 && !myState.currentPiece && !myState.isGameOver) {
      pBag.current = new PieceBag();
      const activeBag = pBag.current;

      const initialPlayer = createInitialPlayer(onlineRole, onlineNickname, activeBag);
      const firstPiece = activeBag.getNext();
      const spawnX = Math.floor((COLS - firstPiece.shape[0].length) / 2);

      initialPlayer.currentPiece = {
        shape: firstPiece.shape,
        x: spawnX,
        y: 0,
        color: firstPiece.color,
        type: firstPiece.type
      };

      if (onlineRole === 'p1') {
        setP1(initialPlayer);
        setP2(createInitialPlayer('p2', onlineLobbyData.p2?.name || 'CHALLENGER', activeBag));
      } else {
        setP2(initialPlayer);
        setP1(createInitialPlayer('p1', onlineLobbyData.p1?.name || 'HOST', activeBag));
      }

      setIsPaused(false);
    }
  }, [gameState, onlineLobbyId, onlineRole, onlineLobbyData?.status]);

  // 3. Periodic local state sync to Firestore (throttled every 250ms)
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    if (onlineLobbyData.status !== 'playing') return;

    const myState = onlineRole === 'p1' ? p1 : p2;
    if (myState.isGameOver) return; // Handled by separate game over effects

    const syncTimer = setInterval(() => {
      updatePlayerStateInLobby(onlineLobbyId, onlineRole, myState);
    }, 250);

    return () => clearInterval(syncTimer);
  }, [gameState, onlineLobbyId, onlineRole, onlineLobbyData?.status, p1, p2]);

  // 4. Opponent state syncer (maps opponent updates to our React view)
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    if (onlineLobbyData.status !== 'playing') return;

    const oppRole = onlineRole === 'p1' ? 'p2' : 'p1';
    const oppState = onlineLobbyData[`${oppRole}State`];

    if (oppState) {
      const setOpponent = onlineRole === 'p1' ? setP2 : setP1;
      setOpponent(prev => {
        if (
          prev.score !== oppState.score ||
          prev.level !== oppState.level ||
          prev.linesCleared !== oppState.linesCleared ||
          prev.isGameOver !== oppState.isGameOver ||
          JSON.stringify(prev.grid) !== JSON.stringify(oppState.grid) ||
          JSON.stringify(prev.currentPiece) !== JSON.stringify(oppState.currentPiece) ||
          JSON.stringify(prev.nextPiece) !== JSON.stringify(oppState.nextPiece) ||
          JSON.stringify(prev.holdPiece) !== JSON.stringify(oppState.holdPiece) ||
          prev.hand.length !== oppState.hand.length
        ) {
          return {
            ...oppState,
            id: oppRole
          };
        }
        return prev;
      });
    }
  }, [gameState, onlineLobbyId, onlineRole, onlineLobbyData]);

  // 5. Active spell queue listener (handles cards/garbage applied to us)
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    if (onlineLobbyData.status !== 'playing') return;

    const myPendingSpells = onlineRole === 'p1' ? onlineLobbyData.p1PendingSpells : onlineLobbyData.p2PendingSpells;

    if (myPendingSpells && myPendingSpells.length > 0) {
      const setMe = onlineRole === 'p1' ? setP1 : setP2;
      setMe(prev => {
        let updated = { ...prev };
        myPendingSpells.forEach((spell: any) => {
          if (spell.type === 'COLOUR_SWITCH') {
            applyColourSwitch(updated);
          } else if (spell.type === 'BOMB') {
            applyBomb(updated);
            audio.playBomb();
          } else if (spell.type === 'SLOW_DOWN') {
            applySlowDown(updated);
          } else if (spell.type === 'CLEAR_ROW') {
            applyClearRow(updated);
          } else if (spell.type === 'SHUFFLE') {
            applyShuffle(updated);
          } else if (spell.type === 'GARBAGE') {
            addGarbageLines(updated, spell.count || 1);
          }
          addGameMessage(updated, `⚡ Opponent cast [${spell.title}] on you!`, 'warning');
        });
        return updated;
      });

      // Clear from database
      clearPendingSpells(onlineLobbyId, onlineRole, myPendingSpells);
    }
  }, [gameState, onlineLobbyId, onlineRole, onlineLobbyData]);

  // 6. Sync game over triggers
  useEffect(() => {
    if (gameState !== 'GAME_ONLINE' || !onlineLobbyId || !onlineRole || !onlineLobbyData) return;
    if (onlineLobbyData.status !== 'playing') return;

    const myState = onlineRole === 'p1' ? p1 : p2;
    if (myState.isGameOver && !onlineLobbyData[`${onlineRole}State`]?.isGameOver) {
      setGameOverInLobby(onlineLobbyId, onlineRole, myState.score);
    }
  }, [gameState, onlineLobbyId, onlineRole, p1.isGameOver, p2.isGameOver, onlineLobbyData]);

  // Trigger high score evaluation when Solo Mode finishes
  useEffect(() => {
    if (gameState === 'GAME_SOLO' && p1.isGameOver) {
      const highScoresRaw = localStorage.getItem('unotetris_high_scores');
      let isNewHighScore = false;
      if (highScoresRaw) {
        try {
          const parsed = JSON.parse(highScoresRaw) as LeaderboardEntry[];
          // Eligible if we score higher than the 5th place or if there are less than 5 entries
          if (parsed.length < 5 || p1.score > parsed[parsed.length - 1].score) {
            isNewHighScore = true;
          }
        } catch (e) {
          isNewHighScore = true;
        }
      } else {
        isNewHighScore = true;
      }

      if (isNewHighScore && p1.score > 0) {
        setShowScoreSubmit(true);
      }
    }
  }, [p1.isGameOver, gameState]);

  // Navigation helpers
  const handleScoreSubmitted = () => {
    setShowScoreSubmit(false);
    setGameState('LEADERBOARD');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col font-sans select-none relative overflow-x-hidden antialiased">
      {/* Ambient background glow meshes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* Main Top Header Navigation */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-sm">
        <button
          onClick={() => setGameState('MENU')}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="flex gap-1">
            <span className="w-2.5 h-6 bg-red-500 rounded transform -skew-x-12" />
            <span className="w-2.5 h-6 bg-yellow-500 rounded transform -skew-x-12" />
            <span className="w-2.5 h-6 bg-green-500 rounded transform -skew-x-12" />
            <span className="w-2.5 h-6 bg-blue-500 rounded transform -skew-x-12" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xl font-light tracking-tighter text-white uppercase leading-none flex items-center gap-0.5">
              UNO<span className="font-black italic text-red-500">TETRIS</span>
            </h1>
            <span className="text-[9px] text-zinc-500 font-mono tracking-wider group-hover:text-zinc-300 transition-all">
              HYBRID CARD-TACTICAL SIMULATOR
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {/* Mute toggle button */}
          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/10 cursor-pointer transition-all shadow-md"
            title={isMuted ? 'Unmute game' : 'Mute game'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Quick exit to Menu if playing */}
          {(gameState === 'GAME_SOLO' || gameState === 'GAME_VERSUS' || gameState === 'GAME_AI') && (
            <button
              onClick={() => {
                setWasPausedBeforeQuit(isPaused);
                setIsPaused(true);
                setShowQuitConfirm(true);
              }}
              className="px-4 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded-xl cursor-pointer flex items-center gap-1 transition-all shadow-sm"
            >
              <ArrowLeft size={12} /> QUIT
            </button>
          )}
        </div>
      </header>

      {/* Primary Content Router */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex items-center justify-center relative z-20">
        <AnimatePresence mode="wait">
          {/* 1. START MENU */}
          {gameState === 'MENU' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center w-full max-w-md text-center bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
            >
              {/* Grand logo card stacked block visual */}
              <div className="relative mb-6 flex justify-center items-center">
                <div className="absolute w-24 h-36 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#991B1B] border-4 border-white shadow-[0_15px_30px_rgba(0,0,0,0.5)] rotate-[-15deg] transform origin-bottom-right z-10 flex items-center justify-center p-1">
                  <div className="border border-white/20 rounded-lg w-full h-full flex items-center justify-center">
                    <span className="text-white font-black text-xs -skew-x-12 shadow-sm uppercase tracking-wide">RED</span>
                  </div>
                </div>
                <div className="w-24 h-36 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] border-4 border-white shadow-[0_15px_30px_rgba(0,0,0,0.5)] rotate-[15deg] transform origin-bottom-left z-20 flex items-center justify-center p-1">
                  <div className="border border-white/20 rounded-lg w-full h-full flex items-center justify-center">
                    <span className="text-white font-black text-xs skew-x-12 shadow-sm uppercase tracking-wide">BLUE</span>
                  </div>
                </div>
                <div className="absolute w-12 h-12 rounded-lg bg-amber-500 border border-white shadow-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center font-bold text-slate-950 font-mono rotate-12">
                  UNO
                </div>
              </div>

              <h2 className="text-3xl font-light tracking-tighter text-white flex justify-center items-center gap-1 uppercase mb-1">
                <span>UNO</span><span className="font-black italic text-red-500">TETRIS</span>
              </h2>
              <p className="text-zinc-400 text-xs font-mono mb-8 max-w-xs leading-relaxed">
                Classic falling block puzzles fused with strategic Uno action card spells.
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={startSoloGame}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-blue-400/20"
                >
                  <Play size={16} fill="white" /> SOLO PLAY
                </button>

                <button
                  onClick={startAiGame}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg hover:shadow-rose-500/20 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-rose-400/20"
                >
                  <Cpu size={16} /> VS AI CHALLENGER
                </button>

                <button
                  onClick={() => {
                    setMatchmakingError(null);
                    setGameState('GAME_ONLINE');
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-purple-400/20"
                >
                  <Zap size={16} fill="white" /> ONLINE MULTIPLAYER
                </button>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setGameState('INSTRUCTIONS')}
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HelpCircle size={14} /> HOW-TO
                  </button>

                  <button
                    onClick={() => setGameState('LEADERBOARD')}
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trophy size={14} className="text-amber-500" /> LEADERBOARD
                  </button>
                </div>
              </div>

              <div className="mt-8 text-[9px] text-slate-600 font-mono uppercase">
                Designed for optimal desktop browser performance
              </div>
            </motion.div>
          )}

          {/* 2. LEADERBOARD DISPLAY */}
          {gameState === 'LEADERBOARD' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex justify-center"
            >
              <Leaderboard
                currentScore={p1.score}
                currentLines={p1.linesCleared}
                gameMode="Solo"
                onBackToMenu={() => setGameState('MENU')}
                onSubmitScore={handleScoreSubmitted}
              />
            </motion.div>
          )}

          {/* 3. INSTRUCTIONS SCREEN */}
          {gameState === 'INSTRUCTIONS' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex justify-center"
            >
              <Instructions onBackToMenu={() => setGameState('MENU')} />
            </motion.div>
          )}

          {/* 4. GAME: SOLO MODE */}
          {gameState === 'GAME_SOLO' && (
            <motion.div
              key="game_solo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
            >
              {/* Left Sidebar: Controls & Next Piece */}
              <div className="md:col-span-3 flex flex-col gap-4">
                {/* Score panel */}
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">CURRENT SCORE</span>
                  <span className="text-3xl font-black text-amber-400 font-mono tracking-wider mt-1">{p1.score}</span>
                  <div className="w-full border-t border-white/10 my-3" />
                  <div className="grid grid-cols-2 w-full gap-2 text-center text-xs">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-zinc-400 uppercase">Lines</span>
                      <span className="text-sm font-bold text-white font-mono">{p1.linesCleared}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-zinc-400 uppercase">Level</span>
                      <span className="text-sm font-bold text-white font-mono">{p1.level}</span>
                    </div>
                  </div>
                </div>

                {/* Hold Tetromino preview panel */}
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2.5">HELD BLOCK</span>
                  <div className="w-24 h-24 bg-[#0A0A0B]/50 rounded-xl border border-white/10 flex items-center justify-center relative">
                    {p1.holdPiece ? (
                      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${p1.holdPiece.shape[0].length}, minmax(0, 1fr))` }}>
                        {p1.holdPiece.shape.map((row, r) =>
                          row.map((cell, c) => (
                            <div
                              key={`${r}-${c}`}
                              className="w-4 h-4 rounded-[2px]"
                              style={{
                                backgroundColor: cell ? p1.holdPiece!.color : 'transparent',
                                opacity: cell ? 1 : 0
                              }}
                            />
                          ))
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-700 uppercase">EMPTY</span>
                    )}
                    <span className="absolute bottom-1 text-[8px] font-mono text-zinc-650 bg-black/40 px-1 py-0.5 rounded uppercase">
                      Shift Key
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Game Board */}
              <div className="md:col-span-5 flex flex-col items-center gap-4">
                {/* Active HUD headers */}
                <div className="flex justify-between items-center w-full max-w-[320px] px-1 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`} />
                    <span>{isPaused ? 'PAUSED' : 'GAME PLAYING'}</span>
                  </div>

                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all uppercase text-[10px] flex items-center gap-1"
                  >
                    {isPaused ? <Play size={10} /> : <Pause size={10} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                </div>

                {/* Primary board viewport container */}
                <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
                  <TetrisBoard player={p1} />

                  {/* Paused overlay screen */}
                  <AnimatePresence>
                    {isPaused && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0A0A0B]/85 rounded-2xl flex flex-col items-center justify-center p-4 text-center z-40 backdrop-blur-sm border border-white/10 shadow-2xl"
                      >
                        <Pause size={32} className="text-amber-500 mb-2 animate-bounce" />
                        <span className="text-white font-black text-xl tracking-wider uppercase">GAME PAUSED</span>
                        <span className="text-zinc-400 text-[10px] font-mono mt-1 mb-4">Press ESC or click Resume to continue</span>
                        <button
                          onClick={() => setIsPaused(false)}
                          className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2 rounded-xl border border-white/10 transition-all cursor-pointer shadow-md uppercase tracking-wider"
                        >
                          RESUME GAME
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* High score submission overlay */}
                  <AnimatePresence>
                    {p1.isGameOver && showScoreSubmit && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 rounded-2xl p-4">
                        <Leaderboard
                          currentScore={p1.score}
                          currentLines={p1.linesCleared}
                          gameMode="Solo"
                          onBackToMenu={() => setGameState('MENU')}
                          onSubmitScore={handleScoreSubmitted}
                        />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* On-screen controls for mouse and touch */}
                {renderVirtualControls('p1')}

                {/* Hotkeys controls reminders info strip */}
                <div className="p-3 bg-white/[0.01] border border-white/10 rounded-xl text-[10px] font-mono text-zinc-500 flex gap-4 w-full justify-center max-w-[320px]">
                  <span>Move: <strong>A/D</strong> or <strong>←/→</strong></span>
                  <span>Rotate: <strong>W</strong> or <strong>↑</strong></span>
                  <span>Drop: <strong>Space</strong></span>
                </div>
              </div>

              {/* Right Sidebar: Uno Deck, Hand, Next Piece Preview */}
              <div className="md:col-span-4 flex flex-col gap-4">
                {/* Next Piece box */}
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2.5">NEXT UP</span>
                  <div className="w-24 h-24 bg-[#0A0A0B]/50 rounded-xl border border-white/10 flex items-center justify-center">
                    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${p1.nextPiece.shape[0].length}, minmax(0, 1fr))` }}>
                      {p1.nextPiece.shape.map((row, r) =>
                        row.map((cell, c) => (
                          <div
                            key={`${r}-${c}`}
                            className="w-4 h-4 rounded-[2px]"
                            style={{
                              backgroundColor: cell ? p1.nextPiece.color : 'transparent',
                              opacity: cell ? 1 : 0
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Hand Action Cards shelf */}
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 shadow-xl flex-col flex items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">UNO CARDS ({p1.hand.length}/3)</span>
                  
                  {p1.hand.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-center p-4 w-full">
                      <span className="text-[10px] font-mono text-slate-600 leading-normal max-w-[140px] uppercase">
                        Clear lines to draw Uno Action Cards here
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap justify-center max-w-full">
                      {p1.hand.map((card, idx) => (
                        <UnoCard
                          key={card.id}
                          card={card}
                          index={idx}
                          onUseSelf={() => handleUseCard('p1', idx, 'p1')}
                          hotkeySelf={idx === 0 ? 'Q' : undefined}
                          disabled={isPaused || p1.isGameOver}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Mini Notifications feed */}
                <div className="bg-white/[0.01] border border-white/10 rounded-xl p-3 flex-1 min-h-[100px] overflow-hidden flex flex-col justify-end">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase mb-2">LIVE BATTLE TICKER</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {p1.messages.slice(0, 4).map((msg) => (
                      <div key={msg.id} className="text-[10px] font-mono flex gap-1 items-start leading-tight">
                        <span className="text-slate-600 shrink-0">[{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                        <span className={`${
                          msg.type === 'success' ? 'text-green-400' :
                          msg.type === 'danger' ? 'text-rose-400' :
                          msg.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
                        }`}>{msg.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. GAME: ONLINE MULTIPLAYER MODE */}
          {gameState === 'GAME_ONLINE' && (
            <motion.div
              key="game_online"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-6"
            >
              {!onlineLobbyId ? (
                /* ================= Matchmaking / Nickname Screen ================= */
                <div className="w-full max-w-md mx-auto bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3 animate-pulse">
                      <Zap size={22} fill="currentColor" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">Online Matchmaker</h3>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mt-1 font-bold">Connect with challengers worldwide</span>
                  </div>

                  {/* Nickname Form */}
                  <div className="flex flex-col text-left gap-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Your Battletag / Nickname</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={onlineNickname}
                        onChange={(e) => handleSaveNickname(e.target.value)}
                        placeholder="Challenger..."
                        maxLength={16}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  {/* Matchmaking Action Options */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleQuickMatch}
                      disabled={isSearching}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white font-black text-sm tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-violet-500/20"
                    >
                      {isSearching ? 'SEARCHING FOR DUEL...' : 'QUICK MATCHMAKING'}
                    </button>

                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-[1px] bg-white/10" />
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">OR CUSTOM ROOM</span>
                      <div className="flex-1 h-[1px] bg-white/10" />
                    </div>

                    <button
                      onClick={handleCreateCustomRoom}
                      disabled={isSearching}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      HOST PRIVATE ROOM
                    </button>

                    <div className="flex gap-2 mt-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                      <input
                        type="text"
                        placeholder="ENTER 4-DIGIT CODE"
                        value={lobbyCodeInput}
                        onChange={(e) => setLobbyCodeInput(e.target.value.toUpperCase().slice(0, 4))}
                        className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-violet-500/50"
                      />
                      <button
                        onClick={handleJoinCustomRoom}
                        disabled={isSearching}
                        className="w-1/2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        JOIN ROOM
                      </button>
                    </div>
                  </div>

                  {matchmakingError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2 px-3 rounded-xl font-mono leading-relaxed">
                      ⚠️ {matchmakingError}
                    </div>
                  )}

                  <button
                    onClick={() => setGameState('MENU')}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    BACK TO MENU
                  </button>
                </div>
              ) : !onlineLobbyData ? (
                /* ================= Loading Screen ================= */
                <div className="w-full max-w-md mx-auto bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center gap-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 animate-spin">
                    <Zap size={22} fill="currentColor" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Connecting to Room...</h3>
                  <p className="text-xs text-zinc-400 font-mono">Initializing secure connection...</p>
                  <button
                    onClick={handleLeaveOnlineLobby}
                    className="mt-4 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold font-mono transition-all uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : onlineLobbyData.status !== 'playing' ? (
                /* ================= Lobby Waiting Room Screen ================= */
                <div className="w-full max-w-lg mx-auto bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">PRIVATE DUEL LOBBY</span>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">ROOM: {onlineLobbyId}</h3>
                    </div>
                    <button
                      onClick={handleLeaveOnlineLobby}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold font-mono transition-all uppercase cursor-pointer"
                    >
                      LEAVE LOBBY
                    </button>
                  </div>

                  {/* Player Slot Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Host P1 */}
                    <div className="bg-black/35 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden">
                      <div className="absolute top-2 left-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-mono text-[7px] uppercase px-1.5 py-0.5 rounded-md font-bold">
                        HOST (P1)
                      </div>
                      <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-bold text-violet-400 text-sm mt-2">
                        {onlineLobbyData.p1?.name?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <span className="font-bold text-xs text-white max-w-full truncate">{onlineLobbyData.p1?.name || 'Waiting...'}</span>
                      <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase ${
                        onlineLobbyData.p1Ready ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {onlineLobbyData.p1Ready ? 'READY' : 'NOT READY'}
                      </div>
                    </div>

                    {/* Challenger P2 */}
                    <div className="bg-black/35 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 relative overflow-hidden">
                      <div className="absolute top-2 left-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-mono text-[7px] uppercase px-1.5 py-0.5 rounded-md font-bold">
                        CHALLENGER (P2)
                      </div>
                      {onlineLobbyData.p2 ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm mt-2">
                            {onlineLobbyData.p2.name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <span className="font-bold text-xs text-white max-w-full truncate">{onlineLobbyData.p2.name}</span>
                          <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase ${
                            onlineLobbyData.p2Ready ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {onlineLobbyData.p2Ready ? 'READY' : 'NOT READY'}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-6">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest animate-pulse font-bold">WAITING...</span>
                          <span className="text-[8px] text-zinc-650 text-center font-mono mt-1 px-4 leading-normal">
                            Share room code to play with a friend
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ready Action Footer */}
                  <div className="flex flex-col gap-3 mt-4 border-t border-white/10 pt-5">
                    <button
                      onClick={handleToggleReady}
                      className={`w-full py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all cursor-pointer border ${
                        (onlineRole === 'p1' ? onlineLobbyData.p1Ready : onlineLobbyData.p2Ready)
                          ? 'bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600/20'
                          : 'bg-green-600/10 text-green-400 border-green-500/20 hover:bg-green-600/20'
                      }`}
                    >
                      {(onlineRole === 'p1' ? onlineLobbyData.p1Ready : onlineLobbyData.p2Ready) ? 'CANCEL READY STATE' : 'DECLARE READY FOR BATTLE'}
                    </button>

                    {onlineRole === 'p1' && (
                      <button
                        onClick={handleStartOnlineMatch}
                        disabled={!onlineLobbyData.p1Ready || !onlineLobbyData.p2Ready}
                        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-sm tracking-widest uppercase transition-all shadow-md cursor-pointer border border-violet-500/20 disabled:border-none"
                      >
                        LAUNCH MULTIPLAYER MATCH
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ================= Live Online Multiplayer Board Gameplay ================= */
                <div className="w-full flex flex-col gap-6">
                  {/* Match Header */}
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex justify-between items-center px-6">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase mb-1">ONLINE DUEL MATCH</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">ROOM CODE: {onlineLobbyId}</h3>
                      </div>
                    </div>

                    <div className="text-center font-sans">
                      {p1.isGameOver && p2.isGameOver ? (
                        <div className="bg-slate-800 border border-slate-700 px-4 py-1 rounded-full text-xs font-bold text-slate-300 uppercase font-mono">
                          DRAW GAME!
                        </div>
                      ) : p1.isGameOver ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black text-emerald-400 uppercase flex items-center gap-1 animate-pulse">
                          <Crown size={12} className="fill-emerald-400" /> Challenger ({onlineLobbyData.p2?.name}) Wins!
                        </div>
                      ) : p2.isGameOver ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black text-emerald-400 uppercase flex items-center gap-1 animate-pulse">
                          <Crown size={12} className="fill-emerald-400" /> Host ({onlineLobbyData.p1?.name}) Wins!
                        </div>
                      ) : (
                        <div className="bg-violet-500/10 border border-violet-500/25 px-4 py-1 rounded-full text-xs font-mono text-violet-400 animate-pulse uppercase font-bold">
                          ACTIVE DUEL IN PROGRESS
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleLeaveOnlineLobby}
                        className="px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold font-mono transition-all uppercase cursor-pointer"
                      >
                        QUIT MATCH
                      </button>
                    </div>
                  </div>

                  {/* Dual Grid boards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative">
                    <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1px] h-3/4 border-dashed border-r border-white/10" />

                    {/* Left Screen: Player 1 (Host) */}
                    <div className={`flex flex-col md:flex-row gap-4 justify-between bg-white/[0.01] border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${
                      p1.isGameOver ? 'opacity-40 grayscale scale-98 animate-none' : 'border-white/10'
                    } ${onlineRole === 'p1' ? 'ring-2 ring-violet-500/40 bg-violet-500/[0.005]' : ''}`}>
                      
                      {/* Hold & Next Left */}
                      <div className="flex md:flex-col gap-3 justify-center items-center shrink-0">
                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">HOLD</span>
                          <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center relative">
                            {p1.holdPiece ? (
                              <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p1.holdPiece.shape[0].length}, minmax(0, 1fr))` }}>
                                {p1.holdPiece.shape.map((row, r) =>
                                  row.map((cell, c) => (
                                    <div
                                      key={`${r}-${c}`}
                                      className="w-3 h-3 rounded-[1px]"
                                      style={{
                                        backgroundColor: cell ? p1.holdPiece!.color : 'transparent',
                                        opacity: cell ? 1 : 0
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-750 uppercase">EMPTY</span>
                            )}
                            {onlineRole === 'p1' && (
                              <span className="absolute bottom-0.5 text-[6px] font-mono text-zinc-600 bg-black/40 px-1 py-0.2 rounded uppercase">
                                Shift
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">NEXT</span>
                          <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center">
                            {p1.nextPiece ? (
                              <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p1.nextPiece.shape[0].length}, minmax(0, 1fr))` }}>
                                {p1.nextPiece.shape.map((row, r) =>
                                  row.map((cell, c) => (
                                    <div
                                      key={`${r}-${c}`}
                                      className="w-3 h-3 rounded-[1px]"
                                      style={{
                                        backgroundColor: cell ? p1.nextPiece.color : 'transparent',
                                        opacity: cell ? 1 : 0
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-700">EMPTY</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24 text-center">
                          <span className="text-[8px] font-mono text-zinc-500 leading-none">SCORE</span>
                          <span className="text-base font-black text-amber-400 font-mono mt-0.5">{p1.score}</span>
                          <div className="w-full border-t border-white/10 my-1.5" />
                          <div className="flex flex-col text-[8px] text-zinc-400 leading-relaxed font-mono">
                            <span>Lines: <strong>{p1.linesCleared}</strong></span>
                            <span>Level: <strong>{p1.level}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Board Center */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-black leading-none mb-1 flex items-center gap-1">
                          {onlineLobbyData.p1?.name || 'HOST'} {onlineRole === 'p1' && <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1 py-0.2 rounded font-sans">(YOU)</span>}
                        </span>
                        <TetrisBoard player={p1} />
                        {onlineRole === 'p1' && renderVirtualControls('p1')}
                      </div>

                      {/* Hand Column Right */}
                      <div className="flex flex-col gap-3 md:w-36 justify-between">
                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex-1 flex flex-col items-center">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-2 text-center font-bold">
                            CARDS ({p1.hand.length}/3)
                          </span>
                          {p1.hand.length === 0 ? (
                            <div className="flex-1 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-center p-3 w-full">
                              <span className="text-[8px] font-mono text-zinc-650 uppercase">
                                No cards
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-full items-center">
                              {p1.hand.slice(0, 2).map((card, idx) => (
                                <UnoCard
                                  key={card.id}
                                  card={card}
                                  index={idx}
                                  onUseSelf={() => handleUseCard('p1', idx, 'p1')}
                                  onUseOpponent={() => handleUseCard('p1', idx, 'p2')}
                                  hotkeySelf={onlineRole === 'p1' && idx === 0 ? 'Q' : undefined}
                                  hotkeyOpponent={onlineRole === 'p1' && idx === 0 ? 'E' : undefined}
                                  disabled={onlineRole !== 'p1' || p1.isGameOver}
                                />
                              ))}
                              {p1.hand.length > 2 && (
                                <span className="text-[7px] font-mono text-zinc-500 uppercase bg-black/30 px-1 py-0.5 rounded">
                                  +1 MORE CARD
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-[#0A0A0B]/20 border border-white/10 rounded-lg p-2.5 h-24 overflow-hidden flex flex-col justify-end">
                          <div className="space-y-1 overflow-y-auto max-h-[70px]">
                            {p1.messages.slice(0, 3).map((msg) => (
                              <p key={msg.id} className="text-[8px] font-mono leading-tight">
                                <span className={`${
                                  msg.type === 'success' ? 'text-green-400' :
                                  msg.type === 'danger' ? 'text-rose-400' :
                                  msg.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
                                }`}>{msg.text}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Screen: Player 2 (Challenger) */}
                    <div className={`flex flex-col md:flex-row gap-4 justify-between bg-white/[0.01] border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${
                      p2.isGameOver ? 'opacity-40 grayscale scale-98 animate-none' : 'border-white/10'
                    } ${onlineRole === 'p2' ? 'ring-2 ring-violet-500/40 bg-violet-500/[0.005]' : ''}`}>
                      
                      {/* Hold & Next Left */}
                      <div className="flex md:flex-col gap-3 justify-center items-center shrink-0">
                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">HOLD</span>
                          <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center relative">
                            {p2.holdPiece ? (
                              <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p2.holdPiece.shape[0].length}, minmax(0, 1fr))` }}>
                                {p2.holdPiece.shape.map((row, r) =>
                                  row.map((cell, c) => (
                                    <div
                                      key={`${r}-${c}`}
                                      className="w-3 h-3 rounded-[1px]"
                                      style={{
                                        backgroundColor: cell ? p2.holdPiece!.color : 'transparent',
                                        opacity: cell ? 1 : 0
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-750 uppercase">EMPTY</span>
                            )}
                            {onlineRole === 'p2' && (
                              <span className="absolute bottom-0.5 text-[6px] font-mono text-zinc-600 bg-black/40 px-1 py-0.2 rounded uppercase">
                                Shift
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">NEXT</span>
                          <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center">
                            {p2.nextPiece ? (
                              <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p2.nextPiece.shape[0].length}, minmax(0, 1fr))` }}>
                                {p2.nextPiece.shape.map((row, r) =>
                                  row.map((cell, c) => (
                                    <div
                                      key={`${r}-${c}`}
                                      className="w-3 h-3 rounded-[1px]"
                                      style={{
                                        backgroundColor: cell ? p2.nextPiece.color : 'transparent',
                                        opacity: cell ? 1 : 0
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-700">EMPTY</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24 text-center">
                          <span className="text-[8px] font-mono text-zinc-500 leading-none">SCORE</span>
                          <span className="text-base font-black text-amber-400 font-mono mt-0.5">{p2.score}</span>
                          <div className="w-full border-t border-white/10 my-1.5" />
                          <div className="flex flex-col text-[8px] text-zinc-400 leading-relaxed font-mono">
                            <span>Lines: <strong>{p2.linesCleared}</strong></span>
                            <span>Level: <strong>{p2.level}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Board Center */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black leading-none mb-1 flex items-center gap-1">
                          {onlineLobbyData.p2?.name || 'CHALLENGER'} {onlineRole === 'p2' && <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-sans">(YOU)</span>}
                        </span>
                        <TetrisBoard player={p2} />
                        {onlineRole === 'p2' && renderVirtualControls('p2')}
                      </div>

                      {/* Hand Column Right */}
                      <div className="flex flex-col gap-3 md:w-36 justify-between">
                        <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex-1 flex flex-col items-center">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase mb-2 text-center font-bold">
                            CARDS ({p2.hand.length}/3)
                          </span>
                          {p2.hand.length === 0 ? (
                            <div className="flex-1 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-center p-3 w-full">
                              <span className="text-[8px] font-mono text-zinc-650 uppercase">
                                No cards
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-full items-center">
                              {p2.hand.slice(0, 2).map((card, idx) => (
                                <UnoCard
                                  key={card.id}
                                  card={card}
                                  index={idx}
                                  onUseSelf={() => handleUseCard('p2', idx, 'p2')}
                                  onUseOpponent={() => handleUseCard('p2', idx, 'p1')}
                                  hotkeySelf={onlineRole === 'p2' && idx === 0 ? 'Q' : undefined}
                                  hotkeyOpponent={onlineRole === 'p2' && idx === 0 ? 'E' : undefined}
                                  disabled={onlineRole !== 'p2' || p2.isGameOver}
                                />
                              ))}
                              {p2.hand.length > 2 && (
                                <span className="text-[7px] font-mono text-zinc-500 uppercase bg-black/30 px-1 py-0.5 rounded">
                                  +1 MORE CARD
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-[#0A0A0B]/20 border border-white/10 rounded-lg p-2.5 h-24 overflow-hidden flex flex-col justify-end">
                          <div className="space-y-1 overflow-y-auto max-h-[70px]">
                            {p2.messages.slice(0, 3).map((msg) => (
                              <p key={msg.id} className="text-[8px] font-mono leading-tight">
                                <span className={`${
                                  msg.type === 'success' ? 'text-green-400' :
                                  msg.type === 'danger' ? 'text-rose-400' :
                                  msg.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
                                }`}>{msg.text}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 5. GAME: LOCAL VERSUS MODE */}
          {(gameState === 'GAME_VERSUS' || gameState === 'GAME_AI') && (
            <motion.div
              key="game_versus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-6"
            >
              {/* Header Status Bar (Draw notification, Winner announcement etc) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex justify-between items-center px-6">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase leading-none mb-1">
                      {gameState === 'GAME_AI' ? 'AI CHALLENGE' : 'VERSUS BATTLE'}
                    </span>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
                      {gameState === 'GAME_AI' ? 'SOLO VS COMPUTER' : 'LOCAL SPLIT SCREEN'}
                    </h3>
                  </div>
                </div>

                {/* Status indicator banner */}
                <div className="text-center">
                  {p1.isGameOver && p2.isGameOver ? (
                    <div className="bg-slate-800 border border-slate-700 px-4 py-1 rounded-full text-xs font-bold text-slate-300 animate-pulse uppercase font-mono">
                      DRAW GAME!
                    </div>
                  ) : p1.isGameOver ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black text-emerald-400 animate-pulse uppercase font-sans flex items-center gap-1">
                      <Crown size={12} className="fill-emerald-400" /> {gameState === 'GAME_AI' ? 'AI CHALLENGER WINS!' : 'PLAYER 2 WINS THE BATTLE!'}
                    </div>
                  ) : p2.isGameOver ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black text-emerald-400 animate-pulse uppercase font-sans flex items-center gap-1">
                      <Crown size={12} className="fill-emerald-400" /> PLAYER 1 WINS THE BATTLE!
                    </div>
                  ) : (
                    <div className="bg-indigo-500/10 border border-indigo-500/25 px-4 py-1 rounded-full text-xs font-mono text-indigo-400 animate-pulse uppercase">
                      ACTIVE COMBAT IN PROGRESS
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all uppercase cursor-pointer"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={startVersusGame}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <RotateCcw size={12} /> RESTART
                  </button>
                </div>
              </div>

              {/* Main Side-by-Side Playfields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative">
                {/* Visual partition separator */}
                <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1px] h-3/4 border-dashed border-r border-white/10" />

                {/* -------------------- PLAYER 1 SECTION -------------------- */}
                <div className={`flex flex-col md:flex-row gap-4 justify-between bg-white/[0.01] border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${
                  p1.isGameOver ? 'opacity-40 grayscale scale-98' : 'border-white/10'
                }`}>
                  {/* P1 Left Column (Hold block & Next block) */}
                  <div className="flex md:flex-col gap-3 justify-center items-center shrink-0">
                    {/* Hold Box */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">HOLD</span>
                      <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center relative">
                        {p1.holdPiece ? (
                          <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p1.holdPiece.shape[0].length}, minmax(0, 1fr))` }}>
                            {p1.holdPiece.shape.map((row, r) =>
                              row.map((cell, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  className="w-3 h-3 rounded-[1px]"
                                  style={{
                                    backgroundColor: cell ? p1.holdPiece!.color : 'transparent',
                                    opacity: cell ? 1 : 0
                                  }}
                                />
                              ))
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] font-mono text-zinc-750 uppercase">EMPTY</span>
                        )}
                        <span className="absolute bottom-0.5 text-[6px] font-mono text-zinc-600 bg-black/40 px-1 py-0.2 rounded uppercase">
                          L-Shift
                        </span>
                      </div>
                    </div>

                    {/* Next Box */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">NEXT</span>
                      <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center">
                        <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p1.nextPiece.shape[0].length}, minmax(0, 1fr))` }}>
                          {p1.nextPiece.shape.map((row, r) =>
                            row.map((cell, c) => (
                              <div
                                key={`${r}-${c}`}
                                className="w-3 h-3 rounded-[1px]"
                                style={{
                                  backgroundColor: cell ? p1.nextPiece.color : 'transparent',
                                  opacity: cell ? 1 : 0
                                }}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* P1 Stats */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24 text-center">
                      <span className="text-[8px] font-mono text-zinc-550 uppercase leading-none">SCORE</span>
                      <span className="text-base font-black text-amber-400 font-mono mt-0.5">{p1.score}</span>
                      <div className="w-full border-t border-white/10 my-1.5" />
                      <div className="flex flex-col text-[8px] text-zinc-400 leading-relaxed font-mono">
                        <span>Lines: <strong>{p1.linesCleared}</strong></span>
                        <span>Level: <strong>{p1.level}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* P1 Main Playfield (Grid) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-black leading-none mb-1">
                      PLAYER 1 (A-S-D-W)
                    </span>
                    <TetrisBoard player={p1} />
                    {renderVirtualControls('p1')}
                  </div>

                  {/* P1 Right Column (Uno Cards Shelf & Messages) */}
                  <div className="flex flex-col gap-3 md:w-36 justify-between">
                    {/* Active hand cards */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex-1 flex flex-col items-center">
                      <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-wider mb-2 text-center">
                        P1 CARDS ({p1.hand.length}/3)
                      </span>

                      {p1.hand.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-center p-3 w-full">
                          <span className="text-[8px] font-mono text-zinc-600 leading-normal uppercase">
                            No cards in hand
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 w-full items-center">
                          {p1.hand.slice(0, 2).map((card, idx) => (
                            <UnoCard
                              key={card.id}
                              card={card}
                              index={idx}
                              onUseSelf={() => handleUseCard('p1', idx, 'p1')}
                              onUseOpponent={() => handleUseCard('p1', idx, 'p2')}
                              hotkeySelf={idx === 0 ? 'Q' : undefined}
                              hotkeyOpponent={idx === 0 ? 'E' : undefined}
                              disabled={isPaused || p1.isGameOver}
                            />
                          ))}
                          {p1.hand.length > 2 && (
                            <span className="text-[7px] font-mono text-zinc-500 uppercase bg-black/30 px-1 py-0.5 rounded">
                              +1 MORE CARD
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat notifications */}
                    <div className="bg-[#0A0A0B]/20 border border-white/10 rounded-lg p-2.5 h-24 overflow-hidden flex flex-col justify-end">
                      <div className="space-y-1 overflow-y-auto max-h-[70px]">
                        {p1.messages.slice(0, 3).map((msg) => (
                          <p key={msg.id} className="text-[8px] font-mono leading-tight">
                            <span className={`${
                              msg.type === 'success' ? 'text-green-400' :
                              msg.type === 'danger' ? 'text-rose-400' :
                              msg.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
                            }`}>{msg.text}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------- PLAYER 2 SECTION -------------------- */}
                <div className={`flex flex-col md:flex-row gap-4 justify-between bg-white/[0.01] border border-white/10 rounded-3xl p-6 shadow-xl transition-all ${
                  p2.isGameOver ? 'opacity-40 grayscale scale-98' : 'border-white/10'
                }`}>
                  {/* P2 Left Column (Hold block & Next block) */}
                  <div className="flex md:flex-col gap-3 justify-center items-center shrink-0">
                    {/* Hold Box */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                      <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-wider mb-1.5">HOLD</span>
                      <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center relative">
                        {p2.holdPiece ? (
                          <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p2.holdPiece.shape[0].length}, minmax(0, 1fr))` }}>
                            {p2.holdPiece.shape.map((row, r) =>
                              row.map((cell, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  className="w-3 h-3 rounded-[1px]"
                                  style={{
                                    backgroundColor: cell ? p2.holdPiece!.color : 'transparent',
                                    opacity: cell ? 1 : 0
                                  }}
                                />
                              ))
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] font-mono text-zinc-750 uppercase">EMPTY</span>
                        )}
                        {gameState !== 'GAME_AI' && (
                          <span className="absolute bottom-0.5 text-[6px] font-mono text-zinc-600 bg-black/40 px-1 py-0.2 rounded uppercase">
                            R-Shift
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Next Box */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24">
                      <span className="text-[8px] font-mono text-zinc-550 uppercase tracking-wider mb-1.5">NEXT</span>
                      <div className="w-16 h-16 bg-[#0A0A0B]/30 rounded-lg border border-white/10 flex items-center justify-center">
                        <div className="grid gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${p2.nextPiece.shape[0].length}, minmax(0, 1fr))` }}>
                          {p2.nextPiece.shape.map((row, r) =>
                            row.map((cell, c) => (
                              <div
                                key={`${r}-${c}`}
                                className="w-3 h-3 rounded-[1px]"
                                style={{
                                  backgroundColor: cell ? p2.nextPiece.color : 'transparent',
                                  opacity: cell ? 1 : 0
                                }}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* P2 Stats */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex flex-col items-center w-24 text-center">
                      <span className="text-[8px] font-mono text-zinc-550 uppercase leading-none">SCORE</span>
                      <span className="text-base font-black text-amber-400 font-mono mt-0.5">{p2.score}</span>
                      <div className="w-full border-t border-white/10 my-1.5" />
                      <div className="flex flex-col text-[8px] text-zinc-400 leading-relaxed font-mono">
                        <span>Lines: <strong>{p2.linesCleared}</strong></span>
                        <span>Level: <strong>{p2.level}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* P2 Main Playfield (Grid) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black leading-none mb-1">
                      {gameState === 'GAME_AI' ? 'AI CHALLENGER (AUTOMATED)' : 'PLAYER 2 (Arrow Keys)'}
                    </span>
                    <TetrisBoard player={p2} />
                  </div>

                  {/* P2 Right Column (Uno Cards Shelf & Messages) */}
                  <div className="flex flex-col gap-3 md:w-36 justify-between">
                    {/* Active hand cards */}
                    <div className="bg-[#0A0A0B]/50 border border-white/10 rounded-xl p-3 flex-1 flex flex-col items-center">
                      <span className="text-[8px] font-mono text-zinc-555 uppercase tracking-wider mb-2 text-center">
                        P2 CARDS ({p2.hand.length}/3)
                      </span>

                      {p2.hand.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-center p-3 w-full">
                          <span className="text-[8px] font-mono text-zinc-600 leading-normal uppercase">
                            No cards in hand
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 w-full items-center">
                          {p2.hand.slice(0, 2).map((card, idx) => (
                            <UnoCard
                              key={card.id}
                              card={card}
                              index={idx}
                              onUseSelf={() => handleUseCard('p2', idx, 'p2')}
                              onUseOpponent={() => handleUseCard('p2', idx, 'p1')}
                              hotkeySelf={gameState === 'GAME_AI' ? undefined : (idx === 0 ? 'K' : undefined)}
                              hotkeyOpponent={gameState === 'GAME_AI' ? undefined : (idx === 0 ? 'L' : undefined)}
                              disabled={gameState === 'GAME_AI' || isPaused || p2.isGameOver}
                            />
                          ))}
                          {p2.hand.length > 2 && (
                            <span className="text-[7px] font-mono text-zinc-500 uppercase bg-black/30 px-1 py-0.5 rounded">
                              +1 MORE CARD
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat notifications */}
                    <div className="bg-[#0A0A0B]/20 border border-white/10 rounded-lg p-2.5 h-24 overflow-hidden flex flex-col justify-end">
                      <div className="space-y-1 overflow-y-auto max-h-[70px]">
                        {p2.messages.slice(0, 3).map((msg) => (
                          <p key={msg.id} className="text-[8px] font-mono leading-tight">
                            <span className={`${
                              msg.type === 'success' ? 'text-green-400' :
                              msg.type === 'danger' ? 'text-rose-400' :
                              msg.type === 'warning' ? 'text-amber-400' : 'text-blue-300'
                            }`}>{msg.text}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pause overlay state */}
              <AnimatePresence>
                {isPaused && !showQuitConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-[#0A0A0B]/85 z-50 flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm"
                  >
                    <Pause size={40} className="text-amber-500 mb-2 animate-bounce" />
                    <span className="text-white font-black text-2xl tracking-wider uppercase">BATTLE PAUSED</span>
                    <span className="text-zinc-400 text-xs font-mono mt-1 mb-6">Take a breath, adjust plans, and click below to resume</span>
                    <button
                      onClick={() => setIsPaused(false)}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md uppercase tracking-widest"
                    >
                      RESUME CONFLICT
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-6 border-t border-white/10 text-center text-[10px] text-zinc-500 font-mono flex flex-col sm:flex-row justify-between gap-2 relative z-30 bg-[#0A0A0B]">
        <span>UNO TETRIS BLOCKS &copy; 2026. ALL RIGHTS RESERVED.</span>
        <span>DRAGGABLE SPAWNINGS &middot; FAST-PACED LOCAL COMBAT ENGINE</span>
      </footer>

      {/* Custom, Iframe-safe Quit Confirmation Overlay */}
      <AnimatePresence>
        {showQuitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with click-away to cancel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowQuitConfirm(false);
                setIsPaused(wasPausedBeforeQuit);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal dialog box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col gap-5 text-center z-10"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3.5">
                  <ArrowLeft size={22} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Abandon Match?</h3>
                <p className="text-xs text-zinc-400 font-mono mt-1.5 leading-relaxed">
                  Your current game state will be lost. Are you absolutely ready to concede and return to the main menu?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  onClick={() => {
                    setShowQuitConfirm(false);
                    setIsPaused(wasPausedBeforeQuit);
                  }}
                  className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                >
                  No, Resume
                </button>
                <button
                  onClick={() => {
                    setShowQuitConfirm(false);
                    setGameState('MENU');
                  }}
                  className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-lg shadow-rose-600/10 border border-rose-500/30"
                >
                  Yes, Abandon
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

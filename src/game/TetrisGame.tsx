import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Zap,
  Trophy,
} from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;

type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

interface Piece {
  type: PieceType;
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const PIECES: Record<PieceType, { shape: number[][]; color: string }> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#06b6d4', // cyan
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3b82f6', // blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f97316', // orange
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#eab308', // yellow
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#22c55e', // green
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#a855f7', // purple
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#ef4444', // red
  },
};

const PIECE_TYPES: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

function getRandomPiece(): Piece {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
  const def = PIECES[type];
  return {
    type,
    shape: def.shape.map((r) => [...r]),
    color: def.color,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0,
  };
}

export const TetrisGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('tetris_high_score') || 0);
  });

  // Game internal state
  const boardRef = useRef<string[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  );
  const currentPieceRef = useRef<Piece>(getRandomPiece());
  const nextPieceRef = useRef<Piece>(getRandomPiece());
  const dropTimerRef = useRef<number>(0);
  const animIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Check collision
  const checkCollision = useCallback((piece: Piece, offsetX = 0, offsetY = 0, customShape?: number[][]): boolean => {
    const shape = customShape || piece.shape;
    const board = boardRef.current;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = piece.x + c + offsetX;
          const targetY = piece.y + r + offsetY;

          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
            return true;
          }
          if (targetY >= 0 && board[targetY][targetX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Lock piece into board
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current;
    const board = boardRef.current;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const y = piece.y + r;
          const x = piece.x + c;
          if (y < 0) {
            // Reached top! Game Over
            sound.playGameOver();
            setGameState('gameOver');
            return;
          }
          board[y][x] = piece.color;
        }
      }
    }

    // Check completed lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== '')) {
        cleared++;
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(''));
        r++; // check same row again
      }
    }

    if (cleared > 0) {
      sound.playTetrisClear();
      const linePoints = [0, 100, 300, 500, 800];
      const pts = (linePoints[cleared] || 1000) * level;

      setScore((s) => {
        const ns = s + pts;
        if (ns > highScore) {
          setHighScore(ns);
          localStorage.setItem('tetris_high_score', ns.toString());
        }
        return ns;
      });

      setLines((l) => {
        const newTotal = l + cleared;
        const newLevel = Math.floor(newTotal / 10) + 1;
        setLevel(newLevel);
        return newTotal;
      });

      if (cleared >= 4) {
        confetti({ particleCount: 50, spread: 60 });
      }
    } else {
      sound.playClick();
    }

    // Spawn next piece
    currentPieceRef.current = nextPieceRef.current;
    nextPieceRef.current = getRandomPiece();

    if (checkCollision(currentPieceRef.current)) {
      sound.playGameOver();
      setGameState('gameOver');
    }
  }, [level, highScore, checkCollision]);

  // Movement methods
  const moveLeft = useCallback(() => {
    if (gameState !== 'playing') return;
    if (!checkCollision(currentPieceRef.current, -1, 0)) {
      currentPieceRef.current.x -= 1;
      sound.playClick();
    }
  }, [gameState, checkCollision]);

  const moveRight = useCallback(() => {
    if (gameState !== 'playing') return;
    if (!checkCollision(currentPieceRef.current, 1, 0)) {
      currentPieceRef.current.x += 1;
      sound.playClick();
    }
  }, [gameState, checkCollision]);

  const rotatePiece = useCallback(() => {
    if (gameState !== 'playing') return;
    const piece = currentPieceRef.current;
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const rotated: number[][] = [];

    for (let c = 0; c < cols; c++) {
      const newRow: number[] = [];
      for (let r = rows - 1; r >= 0; r--) {
        newRow.push(piece.shape[r][c]);
      }
      rotated.push(newRow);
    }

    // Wall kick attempts
    if (!checkCollision(piece, 0, 0, rotated)) {
      piece.shape = rotated;
      sound.playTetrisRotate();
    } else if (!checkCollision(piece, 1, 0, rotated)) {
      piece.x += 1;
      piece.shape = rotated;
      sound.playTetrisRotate();
    } else if (!checkCollision(piece, -1, 0, rotated)) {
      piece.x -= 1;
      piece.shape = rotated;
      sound.playTetrisRotate();
    }
  }, [gameState, checkCollision]);

  const softDrop = useCallback(() => {
    if (gameState !== 'playing') return;
    if (!checkCollision(currentPieceRef.current, 0, 1)) {
      currentPieceRef.current.y += 1;
      setScore((s) => s + 1);
    } else {
      lockPiece();
    }
  }, [gameState, checkCollision, lockPiece]);

  const hardDrop = useCallback(() => {
    if (gameState !== 'playing') return;
    let dropped = 0;
    while (!checkCollision(currentPieceRef.current, 0, 1)) {
      currentPieceRef.current.y += 1;
      dropped++;
    }
    setScore((s) => s + dropped * 2);
    sound.playPaddleBeep(true);
    lockPiece();
  }, [gameState, checkCollision, lockPiece]);

  // Restart game
  const resetGame = () => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    currentPieceRef.current = getRandomPiece();
    nextPieceRef.current = getRandomPiece();
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameState('playing');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        moveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        moveRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        rotatePiece();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        softDrop();
      } else if (e.code === 'Space') {
        e.preventDefault();
        hardDrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, rotatePiece, softDrop, hardDrop]);

  // Main Loop
  useEffect(() => {
    let running = true;

    const loop = (now: number) => {
      if (!running) return;

      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (gameState === 'playing') {
        dropTimerRef.current += delta;
        const dropInterval = Math.max(0.08, 0.8 - (level - 1) * 0.07);

        if (dropTimerRef.current >= dropInterval) {
          dropTimerRef.current = 0;
          if (!checkCollision(currentPieceRef.current, 0, 1)) {
            currentPieceRef.current.y += 1;
          } else {
            lockPiece();
          }
        }
      }

      // RENDER MAIN BOARD
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let x = 0; x <= canvas.width; x += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y <= canvas.height; y += BLOCK_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Draw Board Blocks
          const board = boardRef.current;
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (board[r][c]) {
                ctx.fillStyle = board[r][c];
                ctx.shadowColor = board[r][c];
                ctx.shadowBlur = 6;
                ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

                // Highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 3);
                ctx.shadowBlur = 0;
              }
            }
          }

          // Draw Ghost piece
          const piece = currentPieceRef.current;
          let ghostY = piece.y;
          while (!checkCollision(piece, 0, ghostY - piece.y + 1)) {
            ghostY++;
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1.5;
          for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c]) {
                const gx = (piece.x + c) * BLOCK_SIZE;
                const gy = (ghostY + r) * BLOCK_SIZE;
                ctx.strokeRect(gx + 2, gy + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
              }
            }
          }

          // Draw Current Piece
          ctx.fillStyle = piece.color;
          ctx.shadowColor = piece.color;
          ctx.shadowBlur = 8;
          for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c]) {
                const px = (piece.x + c) * BLOCK_SIZE;
                const py = (piece.y + r) * BLOCK_SIZE;
                ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 3);
                ctx.fillStyle = piece.color;
              }
            }
          }
          ctx.shadowBlur = 0;
        }
      }

      // RENDER NEXT PIECE CANVAS
      const nextCanvas = nextCanvasRef.current;
      if (nextCanvas) {
        const nextCtx = nextCanvas.getContext('2d');
        if (nextCtx) {
          nextCtx.fillStyle = '#0a0a0c';
          nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

          const np = nextPieceRef.current;
          const miniSize = 16;
          const offX = (nextCanvas.width - np.shape[0].length * miniSize) / 2;
          const offY = (nextCanvas.height - np.shape.length * miniSize) / 2;

          nextCtx.fillStyle = np.color;
          nextCtx.shadowColor = np.color;
          nextCtx.shadowBlur = 6;
          for (let r = 0; r < np.shape.length; r++) {
            for (let c = 0; c < np.shape[r].length; c++) {
              if (np.shape[r][c]) {
                nextCtx.fillRect(offX + c * miniSize + 1, offY + r * miniSize + 1, miniSize - 2, miniSize - 2);
              }
            }
          }
          nextCtx.shadowBlur = 0;
        }
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, level, checkCollision, lockPiece]);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-stone-800 bg-stone-950 p-4 sm:p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
        <div>
          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
            TETRIS 1984 ORIGINAL
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">טטריס קלאסי (Tetris)</h2>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
        </button>
      </div>

      {/* Main Game Stage + Side HUD */}
      <div className="flex gap-4 items-start justify-center">
        {/* Canvas Area */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-stone-800 bg-black shadow-inner">
          <canvas
            ref={canvasRef}
            width={COLS * BLOCK_SIZE}
            height={ROWS * BLOCK_SIZE}
            className="block"
          />

          {gameState === 'gameOver' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 text-center">
              <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 mb-2">
                הלוח מלא
              </span>
              <h3 className="text-2xl font-black text-white">המשחק הסתיים!</h3>
              <p className="text-xs text-stone-400 mt-1 mb-4">
                ניקוד סופי: <strong className="text-amber-400 font-mono">{score}</strong>
              </p>
              <button
                onClick={resetGame}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-stone-950 hover:bg-amber-400 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>שחק שוב</span>
              </button>
            </div>
          )}
        </div>

        {/* Side Panel: Next Piece, Score, Lines */}
        <div className="flex flex-col gap-3 w-28 sm:w-32">
          {/* Next Piece Box */}
          <div className="rounded-2xl bg-stone-900/80 p-3 border border-stone-800 text-center">
            <span className="text-[10px] text-stone-400 font-bold block mb-1">החלק הבא</span>
            <canvas
              ref={nextCanvasRef}
              width={70}
              height={70}
              className="mx-auto rounded-lg border border-stone-800 bg-black/50"
            />
          </div>

          {/* Score */}
          <div className="rounded-2xl bg-stone-900/80 p-3 border border-stone-800 text-center">
            <span className="text-[10px] text-stone-400 font-bold block">ניקוד</span>
            <span className="font-mono text-lg font-black text-amber-400">{score}</span>
          </div>

          {/* Lines */}
          <div className="rounded-2xl bg-stone-900/80 p-3 border border-stone-800 text-center">
            <span className="text-[10px] text-stone-400 font-bold block">שורות</span>
            <span className="font-mono text-base font-bold text-cyan-400">{lines}</span>
          </div>

          {/* Level */}
          <div className="rounded-2xl bg-stone-900/80 p-3 border border-stone-800 text-center">
            <span className="text-[10px] text-stone-400 font-bold block">רמה</span>
            <span className="font-mono text-base font-bold text-emerald-400">{level}</span>
          </div>
        </div>
      </div>

      {/* Touch Screen Controls (Mobile Ergonomic Gamepad) */}
      <div className="mt-5 select-none touch-none">
        <div className="flex items-center justify-between gap-3">
          {/* Left / Right / Down D-pad */}
          <div className="grid grid-cols-3 gap-1.5 w-40">
            <div />
            <button
              onClick={rotatePiece}
              className="flex h-12 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-amber-400 active:bg-amber-500 active:text-stone-950 font-bold shadow-md"
              title="סובב"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <div />

            <button
              onClick={moveLeft}
              className="flex h-12 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-stone-700 shadow-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              onClick={softDrop}
              className="flex h-12 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-stone-700 shadow-md"
            >
              <ArrowDown className="h-5 w-5" />
            </button>

            <button
              onClick={moveRight}
              className="flex h-12 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-stone-700 shadow-md"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Action Buttons: Hard Drop & Rotate */}
          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={hardDrop}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-stone-950 active:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Zap className="h-4 w-4 fill-stone-950" />
              <span>הורדה מהירה (רווח)</span>
            </button>
            <button
              onClick={rotatePiece}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 font-bold text-white active:bg-cyan-500 shadow-lg shadow-cyan-600/20 active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
              <span>סיבוב חלק (למעלה)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

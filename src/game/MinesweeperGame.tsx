import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import { Flag, Bomb, RotateCcw, Volume2, VolumeX, Trophy, Clock } from 'lucide-react';

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  neighborMines: number;
}

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number; label: string }> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'מתחיל (9x9)' },
  intermediate: { rows: 14, cols: 14, mines: 30, label: 'בינוני (14x14)' },
  expert: { rows: 14, cols: 20, mines: 50, label: 'מומחה (14x20)' },
};

const NUMBER_COLORS = [
  '',
  'text-blue-400 font-bold',
  'text-emerald-400 font-bold',
  'text-rose-400 font-bold',
  'text-purple-400 font-bold',
  'text-amber-400 font-bold',
  'text-teal-400 font-bold',
  'text-stone-100 font-bold',
  'text-stone-400 font-bold',
];

export const MinesweeperGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [flagsRemaining, setFlagsRemaining] = useState<number>(10);
  const [timer, setTimer] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cfg = CONFIGS[difficulty];

  // Initialize empty grid
  const initBoard = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
    setGameStatus('idle');
    setFlagsRemaining(cfg.mines);

    const newGrid: Cell[][] = [];
    for (let r = 0; r < cfg.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cfg.cols; c++) {
        row.push({
          r,
          c,
          isMine: false,
          revealed: false,
          flagged: false,
          neighborMines: 0,
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, [cfg]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Timer tick
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer((t) => Math.min(999, t + 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  // Populate mines safely (avoid first click)
  const placeMines = (startR: number, startC: number, board: Cell[][]) => {
    let placed = 0;
    while (placed < cfg.mines) {
      const r = Math.floor(Math.random() * cfg.rows);
      const c = Math.floor(Math.random() * cfg.cols);
      // Don't place on first click or if already a mine
      if ((r === startR && c === startC) || board[r][c].isMine) continue;
      board[r][c].isMine = true;
      placed++;
    }

    // Calculate neighbors
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && board[nr][nc].isMine) {
              count++;
            }
          }
        }
        board[r][c].neighborMines = count;
      }
    }
  };

  // Flood fill reveal
  const revealCell = (r: number, c: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;

    let currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

    // First click: generate mines & start timer
    if (gameStatus === 'idle') {
      placeMines(r, c, currentGrid);
      setGameStatus('playing');
    }

    const cell = currentGrid[r][c];
    if (cell.flagged || cell.revealed) return;

    // Hit a mine!
    if (cell.isMine) {
      sound.playExplosion(true);
      // Reveal all mines
      currentGrid.forEach((row) =>
        row.forEach((c) => {
          if (c.isMine) c.revealed = true;
        })
      );
      setGrid(currentGrid);
      setGameStatus('lost');
      return;
    }

    // Safe reveal
    sound.playClick();
    const queue: [number, number][] = [[r, c]];
    cell.revealed = true;

    while (queue.length > 0) {
      const [currR, currC] = queue.shift()!;
      const current = currentGrid[currR][currC];

      if (current.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (
              nr >= 0 &&
              nr < cfg.rows &&
              nc >= 0 &&
              nc < cfg.cols &&
              !currentGrid[nr][nc].revealed &&
              !currentGrid[nr][nc].flagged &&
              !currentGrid[nr][nc].isMine
            ) {
              currentGrid[nr][nc].revealed = true;
              queue.push([nr, nc]);
            }
          }
        }
      }
    }

    // Check Win Condition
    let unrevealedSafe = 0;
    currentGrid.forEach((row) =>
      row.forEach((cell) => {
        if (!cell.isMine && !cell.revealed) unrevealedSafe++;
      })
    );

    if (unrevealedSafe === 0) {
      sound.playLevelUp();
      confetti({ particleCount: 100, spread: 80 });
      setGameStatus('won');
    }

    setGrid(currentGrid);
  };

  // Toggle Flag
  const toggleFlag = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (gameStatus === 'won' || gameStatus === 'lost') return;

    const currentGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const cell = currentGrid[r][c];
    if (cell.revealed) return;

    sound.playClick();
    cell.flagged = !cell.flagged;
    setFlagsRemaining((f) => f + (cell.flagged ? -1 : 1));
    setGrid(currentGrid);
  };

  const handleCellClick = (r: number, c: number) => {
    if (flagMode) {
      toggleFlag(r, c);
    } else {
      revealCell(r, c);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-stone-800 bg-stone-950 p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-stone-800 pb-4 mb-4 gap-3">
        <div>
          <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-500/30">
            WINDOWS NOSTALGIA
          </span>
          <h2 className="text-2xl font-black text-white mt-1">שולה המוקשים (Minesweeper)</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Difficulty picker */}
          <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs">
            {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  difficulty === d
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {d === 'beginner' ? 'קל' : d === 'intermediate' ? 'בינוני' : 'מומחה'}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Classic Retro Windows Bar */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-stone-900 p-3 border border-stone-800">
        {/* Mines left LED display */}
        <div className="flex items-center gap-2 font-mono text-xl font-black bg-stone-950 text-rose-500 px-3 py-1.5 rounded-xl border border-stone-800 tracking-wider">
          <Bomb className="h-4 w-4 text-rose-500" />
          <span>{String(Math.max(0, flagsRemaining)).padStart(3, '0')}</span>
        </div>

        {/* Nostalgic Smiley Button */}
        <button
          onClick={initBoard}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-700 bg-stone-800 text-2xl hover:bg-stone-700 active:scale-95 shadow-inner transition-transform"
          title="משחק חדש"
        >
          {gameStatus === 'won'
            ? '😎'
            : gameStatus === 'lost'
            ? '😵'
            : isPressing
            ? '😮'
            : '😊'}
        </button>

        {/* Timer LED display */}
        <div className="flex items-center gap-2 font-mono text-xl font-black bg-stone-950 text-rose-500 px-3 py-1.5 rounded-xl border border-stone-800 tracking-wider">
          <Clock className="h-4 w-4 text-rose-500" />
          <span>{String(timer).padStart(3, '0')}</span>
        </div>
      </div>

      {/* Flag Mode Toggle Button (Mobile Friendly) */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setFlagMode(!flagMode)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            flagMode
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Flag className={`h-4 w-4 ${flagMode ? 'fill-white' : 'text-rose-400'}`} />
          <span>מצב סימון דגל: {flagMode ? 'פעיל (לחיצה מסמנת דגל)' : 'כבוי (לחיצה חושפת)'}</span>
        </button>

        <span className="text-[11px] text-stone-400 hidden sm:inline">
          💡 מקש ימני בעכבר מציב דגל ישירות
        </span>
      </div>

      {/* The Mines Grid */}
      <div className="overflow-x-auto pb-2 flex justify-center">
        <div
          className="inline-grid gap-1 rounded-2xl bg-stone-900 p-3 border border-stone-800 shadow-inner select-none"
          style={{
            gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))`,
          }}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => toggleFlag(r, c, e)}
                  disabled={cell.revealed && cell.neighborMines === 0}
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                    cell.revealed
                      ? cell.isMine
                        ? 'bg-rose-600 text-white'
                        : 'bg-stone-950 text-white border border-stone-800/80 shadow-inner'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-t border-l border-stone-700 border-b border-r border-stone-900 shadow-sm active:scale-95'
                  }`}
                >
                  {cell.revealed ? (
                    cell.isMine ? (
                      <Bomb className="h-4 w-4" />
                    ) : cell.neighborMines > 0 ? (
                      <span className={NUMBER_COLORS[cell.neighborMines]}>
                        {cell.neighborMines}
                      </span>
                    ) : null
                  ) : cell.flagged ? (
                    <Flag className="h-4 w-4 text-rose-500 fill-rose-500" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

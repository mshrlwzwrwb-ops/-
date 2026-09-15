import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Trophy,
  Play,
  Pause,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 22;

export const SnakeGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [specialFood, setSpecialFood] = useState<Point | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('neon_snake_highscore') || 0);
  });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(110);

  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sound sync
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    while (true) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = currentSnake.some((segment) => segment.x === x && segment.y === y);
      if (!onSnake) {
        return { x, y };
      }
    }
  }, []);

  const resetGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    setSnake(initialSnake);
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setFood(generateFood(initialSnake));
    setSpecialFood(null);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(110);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = directionRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && current.y === 0) {
        directionRef.current = { x: 0, y: -1 };
        setDirection({ x: 0, y: -1 });
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && current.y === 0) {
        directionRef.current = { x: 0, y: 1 };
        setDirection({ x: 0, y: 1 });
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && current.x === 0) {
        directionRef.current = { x: -1, y: 0 };
        setDirection({ x: -1, y: 0 });
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && current.x === 0) {
        directionRef.current = { x: 1, y: 0 };
        setDirection({ x: 1, y: 0 });
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Game tick loop
  useEffect(() => {
    if (isGameOver || isPaused) return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const dir = directionRef.current;
        head.x += dir.x;
        head.y += dir.y;

        // Wrap around walls (portal border)
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;

        // Check self collision
        const hitSelf = prevSnake.some(
          (seg, idx) => idx !== 0 && seg.x === head.x && seg.y === head.y
        );

        if (hitSelf) {
          sound.playHit();
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          sound.playGem();
          setScore((s) => {
            const next = s + 10;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem('neon_snake_highscore', next.toString());
            }
            return next;
          });
          setFood(generateFood(newSnake));

          // Occasional Golden Star food
          if (Math.random() < 0.25 && !specialFood) {
            setSpecialFood(generateFood(newSnake));
          }

          // Gradually speed up
          setSpeed((sp) => Math.max(65, sp - 1.5));
        } else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
          sound.playPowerup();
          confetti({ particleCount: 40, spread: 60 });
          setScore((s) => {
            const next = s + 50;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem('neon_snake_highscore', next.toString());
            }
            return next;
          });
          setSpecialFood(null);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused, food, specialFood, speed, generateFood, highScore]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cellSize = size / GRID_SIZE;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, size, size);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }

    // Draw regular food
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize * 0.38,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw special food (if present)
    if (specialFood) {
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(
        specialFood.x * cellSize + cellSize / 2,
        specialFood.y * cellSize + cellSize / 2,
        cellSize * 0.45,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw snake
    snake.forEach((seg, idx) => {
      const isHead = idx === 0;
      ctx.fillStyle = isHead ? '#22c55e' : '#10b981';
      ctx.shadowColor = isHead ? '#22c55e' : '#10b981';
      ctx.shadowBlur = isHead ? 10 : 4;

      const r = isHead ? 6 : 4;
      const x = seg.x * cellSize + 1.5;
      const y = seg.y * cellSize + 1.5;
      const w = cellSize - 3;
      const h = cellSize - 3;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw eyes on head
      if (isHead) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.35, 2, 0, Math.PI * 2);
        ctx.arc(x + w * 0.65, y + h * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [snake, food, specialFood]);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleArrowClick = (dx: number, dy: number) => {
    const cur = directionRef.current;
    if (dx !== 0 && cur.x === 0) {
      directionRef.current = { x: dx, y: 0 };
      setDirection({ x: dx, y: 0 });
    } else if (dy !== 0 && cur.y === 0) {
      directionRef.current = { x: 0, y: dy };
      setDirection({ x: 0, y: dy });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      handleArrowClick(Math.sign(dx), 0);
    } else if (Math.abs(dy) > 20) {
      handleArrowClick(0, Math.sign(dy));
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-stone-800 bg-stone-950 p-6 shadow-2xl text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
        <div>
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
            NEON CYBER ARCADE
          </span>
          <h2 className="text-2xl font-black text-white mt-1">סנייק ניאון (Cyber Snake)</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">ניקוד</span>
            <span className="font-mono text-lg font-black text-emerald-400">{score}</span>
          </div>

          <div className="text-right border-r border-stone-800 pr-3">
            <span className="text-[10px] text-stone-500 block">שיא</span>
            <span className="font-mono text-sm font-bold text-amber-400">{highScore}</span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Canvas Area with overlays (Touch swipe enabled) */}
      <div
        className="relative aspect-square w-full rounded-2xl overflow-hidden border border-stone-800 bg-black flex items-center justify-center touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} width={480} height={480} className="w-full h-full block" />

        {isGameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-6 text-center animate-in zoom-in-95">
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 mb-2">
              פסילה
            </span>
            <h3 className="text-3xl font-black text-white">המשחק הסתיים!</h3>
            <p className="text-sm text-stone-400 mt-1 mb-4">
              צברת <strong className="text-emerald-400 font-mono">{score}</strong> נקודות
            </p>

            <button
              onClick={resetGame}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-stone-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
              <span>שחק שוב</span>
            </button>
          </div>
        )}

        {isPaused && !isGameOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs">
            <h3 className="text-2xl font-black text-white mb-3">משחק מושהה</h3>
            <button
              onClick={() => setIsPaused(false)}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-bold text-stone-950 hover:bg-emerald-400"
            >
              <Play className="h-4 w-4 fill-stone-950" />
              <span>המשך</span>
            </button>
          </div>
        )}
      </div>

      {/* On-screen Direction Arrows (Great for Mobile and Touch) */}
      <div className="mt-4 flex flex-col items-center gap-1.5 sm:hidden">
        <button
          onClick={() => handleArrowClick(0, -1)}
          className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300 active:bg-stone-800 active:scale-95"
        >
          <ArrowUp className="h-6 w-6" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => handleArrowClick(-1, 0)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300 active:bg-stone-800 active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => handleArrowClick(0, 1)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300 active:bg-stone-800 active:scale-95"
          >
            <ArrowDown className="h-6 w-6" />
          </button>
          <button
            onClick={() => handleArrowClick(1, 0)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300 active:bg-stone-800 active:scale-95"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-stone-400 hidden sm:block">
        🎮 השתמש במקשי <strong>החיצים</strong> או <strong>WASD</strong> לניווט הנחש, ו-<strong>רווח</strong> להשהיה.
      </div>
    </div>
  );
};

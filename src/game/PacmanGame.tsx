import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Heart,
} from 'lucide-react';

const TILE_SIZE = 20;

// 1 = Wall, 0 = Dot, 2 = Power Pellet, 3 = Empty/Ghost house
const MAZE_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 3, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1],
  [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3],
  [1, 1, 1, 1, 0, 1, 3, 1, 1, 3, 1, 1, 3, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 3, 1, 1, 1, 1, 1, 3, 1, 0, 1, 1, 1, 1],
  [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3],
  [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 2, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 2, 1],
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface Ghost {
  id: string;
  x: number;
  y: number;
  color: string;
  dirX: number;
  dirY: number;
  frightened: boolean;
}

export const PacmanGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'playing' | 'gameOver' | 'win'>('playing');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('pacman_high_score') || 0);
  });

  // Game internal state
  const mapRef = useRef<number[][]>(MAZE_MAP.map((r) => [...r]));
  const pacmanRef = useRef<{
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    nextDirX: number;
    nextDirY: number;
    mouthAngle: number;
    mouthSpeed: number;
  }>({
    x: 9 * TILE_SIZE,
    y: 16 * TILE_SIZE,
    dirX: 0,
    dirY: 0,
    nextDirX: 0,
    nextDirY: 0,
    mouthAngle: 0.2,
    mouthSpeed: 0.04,
  });

  const ghostsRef = useRef<Ghost[]>([
    { id: 'blinky', x: 9 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#ef4444', dirX: 1, dirY: 0, frightened: false },
    { id: 'pinky', x: 8 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#f472b6', dirX: -1, dirY: 0, frightened: false },
    { id: 'inky', x: 10 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#06b6d4', dirX: 0, dirY: -1, frightened: false },
  ]);

  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animIdRef = useRef<number | null>(null);

  // Touch gesture start
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetBoard = useCallback(() => {
    mapRef.current = MAZE_MAP.map((r) => [...r]);
    pacmanRef.current = {
      x: 9 * TILE_SIZE,
      y: 16 * TILE_SIZE,
      dirX: 0,
      dirY: 0,
      nextDirX: 0,
      nextDirY: 0,
      mouthAngle: 0.2,
      mouthSpeed: 0.04,
    };
    ghostsRef.current = [
      { id: 'blinky', x: 9 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#ef4444', dirX: 1, dirY: 0, frightened: false },
      { id: 'pinky', x: 8 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#f472b6', dirX: -1, dirY: 0, frightened: false },
      { id: 'inky', x: 10 * TILE_SIZE, y: 8 * TILE_SIZE, color: '#06b6d4', dirX: 0, dirY: -1, frightened: false },
    ];
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, []);

  const setNextDirection = useCallback((dx: number, dy: number) => {
    pacmanRef.current.nextDirX = dx;
    pacmanRef.current.nextDirY = dy;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setNextDirection(0, -1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setNextDirection(0, 1);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setNextDirection(-1, 0);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        setNextDirection(1, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNextDirection]);

  // Touch swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      setNextDirection(Math.sign(dx), 0);
    } else if (Math.abs(dy) > 20) {
      setNextDirection(0, Math.sign(dy));
    }
  };

  // Main 60 FPS Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const isWall = (x: number, y: number): boolean => {
      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);
      const map = mapRef.current;
      if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) {
        return false; // Tunnel passage
      }
      return map[tileY][tileX] === 1;
    };

    const loop = () => {
      if (!running) return;

      const pacman = pacmanRef.current;
      const speed = 2.5;

      // UPDATE PHASE
      if (gameState === 'playing') {
        // Mouth animation
        pacman.mouthAngle += pacman.mouthSpeed;
        if (pacman.mouthAngle > 0.45 || pacman.mouthAngle < 0.05) {
          pacman.mouthSpeed = -pacman.mouthSpeed;
        }

        // Try apply next direction at tile center
        const isAligned = Math.floor(pacman.x) % TILE_SIZE === 0 && Math.floor(pacman.y) % TILE_SIZE === 0;
        if (isAligned || (pacman.dirX === -pacman.nextDirX && pacman.dirY === -pacman.nextDirY)) {
          const testX = pacman.x + pacman.nextDirX * speed;
          const testY = pacman.y + pacman.nextDirY * speed;
          if (!isWall(testX + (pacman.nextDirX > 0 ? TILE_SIZE - 1 : 0), testY + (pacman.nextDirY > 0 ? TILE_SIZE - 1 : 0))) {
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = pacman.nextDirY;
          }
        }

        // Move Pacman
        const nextX = pacman.x + pacman.dirX * speed;
        const nextY = pacman.y + pacman.dirY * speed;

        // Check wall in current dir
        const cornerX = nextX + (pacman.dirX > 0 ? TILE_SIZE - 1 : 0);
        const cornerY = nextY + (pacman.dirY > 0 ? TILE_SIZE - 1 : 0);

        if (!isWall(cornerX, cornerY)) {
          pacman.x = nextX;
          pacman.y = nextY;
        }

        // Wrap around side tunnels
        const totalW = mapRef.current[0].length * TILE_SIZE;
        if (pacman.x < -TILE_SIZE / 2) pacman.x = totalW - TILE_SIZE / 2;
        if (pacman.x > totalW - TILE_SIZE / 2) pacman.x = -TILE_SIZE / 2;

        // Eat dots
        const centerTileX = Math.floor((pacman.x + TILE_SIZE / 2) / TILE_SIZE);
        const centerTileY = Math.floor((pacman.y + TILE_SIZE / 2) / TILE_SIZE);

        if (
          centerTileY >= 0 &&
          centerTileY < mapRef.current.length &&
          centerTileX >= 0 &&
          centerTileX < mapRef.current[0].length
        ) {
          const tile = mapRef.current[centerTileY][centerTileX];
          if (tile === 0) {
            // Normal dot
            mapRef.current[centerTileY][centerTileX] = 3;
            sound.playChomp();
            setScore((s) => {
              const ns = s + 10;
              if (ns > highScore) {
                setHighScore(ns);
                localStorage.setItem('pacman_high_score', ns.toString());
              }
              return ns;
            });
          } else if (tile === 2) {
            // Power pellet
            mapRef.current[centerTileY][centerTileX] = 3;
            sound.playPowerup();
            setScore((s) => s + 50);

            // Make ghosts frightened
            ghostsRef.current.forEach((g) => (g.frightened = true));
            if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
            powerTimerRef.current = setTimeout(() => {
              ghostsRef.current.forEach((g) => (g.frightened = false));
            }, 7000);
          }
        }

        // Check if all dots eaten (Win)
        let remainingDots = 0;
        mapRef.current.forEach((row) =>
          row.forEach((t) => {
            if (t === 0 || t === 2) remainingDots++;
          })
        );
        if (remainingDots === 0) {
          sound.playLevelUp();
          confetti({ particleCount: 100, spread: 80 });
          setGameState('win');
        }

        // Move Ghosts
        const ghostSpeed = 1.8;
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];

        for (const ghost of ghostsRef.current) {
          const gAligned = Math.floor(ghost.x) % TILE_SIZE === 0 && Math.floor(ghost.y) % TILE_SIZE === 0;

          if (gAligned) {
            // Pick valid directions (don't reverse unless dead end)
            const valid = dirs.filter(
              (d) =>
                !(d.x === -ghost.dirX && d.y === -ghost.dirY) &&
                !isWall(
                  ghost.x + d.x * TILE_SIZE + (d.x > 0 ? TILE_SIZE - 1 : 0),
                  ghost.y + d.y * TILE_SIZE + (d.y > 0 ? TILE_SIZE - 1 : 0)
                )
            );

            if (valid.length > 0) {
              const chosen = valid[Math.floor(Math.random() * valid.length)];
              ghost.dirX = chosen.x;
              ghost.dirY = chosen.y;
            } else {
              ghost.dirX = -ghost.dirX;
              ghost.dirY = -ghost.dirY;
            }
          }

          ghost.x += ghost.dirX * ghostSpeed;
          ghost.y += ghost.dirY * ghostSpeed;

          // Ghost touch Pacman
          const dist = Math.hypot(
            pacman.x + TILE_SIZE / 2 - (ghost.x + TILE_SIZE / 2),
            pacman.y + TILE_SIZE / 2 - (ghost.y + TILE_SIZE / 2)
          );

          if (dist < 14) {
            if (ghost.frightened) {
              // Eat ghost
              sound.playGem();
              setScore((s) => s + 200);
              ghost.x = 9 * TILE_SIZE;
              ghost.y = 8 * TILE_SIZE;
              ghost.frightened = false;
            } else {
              // Pacman dies
              sound.playHit();
              const newLives = lives - 1;
              setLives(newLives);

              if (newLives <= 0) {
                sound.playGameOver();
                setGameState('gameOver');
              } else {
                pacman.x = 9 * TILE_SIZE;
                pacman.y = 16 * TILE_SIZE;
                pacman.dirX = 0;
                pacman.dirY = 0;
              }
            }
          }
        }
      }

      // RENDER PHASE
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const map = mapRef.current;
      for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
          const tile = map[r][c];
          const tx = c * TILE_SIZE;
          const ty = r * TILE_SIZE;

          if (tile === 1) {
            // Neon blue wall
            ctx.strokeStyle = '#2563eb';
            ctx.fillStyle = '#1e3a8a';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          } else if (tile === 0) {
            // Yellow dot
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === 2) {
            // Power pellet
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Pacman
      ctx.save();
      ctx.translate(pacman.x + TILE_SIZE / 2, pacman.y + TILE_SIZE / 2);
      let angle = 0;
      if (pacman.dirX === 1) angle = 0;
      else if (pacman.dirX === -1) angle = Math.PI;
      else if (pacman.dirY === 1) angle = Math.PI / 2;
      else if (pacman.dirY === -1) angle = -Math.PI / 2;
      ctx.rotate(angle);

      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, TILE_SIZE / 2 - 1, pacman.mouthAngle * Math.PI, (2 - pacman.mouthAngle) * Math.PI);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Draw Ghosts
      for (const ghost of ghostsRef.current) {
        ctx.fillStyle = ghost.frightened ? '#38bdf8' : ghost.color;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;

        const gx = ghost.x + 2;
        const gy = ghost.y + 2;
        const gw = TILE_SIZE - 4;

        ctx.beginPath();
        ctx.arc(gx + gw / 2, gy + gw / 2, gw / 2, Math.PI, 0, false);
        ctx.lineTo(gx + gw, gy + gw);
        ctx.lineTo(gx + (gw * 3) / 4, gy + gw - 3);
        ctx.lineTo(gx + gw / 2, gy + gw);
        ctx.lineTo(gx + gw / 4, gy + gw - 3);
        ctx.lineTo(gx, gy + gw);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ghost eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(gx + 5, gy + 6, 3, 0, Math.PI * 2);
        ctx.arc(gx + gw - 5, gy + 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(gx + 5, gy + 6, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + gw - 5, gy + 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, highScore, lives]);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-stone-800 bg-stone-950 p-4 sm:p-6 text-white shadow-2xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
        <div>
          <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-[11px] font-bold text-yellow-400 border border-yellow-500/30">
            PAC-MAZE 1980
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">פקמן רטרו (Pac-Maze)</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">ניקוד</span>
            <span className="font-mono text-base font-black text-amber-400">{score}</span>
          </div>

          <div className="text-right border-r border-stone-800 pr-2">
            <span className="text-[10px] text-stone-500 block">פסילות</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < lives ? 'text-yellow-400 fill-yellow-400' : 'text-stone-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Screen Canvas (Supports Touch Gestures) */}
      <div
        className="relative aspect-19/20 w-full rounded-2xl overflow-hidden border-2 border-stone-800 bg-black touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={MAZE_MAP[0].length * TILE_SIZE}
          height={MAZE_MAP.length * TILE_SIZE}
          className="w-full h-full block"
        />

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-white mb-2">רוחות החושך תפסו אותך!</h3>
            <p className="text-sm text-stone-400 mb-5">
              צברת <strong className="text-amber-400 font-mono">{score}</strong> נקודות
            </p>
            <button
              onClick={resetBoard}
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-2.5 font-bold text-stone-950 hover:bg-yellow-300 active:scale-95 shadow-lg shadow-yellow-400/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>שחק שוב</span>
            </button>
          </div>
        )}

        {gameState === 'win' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <Sparkles className="h-12 w-12 text-yellow-400 mb-2 animate-bounce" />
            <h3 className="text-3xl font-black text-white mb-2">ניצחת! ניקית את כל המבוך!</h3>
            <p className="text-sm text-stone-400 mb-5">
              ניקוד סופי: <strong className="text-amber-400 font-mono">{score}</strong>
            </p>
            <button
              onClick={resetBoard}
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-2.5 font-bold text-stone-950 hover:bg-yellow-300 active:scale-95 shadow-lg shadow-yellow-400/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>שחק שוב</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch Screen D-pad (Ergonomic for Phone) */}
      <div className="mt-4 flex flex-col items-center select-none touch-none">
        <button
          onClick={() => setNextDirection(0, -1)}
          className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-yellow-400 active:text-stone-950 font-bold shadow-md mb-1"
        >
          <ArrowUp className="h-6 w-6" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setNextDirection(-1, 0)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-yellow-400 active:text-stone-950 font-bold shadow-md"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <button
            onClick={() => setNextDirection(0, 1)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-yellow-400 active:text-stone-950 font-bold shadow-md"
          >
            <ArrowDown className="h-6 w-6" />
          </button>

          <button
            onClick={() => setNextDirection(1, 0)}
            className="flex h-12 w-14 items-center justify-center rounded-xl bg-stone-900 border border-stone-700 text-white active:bg-yellow-400 active:text-stone-950 font-bold shadow-md"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-stone-400">
        👆 החלק על גבי המסך או השתמש במקשים / כפתורי החצים כדי לנווט
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Shield,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface Invader {
  id: number;
  x: number;
  y: number;
  row: number;
  col: number;
  type: 1 | 2 | 3;
  alive: boolean;
  points: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isEnemy: boolean;
}

interface BunkerPixel {
  x: number;
  y: number;
  alive: boolean;
}

export const SpaceInvadersGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'win'>('playing');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('invaders_high_score') || 0);
  });

  // Game internal refs
  const playerRef = useRef<{ x: number; y: number; w: number; h: number; speed: number }>({
    x: 275,
    y: 440,
    w: 36,
    h: 18,
    speed: 5.5,
  });

  const invadersRef = useRef<Invader[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const bunkersRef = useRef<BunkerPixel[]>([]);
  const ufoRef = useRef<{ x: number; y: number; active: boolean; dir: number } | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const invaderDirRef = useRef<number>(1);
  const invaderStepTimerRef = useRef<number>(0);
  const invaderStepCounterRef = useRef<number>(0);
  const lastShootTimeRef = useRef<number>(0);
  const animIdRef = useRef<number | null>(null);

  // Initialize Invaders Grid
  const initInvaders = useCallback((waveNum: number) => {
    const rows = 5;
    const cols = 10;
    const invaders: Invader[] = [];
    const startX = 60;
    const startY = 60 + Math.min(waveNum * 10, 40);
    const spacingX = 45;
    const spacingY = 32;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: 1 | 2 | 3 = 1;
        let pts = 10;
        if (r === 0) {
          type = 3; // top row
          pts = 30;
        } else if (r <= 2) {
          type = 2; // middle rows
          pts = 20;
        }

        invaders.push({
          id: id++,
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          row: r,
          col: c,
          type,
          alive: true,
          points: pts,
        });
      }
    }
    invadersRef.current = invaders;
    invaderDirRef.current = 1;
  }, []);

  // Initialize Defensive Bunkers
  const initBunkers = useCallback((canvasWidth = 600, canvasHeight = 480) => {
    const bunkerCount = 4;
    const bunkerW = 44;
    const bunkerH = 30;
    const spacing = canvasWidth / (bunkerCount + 1);
    const baseY = canvasHeight - 90;
    const pixels: BunkerPixel[] = [];

    for (let b = 1; b <= bunkerCount; b++) {
      const bx = b * spacing - bunkerW / 2;
      for (let x = 0; x < bunkerW; x += 4) {
        for (let y = 0; y < bunkerH; y += 4) {
          // Arch notch in bottom center
          if (y > 18 && x > 12 && x < bunkerW - 12) continue;
          pixels.push({ x: bx + x, y: baseY + y, alive: true });
        }
      }
    }
    bunkersRef.current = pixels;
  }, []);

  const initGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setWave(1);
    initInvaders(1);
    initBunkers();
    bulletsRef.current = [];
    ufoRef.current = null;
    playerRef.current.x = 280;
    setGameState('playing');
  }, [initInvaders, initBunkers]);

  useEffect(() => {
    initInvaders(wave);
    initBunkers();
  }, [wave, initInvaders, initBunkers]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const shootPlayerBullet = () => {
    const now = performance.now();
    if (now - lastShootTimeRef.current < 350) return;
    // Check if max 2 player bullets on screen
    const playerBullets = bulletsRef.current.filter((b) => !b.isEnemy);
    if (playerBullets.length >= 2) return;

    lastShootTimeRef.current = now;
    sound.playShoot();
    bulletsRef.current.push({
      x: playerRef.current.x + playerRef.current.w / 2,
      y: playerRef.current.y - 4,
      vy: -9,
      isEnemy: false,
    });
  };

  // Main 60 FPS Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const loop = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      const player = playerRef.current;

      if (gameState === 'playing') {
        // Player movement
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
          player.x = Math.max(10, player.x - player.speed);
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
          player.x = Math.min(width - player.w - 10, player.x + player.speed);
        }
        if (keysRef.current['Space']) {
          shootPlayerBullet();
        }

        // Invaders march timing
        const aliveInvaders = invadersRef.current.filter((inv) => inv.alive);
        if (aliveInvaders.length === 0) {
          // Wave Win!
          sound.playLevelUp();
          confetti({ particleCount: 80, spread: 70 });
          setWave((w) => w + 1);
          initInvaders(wave + 1);
          return;
        }

        // Speed increases as invaders decrease
        const speedInterval = Math.max(8, Math.floor((aliveInvaders.length / 50) * 35));
        invaderStepTimerRef.current++;

        if (invaderStepTimerRef.current >= speedInterval) {
          invaderStepTimerRef.current = 0;
          invaderStepCounterRef.current++;
          sound.playInvaderStep(invaderStepCounterRef.current);

          // Check if hitting wall
          let hitEdge = false;
          for (const inv of aliveInvaders) {
            if (invaderDirRef.current === 1 && inv.x + 30 >= width - 15) {
              hitEdge = true;
              break;
            }
            if (invaderDirRef.current === -1 && inv.x <= 15) {
              hitEdge = true;
              break;
            }
          }

          if (hitEdge) {
            invaderDirRef.current *= -1;
            // Drop down
            for (const inv of invadersRef.current) {
              inv.y += 18;
              // If reached player level, game over!
              if (inv.alive && inv.y >= player.y - 20) {
                sound.playGameOver();
                setGameState('gameOver');
                return;
              }
            }
          } else {
            // Step sideways
            for (const inv of invadersRef.current) {
              inv.x += invaderDirRef.current * 10;
            }
          }

          // Random invader shooting
          if (Math.random() < 0.45 && bulletsRef.current.filter((b) => b.isEnemy).length < 4) {
            const randomShooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
            if (randomShooter) {
              bulletsRef.current.push({
                x: randomShooter.x + 14,
                y: randomShooter.y + 18,
                vy: 4.5,
                isEnemy: true,
              });
            }
          }
        }

        // Random UFO mothership flying across
        if (!ufoRef.current && Math.random() < 0.003) {
          ufoRef.current = {
            x: -40,
            y: 35,
            active: true,
            dir: 1,
          };
        } else if (ufoRef.current) {
          ufoRef.current.x += 2.5;
          if (ufoRef.current.x > width + 40) {
            ufoRef.current = null;
          }
        }

        // Update Bullets
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const b = bulletsRef.current[i];
          b.y += b.vy;

          // Out of bounds
          if (b.y < 0 || b.y > height) {
            bulletsRef.current.splice(i, 1);
            continue;
          }

          // Check Bunker collisions
          let hitBunker = false;
          for (const bp of bunkersRef.current) {
            if (bp.alive && Math.hypot(b.x - (bp.x + 2), b.y - (bp.y + 2)) < 6) {
              bp.alive = false;
              hitBunker = true;
              break;
            }
          }
          if (hitBunker) {
            bulletsRef.current.splice(i, 1);
            continue;
          }

          if (!b.isEnemy) {
            // Player bullet hitting UFO
            if (
              ufoRef.current &&
              Math.hypot(b.x - (ufoRef.current.x + 20), b.y - (ufoRef.current.y + 10)) < 18
            ) {
              sound.playExplosion();
              confetti({ particleCount: 30 });
              setScore((s) => s + 300);
              ufoRef.current = null;
              bulletsRef.current.splice(i, 1);
              continue;
            }

            // Player bullet hitting Invader
            let hit = false;
            for (const inv of aliveInvaders) {
              if (b.x >= inv.x && b.x <= inv.x + 26 && b.y >= inv.y && b.y <= inv.y + 20) {
                inv.alive = false;
                hit = true;
                sound.playExplosion(false);
                setScore((s) => {
                  const ns = s + inv.points;
                  if (ns > highScore) {
                    setHighScore(ns);
                    localStorage.setItem('invaders_high_score', ns.toString());
                  }
                  return ns;
                });
                break;
              }
            }
            if (hit) {
              bulletsRef.current.splice(i, 1);
              continue;
            }
          } else {
            // Enemy bullet hitting Player
            if (
              b.x >= player.x &&
              b.x <= player.x + player.w &&
              b.y >= player.y &&
              b.y <= player.y + player.h
            ) {
              sound.playHit();
              bulletsRef.current.splice(i, 1);
              const newLives = lives - 1;
              setLives(newLives);

              if (newLives <= 0) {
                sound.playGameOver();
                setGameState('gameOver');
              }
              continue;
            }
          }
        }
      }

      // RENDER PHASE
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Draw Green floor line
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 25);
      ctx.lineTo(width, height - 25);
      ctx.stroke();

      // Draw UFO if active
      if (ufoRef.current) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(ufoRef.current.x + 20, ufoRef.current.y + 10, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(ufoRef.current.x + 20, ufoRef.current.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Invaders
      const step = invaderStepCounterRef.current % 2;
      for (const inv of invadersRef.current) {
        if (!inv.alive) continue;

        ctx.fillStyle = inv.type === 3 ? '#a855f7' : inv.type === 2 ? '#06b6d4' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 4;

        // Pixel-like invader drawing
        const x = inv.x;
        const y = inv.y;

        ctx.fillRect(x + 4, y + 2, 16, 12);
        // Invader eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 7, y + 5, 3, 3);
        ctx.fillRect(x + 14, y + 5, 3, 3);

        // Antennae / legs animate
        ctx.fillStyle = inv.type === 3 ? '#a855f7' : inv.type === 2 ? '#06b6d4' : '#22c55e';
        if (step === 0) {
          ctx.fillRect(x + 2, y + 14, 4, 4);
          ctx.fillRect(x + 18, y + 14, 4, 4);
        } else {
          ctx.fillRect(x + 5, y + 14, 4, 4);
          ctx.fillRect(x + 15, y + 14, 4, 4);
        }
        ctx.shadowBlur = 0;
      }

      // Draw Bunkers
      ctx.fillStyle = '#22c55e';
      for (const bp of bunkersRef.current) {
        if (bp.alive) {
          ctx.fillRect(bp.x, bp.y, 4, 4);
        }
      }

      // Draw Player Cannon
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(player.x, player.y + 6, player.w, player.h - 6, 3);
      ctx.fill();
      ctx.fillRect(player.x + player.w / 2 - 3, player.y, 6, 8);
      ctx.shadowBlur = 0;

      // Draw Bullets
      for (const b of bulletsRef.current) {
        ctx.fillStyle = b.isEnemy ? '#ef4444' : '#38bdf8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x - 1.5, b.y, 3, 10);
        ctx.shadowBlur = 0;
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, wave, highScore, lives, initInvaders]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-800 bg-stone-950 p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
        <div>
          <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/30">
            CLASSIC 1978 ARCADE
          </span>
          <h2 className="text-2xl font-black text-white mt-1">פולשי החלל (Space Invaders)</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">גל</span>
            <span className="font-mono text-sm font-bold text-purple-400">גל {wave}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">ניקוד</span>
            <span className="font-mono text-lg font-black text-amber-400">{score}</span>
          </div>

          <div className="text-right border-r border-stone-800 pr-3">
            <span className="text-[10px] text-stone-500 block">חיים</span>
            <span className="font-mono text-sm font-bold text-emerald-400">{lives} x 🚀</span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-purple-400" />}
          </button>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-stone-800 bg-black">
        <canvas ref={canvasRef} width={600} height={460} className="w-full h-full block" />

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 mb-2">
              הפולשים ניצחו
            </span>
            <h3 className="text-3xl font-black text-white">המשחק הסתיים!</h3>
            <p className="text-sm text-stone-400 mt-1 mb-4">
              ניקוד סופי: <strong className="text-amber-400 font-mono">{score}</strong>
            </p>
            <button
              onClick={initGame}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>נסה שוב</span>
            </button>
          </div>
        )}
      </div>

      {/* On-screen controls for mobile & touch */}
      <div className="mt-4 flex items-center justify-between select-none touch-none">
        <div className="flex gap-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              keysRef.current['ArrowLeft'] = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current['ArrowLeft'] = false;
            }}
            onPointerLeave={() => {
              keysRef.current['ArrowLeft'] = false;
            }}
            className="flex h-14 w-16 items-center justify-center rounded-2xl bg-stone-900 border border-stone-700 text-white active:bg-purple-600 active:scale-95 shadow-md"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              keysRef.current['ArrowRight'] = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              keysRef.current['ArrowRight'] = false;
            }}
            onPointerLeave={() => {
              keysRef.current['ArrowRight'] = false;
            }}
            className="flex h-14 w-16 items-center justify-center rounded-2xl bg-stone-900 border border-stone-700 text-white active:bg-purple-600 active:scale-95 shadow-md"
          >
            <ArrowRight className="h-7 w-7" />
          </button>
        </div>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            shootPlayerBullet();
          }}
          className="flex items-center gap-2 rounded-2xl bg-purple-600 px-8 py-4 font-black text-white active:bg-purple-500 active:scale-95 shadow-lg shadow-purple-600/30"
        >
          <Flame className="h-6 w-6" />
          <span className="text-base">ירי!</span>
        </button>
      </div>

      <div className="mt-3 text-center text-xs text-stone-400 hidden sm:block">
        🎮 מקשי <strong>חיצים</strong> או <strong>A / D</strong> לתנועה, ו-<strong>רווח</strong> לירי לעבר הפולשים והחללית האדומה!
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Trophy,
  Sparkles,
  Zap,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFireball?: boolean;
}

interface Brick {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hp: number;
  maxHp: number;
  points: number;
  powerup?: 'multiball' | 'laser' | 'expand' | 'fireball';
}

interface FallingPowerup {
  id: number;
  x: number;
  y: number;
  type: 'multiball' | 'laser' | 'expand' | 'fireball';
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export const BreakoutGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'levelClear' | 'gameOver'>('ready');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [level, setLevel] = useState<number>(1);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);

  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('breakout_high_score') || 0);
  });

  // Game internal refs
  const paddleRef = useRef<{ x: number; y: number; w: number; h: number; speed: number }>({
    x: 250,
    y: 480,
    w: 90,
    h: 12,
    speed: 7,
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerupsRef = useRef<FallingPowerup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animIdRef = useRef<number | null>(null);

  // Initialize level bricks
  const buildBricks = useCallback((lvl: number, canvasWidth = 600) => {
    const rows = 5 + Math.min(lvl, 3);
    const cols = 8;
    const padding = 6;
    const topOffset = 60;
    const brickW = (canvasWidth - (cols + 1) * padding) / cols;
    const brickH = 20;

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
    const bricks: Brick[] = [];
    let id = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = colors[r % colors.length];
        const hp = r === 0 && lvl > 1 ? 2 : 1;
        const rand = Math.random();
        let powerup: Brick['powerup'] = undefined;
        if (rand < 0.12) powerup = 'multiball';
        else if (rand < 0.2) powerup = 'expand';
        else if (rand < 0.28) powerup = 'fireball';

        bricks.push({
          id: id++,
          x: padding + c * (brickW + padding),
          y: topOffset + r * (brickH + padding),
          w: brickW,
          h: brickH,
          color,
          hp,
          maxHp: hp,
          points: (rows - r) * 10,
          powerup,
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const resetBallAndPaddle = useCallback((canvasWidth = 600, canvasHeight = 520) => {
    paddleRef.current = {
      x: canvasWidth / 2 - 45,
      y: canvasHeight - 35,
      w: 90,
      h: 12,
      speed: 8,
    };
    ballsRef.current = [
      {
        x: canvasWidth / 2,
        y: canvasHeight - 55,
        vx: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 1.5),
        vy: -4.5,
        radius: 6,
        isFireball: false,
      },
    ];
    powerupsRef.current = [];
    setActivePowerup(null);
  }, []);

  const startNewGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setLevel(1);
    buildBricks(1);
    resetBallAndPaddle();
    setGameState('ready');
  }, [buildBricks, resetBallAndPaddle]);

  useEffect(() => {
    buildBricks(level);
    resetBallAndPaddle();
  }, [level, buildBricks, resetBallAndPaddle]);

  // Keyboard and mouse controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') {
        if (gameState === 'ready') {
          setGameState('playing');
        } else if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
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
  }, [gameState]);

  // Paddle drag / mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const paddle = paddleRef.current;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, mouseX - paddle.w / 2));
    if (gameState === 'ready') {
      ballsRef.current[0].x = paddle.x + paddle.w / 2;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const paddle = paddleRef.current;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, touchX - paddle.w / 2));
    if (gameState === 'ready') {
      ballsRef.current[0].x = paddle.x + paddle.w / 2;
    }
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
      const paddle = paddleRef.current;

      // UPDATE PHASE
      if (gameState === 'playing') {
        // Paddle keyboard motion
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
          paddle.x = Math.max(0, paddle.x - paddle.speed);
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
          paddle.x = Math.min(width - paddle.w, paddle.x + paddle.speed);
        }

        // Falling powerups
        for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
          const pup = powerupsRef.current[i];
          pup.y += pup.vy;

          // Catch powerup
          if (
            pup.y + 10 >= paddle.y &&
            pup.y - 10 <= paddle.y + paddle.h &&
            pup.x >= paddle.x &&
            pup.x <= paddle.x + paddle.w
          ) {
            sound.playPowerup();
            setActivePowerup(pup.type);

            if (pup.type === 'multiball') {
              const currentBall = ballsRef.current[0] || { x: paddle.x + paddle.w / 2, y: paddle.y - 10 };
              ballsRef.current.push(
                { x: currentBall.x, y: currentBall.y, vx: -3.5, vy: -4, radius: 6 },
                { x: currentBall.x, y: currentBall.y, vx: 3.5, vy: -4, radius: 6 }
              );
            } else if (pup.type === 'expand') {
              paddle.w = 140;
              setTimeout(() => {
                paddleRef.current.w = 90;
              }, 9000);
            } else if (pup.type === 'fireball') {
              ballsRef.current.forEach((b) => (b.isFireball = true));
              setTimeout(() => {
                ballsRef.current.forEach((b) => (b.isFireball = false));
              }, 8000);
            }

            powerupsRef.current.splice(i, 1);
            continue;
          }

          if (pup.y > height) {
            powerupsRef.current.splice(i, 1);
          }
        }

        // Balls update & collision
        for (let i = ballsRef.current.length - 1; i >= 0; i--) {
          const b = ballsRef.current[i];
          b.x += b.vx;
          b.y += b.vy;

          // Wall bounces
          if (b.x - b.radius <= 0) {
            b.x = b.radius;
            b.vx = Math.abs(b.vx);
            sound.playPaddleBeep(false);
          } else if (b.x + b.radius >= width) {
            b.x = width - b.radius;
            b.vx = -Math.abs(b.vx);
            sound.playPaddleBeep(false);
          }

          if (b.y - b.radius <= 0) {
            b.y = b.radius;
            b.vy = Math.abs(b.vy);
            sound.playPaddleBeep(false);
          }

          // Paddle bounce
          if (
            b.y + b.radius >= paddle.y &&
            b.y - b.radius <= paddle.y + paddle.h &&
            b.x >= paddle.x &&
            b.x <= paddle.x + paddle.w &&
            b.vy > 0
          ) {
            b.y = paddle.y - b.radius;
            // Calculate bounce angle based on where it hit paddle
            const hitOffset = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            const speed = Math.hypot(b.vx, b.vy);
            const maxAngle = (Math.PI / 180) * 60; // 60 degrees max
            const angle = hitOffset * maxAngle;

            b.vx = speed * Math.sin(angle);
            b.vy = -Math.abs(speed * Math.cos(angle));
            sound.playPaddleBeep(true);
          }

          // Brick collision
          for (let j = bricksRef.current.length - 1; j >= 0; j--) {
            const br = bricksRef.current[j];
            if (
              b.x + b.radius >= br.x &&
              b.x - b.radius <= br.x + br.w &&
              b.y + b.radius >= br.y &&
              b.y - b.radius <= br.y + br.h
            ) {
              // Hit brick!
              sound.playBrickBreak();
              br.hp--;

              // Particles
              for (let p = 0; p < 8; p++) {
                particlesRef.current.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  color: br.color,
                  life: 25,
                });
              }

              if (!b.isFireball) {
                // Determine collision side
                const prevX = b.x - b.vx;
                if (prevX < br.x || prevX > br.x + br.w) {
                  b.vx = -b.vx;
                } else {
                  b.vy = -b.vy;
                }
              }

              if (br.hp <= 0) {
                setScore((s) => {
                  const ns = s + br.points;
                  if (ns > highScore) {
                    setHighScore(ns);
                    localStorage.setItem('breakout_high_score', ns.toString());
                  }
                  return ns;
                });

                if (br.powerup) {
                  powerupsRef.current.push({
                    id: Math.random(),
                    x: br.x + br.w / 2,
                    y: br.y + br.h,
                    type: br.powerup,
                    vy: 2.2,
                  });
                }

                bricksRef.current.splice(j, 1);
              }
              break;
            }
          }

          // Ball falls off bottom
          if (b.y - b.radius > height) {
            ballsRef.current.splice(i, 1);
          }
        }

        // If all balls lost
        if (ballsRef.current.length === 0) {
          sound.playHit();
          const newLives = lives - 1;
          setLives(newLives);

          if (newLives <= 0) {
            sound.playGameOver();
            setGameState('gameOver');
          } else {
            resetBallAndPaddle(width, height);
            setGameState('ready');
          }
        }

        // Check if all bricks cleared!
        if (bricksRef.current.length === 0) {
          sound.playLevelUp();
          confetti({ particleCount: 100, spread: 80 });
          setLevel((l) => l + 1);
          buildBricks(level + 1, width);
          resetBallAndPaddle(width, height);
          setGameState('ready');
        }
      }

      // DRAW PHASE
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Bricks
      for (const br of bricksRef.current) {
        ctx.fillStyle = br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = br.hp > 1 ? 10 : 3;

        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Brick top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(br.x, br.y, br.w, 3);

        // Multi-hit indicator
        if (br.hp > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(br.x + br.w / 2 - 4, br.y + br.h / 2 - 2, 8, 4);
        }
      }

      // Draw Falling Powerups
      for (const pup of powerupsRef.current) {
        ctx.fillStyle = pup.type === 'fireball' ? '#f97316' : pup.type === 'multiball' ? '#06b6d4' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pup.x, pup.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pup.type === 'fireball' ? '🔥' : pup.type === 'multiball' ? '3x' : '↔️', pup.x, pup.y + 3);
      }

      // Draw Paddle
      ctx.fillStyle = activePowerup ? '#38bdf8' : '#e2e8f0';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Balls
      for (const b of ballsRef.current) {
        ctx.fillStyle = b.isFireball ? '#f97316' : '#ffffff';
        ctx.shadowColor = b.isFireball ? '#f97316' : '#ffffff';
        ctx.shadowBlur = b.isFireball ? 16 : 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.life--;
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / 25;
        ctx.fillRect(pt.x, pt.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, highScore, lives, level, buildBricks, resetBallAndPaddle]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-800 bg-stone-950 p-6 text-white shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
        <div>
          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
            RETRO ARKANOID
          </span>
          <h2 className="text-2xl font-black text-white mt-1">שובר הלבנים (Breakout)</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">שלב</span>
            <span className="font-mono text-sm font-bold text-cyan-400">שלב {level}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">ניקוד</span>
            <span className="font-mono text-lg font-black text-amber-400">{score}</span>
          </div>

          <div className="text-right border-r border-stone-800 pr-3">
            <span className="text-[10px] text-stone-500 block">פסילות</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${
                    i < lives ? 'text-rose-500 fill-rose-500' : 'text-stone-700'
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

      {/* Canvas Area with Overlays */}
      <div
        ref={containerRef}
        className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-stone-800 bg-black touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={480}
          onMouseMove={handleMouseMove}
          onTouchStart={(e) => {
            handleTouchMove(e);
            if (gameState === 'ready') setGameState('playing');
          }}
          onTouchMove={handleTouchMove}
          onClick={() => {
            if (gameState === 'ready') setGameState('playing');
          }}
          className="w-full h-full block cursor-none touch-none"
        />

        {/* Ready to launch overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs p-6 text-center">
            <div className="rounded-2xl border border-stone-700 bg-stone-900/90 p-5 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2">מוכן לשיגור הכדור?</h3>
              <p className="text-xs text-stone-400 mb-4">
                הזז את העכבר או מקשי החיצים, ולחץ <strong className="text-amber-400">רווח</strong> או הקלק להתחלת המשחק
              </p>
              <button
                onClick={() => setGameState('playing')}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-stone-950 hover:bg-amber-400 active:scale-95 mx-auto"
              >
                <Play className="h-4 w-4 fill-stone-950" />
                <span>שגר כדור</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-white">המשחק נגמר!</h3>
            <p className="text-sm text-stone-400 mt-1 mb-4">
              צברת <strong className="text-amber-400 font-mono">{score}</strong> נקודות
            </p>
            <button
              onClick={startNewGame}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-stone-950 hover:bg-amber-400 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>שחק שוב</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Movement Buttons */}
      <div className="mt-4 flex items-center justify-between gap-3 select-none touch-none">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            paddleRef.current.x = Math.max(0, paddleRef.current.x - 40);
          }}
          className="flex flex-1 h-14 items-center justify-center gap-2 rounded-2xl bg-stone-900 border border-stone-700 text-cyan-400 active:bg-cyan-500 active:text-stone-950 font-bold shadow-md"
        >
          <ArrowLeft className="h-6 w-6" />
          <span>שמאלה</span>
        </button>

        <button
          onClick={() => {
            if (gameState === 'ready') setGameState('playing');
          }}
          className="flex h-14 px-6 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 font-black active:bg-amber-400 shadow-md"
        >
          <span>שגר כדור</span>
        </button>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            const maxW = canvas ? canvas.width : 600;
            paddleRef.current.x = Math.min(maxW - paddleRef.current.w, paddleRef.current.x + 40);
          }}
          className="flex flex-1 h-14 items-center justify-center gap-2 rounded-2xl bg-stone-900 border border-stone-700 text-cyan-400 active:bg-cyan-500 active:text-stone-950 font-bold shadow-md"
        >
          <span>ימינה</span>
          <ArrowRight className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-3 text-center text-xs text-stone-400">
        👆 גרור אצבע ישירות על גבי המסך או השתמש בכפתורי החצים להזזת המטקה
      </div>
    </div>
  );
};

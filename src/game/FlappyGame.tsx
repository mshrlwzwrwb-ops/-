import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import { RotateCcw, Volume2, VolumeX, Trophy, Play, Sparkles } from 'lucide-react';

interface Pipe {
  x: number;
  topH: number;
  bottomY: number;
  passed: boolean;
}

export const FlappyGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('flappy_high_score') || 0);
  });

  // Bird physics refs
  const birdRef = useRef<{
    x: number;
    y: number;
    vy: number;
    radius: number;
    rotation: number;
  }>({
    x: 80,
    y: 200,
    vy: 0,
    radius: 14,
    rotation: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const pipeTimerRef = useRef<number>(0);
  const animIdRef = useRef<number | null>(null);

  const resetGame = useCallback(() => {
    birdRef.current = {
      x: 80,
      y: 200,
      vy: 0,
      radius: 14,
      rotation: 0,
    };
    pipesRef.current = [];
    pipeTimerRef.current = 0;
    setScore(0);
    setGameState('ready');
  }, []);

  const flap = useCallback(() => {
    if (gameState === 'ready') {
      setGameState('playing');
      birdRef.current.vy = -6.8;
      sound.playFlap();
    } else if (gameState === 'playing') {
      birdRef.current.vy = -6.8;
      sound.playFlap();
    }
  }, [gameState]);

  // Handle keyboard & touch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap]);

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
      const bird = birdRef.current;

      // UPDATE PHASE
      if (gameState === 'playing') {
        // Apply Gravity
        bird.vy += 0.38;
        bird.y += bird.vy;
        bird.rotation = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, bird.vy * 0.1));

        // Pipe spawn
        pipeTimerRef.current++;
        if (pipeTimerRef.current >= 100) {
          pipeTimerRef.current = 0;
          const gap = 125;
          const minH = 50;
          const maxH = height - 120 - gap;
          const topH = minH + Math.random() * (maxH - minH);

          pipesRef.current.push({
            x: width,
            topH,
            bottomY: topH + gap,
            passed: false,
          });
        }

        // Pipe movement & collisions
        const PIPE_WIDTH = 52;
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= 2.6;

          // Check score point
          if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            sound.playPoint();
            setScore((s) => {
              const ns = s + 1;
              if (ns > highScore) {
                setHighScore(ns);
                localStorage.setItem('flappy_high_score', ns.toString());
              }
              return ns;
            });
          }

          // Check collision with pipes
          if (
            bird.x + bird.radius > pipe.x &&
            bird.x - bird.radius < pipe.x + PIPE_WIDTH
          ) {
            if (bird.y - bird.radius < pipe.topH || bird.y + bird.radius > pipe.bottomY) {
              sound.playHit();
              sound.playGameOver();
              setGameState('gameOver');
            }
          }

          // Remove off-screen pipes
          if (pipe.x + PIPE_WIDTH < 0) {
            pipesRef.current.splice(i, 1);
          }
        }

        // Floor and ceiling collisions
        const floorY = height - 35;
        if (bird.y + bird.radius >= floorY || bird.y - bird.radius <= 0) {
          sound.playHit();
          sound.playGameOver();
          setGameState('gameOver');
        }
      }

      // RENDER PHASE
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.75, '#bae6fd');
      skyGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant pixel clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(80, 70, 24, 0, Math.PI * 2);
      ctx.arc(105, 60, 30, 0, Math.PI * 2);
      ctx.arc(135, 70, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(280, 110, 20, 0, Math.PI * 2);
      ctx.arc(305, 100, 26, 0, Math.PI * 2);
      ctx.arc(330, 110, 20, 0, Math.PI * 2);
      ctx.fill();

      // Pipes
      const PIPE_WIDTH = 52;
      for (const pipe of pipesRef.current) {
        // Top Pipe
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;

        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
        // Top Pipe Cap
        ctx.fillRect(pipe.x - 4, pipe.topH - 24, PIPE_WIDTH + 8, 24);
        ctx.strokeRect(pipe.x - 4, pipe.topH - 24, PIPE_WIDTH + 8, 24);

        // Bottom Pipe
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, height - pipe.bottomY);
        ctx.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, height - pipe.bottomY);
        // Bottom Pipe Cap
        ctx.fillRect(pipe.x - 4, pipe.bottomY, PIPE_WIDTH + 8, 24);
        ctx.strokeRect(pipe.x - 4, pipe.bottomY, PIPE_WIDTH + 8, 24);
      }

      // Ground floor
      const floorY = height - 35;
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, floorY, width, 35);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, floorY, width, 8);

      // Draw Bird
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      // Yellow body
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Wing
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-4, 2, 7, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Orange Beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(18, 1);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Live Score on Screen
      if (gameState === 'playing') {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.font = 'black 36px monospace';
        ctx.textAlign = 'center';
        ctx.strokeText(score.toString(), width / 2, 60);
        ctx.fillText(score.toString(), width / 2, 60);
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, score, highScore]);

  // Medals based on score
  const getMedal = (s: number) => {
    if (s >= 40) return { name: 'פלטינה 💎', color: 'text-cyan-300' };
    if (s >= 20) return { name: 'זהב 🥇', color: 'text-amber-400' };
    if (s >= 10) return { name: 'כסף 🥈', color: 'text-stone-300' };
    if (s >= 5) return { name: 'ארד 🥉', color: 'text-amber-600' };
    return null;
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-stone-800 bg-stone-950 p-4 sm:p-6 text-white shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
        <div>
          <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-bold text-sky-400 border border-sky-500/30">
            FLAPPY 2013 RETRO
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">ציפור נוסטלגית (Flappy)</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-500 block">שיא</span>
            <span className="font-mono text-sm font-bold text-amber-400">{highScore}</span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Screen Canvas (Touch Friendly) */}
      <div
        className="relative aspect-3/4 w-full rounded-2xl overflow-hidden border-2 border-stone-800 bg-black cursor-pointer select-none touch-none"
        onClick={flap}
        onTouchStart={(e) => {
          e.preventDefault();
          flap();
        }}
      >
        <canvas ref={canvasRef} width={360} height={480} className="w-full h-full block" />

        {/* Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs p-4 text-center">
            <div className="rounded-2xl border border-stone-700 bg-stone-900/90 p-5 shadow-2xl animate-bounce">
              <span className="text-3xl block mb-2">🐥</span>
              <h3 className="text-xl font-bold text-white mb-1">הקש כדי לעוף!</h3>
              <p className="text-xs text-stone-400">גע בכל מקום במסך או לחץ רווח</p>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-white mb-1">התרסקת!</h3>

            {/* Scorecard */}
            <div className="rounded-2xl border border-stone-700 bg-stone-900 p-4 w-56 my-3 text-center">
              <div className="flex justify-between items-center text-sm border-b border-stone-800 pb-2 mb-2">
                <span className="text-stone-400">ניקוד:</span>
                <span className="font-mono text-xl font-black text-white">{score}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-400">שיא אישי:</span>
                <span className="font-mono text-lg font-bold text-amber-400">{highScore}</span>
              </div>
              {getMedal(score) && (
                <div className="mt-3 pt-2 border-t border-stone-800">
                  <span className="text-[10px] text-stone-500 block">מדליה</span>
                  <span className={`font-bold text-sm ${getMedal(score)!.color}`}>
                    {getMedal(score)!.name}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                resetGame();
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-stone-950 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>נסה שוב</span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-xs text-stone-400">
        👆 מסך מגע: הקש בכל מקום במסך כדי לנופף בכנפיים ולחמוק מהצינורות!
      </div>
    </div>
  );
};

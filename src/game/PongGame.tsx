import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Users,
  Bot,
  Trophy,
} from 'lucide-react';

export const PongGame: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<'1p' | '2p'>('1p');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready');
  const [winner, setWinner] = useState<string | null>(null);

  // Paddles & Ball internal state
  const paddle1Ref = useRef<{ y: number; h: number; w: number; speed: number }>({
    y: 180,
    h: 80,
    w: 12,
    speed: 6.5,
  });

  const paddle2Ref = useRef<{ y: number; h: number; w: number; speed: number }>({
    y: 180,
    h: 80,
    w: 12,
    speed: 5.5,
  });

  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number; radius: number }>({
    x: 300,
    y: 200,
    vx: 5,
    vy: 2.5,
    radius: 7,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animIdRef = useRef<number | null>(null);

  const resetBall = useCallback((towardsPlayer1: boolean, canvasWidth = 600, canvasHeight = 400) => {
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    const speed = 5.5;
    const dir = towardsPlayer1 ? -1 : 1;
    ballRef.current = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: dir * speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      radius: 7,
    };
  }, []);

  const resetGame = useCallback(() => {
    setScore1(0);
    setScore2(0);
    setWinner(null);
    resetBall(Math.random() > 0.5);
    setGameState('ready');
  }, [resetBall]);

  useEffect(() => {
    resetGame();
  }, [mode, difficulty, resetGame]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && gameState === 'ready') {
        setGameState('playing');
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

  // Mouse / Touch for Player 1
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    paddle1Ref.current.y = Math.max(0, Math.min(canvas.height - paddle1Ref.current.h, mouseY - paddle1Ref.current.h / 2));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const scaleX = canvas.width / rect.width;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = (touch.clientX - rect.left) * scaleX;
      const touchY = (touch.clientY - rect.top) * scaleY;

      if (mode === '2p' && touchX > canvas.width / 2) {
        paddle2Ref.current.y = Math.max(0, Math.min(canvas.height - paddle2Ref.current.h, touchY - paddle2Ref.current.h / 2));
      } else {
        paddle1Ref.current.y = Math.max(0, Math.min(canvas.height - paddle1Ref.current.h, touchY - paddle1Ref.current.h / 2));
      }
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
      const p1 = paddle1Ref.current;
      const p2 = paddle2Ref.current;
      const ball = ballRef.current;

      if (gameState === 'playing') {
        // Player 1 keyboard controls
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) {
          p1.y = Math.max(0, p1.y - p1.speed);
        }
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) {
          p1.y = Math.min(height - p1.h, p1.y + p1.speed);
        }

        // Player 2 or AI controls
        if (mode === '2p') {
          if (keysRef.current['KeyI'] || keysRef.current['Numpad8']) {
            p2.y = Math.max(0, p2.y - p2.speed);
          }
          if (keysRef.current['KeyK'] || keysRef.current['Numpad2']) {
            p2.y = Math.min(height - p2.h, p2.y + p2.speed);
          }
        } else {
          // AI Logic
          const targetY = ball.y - p2.h / 2;
          const aiSpeed = difficulty === 'easy' ? 3.5 : difficulty === 'medium' ? 5.2 : 7.2;
          const diff = targetY - p2.y;
          if (Math.abs(diff) > 10) {
            p2.y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
          }
          p2.y = Math.max(0, Math.min(height - p2.h, p2.y));
        }

        // Ball movement
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Top & Bottom walls
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          sound.playPaddleBeep(false);
        } else if (ball.y + ball.radius >= height) {
          ball.y = height - ball.radius;
          ball.vy = -Math.abs(ball.vy);
          sound.playPaddleBeep(false);
        }

        // Paddle 1 Collision (Left)
        const p1X = 25;
        if (
          ball.x - ball.radius <= p1X + p1.w &&
          ball.x + ball.radius >= p1X &&
          ball.y >= p1.y &&
          ball.y <= p1.y + p1.h &&
          ball.vx < 0
        ) {
          ball.x = p1X + p1.w + ball.radius;
          const offset = (ball.y - (p1.y + p1.h / 2)) / (p1.h / 2);
          const currentSpeed = Math.min(12, Math.hypot(ball.vx, ball.vy) * 1.05);
          ball.vx = currentSpeed * Math.cos(offset * 0.7);
          ball.vy = currentSpeed * Math.sin(offset * 0.7);
          sound.playPaddleBeep(true);
        }

        // Paddle 2 Collision (Right)
        const p2X = width - 25 - p2.w;
        if (
          ball.x + ball.radius >= p2X &&
          ball.x - ball.radius <= p2X + p2.w &&
          ball.y >= p2.y &&
          ball.y <= p2.y + p2.h &&
          ball.vx > 0
        ) {
          ball.x = p2X - ball.radius;
          const offset = (ball.y - (p2.y + p2.h / 2)) / (p2.h / 2);
          const currentSpeed = Math.min(12, Math.hypot(ball.vx, ball.vy) * 1.05);
          ball.vx = -currentSpeed * Math.cos(offset * 0.7);
          ball.vy = currentSpeed * Math.sin(offset * 0.7);
          sound.playPaddleBeep(true);
        }

        // Goal scoring
        const WIN_SCORE = 7;
        if (ball.x < 0) {
          // Player 2 scores
          sound.playHit();
          const newScore2 = score2 + 1;
          setScore2(newScore2);
          if (newScore2 >= WIN_SCORE) {
            sound.playGameOver();
            setWinner(mode === '2p' ? 'שחקן 2' : 'המחשב (AI)');
            setGameState('gameOver');
          } else {
            resetBall(false, width, height);
          }
        } else if (ball.x > width) {
          // Player 1 scores
          sound.playGem();
          const newScore1 = score1 + 1;
          setScore1(newScore1);
          if (newScore1 >= WIN_SCORE) {
            sound.playLevelUp();
            confetti({ particleCount: 100, spread: 80 });
            setWinner(mode === '2p' ? 'שחקן 1' : 'אתה (ניצחון!)');
            setGameState('gameOver');
          } else {
            resetBall(true, width, height);
          }
        }
      }

      // RENDER
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Center dashed line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Paddles
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(25, p1.y, p1.w, p1.h, 4);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(width - 25 - p2.w, p2.y, p2.w, p2.h, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [gameState, score1, score2, mode, difficulty, resetBall]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-stone-800 bg-stone-950 p-6 text-white shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
        <div>
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
            PONG 1972 ORIGINAL
          </span>
          <h2 className="text-2xl font-black text-white mt-1">פונג רטרו (Classic Pong)</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switch */}
          <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs">
            <button
              onClick={() => setMode('1p')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                mode === '1p' ? 'bg-emerald-500 text-stone-950' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>נגד מחשב</span>
            </button>
            <button
              onClick={() => setMode('2p')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                mode === '2p' ? 'bg-cyan-500 text-stone-950' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>שני שחקנים</span>
            </button>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-around rounded-2xl bg-stone-900/60 p-3 mb-4 border border-stone-800/80">
        <div className="text-center">
          <span className="text-xs text-emerald-400 font-bold block">שחקן 1 (ירוק)</span>
          <span className="font-mono text-3xl font-black text-white">{score1}</span>
        </div>

        <div className="text-stone-500 font-mono text-lg font-bold">עד 7 נקודות</div>

        <div className="text-center">
          <span className="text-xs text-cyan-400 font-bold block">
            {mode === '2p' ? 'שחקן 2 (כחול)' : 'מחשב (AI)'}
          </span>
          <span className="font-mono text-3xl font-black text-white">{score2}</span>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-stone-800 bg-black touch-none select-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
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

        {gameState === 'ready' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs p-6 text-center">
            <h3 className="text-2xl font-black text-white mb-2">מוכן למשחק?</h3>
            <p className="text-xs text-stone-400 mb-4">
              הזז את העכבר, או השתמש במקשי <strong>W / S</strong>. לחץ להתחלה.
            </p>
            <button
              onClick={() => setGameState('playing')}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 font-bold text-stone-950 hover:bg-emerald-400 active:scale-95"
            >
              <Play className="h-4 w-4 fill-stone-950" />
              <span>התחל סרב</span>
            </button>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in zoom-in-95">
            <Trophy className="h-12 w-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-3xl font-black text-white">{winner} ניצח!</h3>
            <p className="text-sm text-stone-400 mt-1 mb-5">תוצאה: {score1} - {score2}</p>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-stone-950 hover:bg-emerald-400 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>משחק חוזר</span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-xs text-stone-400">
        🎮 שחקן 1: עכבר או מקשי <strong>W / S</strong> | שחקן 2: מקשי <strong>I / K</strong> או חיצים
      </div>
    </div>
  );
};

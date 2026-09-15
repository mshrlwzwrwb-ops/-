/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SnakeGame } from './game/SnakeGame';
import { BreakoutGame } from './game/BreakoutGame';
import { SpaceInvadersGame } from './game/SpaceInvadersGame';
import { PongGame } from './game/PongGame';
import { MinesweeperGame } from './game/MinesweeperGame';
import { TetrisGame } from './game/TetrisGame';
import { FlappyGame } from './game/FlappyGame';
import { PacmanGame } from './game/PacmanGame';
import { AppLauncher } from './components/AppLauncher';
import { AppLogoIcon } from './components/AppLogoIcon';
import { MainAppLogo } from './components/MainAppLogo';
import { sound } from './game/sound';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Flame,
  Bomb,
  Radio,
  Boxes,
  Bird,
  Ghost,
  Smartphone,
  ArrowRight,
  Home,
} from 'lucide-react';

export type GameKey =
  | 'tetris'
  | 'pacman'
  | 'flappy'
  | 'snake'
  | 'breakout'
  | 'invaders'
  | 'pong'
  | 'minesweeper';

export interface GameInfo {
  id: GameKey;
  name: string;
  subtitle: string;
  year: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export const GAMES: GameInfo[] = [
  {
    id: 'tetris',
    name: 'טטריס קלאסי',
    subtitle: 'משחק הבלוקים האגדי מ-1984 עם כפתורי סיבוב, שורות מתנפצות ומגע מלא',
    year: '1984',
    badge: 'הלהיט הנצחי',
    icon: Boxes,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
  },
  {
    id: 'pacman',
    name: 'פקמן רטרו',
    subtitle: 'מבוך ארקייד מיתולוגי, גלולות כוח, רוחות רפאים והחלקות אצבע (Swipe)',
    year: '1980',
    badge: 'מלך הארקייד',
    icon: Ghost,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
  },
  {
    id: 'flappy',
    name: 'ציפור נוסטלגית',
    subtitle: 'הקש בכל מקום במסך למעוף הציפור, מעבר בין צינורות רטרו ואיסוף מדליות',
    year: '2013',
    badge: 'להיט מובייל',
    icon: Bird,
    color: 'text-sky-400',
    bgColor: 'from-sky-500/20 to-blue-500/10 border-sky-500/30',
  },
  {
    id: 'snake',
    name: 'סנייק נוסטלגי',
    subtitle: 'נחש הניאון האגדי: מחוות החלקה על המסך, D-pad ותפוחי זהב',
    year: '1997',
    badge: 'נוקיה רטרו',
    icon: Sparkles,
    color: 'text-emerald-400',
    bgColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    id: 'breakout',
    name: 'שובר הלבנים',
    subtitle: 'ארקנויד קלאסי: כדור אש, כדורים מרובים וגרירת אצבע מהירה',
    year: '1976',
    badge: 'ארקייד קלאסי',
    icon: Layers,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
  },
  {
    id: 'invaders',
    name: 'פולשי החלל',
    subtitle: 'גלי פולשים מקוריים, בונקרים מתפרקים, חללית אם וכפתורי ירי במגע',
    year: '1978',
    badge: 'רטרו אותנטי',
    icon: Flame,
    color: 'text-purple-400',
    bgColor: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
  },
  {
    id: 'pong',
    name: 'פונג רטרו',
    subtitle: 'משחק הוידאו ה-1 בהיסטוריה: מגע מול AI או שני שחקנים במסך מגע אחד',
    year: '1972',
    badge: 'משחק הוידאו ה-1',
    icon: Radio,
    color: 'text-teal-400',
    bgColor: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30',
  },
  {
    id: 'minesweeper',
    name: 'שולה המוקשים',
    subtitle: 'הלהיט של Windows: סמיילי אינטראקטיבי, מתג דגלים למובייל וטיימר רטרו',
    year: '1990',
    badge: 'ווינדוס 95',
    icon: Bomb,
    color: 'text-rose-400',
    bgColor: 'from-rose-500/20 to-red-500/10 border-rose-500/30',
  },
];

export default function App() {
  const [activeGame, setActiveGame] = useState<GameKey | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('arcade_sound_muted') === 'true';
  });

  // Keep sound engine in sync
  useEffect(() => {
    sound.setMuted(isMuted);
    localStorage.setItem('arcade_sound_muted', isMuted ? 'true' : 'false');
  }, [isMuted]);

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const currentGame = GAMES.find((g) => g.id === activeGame);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-400 selection:text-stone-950">
      {/* Top Arcade Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-900/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Left / Start: Brand or Back Button */}
          <div className="flex items-center gap-3">
            {activeGame ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playSelect();
                    setActiveGame(null);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-stone-800/90 border border-stone-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-stone-700 hover:border-amber-500/50 transition-all active:scale-95 shadow-sm"
                >
                  <ArrowRight className="h-4 w-4 text-amber-400" />
                  <span>חזרה לכל המשחקים</span>
                </button>
                <button
                  onClick={() => {
                    sound.playSelect();
                    setActiveGame(null);
                  }}
                  title="חזרה לתפריט הראשי"
                  className="hidden sm:block hover:scale-105 transition-transform"
                >
                  <MainAppLogo size="xs" withGlow={false} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <MainAppLogo size="sm" withGlow={true} className="shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black tracking-tight text-white">
                      משחקי נוסטלגיה
                    </h1>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      <span>מסך מגע</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">8 אפליקציות רטרו מלאות ב-60 FPS</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Game Title (when in game) */}
          {currentGame && (
            <div className="hidden md:flex items-center gap-2">
              <AppLogoIcon gameId={currentGame.id} size="sm" />
              <div className="text-right">
                <span className="text-xs font-black text-white">{currentGame.name}</span>
                <span className="text-[10px] text-stone-400 block">{currentGame.badge}</span>
              </div>
            </div>
          )}

          {/* Right Actions: Quick switcher & Sound Toggle */}
          <div className="flex items-center gap-2">
            {/* Quick App Mini-Switcher if inside a game */}
            {activeGame && (
              <div className="hidden lg:flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                {GAMES.map((g) => {
                  const isCurrent = activeGame === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        sound.playSelect();
                        setActiveGame(g.id);
                      }}
                      title={g.name}
                      className={`p-1.5 rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-amber-500 text-stone-950 shadow-sm'
                          : 'text-stone-400 hover:text-white hover:bg-stone-900'
                      }`}
                    >
                      <AppLogoIcon gameId={g.id} size="sm" className="w-5 h-5 rounded-md" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Audio Toggle */}
            <button
              onClick={handleToggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors"
              title={isMuted ? 'הפעל סאונד' : 'השתק סאונד'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-stone-500" />
              ) : (
                <Volume2 className="h-4 w-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        {/* If no active game, render App Launcher with all logos */}
        {!activeGame && (
          <AppLauncher games={GAMES} onSelectGame={(id) => setActiveGame(id)} />
        )}

        {/* Tetris Classic */}
        {activeGame === 'tetris' && (
          <TetrisGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Flappy Bird Retro */}
        {activeGame === 'flappy' && (
          <FlappyGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Pacman Retro */}
        {activeGame === 'pacman' && (
          <PacmanGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Breakout / Arkanoid */}
        {activeGame === 'breakout' && (
          <BreakoutGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Space Invaders */}
        {activeGame === 'invaders' && (
          <SpaceInvadersGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Retro Snake */}
        {activeGame === 'snake' && (
          <SnakeGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Pong */}
        {activeGame === 'pong' && (
          <PongGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* Minesweeper */}
        {activeGame === 'minesweeper' && (
          <MinesweeperGame isMuted={isMuted} onToggleMute={handleToggleMute} />
        )}

        {/* When inside a game, provide a quick jump bar at the bottom */}
        {activeGame && (
          <section className="mt-8 border-t border-stone-800/80 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-300 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-amber-400" />
                <span>מעבר מהיר בין האפליקציות</span>
              </h3>
              <button
                onClick={() => {
                  sound.playSelect();
                  setActiveGame(null);
                }}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <Home className="h-3 w-3" />
                <span>לתפריט הראשי</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {GAMES.map((g) => {
                const isSelected = activeGame === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      sound.playSelect();
                      setActiveGame(g.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex flex-col items-center text-center rounded-2xl p-2.5 border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                        : 'border-stone-800 bg-stone-900/60 hover:bg-stone-900 hover:border-stone-700'
                    }`}
                  >
                    <AppLogoIcon gameId={g.id} size="sm" className="mb-1.5" />
                    <span className="font-bold text-[11px] text-white truncate w-full">
                      {g.name}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">{g.year}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950/80 py-4 text-center text-xs text-stone-500 mt-auto">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>משחקי נוסטלגיה • 8 אפליקציות רטרו מלאות ב-60 FPS עם תמיכת מגע ומקלדת</span>
          </div>
          <div className="text-[11px] text-stone-600">
            תומך במחוות מגע, כפתורי שטח ומקלדת
          </div>
        </div>
      </footer>
    </div>
  );
}

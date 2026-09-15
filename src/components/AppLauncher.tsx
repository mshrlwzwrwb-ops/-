import React, { useState } from 'react';
import { GameKey, GameInfo } from '../App';
import { AppLogoIcon } from './AppLogoIcon';
import { MainAppLogo } from './MainAppLogo';
import { Play, Trophy, Sparkles, Smartphone, Flame, Search } from 'lucide-react';
import { sound } from '../game/sound';

interface AppLauncherProps {
  games: GameInfo[];
  onSelectGame: (gameId: GameKey) => void;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({ games, onSelectGame }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getHighScore = (gameId: GameKey): number => {
    switch (gameId) {
      case 'tetris':
        return Number(localStorage.getItem('tetris_high_score') || 0);
      case 'flappy':
        return Number(localStorage.getItem('flappy_high_score') || 0);
      case 'pacman':
        return Number(localStorage.getItem('pacman_high_score') || 0);
      case 'snake':
        return Number(localStorage.getItem('snake_high_score') || 0);
      case 'breakout':
        return Number(localStorage.getItem('breakout_high_score') || 0);
      case 'invaders':
        return Number(localStorage.getItem('space_invaders_high_score') || 0);
      case 'pong':
        return Number(localStorage.getItem('pong_high_score') || 0);
      case 'minesweeper':
        return Number(localStorage.getItem('minesweeper_best_time') || 0);
      default:
        return 0;
    }
  };

  const filteredGames = games.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'arcade') {
      return ['pacman', 'breakout', 'invaders', 'pong'].includes(g.id);
    }
    if (selectedCategory === 'puzzle') {
      return ['tetris', 'minesweeper'].includes(g.id);
    }
    if (selectedCategory === 'mobile') {
      return ['snake', 'flappy'].includes(g.id);
    }
    return true;
  });

  const handleLaunch = (id: GameKey) => {
    sound.playSelect();
    onSelectGame(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8 px-2">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-stone-800 bg-gradient-to-b from-stone-900/90 via-stone-900/60 to-stone-950 p-6 sm:p-10 mb-8 text-center shadow-2xl">
        {/* Glow ambient lights */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Main Application Logo */}
          <div className="mb-4">
            <MainAppLogo size="lg" className="transition-transform duration-300 hover:scale-105" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-400 mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>פורטל משחקי רטרו • 8 אפליקציות מוכנות</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            משחקי נוסטלגיה
          </h1>

          <p className="text-stone-400 text-sm sm:text-base max-w-xl mb-6">
            לחץ על לוגו של כל אפליקציה כדי להיכנס ולשחק מיד. כל המשחקים כוללים בקרת מגע מלאה
            לטלפונים, סאונד מובנה וטבלת שיאים מקומית!
          </p>

          {/* Quick Search & Filters */}
          <div className="w-full max-w-md flex items-center gap-2 rounded-2xl bg-stone-950/80 border border-stone-800 px-4 py-2.5 mb-6 focus-within:border-amber-500/70 transition-all">
            <Search className="h-4 w-4 text-stone-500" />
            <input
              type="text"
              placeholder="חיפוש משחק (טטריס, פקמן, סנייק...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-white placeholder:text-stone-500 outline-none w-full text-right"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: `כל האפליקציות (${games.length})` },
              { id: 'arcade', label: '🕹️ ארקייד' },
              { id: 'puzzle', label: '🧩 פאזל ומחשבה' },
              { id: 'mobile', label: '📱 נוסטלגיה ומובייל' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of App Logos & Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredGames.map((game) => {
          const score = getHighScore(game.id);

          return (
            <div
              key={game.id}
              onClick={() => handleLaunch(game.id)}
              className="group relative flex flex-col justify-between rounded-3xl border border-stone-800/90 bg-stone-900/60 p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1.5 hover:border-amber-500/50 hover:bg-stone-900/90 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer active:scale-98"
            >
              {/* Card Top: Logo & Badges */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  {/* Big Stylized App Logo */}
                  <div className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1">
                    <AppLogoIcon gameId={game.id} size="lg" />
                  </div>

                  {/* Year & Badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-lg bg-stone-800 border border-stone-700 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-300">
                      {game.year}
                    </span>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      {game.badge}
                    </span>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors mb-1 text-right">
                  {game.name}
                </h3>
                <p className="text-xs text-stone-400 line-clamp-2 text-right leading-relaxed mb-4">
                  {game.subtitle}
                </p>
              </div>

              {/* Card Bottom: High Score & Launch Button */}
              <div className="border-t border-stone-800/80 pt-3 mt-auto">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-stone-500">שיא אישי:</span>
                  <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    {score > 0 ? score : 'טרם נקבע'}
                  </span>
                </div>

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-stone-950 shadow-md transition-all group-hover:bg-amber-400 active:scale-95"
                >
                  <Play className="h-4 w-4 fill-stone-950" />
                  <span>פתח אפליקציה</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer Note */}
      <div className="mt-12 rounded-2xl border border-stone-800/60 bg-stone-950/60 p-4 text-center text-xs text-stone-500 flex flex-wrap items-center justify-center gap-4">
        <span className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
          <span>מותאם ב-100% למסכי מגע בטלפון ולמקלדת במחשב</span>
        </span>
        <span>•</span>
        <span>שמירת שיאים מקומית אוטומטית</span>
        <span>•</span>
        <span>סאונד מובנה עם השתקה בלחיצה</span>
      </div>
    </div>
  );
};

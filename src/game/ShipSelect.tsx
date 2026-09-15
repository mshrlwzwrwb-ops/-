import React from 'react';
import { ShipId } from './types';
import { SHIPS } from './constants';
import { Shield, Zap, Flame, Play, Trophy, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface ShipSelectProps {
  selectedShip: ShipId;
  onSelectShip: (id: ShipId) => void;
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  highScore: number;
}

export const ShipSelect: React.FC<ShipSelectProps> = ({
  selectedShip,
  onSelectShip,
  onStartGame,
  isMuted,
  onToggleMute,
  highScore,
}) => {
  return (
    <div className="relative mx-auto max-w-5xl rounded-3xl border border-stone-800 bg-stone-950 p-6 sm:p-8 text-white shadow-2xl overflow-hidden">
      {/* Background glow styling */}
      <div className="absolute top-0 right-1/4 -z-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-400 border border-amber-500/30">
              SPACE SURVIVORS ROGUELITE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            מגן הגלקסיה: שורד הארנה
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            בחר את ספינת הקרב שלך, אסוף גבישי אנרגיה, שדרג נשקים והילחם בגלי אויבים ובבוסים אימתניים!
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* High Score Badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-2 text-xs">
            <Trophy className="h-4 w-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-stone-500 block">שיא נוכחי</span>
              <span className="font-mono text-sm font-bold text-amber-300">
                {highScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors"
            title={isMuted ? 'הפעל צלילים' : 'השתק'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-stone-500" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Ship Selection Grid */}
      <div className="my-8">
        <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">
          בחר ספינת קרב לחדירה:
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SHIPS.map((ship) => {
            const isSelected = selectedShip === ship.id;

            return (
              <div
                key={ship.id}
                onClick={() => onSelectShip(ship.id)}
                className={`relative cursor-pointer rounded-2xl p-5 transition-all duration-200 border text-right flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-stone-900/90 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : 'border-stone-800 bg-stone-900/40 hover:border-stone-700 hover:bg-stone-900/70'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-4 left-4 rounded-full bg-amber-400 text-stone-950 px-2 py-0.5 text-[10px] font-black">
                    נבחרה
                  </span>
                )}

                <div>
                  {/* Ship Vector Preview Icon */}
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: `${ship.color}15`,
                      border: `1px solid ${ship.color}40`,
                    }}
                  >
                    {ship.id === 'striker' && <Zap className="h-7 w-7 text-cyan-400" />}
                    {ship.id === 'titan' && <Shield className="h-7 w-7 text-amber-400" />}
                    {ship.id === 'spectre' && <Sparkles className="h-7 w-7 text-purple-400" />}
                  </div>

                  <h3 className="text-xl font-black text-white">{ship.name}</h3>
                  <span className="text-xs font-semibold text-amber-400/90 block mb-2">
                    {ship.subName}
                  </span>
                  <p className="text-xs text-stone-400 leading-relaxed min-h-11">
                    {ship.description}
                  </p>

                  {/* Ship Stats Bars */}
                  <div className="my-4 space-y-2 text-xs border-t border-stone-800 pt-3">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400">עמידות (HP):</span>
                      <span className="font-mono font-bold text-white">{ship.maxHp}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400">מהירות תמרון:</span>
                      <span className="font-mono font-bold text-white">{ship.speed}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400">קצב אש בסיסי:</span>
                      <span className="font-mono font-bold text-white">{ship.fireRate} יריות/שנייה</span>
                    </div>
                  </div>
                </div>

                {/* Trait Badge */}
                <div className="mt-2 rounded-xl bg-stone-950 p-2.5 border border-stone-800 text-[11px] text-stone-300">
                  <span className="font-bold text-amber-300 block mb-0.5">מאפיין ייחודי:</span>
                  <span>{ship.specialTrait}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Launch Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-800 pt-6">
        <div className="text-xs text-stone-400 text-center sm:text-right">
          💡 <strong>טיפ למתחילים:</strong> אסוף גבישי EXP כחולים שנשמטים מאויבים כדי לעלות רמות
          ולבחור שדרוגים כמו טילי מעקב, מגינים וכדורי פלזמה!
        </div>

        <button
          onClick={onStartGame}
          className="flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-amber-400 to-amber-500 px-8 py-4 text-base font-black text-stone-950 hover:from-amber-300 hover:to-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/20 cursor-pointer"
        >
          <Play className="h-5 w-5 fill-stone-950" />
          <span>שגר ספינה לארנה (התחל משחק)</span>
        </button>
      </div>
    </div>
  );
};

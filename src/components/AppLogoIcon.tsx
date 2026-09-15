import React from 'react';
import { GameKey } from '../App';

interface AppLogoIconProps {
  gameId: GameKey;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AppLogoIcon: React.FC<AppLogoIconProps> = ({
  gameId,
  size = 'lg',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-12 h-12 rounded-xl text-sm',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl',
    xl: 'w-24 h-24 rounded-3xl',
  }[size];

  switch (gameId) {
    case 'tetris':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-cyan-900 via-indigo-950 to-purple-950 border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20 overflow-hidden ${className}`}
        >
          {/* Tetris Blocks Graphic */}
          <div className="grid grid-cols-3 gap-1 p-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-xs shadow-xs shadow-cyan-300"></div>
            <div className="w-3 h-3 bg-cyan-400 rounded-xs shadow-xs shadow-cyan-300"></div>
            <div className="w-3 h-3 bg-amber-400 rounded-xs shadow-xs shadow-amber-300"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-xs shadow-xs shadow-purple-300"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-xs shadow-xs shadow-purple-300"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-xs shadow-xs shadow-purple-300"></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'pacman':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-yellow-950 via-stone-900 to-black border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/25 overflow-hidden ${className}`}
        >
          {/* Pac-Man & Ghost */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-7 h-7 bg-yellow-400 rounded-full shadow-md shadow-yellow-400/50 flex items-center">
              {/* Mouth cutout wedge */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-6 border-y-transparent border-r-8 border-r-stone-900" />
            </div>
            {/* Dots */}
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'flappy':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-sky-900 via-sky-950 to-emerald-950 border-2 border-sky-400/40 shadow-lg shadow-sky-500/20 overflow-hidden ${className}`}
        >
          {/* Flappy Bird Vector */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-8 h-7 bg-yellow-400 rounded-xl border border-yellow-200 shadow-md">
              {/* Eye */}
              <div className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              </div>
              {/* Wing */}
              <div className="absolute bottom-1 left-1 w-3.5 h-2.5 bg-yellow-100 rounded-md border border-amber-300" />
              {/* Beak */}
              <div className="absolute top-3 -right-2 w-3 h-2 bg-orange-500 rounded-r-md border border-orange-600" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'snake':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-emerald-950 via-stone-900 to-teal-950 border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/20 overflow-hidden ${className}`}
        >
          {/* Snake segments */}
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-xs shadow-xs shadow-emerald-400 border border-emerald-300 flex items-center justify-center">
              <div className="w-1 h-1 bg-black rounded-full" />
            </div>
            <div className="w-3 h-3 bg-emerald-400 rounded-xs" />
            <div className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" />
            {/* Apple */}
            <div className="mr-1 w-3 h-3 bg-rose-500 rounded-full shadow-xs shadow-rose-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'breakout':
      return (
        <div
          className={`${sizeClasses} relative flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-indigo-950 via-stone-900 to-blue-950 border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20 overflow-hidden ${className}`}
        >
          {/* Bricks */}
          <div className="flex gap-1">
            <div className="w-3.5 h-1.5 bg-rose-500 rounded-xs" />
            <div className="w-3.5 h-1.5 bg-amber-500 rounded-xs" />
            <div className="w-3.5 h-1.5 bg-emerald-500 rounded-xs" />
          </div>
          {/* Ball */}
          <div className="w-2 h-2 rounded-full bg-white shadow-xs shadow-white my-0.5" />
          {/* Paddle */}
          <div className="w-9 h-2 bg-cyan-400 rounded-full shadow-xs shadow-cyan-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'invaders':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-purple-950 via-stone-900 to-black border-2 border-purple-400/40 shadow-lg shadow-purple-500/20 overflow-hidden ${className}`}
        >
          {/* 8-bit Invader Alien */}
          <div className="relative flex flex-col items-center">
            <div className="flex gap-4">
              <div className="w-1.5 h-2 bg-purple-400 rounded-xs" />
              <div className="w-1.5 h-2 bg-purple-400 rounded-xs" />
            </div>
            <div className="w-8 h-4 bg-purple-500 rounded-sm flex items-center justify-around px-1">
              <div className="w-1.5 h-1.5 bg-black rounded-xs" />
              <div className="w-1.5 h-1.5 bg-black rounded-xs" />
            </div>
            <div className="flex gap-2 mt-0.5">
              <div className="w-2 h-1.5 bg-purple-400 rounded-xs" />
              <div className="w-2 h-1.5 bg-purple-400 rounded-xs" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'pong':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-between px-2 bg-gradient-to-br from-teal-950 via-stone-900 to-black border-2 border-teal-400/40 shadow-lg shadow-teal-500/20 overflow-hidden ${className}`}
        >
          {/* Paddle 1 */}
          <div className="w-1.5 h-7 bg-emerald-400 rounded-xs shadow-xs shadow-emerald-400" />
          {/* Dashed Center & Ball */}
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <div className="w-2 h-2 bg-white shadow-xs shadow-white" />
          </div>
          {/* Paddle 2 */}
          <div className="w-1.5 h-7 bg-cyan-400 rounded-xs shadow-xs shadow-cyan-400" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    case 'minesweeper':
      return (
        <div
          className={`${sizeClasses} relative flex items-center justify-center bg-gradient-to-br from-rose-950 via-stone-900 to-stone-950 border-2 border-rose-400/40 shadow-lg shadow-rose-500/20 overflow-hidden ${className}`}
        >
          {/* Smiley / Mine Icon */}
          <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-amber-500 flex flex-col items-center justify-center shadow-md">
            <div className="flex gap-1.5 mb-0.5">
              <div className="w-1 h-1 bg-stone-950 rounded-full" />
              <div className="w-1 h-1 bg-stone-950 rounded-full" />
            </div>
            <div className="w-3.5 h-1.5 border-b-2 border-stone-950 rounded-b-full" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
        </div>
      );

    default:
      return null;
  }
};

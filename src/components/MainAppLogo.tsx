import React from 'react';

const appLogoSrc = '/app-logo.jpg';

interface MainAppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const MainAppLogo: React.FC<MainAppLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true,
}) => {
  const sizeMap = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl',
    xl: 'w-32 h-32 sm:w-36 sm:h-36 rounded-3xl',
  };

  const glowMap = {
    xs: 'shadow-xs shadow-amber-500/20',
    sm: 'shadow-md shadow-amber-500/30',
    md: 'shadow-lg shadow-amber-500/40',
    lg: 'shadow-2xl shadow-amber-500/40',
    xl: 'shadow-2xl shadow-amber-500/50',
  };

  return (
    <div
      className={`relative inline-block select-none ${className}`}
    >
      {withGlow && (
        <div
          className={`absolute inset-0 -z-10 bg-gradient-to-tr from-amber-500/30 via-purple-500/20 to-cyan-500/30 blur-xl rounded-full scale-110 pointer-events-none`}
        />
      )}
      <div
        className={`${sizeMap[size]} ${withGlow ? glowMap[size] : ''} relative overflow-hidden border-2 border-amber-500/40 bg-stone-900 ring-1 ring-white/10`}
      >
        <img
          src={appLogoSrc}
          alt="לוגו משחקי נוסטלגיה"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/15 pointer-events-none" />
      </div>
    </div>
  );
};

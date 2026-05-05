import { type ReactNode } from 'react';

interface PixelPanelProps {
  title?: string;
  titleColor?: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  contentClassName?: string;
}

export const PixelPanel = ({ title, titleColor = 'text-emerald-400', children, className = '', contentClassName = '', onClick }: PixelPanelProps) => {
  return (
    <div className={`relative bg-zinc-900 border-2 border-zinc-600 shadow-2xl ${className}`}
      style={{ imageRendering: 'pixelated' }}
      onClick={onClick}>
      {/* Corner ornaments — inset, won't clip */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500/70 z-10" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500/70 z-10" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500/70 z-10" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500/70 z-10" />

      {/* Inner border glow */}
      <div className="absolute inset-[2px] border border-zinc-700/50 pointer-events-none rounded-[1px]" />

      {/* Header with title */}
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-zinc-700 bg-zinc-950/40">
          {/* Pixel decorative dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-amber-500/60" style={{ imageRendering: 'pixelated' }} />
            ))}
          </div>
          <h2 className={`text-base font-bold tracking-wide ${titleColor}`}>{title}</h2>
          <div className="flex-1" />
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-amber-500/60" style={{ imageRendering: 'pixelated' }} />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={contentClassName || ''}>
        {children}
      </div>

      {/* Subtle scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }} />
    </div>
  );
};

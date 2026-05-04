import React, { useEffect, useRef } from 'react';
import { useGameStore, type WorldEvent } from '../store/gameStore';

const TYPE_ICONS: Record<string, string> = {
  trade: '💰',
  duel: '⚔️',
  alliance: '🤝',
  conflict: '💥',
  greet: '👋',
  system: '📜',
};

const TYPE_COLORS: Record<string, string> = {
  trade: 'text-amber-400',
  duel: 'text-red-400',
  alliance: 'text-green-400',
  conflict: 'text-orange-400',
  greet: 'text-zinc-400',
  system: 'text-blue-400',
};

const TYPE_BG: Record<string, string> = {
  trade: 'bg-amber-900/20 border-amber-800/30',
  duel: 'bg-red-900/20 border-red-800/30',
  alliance: 'bg-green-900/20 border-green-800/30',
  conflict: 'bg-orange-900/20 border-orange-800/30',
  greet: 'bg-zinc-800/20 border-zinc-800/30',
  system: 'bg-blue-900/20 border-blue-800/30',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

interface EventLogProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const EventLog = ({ isOpen, onToggle }: EventLogProps) => {
  const worldEvents = useGameStore(s => s.worldEvents);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [worldEvents.length, isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 bg-zinc-900/90 border border-zinc-700 hover:border-amber-600/50
                   text-zinc-400 hover:text-amber-400 px-3 py-2 rounded-lg transition-all duration-200
                   shadow-lg backdrop-blur-sm text-sm flex items-center space-x-2"
      >
        <span>📜</span>
        <span className="font-medium">世界事件</span>
        {worldEvents.length > 0 && (
          <span className="bg-amber-900/60 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {worldEvents.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-h-[60vh] bg-zinc-900/95 border border-zinc-700
                    rounded-lg shadow-2xl backdrop-blur-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
          <span>📜</span>
          <span>世界事件</span>
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-zinc-500">{worldEvents.length} 条记录</span>
          <button
            onClick={onToggle}
            className="text-zinc-500 hover:text-zinc-300 text-sm leading-none p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5"
           style={{ maxHeight: 'calc(60vh - 40px)' }}>
        {worldEvents.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-8">
            暂无世界事件
          </div>
        ) : (
          [...worldEvents].reverse().map(event => (
            <div
              key={event.id}
              className={`text-xs px-2 py-1.5 rounded border ${TYPE_BG[event.type] || 'bg-zinc-800/20 border-zinc-800/30'}
                          transition-colors hover:brightness-110`}
            >
              <div className="flex items-start space-x-1.5">
                <span className="flex-shrink-0 mt-0.5">{TYPE_ICONS[event.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`${TYPE_COLORS[event.type] || 'text-zinc-300'} leading-tight`}>
                    {event.description}
                  </p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">
                    {formatTime(event.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

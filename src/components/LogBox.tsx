import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { ScrollText, Flame } from 'lucide-react';

export const LogBox = () => {
  const { logs, cultivate } = useGameStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="absolute bottom-4 right-4 w-80 flex flex-col pointer-events-auto">
      {/* 聊天/日志框 */}
      <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg backdrop-blur-md shadow-lg overflow-hidden flex flex-col h-48">
        <div className="bg-zinc-900/80 px-3 py-2 border-b border-zinc-800/50 flex items-center space-x-2">
          <ScrollText size={16} className="text-emerald-500" />
          <span className="text-sm font-medium text-zinc-300">仙途纪事</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} className="flex space-x-2">
              <span className="text-zinc-600 text-xs shrink-0 mt-0.5">[{log.time}]</span>
              <span className={`
                ${log.type === 'system' ? 'text-emerald-400' : 
                  log.type === 'combat' ? 'text-rose-400' : 
                  'text-zinc-300'}
              `}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 快捷操作栏 */}
      <div className="mt-4 flex space-x-3">
        <button 
          onClick={cultivate}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg border border-emerald-400 flex items-center justify-center space-x-2 transition-transform active:scale-95"
        >
          <Flame size={18} />
          <span>打坐修炼</span>
        </button>
      </div>
    </div>
  );
};

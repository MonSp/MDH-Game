import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { X, UserCheck, UserX, Swords, Heart, Star } from 'lucide-react';
import { PixelPanel } from './PixelPanel';

interface CaptivePanelProps {
  onClose: () => void;
}

export const CaptivePanel = ({ onClose }: CaptivePanelProps) => {
  const { captives, releaseCaptive, executeCaptive, recruitCaptive } = useGameStore();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<{ text: string; type: 'success' | 'failure' | 'info' } | null>(null);

  if (captives.length === 0) {
    return (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
        <PixelPanel className="w-[480px] flex flex-col text-zinc-200" contentClassName="flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center p-4 border-b border-zinc-700">
            <h2 className="text-xl font-bold flex items-center text-amber-400">
              <UserX className="mr-2" /> 俘虏营
            </h2>
            <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
          </div>
          <div className="p-8 text-center text-zinc-600">
            <Swords size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无俘虏</p>
            <p className="text-xs mt-2 text-zinc-700">击败敌方修士后可将其俘虏</p>
          </div>
          <button onClick={onClose} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-b-lg transition-colors text-sm">关闭</button>
        </PixelPanel>
      </div>
    );
  }

  const selected = selectedIdx !== null ? captives[selectedIdx] : null;

  const doAction = (action: () => void) => {
    action();
    setResultMsg({ text: '操作完成！', type: 'success' });
    setTimeout(() => setResultMsg(null), 2000);
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <PixelPanel className="w-[580px] max-h-[85vh] flex flex-col text-zinc-200" contentClassName="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold flex items-center text-amber-400">
            <UserX className="mr-2" /> 俘虏营
            <span className="ml-2 text-sm font-normal text-zinc-500">({captives.length} 人)</span>
          </h2>
          <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left: captive list */}
          <div className="w-1/2 border-r border-zinc-700 overflow-y-auto">
            {captives.map((captive, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedIdx(idx); setResultMsg(null); }}
                className={`w-full text-left p-3 border-b border-zinc-800 transition-colors hover:bg-zinc-800 ${
                  selectedIdx === idx ? 'bg-amber-900/20 border-l-2 border-l-amber-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-zinc-200">{captive.npc.name}</span>
                  <span className="text-xs text-zinc-500">Lv.{captive.npc.realm}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Heart size={10} className="text-rose-400" />
                    忠诚 {captive.loyalty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={10} className="text-amber-400" />
                    {captive.npc.role}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: detail + actions */}
          <div className="w-1/2 p-4 flex flex-col">
            {selected ? (
              <>
                <div className="flex-1 space-y-3">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-amber-500 font-bold text-xl mx-auto mb-2 border border-zinc-700">
                      {selected.npc.name[0]}
                    </div>
                    <h3 className="font-bold text-zinc-200">{selected.npc.name}</h3>
                    <p className="text-xs text-zinc-500">{selected.npc.role} · {selected.npc.realm}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-zinc-800/50 rounded">
                      <span className="text-zinc-400">忠诚度</span>
                      <span className={`font-medium ${selected.loyalty >= 70 ? 'text-emerald-400' : selected.loyalty >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {selected.loyalty}/100
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-zinc-800/50 rounded">
                      <span className="text-zinc-400">战力</span>
                      <span className="text-zinc-300">{selected.npc.power}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-zinc-800/50 rounded">
                      <span className="text-zinc-400">气血</span>
                      <span className="text-rose-400">{selected.npc.hp}/{selected.npc.maxHp}</span>
                    </div>
                  </div>

                  {/* Group actions */}
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-zinc-500 mb-1">—— 处置 ——</p>
                    <button
                      onClick={() => doAction(() => recruitCaptive(selectedIdx!))}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded text-emerald-300 text-xs font-medium transition-colors"
                    >
                      <UserCheck size={12} />
                      招降 {selected.loyalty >= 70 ? '(可行)' : `(忠诚 ${selected.loyalty}/70)`}
                    </button>
                    <button
                      onClick={() => doAction(() => releaseCaptive(selectedIdx!))}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 rounded text-blue-300 text-xs font-medium transition-colors"
                    >
                      <Star size={12} />
                      释放 (声望+10)
                    </button>
                    <button
                      onClick={() => doAction(() => executeCaptive(selectedIdx!))}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-red-300 text-xs font-medium transition-colors"
                    >
                      <Swords size={12} />
                      处决 (声望-30)
                    </button>
                  </div>
                </div>

                {resultMsg && (
                  <div className={`mt-2 p-2 rounded text-xs text-center ${
                    resultMsg.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40' :
                    resultMsg.type === 'failure' ? 'bg-red-900/30 text-red-400 border border-red-700/40' :
                    'bg-amber-900/30 text-amber-400 border border-amber-700/40'
                  }`}>
                    {resultMsg.text}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600">
                <p className="text-sm">选择一个俘虏查看详情</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={onClose} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-b-lg transition-colors text-sm">
          关闭
        </button>
      </PixelPanel>
    </div>
  );
};

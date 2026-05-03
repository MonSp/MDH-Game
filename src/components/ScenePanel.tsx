import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SceneEntry, ScenePanelState } from '../shared/types/scene';

interface ScenePanelProps {
  scene: SceneEntry;
  scenePath?: string[];           // breadcrumb trail of scene entry IDs
  dialogueText?: string;
  npcName?: string;
  npcRole?: string;
  state: ScenePanelState;
  onChoice: (choiceIndex: number) => void;
  onContinue: () => void;
  onClose: () => void;
  onFallback?: () => void;        // fallback after disconnect/timeout
  llmError?: boolean;
  npcMemory?: Record<string, string>;  // NPC memory state for conditional choices
}

export const ScenePanel = ({
  scene,
  scenePath = [],
  dialogueText,
  npcName,
  npcRole,
  state,
  onChoice,
  onContinue,
  onClose,
  onFallback,
  llmError,
  npcMemory = {},
}: ScenePanelProps) => {
  const [fadeIn, setFadeIn] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    setFadeIn(false);
    setShowTitle(false);
    const t1 = setTimeout(() => setFadeIn(true), 50);
    const t2 = setTimeout(() => setShowTitle(true), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [scene.id]);

  // 键盘导航：Escape 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Filter choices by NPC memory conditions
  const visibleChoices = useMemo(() => {
    return scene.choices.filter(choice => {
      if (!choice.condition?.npcMemory) return true;
      const { npcId, equals } = choice.condition.npcMemory;
      return npcMemory[npcId] === equals;
    });
  }, [scene.choices, npcMemory]);

  // Re-index: map filtered choice index back to original
  const handleFilteredChoice = useCallback((filteredIndex: number) => {
    const originalIndex = scene.choices.indexOf(visibleChoices[filteredIndex]);
    if (originalIndex !== -1) onChoice(originalIndex);
  }, [scene.choices, visibleChoices, onChoice]);

  // 自动聚焦首个选项
  const choicesRef = useCallback((node: HTMLDivElement | null) => {
    if (node && state === 'CHOOSING') {
      const first = node.querySelector('button');
      if (first) setTimeout(() => first.focus(), 100);
    }
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center transition-all duration-300"
      style={{
        backgroundColor: fadeIn ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
        backdropFilter: fadeIn ? 'blur(6px)' : 'blur(0px)',
        opacity: fadeIn ? 1 : 0,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={scene.title}
      aria-describedby="scene-description"
    >
      {/* 关闭按钮 */}
      <button
        className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-300 transition-colors duration-200 text-2xl leading-none z-50 pointer-events-auto"
        onClick={onClose}
        aria-label="关闭场景"
      >
        ✕
      </button>

      {/* 面包屑导航 */}
      {scenePath.length > 1 && (
        <nav className="absolute top-6 left-6 flex items-center space-x-2 text-sm text-zinc-500 z-50">
          {scenePath.map((id, i) => (
            <span key={id} className="flex items-center">
              {i > 0 && <span className="mx-1 text-zinc-600">→</span>}
              <span className={i === scenePath.length - 1 ? 'text-zinc-300' : ''}>
                {id === 'wake_up' ? '初醒' :
                 id === 'look_around' ? '环顾' :
                 id === 'check_body' ? '内视' :
                 id === 'call_someone' ? '呼唤' :
                 id === 'family_corridor' ? '家族走廊' :
                 id === 'family_yard' ? '家族院落' :
                 id === 'family_hall' ? '正厅' :
                 id === 'patriarch_audience' ? '族长训话' : id}
              </span>
            </span>
          ))}
        </nav>
      )}

      {/* 主内容区 */}
      <div className="w-full max-w-2xl mx-auto p-8">
        {(state === 'CHOOSING') && (
          <div className="space-y-6">
            {/* 标题 */}
            <h2 className={`text-3xl font-serif text-emerald-400 tracking-wide text-center transition-all duration-500 ${showTitle ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              {scene.title}
            </h2>

            {/* 场景描述 */}
            <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-8 shadow-2xl">
              <p id="scene-description" className="text-zinc-200 leading-relaxed whitespace-pre-line text-lg">
                {scene.description}
              </p>
            </div>

            {/* 选项按钮 - 玉牌风格 */}
            <div className="space-y-3" ref={choicesRef}>
              {visibleChoices.length > 0 ? (
                visibleChoices.map((choice, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-6 py-3 rounded-md border transition-all duration-200
                      bg-emerald-900/80 border-amber-700/60 text-amber-200
                      hover:bg-emerald-800 hover:border-amber-500 hover:text-amber-100
                      active:bg-emerald-700 text-base font-medium"
                    onClick={() => handleFilteredChoice(i)}
                    role="menuitem"
                  >
                    {choice.text}
                  </button>
                ))
              ) : (
                <p className="text-zinc-500 text-center py-4">（没有可用的选项）</p>
              )}
            </div>
          </div>
        )}

        {(state === 'LOADING') && (
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-8 shadow-2xl">
            {/* NPC 立绘骨架 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-zinc-700 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>

            {/* 对话骨架 */}
            <div className="space-y-3">
              <div className="h-4 bg-zinc-700 rounded animate-pulse w-full" />
              <div className="h-4 bg-zinc-700 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-zinc-700 rounded animate-pulse w-4/6" />
            </div>

            {llmError && (
              <div className="mt-6 p-4 bg-rose-900/30 border border-rose-800 rounded-lg" role="alert">
                <p className="text-rose-300 text-sm mb-3">AI 对话响应超时，暂时无法获取</p>
                <button
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors text-sm"
                  onClick={onFallback}
                >
                  使用默认对话
                </button>
              </div>
            )}
          </div>
        )}

        {(state === 'DIALOGUE') && (
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-8 shadow-2xl" role="status" aria-live="polite">
            {/* NPC 名称 + 角色 */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-emerald-900/50 rounded-full border border-emerald-700/50 flex items-center justify-center text-emerald-500 font-bold text-xl">
                {npcName?.[0] ?? '?'}
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold text-lg">{npcName ?? 'NPC'}</h3>
                {npcRole && (
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                    {npcRole}
                  </span>
                )}
              </div>
            </div>

            {/* 对话文本 */}
            <p className="text-zinc-200 leading-relaxed text-lg italic border-l-2 border-emerald-700 pl-4">
              {dialogueText}
            </p>

            {/* 继续按钮 */}
            <div className="mt-8 flex justify-end">
              <button
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors duration-200 text-sm font-medium"
                onClick={onContinue}
              >
                继续
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

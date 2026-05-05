import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [focusedChoice, setFocusedChoice] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFadeIn(false);
    setShowTitle(false);
    setFocusedChoice(0);
    const t1 = setTimeout(() => setFadeIn(true), 50);
    const t2 = setTimeout(() => setShowTitle(true), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [scene.id]);

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

  // Keyboard navigation: arrow keys + Enter/Space, Tab trapping
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (state !== 'CHOOSING' || visibleChoices.length === 0) return;

      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setFocusedChoice(prev => (prev + 1) % visibleChoices.length);
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setFocusedChoice(prev => (prev - 1 + visibleChoices.length) % visibleChoices.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFilteredChoice(focusedChoice);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, onClose, visibleChoices.length, focusedChoice, handleFilteredChoice]);

  // Focus the currently highlighted choice button
  useEffect(() => {
    if (state !== 'CHOOSING' || visibleChoices.length === 0) return;
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('.scene-choice-btn');
    if (buttons && buttons[focusedChoice]) {
      buttons[focusedChoice].focus();
    }
  }, [focusedChoice, state, visibleChoices.length]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 scene-panel-overlay"
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
        className="absolute top-4 sm:top-6 right-4 sm:right-6 text-zinc-500 hover:text-zinc-300 transition-colors duration-200 text-2xl leading-none z-50 pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={onClose}
        aria-label="关闭场景"
      >
        ✕
      </button>

      {/* 面包屑导航 */}
      {scenePath.length > 1 && (
        <nav className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-zinc-500 z-50 max-w-[50%] sm:max-w-none overflow-x-auto scrollbar-thin" aria-label="场景路径">
          {scenePath.map((id, i) => (
            <span key={id} className="flex items-center whitespace-nowrap">
              {i > 0 && <span className="mx-0.5 sm:mx-1 text-zinc-600" aria-hidden="true">→</span>}
              <span className={i === scenePath.length - 1 ? 'text-zinc-300' : ''}>
                {id === 'wake_up' ? '初醒' :
                 id === 'look_around' ? '环顾' :
                 id === 'check_body' ? '内视' :
                 id === 'call_someone' ? '呼唤' :
                 id === 'family_corridor' ? '走廊' :
                 id === 'family_yard' ? '院落' :
                 id === 'family_hall' ? '正厅' :
                 id === 'patriarch_audience' ? '族长训话' : id}
              </span>
            </span>
          ))}
        </nav>
      )}

      {/* 主内容区 */}
      <div className="w-full max-w-[95vw] sm:max-w-2xl mx-auto p-3 sm:p-8 max-h-screen overflow-y-auto">
        {(state === 'CHOOSING') && (
          <div className="space-y-3 sm:space-y-6">
            {/* 标题 */}
            <h2 className={`text-xl sm:text-3xl font-serif text-emerald-400 tracking-wide text-center transition-all duration-500 ${showTitle ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              {scene.title}
            </h2>

            {/* 场景描述 */}
            <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 sm:p-8 shadow-2xl">
              <p id="scene-description" className="text-zinc-200 leading-relaxed whitespace-pre-line text-sm sm:text-lg">
                {scene.description}
              </p>
            </div>

            {/* 选项按钮 */}
            <div className="space-y-2 sm:space-y-3" role="listbox" aria-label="选项列表">
              {visibleChoices.length > 0 ? (
                visibleChoices.map((choice, i) => (
                  <button
                    key={i}
                    role="option"
                    aria-selected={i === focusedChoice}
                    className={`scene-choice-btn w-full text-left px-3 sm:px-6 py-3 sm:py-3 rounded-md border transition-all duration-200
                      bg-emerald-900/80 border-amber-700/60 text-amber-200
                      hover:bg-emerald-800 hover:border-amber-500 hover:text-amber-100
                      active:bg-emerald-700 text-sm sm:text-base font-medium min-h-[44px]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
                      ${i === focusedChoice ? 'ring-1 ring-amber-400/50 bg-emerald-800/60' : ''}`}
                    onClick={() => handleFilteredChoice(i)}
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
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 sm:p-8 shadow-2xl" role="status" aria-label="加载中">
            {/* NPC 立绘骨架 */}
            <div className="flex items-center space-x-3 sm:space-x-4 mb-6">
              <div className="w-10 sm:w-14 h-10 sm:h-14 rounded-full bg-zinc-700 animate-pulse" />
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
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors text-sm min-h-[44px]"
                  onClick={onFallback}
                >
                  使用默认对话
                </button>
              </div>
            )}
          </div>
        )}

        {(state === 'DIALOGUE') && (
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 sm:p-8 shadow-2xl" role="status" aria-live="polite">
            {/* NPC 名称 + 角色 */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-900/50 rounded-full border border-emerald-700/50 flex items-center justify-center text-emerald-500 font-bold text-lg sm:text-xl">
                {npcName?.[0] ?? '?'}
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold text-base sm:text-lg">{npcName ?? 'NPC'}</h3>
                {npcRole && (
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                    {npcRole}
                  </span>
                )}
              </div>
            </div>

            {/* 对话文本 */}
            <p className="text-zinc-200 leading-relaxed text-sm sm:text-lg italic border-l-2 border-emerald-700 pl-4">
              {dialogueText}
            </p>

            {/* 继续按钮 */}
            <div className="mt-6 sm:mt-8 flex justify-end">
              <button
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors duration-200 text-sm font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                onClick={onContinue}
              >
                继续
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Screen reader live region for choice navigation */}
      {state === 'CHOOSING' && visibleChoices.length > 0 && (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          选项 {focusedChoice + 1} / {visibleChoices.length}：{visibleChoices[focusedChoice]?.text}
        </div>
      )}
    </div>
  );
};

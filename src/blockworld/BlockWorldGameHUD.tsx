import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore, HEAVEN_MAX_REALM, HEAVEN_INFO, REALM_LIST, REALM_BREAKTHROUGH_COST } from '../store/gameStore';
import { Heart, Zap, Sword, Shield, Sparkles } from 'lucide-react';

export const BlockWorldGameHUD = () => {
  const player = useGameStore(s => s.player);
  const useItem = useGameStore(s => s.useItem);
  const attemptAscension = useGameStore(s => s.attemptAscension);
  const [cultivateCooldown, setCultivateCooldown] = useState(0);
  const cultivatingRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleCultivate = useCallback(() => {
    if (cultivatingRef.current) return;
    cultivatingRef.current = true;
    useGameStore.getState().cultivate();
    setCultivateCooldown(3);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCultivateCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current!);
          cooldownTimerRef.current = null;
          cultivatingRef.current = false;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleBreakthrough = useCallback(() => {
    const store = useGameStore.getState();
    if (!store.player) return;
    if (store.player.stats.exp < store.player.stats.maxExp) return;
    const cost = Math.floor(
      (REALM_BREAKTHROUGH_COST[store.player.realm] || 0) *
      (1 - (store.player.talent?.comprehension ?? 40) / 200)
    );
    if ((store.player.inventory['灵石'] || 0) < cost) return;
    store.cultivate();
  }, []);

  if (!player) return null;

  const heavenInfo = HEAVEN_INFO[player.heavenLevel];
  const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
  const isAtMaxRealm = player.realm === maxRealm;
  const canAscend = isAtMaxRealm && heavenInfo.ascensionRequired;
  const hasXisuiDan = (player.inventory['洗髓丹'] || 0) > 0;
  const expFull = player.stats.exp >= player.stats.maxExp;
  const hpPct = Math.max(0, (player.stats.hp / player.stats.maxHp) * 100);
  const mpPct = Math.max(0, (player.stats.mp / player.stats.maxMp) * 100);
  const realmList = REALM_LIST;
  const nextRealm = (() => {
    const idx = realmList.indexOf(player.realm as typeof realmList[number]);
    return idx >= 0 && idx < realmList.length - 1 ? realmList[idx + 1] : null;
  })();
  const breakthroughCost = Math.floor(
    (REALM_BREAKTHROUGH_COST[player.realm] || 0) *
    (1 - (player.talent?.comprehension ?? 40) / 200)
  );

  return (
    <>
      {/* 左上角：玩家状态 */}
      <div className="absolute top-4 left-4 bg-zinc-900/85 border border-zinc-700/60 rounded-lg p-3 backdrop-blur shadow-lg w-56 pointer-events-auto z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-400 font-bold text-sm">{player.realm}</span>
          <span className="text-zinc-500 text-xs">·</span>
          <span className="text-amber-400 text-xs">{player.bodyType}</span>
        </div>

        <div className="space-y-1.5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-400 flex items-center gap-1"><Heart size={10} />气血</span>
              <span className="text-zinc-300">{Math.floor(player.stats.hp)}/{player.stats.maxHp}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-0.5">
              <div className="bg-rose-500 h-1.5 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-400 flex items-center gap-1"><Zap size={10} />灵力</span>
              <span className="text-zinc-300">{Math.floor(player.stats.mp)}/{player.stats.maxMp}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-0.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${mpPct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
            <span className="text-amber-400 flex items-center gap-1"><Sword size={10} />攻击</span>
            <span className="text-zinc-300">{player.stats.attack}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-orange-400 flex items-center gap-1"><Shield size={10} />防御</span>
            <span className="text-zinc-300">{player.stats.defense ?? 0}</span>
          </div>

          <div className="pt-1 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400">修为</span>
              <span className="text-zinc-300">
                {player.stats.exp}/{player.stats.maxExp}
                {expFull && !isAtMaxRealm && (
                  <span className="text-amber-400 ml-1 animate-pulse">可突破</span>
                )}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1 mt-0.5">
              <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (player.stats.exp / player.stats.maxExp) * 100)}%` }} />
            </div>
            {expFull && (
              <div className="text-xs text-amber-400/80 mt-1">
                突破需: {breakthroughCost} 灵石 (当前: {player.inventory['灵石'] || 0})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右下角：操作按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 w-44 pointer-events-auto z-10">
        {/* 修炼按钮 */}
        {isAtMaxRealm ? (
          <button
            disabled
            className="flex items-center justify-center gap-1 w-full py-2 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-500 cursor-not-allowed text-sm"
          >
            <Sparkles size={14} />
            <span>已至巅峰</span>
          </button>
        ) : expFull ? (
          <button
            onClick={handleBreakthrough}
            disabled={(player.inventory['灵石'] || 0) < breakthroughCost}
            className="flex items-center justify-center gap-1 w-full py-2 bg-amber-900/70 hover:bg-amber-800/80 border border-amber-700/50 rounded-lg text-amber-300 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            <span>突破至{nextRealm}</span>
          </button>
        ) : (
          <button
            onClick={handleCultivate}
            disabled={cultivateCooldown > 0}
            className="flex items-center justify-center gap-1 w-full py-2 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-700/50 rounded-lg text-emerald-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            <span>{cultivateCooldown > 0 ? `打坐修炼 (${cultivateCooldown}s)` : '打坐修炼'}</span>
          </button>
        )}

        {/* 使用洗髓丹 */}
        {hasXisuiDan && (
          <button
            onClick={() => useItem('洗髓丹')}
            className="flex items-center justify-center gap-1 w-full py-2 bg-purple-900/60 hover:bg-purple-800/70 border border-purple-700/50 rounded-lg text-purple-300 text-sm transition-colors"
          >
            <Sparkles size={14} />
            <span>使用洗髓丹 ({player.inventory['洗髓丹']})</span>
          </button>
        )}

        {/* 飞升按钮 */}
        {canAscend && (
          <button
            onClick={() => attemptAscension()}
            className="flex items-center justify-center gap-1 w-full py-2 bg-cyan-900/60 hover:bg-cyan-800/70 border border-cyan-700/50 rounded-lg text-cyan-300 text-sm transition-colors"
          >
            <Sparkles size={14} />
            <span>渡劫飞升</span>
          </button>
        )}
      </div>
    </>
  );
};

import { useGameStore, COUNTRIES_DATA, BODY_TYPES_DATA, REALM_BREAKTHROUGH_COST, HEAVEN_INFO, HEAVEN_MAX_REALM } from '../store/gameStore';
import { Heart, Zap, Sword, Map, Shield, Sparkles, Store, Cloud, ArrowUp, RefreshCw, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { MarketPanel } from './MarketPanel';

interface HUDProps {
  onOpenChronicle?: () => void;
}

export const HUD = ({ onOpenChronicle }: HUDProps) => {
  const { player, clans, useItem, attemptAscension, getAscensionQuests, completeAscensionQuest, performCycleRebirth, checkCycleCooldown } = useGameStore();
  const [showMarket, setShowMarket] = useState(false);
  const [showAscension, setShowAscension] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [cultivateCooldown, setCultivateCooldown] = useState(0);
  const [showBreakthrough, setShowBreakthrough] = useState(false);

  if (!player) return null;

  const clan = clans.find(c => c.id === player.clanId);
  const countryInfo = COUNTRIES_DATA[player.country];
  const bodyInfo = BODY_TYPES_DATA[player.bodyType];
  const heavenInfo = HEAVEN_INFO[player.heavenLevel];
  const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
  const isAtMaxRealm = player.realm === maxRealm;
  const canAscend = isAtMaxRealm && heavenInfo.ascensionRequired;
  const ascensionQuests = getAscensionQuests();
  const incompleteQuests = ascensionQuests.filter(q => !q.completed).length;
  const hasFlypanStone = (player.inventory['飞升令'] || 0) >= 1;
  const hasEnoughSpiritStones = (player.inventory['灵石'] || 0) >= 100000;
  const canCycleRebirth = player.heavenLevel >= 6 && checkCycleCooldown();
  const realmList = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'] as const;
  const nextRealm = (() => {
    const idx = realmList.indexOf(player.realm as typeof realmList[number]);
    return idx >= 0 && idx < realmList.length - 1 ? realmList[idx + 1] : null;
  })();
  const breakthroughCost = Math.floor(
    (REALM_BREAKTHROUGH_COST[player.realm] || 0) *
    (1 - (player.talent?.comprehension ?? 40) / 200)
  );

  return (
    <div className="w-full h-full p-4 pointer-events-auto flex justify-between">
      {/* 玩家状态 */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-lg backdrop-blur shadow-2xl w-72">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-emerald-900/50 rounded-full border border-emerald-700/50 flex items-center justify-center text-emerald-500 font-bold text-xl">
            {player.name[0]}
          </div>
          <div>
            <h2 className="font-bold text-zinc-100">{player.name}</h2>
            <div className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
              <span>【{heavenInfo.name}】</span>
              <span>·</span>
              <span>【{player.realm}】</span>
              <span>·</span>
              <div className="relative group">
                <span className="cursor-help border-b border-dashed border-emerald-400/50 pb-0.5">
                  {player.bodyType}
                </span>
                <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-zinc-950 border border-zinc-800 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="font-bold text-emerald-400 mb-1">{bodyInfo.name}</div>
                  <div className="text-zinc-400 text-xs mb-1">{bodyInfo.desc}</div>
                  <div className="text-amber-400 text-xs">{bodyInfo.buff}</div>
                </div>
              </div>
              {player.potential !== '无' && player.bodyType === '凡体' && (
                <>
                  <span>·</span>
                  <span className="text-amber-400">({player.potential})</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-rose-400 space-x-1">
              <Heart size={14} /><span>气血</span>
            </div>
            <div className="text-zinc-300">{player.stats.hp} / {player.stats.maxHp}</div>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-1.5">
            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${(player.stats.hp / player.stats.maxHp) * 100}%` }}></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-blue-400 space-x-1">
              <Zap size={14} /><span>灵力</span>
            </div>
            <div className="text-zinc-300">{player.stats.mp} / {player.stats.maxMp}</div>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(player.stats.mp / player.stats.maxMp) * 100}%` }}></div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center text-amber-400 space-x-1">
              <Sword size={14} /><span>战力</span>
            </div>
            <div className="text-zinc-300">{player.stats.attack}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-emerald-400 space-x-1">
              <Shield size={14} /><span>修为</span>
            </div>
            <div className="text-zinc-300 flex items-center gap-2">
              <span>{player.stats.exp} / {player.stats.maxExp}</span>
              {player.stats.exp >= player.stats.maxExp && !isAtMaxRealm && (
                <span className="text-amber-400 text-xs animate-pulse font-medium">可突破</span>
              )}
            </div>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-1">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(player.stats.exp / player.stats.maxExp) * 100}%` }}></div>
          </div>
          {player.stats.exp >= player.stats.maxExp && (
            <div className="text-xs text-amber-400 mt-1">
              突破需: {REALM_BREAKTHROUGH_COST[player.realm] || 0} 灵石 (当前: {player.inventory['灵石'] || 0})
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center text-purple-400 space-x-1">
              <Cloud size={14} /><span>灵气倍率</span>
            </div>
            <div className="text-purple-300">×{heavenInfo.spiritMultiplier}</div>
          </div>
          
          {player.hiddenStats.ascensionCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-cyan-400 space-x-1">
                <ArrowUp size={14} /><span>飞升次数</span>
              </div>
              <div className="text-cyan-300">{player.hiddenStats.ascensionCount}</div>
            </div>
          )}
          
          {player.inventory['转世灵童印记'] && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-yellow-400 space-x-1">
                <RefreshCw size={14} /><span>转世灵童</span>
              </div>
              <div className="text-yellow-300">宿慧+50%</div>
            </div>
          )}
          
          {player.inventory['洗髓丹'] > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center text-purple-400 space-x-1">
                <Sparkles size={14} /><span>洗髓丹 ({player.inventory['洗髓丹']})</span>
              </div>
              <button 
                onClick={() => useItem('洗髓丹')}
                className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs rounded transition-colors"
              >
                使用
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 家族与地图信息 */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-lg backdrop-blur shadow-2xl h-fit flex flex-col space-y-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 mb-2 font-medium">
            <Map size={16} /><span>第{player.heavenLevel}层天 · {player.country}</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="text-zinc-400">世界：<span className="text-emerald-400">{heavenInfo.name}</span></div>
            <div className="text-zinc-400">国家特质：<span className="text-amber-400">{countryInfo?.feature || '仙域'}</span> ({countryInfo?.buff || '全属性+15%'})</div>
            <div className="text-zinc-400">所属势力：<span className="text-zinc-200">{clan?.name} ({clan?.type})</span></div>
            <div className="text-zinc-400">家族好感：<span className="text-zinc-200">{clan?.reputation}</span></div>
            <div className="text-zinc-400">当前境界：<span className="text-emerald-400">{player.realm}</span> / <span className="text-amber-400">{maxRealm}</span></div>
            <div className="text-zinc-400">资源倍率：<span className="text-purple-400">×{heavenInfo.resourceMultiplier}</span></div>
          </div>
        </div>
        
        {isAtMaxRealm && heavenInfo.ascensionRequired && (
          <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded">
            <div className="text-amber-400 text-sm font-medium mb-2 flex items-center">
              <ArrowUp size={14} className="mr-1" />已达当前世界巅峰境界！
            </div>
            <div className="text-zinc-400 text-xs space-y-1">
              <div>境界要求：<span className="text-emerald-400">✓ 已满足</span></div>
              <div>飞升令：<span className={hasFlypanStone ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['飞升令'] || 0)}/1</span></div>
              <div>灵石消耗：<span className={hasEnoughSpiritStones ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['灵石'] || 0)}/100000</span></div>
              <div>天道任务：<span className={incompleteQuests === 0 ? 'text-emerald-400' : 'text-red-400'}>{ascensionQuests.length - incompleteQuests}/{ascensionQuests.length}</span></div>
            </div>
            <button
              onClick={() => setShowAscension(true)}
              disabled={!hasFlypanStone || !hasEnoughSpiritStones || incompleteQuests > 0}
              className={`mt-2 w-full py-2 rounded font-medium transition-colors ${
                hasFlypanStone && hasEnoughSpiritStones && incompleteQuests === 0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              }`}
            >
              前往飞升台
            </button>
          </div>
        )}
        
        {canCycleRebirth && (
          <button
            onClick={() => setShowCycle(true)}
            className="flex items-center justify-center space-x-2 w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 rounded transition-colors text-cyan-300 font-medium"
          >
            <RefreshCw size={16} />
            <span>轮回转生</span>
          </button>
        )}

        {/* 修炼/突破按钮 */}
        {isAtMaxRealm ? (
          <button
            disabled
            className="flex items-center justify-center space-x-2 w-full py-2 bg-zinc-800/40 border border-zinc-700/50 rounded text-zinc-500 cursor-not-allowed"
          >
            <Sparkles size={16} />
            <span>已至巅峰</span>
          </button>
        ) : player.stats.exp >= player.stats.maxExp ? (
          <button
            onClick={() => setShowBreakthrough(true)}
            className="flex items-center justify-center space-x-2 w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded transition-colors text-amber-300 font-medium shadow-inner"
          >
            <Sparkles size={16} />
            <span>突破境界</span>
          </button>
        ) : (
          <button
            onClick={() => {
              useGameStore.getState().cultivate();
              setCultivateCooldown(3);
              const timer = setInterval(() => {
                setCultivateCooldown(prev => {
                  if (prev <= 1) { clearInterval(timer); return 0; }
                  return prev - 1;
                });
              }, 1000);
            }}
            disabled={cultivateCooldown > 0}
            className="flex items-center justify-center space-x-2 w-full py-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded transition-colors text-emerald-300 font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            <span>{cultivateCooldown > 0 ? `打坐修炼 (${cultivateCooldown}s)` : '打坐修炼'}</span>
          </button>
        )}

        <button
          onClick={() => setShowMarket(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded transition-colors text-emerald-300 font-medium shadow-inner"
        >
          <Store size={16} />
          <span>进入坊市</span>
        </button>

        <button
          onClick={onOpenChronicle}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded transition-colors text-purple-300 font-medium"
        >
          <span>宗门事务</span>
        </button>
      </div>

      {showBreakthrough && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center">
              <Sparkles size={20} className="mr-2" />渡劫突破
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-zinc-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">当前境界</span>
                  <span className="text-emerald-400 font-medium">{player.realm}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-zinc-400">下一境界</span>
                  <span className="text-amber-400 font-medium">{nextRealm || '—'}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">消耗灵石</span>
                  <span className={
                    (player.inventory['灵石'] || 0) >= breakthroughCost
                      ? 'text-emerald-400 font-medium'
                      : 'text-red-400 font-medium'
                  }>{breakthroughCost}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">悟性减免后，灵石充足即可突破</div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBreakthrough(false)}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const store = useGameStore.getState();
                    if (!store.player) return;
                    // 重新读取条件
                    const maxRealm = HEAVEN_MAX_REALM[store.player.heavenLevel];
                    if (store.player.realm === maxRealm) {
                      store.addLog({ type: 'system', message: '你已达到当前世界最高境界，无法继续突破。' });
                      setShowBreakthrough(false);
                      return;
                    }
                    store.cultivate();
                    setShowBreakthrough(false);
                  }}
                  disabled={(player.inventory['灵石'] || 0) < breakthroughCost}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                >
                  {(player.inventory['灵石'] || 0) >= breakthroughCost ? '确认突破' : '灵石不足'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMarket && <MarketPanel onClose={() => setShowMarket(false)} />}
      
      {showAscension && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center">
              <ArrowUp size={20} className="mr-2" />九重天劫·飞升台
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-zinc-800 rounded">
                <div className="text-zinc-400 text-sm mb-2">当前所在：{heavenInfo.name}</div>
                <div className="text-zinc-400 text-sm">目标：第{player.heavenLevel - 1}层天 · {HEAVEN_INFO[(player.heavenLevel - 1) as keyof typeof HEAVEN_INFO].name}</div>
              </div>
              
              <div className="p-3 bg-zinc-800 rounded">
                <div className="text-amber-400 text-sm font-medium mb-2">飞升条件</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">境界要求</span>
                    <span className="text-emerald-400">✓ {player.realm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">飞升令</span>
                    <span className={hasFlypanStone ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['飞升令'] || 0)}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">灵石消耗</span>
                    <span className={hasEnoughSpiritStones ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['灵石'] || 0)}/100000</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-zinc-800 rounded">
                <div className="text-amber-400 text-sm font-medium mb-2 flex items-center">
                  <BookOpen size={14} className="mr-1" />天道任务 ({ascensionQuests.length - incompleteQuests}/{ascensionQuests.length})
                </div>
                <div className="space-y-2">
                  {ascensionQuests.map((quest, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div>
                        <span className={quest.completed ? 'text-emerald-400' : 'text-zinc-400'}>{quest.completed ? '✓' : '○'}</span>
                        <span className="ml-2 text-zinc-300">{quest.name}</span>
                      </div>
                      {!quest.completed && (
                        <button
                          onClick={() => completeAscensionQuest(quest.name)}
                          className="px-2 py-0.5 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 text-xs rounded"
                        >
                          完成任务
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAscension(false)}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    attemptAscension();
                    setShowAscension(false);
                  }}
                  disabled={!hasFlypanStone || !hasEnoughSpiritStones || incompleteQuests > 0}
                  className={`flex-1 py-2 rounded transition-colors ${
                    hasFlypanStone && hasEnoughSpiritStones && incompleteQuests === 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  渡劫飞升
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showCycle && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center">
              <RefreshCw size={20} className="mr-2" />轮回转生
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700 transition-colors" onClick={() => { performCycleRebirth('神念投影'); setShowCycle(false); }}>
                <div className="text-cyan-400 font-medium">神念投影</div>
                <div className="text-zinc-400 text-xs mt-1">消耗分神秘法，CD 7天。在凡界创建临时分身，存在2小时。</div>
              </div>
              
              <div className="p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700 transition-colors" onClick={() => { performCycleRebirth('真灵转世'); setShowCycle(false); }}>
                <div className="text-cyan-400 font-medium">真灵转世</div>
                <div className="text-zinc-400 text-xs mt-1">放弃当前修为，在凡界重塑新生。保留体质、称号与部分记忆，获得「转世灵童」天赋。</div>
              </div>
              
              <div className="p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700 transition-colors" onClick={() => { performCycleRebirth('道统传承'); setShowCycle(false); }}>
                <div className="text-cyan-400 font-medium">道统传承</div>
                <div className="text-zinc-400 text-xs mt-1">飞升时选择，在原家族留下传承石碑。后人参悟可获得功法。</div>
              </div>
            </div>
            
            <button
              onClick={() => setShowCycle(false)}
              className="mt-4 w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

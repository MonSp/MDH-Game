import { useGameStore, COUNTRIES_DATA, BODY_TYPES_DATA, REALM_BREAKTHROUGH_COST, HEAVEN_INFO, HEAVEN_MAX_REALM, REALM_LIST, getReputationTitle } from '../store/gameStore';
import { InitiativeService, InitiativeType } from '../store/gameService';
import type { SaveSlotInfo } from '../store/saveManager';
import { Heart, Zap, Sword, Map, Shield, Sparkles, Store, Cloud, ArrowUp, RefreshCw, BookOpen, Save, Users, Flag, Handshake, MessageCircle, Swords, FlaskRound, Hammer, UserX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { MarketPanel } from './MarketPanel';
import { SquadPanel } from './SquadPanel';
import { FactionPanel } from './FactionPanel';
import { DiplomacyPanel } from './DiplomacyPanel';
import { SkillBar } from './SkillBar';
import { WarPanel } from './WarPanel';
import { AlchemyPanel } from './AlchemyPanel';
import { ForgePanel } from './ForgePanel';
import { CaptivePanel } from './CaptivePanel';
import { PixelItemIcon } from './PixelItemIcon';
import { PixelTechniqueIcon } from './PixelTechniqueIcon';
import { PixelMinimap } from './PixelMinimap';
import { getCharacterPortraitDataURL } from '../utils/pixelSpriteGenerator';
import { PixelPanel } from './PixelPanel';

interface HUDProps {
  onOpenChronicle?: () => void;
}

export const HUD = ({ onOpenChronicle }: HUDProps) => {
  const { player, clans, squadMembers, playerFactionId, nearbyNPCs, wildMonsters, resourcePoints, useItem, attemptAscension, getAscensionQuests, completeAscensionQuest, performCycleRebirth, checkCycleCooldown, saveToSlot, getSaveSlots, deleteSaveSlot, getTechniqueEffects, captives } = useGameStore();
  const [showMarket, setShowMarket] = useState(false);
  const [showAscension, setShowAscension] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const [showFaction, setShowFaction] = useState(false);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [showWarPanel, setShowWarPanel] = useState(false);
  const [showSkillBar, setShowSkillBar] = useState(false);
  const [showAlchemy, setShowAlchemy] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [showCaptives, setShowCaptives] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState('');
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [cultivateCooldown, setCultivateCooldown] = useState(0);
  const [showBreakthrough, setShowBreakthrough] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cultivatingRef = useRef(false);

  // 清理冷却计时器（组件卸载时）
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

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
    <div className="w-full h-full p-4 pointer-events-auto flex justify-between">
      {/* 玩家状态 */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-lg backdrop-blur shadow-2xl w-72">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center overflow-hidden">
            {(() => {
              const portraitUrl = getCharacterPortraitDataURL(player.realm, player.bodyType, '散修');
              return portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={player.name}
                  className="w-10 h-10"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="text-emerald-500 font-bold text-xl">{player.name[0]}</span>
              );
            })()}
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

        {/* 声望 */}
        <div className="mb-3 text-xs text-zinc-400 text-center border-b border-zinc-800 pb-2">
          <span className="text-emerald-400 font-medium">{getReputationTitle(player.reputation)}</span>
          <span className="text-zinc-600"> · 声望 {player.reputation}</span>
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
              <Sword size={14} /><span>攻击</span>
            </div>
            <div className="text-zinc-300">{player.stats.attack}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-orange-400 space-x-1">
              <Shield size={14} /><span>防御</span>
            </div>
            <div className="text-zinc-300">{player.stats.defense ?? 0}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-rose-400 space-x-1">
              <Sword size={14} /><span>妖兽击杀</span>
            </div>
            <div className="text-zinc-300">{player.hiddenStats.killCount}</div>
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
              突破需: {breakthroughCost} 灵石 (当前: {player.inventory['灵石'] || 0})
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
                <Sparkles size={14} /><PixelItemIcon itemName="洗髓丹" size={14} className="mr-1" /><span>洗髓丹 ({player.inventory['洗髓丹']})</span>
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

      {/* 家族与地图信息 — 可折叠 */}
      <div className={`bg-zinc-900/90 border border-zinc-800 rounded-lg backdrop-blur shadow-2xl h-fit flex flex-col ${panelCollapsed ? 'p-2' : 'p-4 space-y-4'}`}>
        {/* Collapse toggle */}
        <button
          onClick={() => setPanelCollapsed(v => !v)}
          className="self-end text-zinc-500 hover:text-zinc-300 transition-colors p-1 mb-1"
          title={panelCollapsed ? '展开面板' : '折叠面板'}
        >
          {panelCollapsed ? '◀' : '▶'}
        </button>

        {panelCollapsed ? (
          /* Collapsed: icon-only action buttons */
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => setShowMarket(true)} className="p-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded text-emerald-300 transition-colors" title="坊市"><Store size={16} /></button>
            <button onClick={() => setShowSkillBar(true)} className="p-2 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 rounded text-cyan-300 transition-colors" title="功法装备"><BookOpen size={16} /></button>
            <button onClick={() => setShowSquad(true)} className="p-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-amber-300 transition-colors" title="小队"><Users size={16} /></button>
            <button onClick={() => setShowAlchemy(true)} className="p-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded text-emerald-300 transition-colors" title="炼丹"><FlaskRound size={16} /></button>
            <button onClick={() => setShowForge(true)} className="p-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-amber-300 transition-colors" title="炼器"><Hammer size={16} /></button>
            {playerFactionId && (
              <button onClick={() => setShowFaction(true)} className="p-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-amber-300 transition-colors" title="势力"><Flag size={16} /></button>
            )}
            {(() => { const pClan = clans.find(c => c.id === playerFactionId); const atWar = pClan?.diplomacy && Object.values(pClan.diplomacy).some(d => d.status === '战争'); if (!atWar) return null; return (
              <button onClick={() => setShowWarPanel(true)} className="p-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-red-300 transition-colors animate-pulse" title="战争"><Swords size={16} /></button>
            ); })()}
            <button onClick={() => setShowCaptives(true)} className="p-2 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 rounded text-rose-300 transition-colors" title="俘虏"><UserX size={16} /></button>
            <button onClick={onOpenChronicle} className="p-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded text-purple-300 transition-colors" title="宗门"><span className="text-xs font-bold">宗</span></button>
            <button onClick={() => setShowDiplomacy(true)} className="p-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded text-purple-300 transition-colors" title="外交"><Handshake size={16} /></button>
          </div>
        ) : (
          /* Expanded: full panel content */
          <div>
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
              <div className="text-zinc-400">当前坐标：<span className="text-emerald-400 font-mono">({player.position.x}, {player.position.y})</span></div>
              <div className="text-zinc-400">资源倍率：<span className="text-purple-400">×{heavenInfo.resourceMultiplier}</span></div>
            </div>
          </div>

          {/* Mini pixel-art minimap */}
          <PixelMinimap
          playerX={player.position.x}
          playerY={player.position.y}
          npcs={nearbyNPCs?.map((n: any) => ({ x: n.position.x, y: n.position.y, color: '#22d3ee' })) || []}
          monsters={wildMonsters?.map((m: any) => ({ x: m.position.x, y: m.position.y, color: '#ef4444' })) || []}
          resources={resourcePoints?.map((r: any) => ({ x: r.x, y: r.y, color: '#a78bfa' })) || []}
          points={clans?.map((c: any) => ({ x: c.base?.x || 0, y: c.base?.y || 0, color: c.id === player.clanId ? '#4ade80' : '#fbbf24' })) || []}
          size={160}
          scale={20}
          className="mx-auto"
        />
        
        {isAtMaxRealm && heavenInfo.ascensionRequired && (
          <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded">
            <div className="text-amber-400 text-sm font-medium mb-2 flex items-center">
              <ArrowUp size={14} className="mr-1" />已达当前世界巅峰境界！
            </div>
            <div className="text-zinc-400 text-xs space-y-1">
              <div>境界要求：<span className="text-emerald-400">✓ 已满足</span></div>
              <div><PixelItemIcon itemName="飞升令" size={14} className="mr-1" />飞升令：<span className={hasFlypanStone ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['飞升令'] || 0)}/1</span></div>
              <div><PixelItemIcon itemName="灵石" size={14} className="mr-1" />灵石消耗：<span className={hasEnoughSpiritStones ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['灵石'] || 0)}/100000</span></div>
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
              if (cultivatingRef.current) return;
              cultivatingRef.current = true;
              useGameStore.getState().cultivate();
              setCultivateCooldown(3);
              if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = setInterval(() => {
                setCultivateCooldown(prev => {
                  if (prev <= 1) { clearInterval(cooldownTimerRef.current!); cooldownTimerRef.current = null; cultivatingRef.current = false; return 0; }
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

        <button
          onClick={() => setShowSkillBar(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 rounded transition-colors text-cyan-300 font-medium"
        >
          <BookOpen size={16} />
          <span>功法装备</span>
        </button>

        <button
          onClick={() => setShowSquad(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded transition-colors text-amber-300 font-medium"
        >
          <Users size={16} />
          <span>小队管理</span>
          {squadMembers.filter(m => m.isAlive).length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-xs text-emerald-400">
              {squadMembers.filter(m => m.isAlive).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowFaction(true)}
          className={`flex items-center justify-center space-x-2 w-full py-2 border rounded transition-colors font-medium ${
            playerFactionId
              ? 'bg-amber-900/40 hover:bg-amber-800/60 border-amber-700/50 text-amber-300'
              : 'bg-zinc-800/60 hover:bg-zinc-700/80 border-zinc-700/50 text-zinc-300'
          }`}
        >
          <Flag size={16} />
          <span>{playerFactionId ? '势力管理' : '创建势力'}</span>
          {playerFactionId && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500/20 border border-amber-500/50 rounded-full text-xs text-amber-400">
              {clans.find(c => c.id === playerFactionId)?.type?.replace('级', '') || '?'}
            </span>
          )}
        </button>

        {playerFactionId && (
          <button
            onClick={() => setShowDiplomacy(true)}
            className="flex items-center justify-center space-x-2 w-full py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 rounded transition-colors text-purple-300 font-medium text-sm"
          >
            <Handshake size={14} />
            <span>外交</span>
          </button>
        )}

        {playerFactionId && (() => {
          const pClan = clans.find(c => c.id === playerFactionId);
          const atWar = pClan?.diplomacy && Object.values(pClan.diplomacy).some(d => d.status === '战争');
          if (!atWar) return null;
          return (
            <button
              onClick={() => setShowWarPanel(true)}
              className="flex items-center justify-center space-x-2 w-full py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded transition-colors text-red-300 font-medium text-sm animate-pulse"
            >
              <Swords size={14} />
              <span>战争</span>
            </button>
          );
        })()}

        <button
          onClick={() => setShowAlchemy(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded transition-colors text-emerald-300 font-medium"
        >
          <FlaskRound size={16} />
          <span>炼丹</span>
        </button>

        <button
          onClick={() => setShowForge(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded transition-colors text-amber-300 font-medium"
        >
          <Hammer size={16} />
          <span>炼器</span>
        </button>

        <button
          onClick={() => setShowCaptives(true)}
          className="flex items-center justify-center space-x-2 w-full py-2 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 rounded transition-colors text-rose-300 font-medium"
        >
          <UserX size={16} />
          <span>俘虏</span>
          {captives.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-rose-500/20 border border-rose-500/50 rounded-full text-xs text-rose-400">
              {captives.length}
            </span>
          )}
        </button>

        <button
          className="flex items-center justify-center space-x-2 w-full py-2 bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/50 rounded transition-colors text-zinc-300 font-medium text-sm"
        >
          <Save size={14} />
          <span>保存游戏</span>
        </button>

        {/* Phase 1.2: NPC initiative notification indicator */}
        {(() => {
          const pending = InitiativeService.getInstance().getPendingEvents();
          const count = pending.filter(e => e.type !== InitiativeType.ENCOUNTER).length;
          if (count === 0) return null;
          const latest = pending[pending.length - 1];
          return (
            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/40 rounded text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1">
                <MessageCircle size={12} />
                <span>{count} 位修士的动静</span>
              </div>
              {latest && (
                <p className="text-zinc-400 truncate">
                  {latest.npcName ? `${latest.npcName}：` : ''}{latest.message.slice(0, 24)}…
                </p>
              )}
            </div>
          );
        })()}
      </div>
      )}
      </div>

      {showBreakthrough && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <PixelPanel className="p-6 w-96">
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
                  <span className="text-zinc-400 flex items-center"><PixelItemIcon itemName="灵石" size={14} className="mr-1" />消耗灵石</span>
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
          </PixelPanel>
        </div>
      )}

      {showMarket && <MarketPanel onClose={() => setShowMarket(false)} />}
      {showSquad && <SquadPanel onClose={() => setShowSquad(false)} />}
      {showFaction && <FactionPanel onClose={() => setShowFaction(false)} />}
      {showDiplomacy && <DiplomacyPanel onClose={() => setShowDiplomacy(false)} />}
      {showWarPanel && <WarPanel onClose={() => setShowWarPanel(false)} />}
      {showSkillBar && <SkillBar onClose={() => setShowSkillBar(false)} />}
      {showAlchemy && <AlchemyPanel onClose={() => setShowAlchemy(false)} />}
      {showForge && <ForgePanel onClose={() => setShowForge(false)} />}
      {showCaptives && <CaptivePanel onClose={() => setShowCaptives(false)} />}
      {showAscension && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <PixelPanel className="p-6 w-96 max-h-[80vh] overflow-y-auto">
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
                    <span className="text-zinc-400 flex items-center"><PixelItemIcon itemName="飞升令" size={14} className="mr-1" />飞升令</span>
                    <span className={hasFlypanStone ? 'text-emerald-400' : 'text-red-400'}>{(player.inventory['飞升令'] || 0)}/1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 flex items-center"><PixelItemIcon itemName="灵石" size={14} className="mr-1" />灵石消耗</span>
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
          </PixelPanel>
        </div>
      )}
      
      {showCycle && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <PixelPanel className="p-6 w-96">
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
          </PixelPanel>
        </div>
      )}

      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <PixelPanel className="p-6 w-96">
            <h3 className="text-xl font-bold text-zinc-100 mb-4 flex items-center">
              <Save size={18} className="mr-2 text-emerald-400" />保存游戏
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {saveSlots.map(slot => (
                <div
                  key={slot.slot}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
                  onClick={() => {
                    saveToSlot(slot.slot);
                    setSavedFeedback(`已保存到槽位 ${slot.slot}`);
                    setSaveSlots(getSaveSlots());
                    setTimeout(() => setSavedFeedback(''), 2000);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-sm font-bold">
                      {slot.slot}
                    </div>
                    <div>
                      {slot.meta ? (
                        <>
                          <div className="text-zinc-200 text-sm">{slot.meta.playerName}</div>
                          <div className="text-zinc-500 text-xs">
                            {slot.meta.playerRealm} · {new Date(slot.meta.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </>
                      ) : (
                        <div className="text-zinc-500 text-sm">空</div>
                      )}
                    </div>
                  </div>
                  {slot.meta && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSaveSlot(slot.slot); setSaveSlots(getSaveSlots()); }}
                      className="px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>

            {savedFeedback && (
              <div className="mt-3 p-2 bg-emerald-900/30 border border-emerald-700/50 rounded text-emerald-400 text-sm text-center">
                {savedFeedback}
              </div>
            )}

            <button
              onClick={() => setShowSaveDialog(false)}
              className="mt-4 w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            >
              关闭
            </button>
          </PixelPanel>
        </div>
      )}
      {/* Phase 1.2e: Floating bubble notifications for NPC initiative events */}
      <NotificationBubbles />
    </div>
  );
};

/** Phase 1.2e: Auto-dismissing toast bubbles for NPC initiative events */
function NotificationBubbles() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string; npcName: string; fading: boolean }>>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const service = InitiativeService.getInstance();
      const events = service.getPendingEvents().filter(e => e.type !== InitiativeType.ENCOUNTER);
      for (const event of events) {
        if (seenRef.current.has(event.id)) continue;
        seenRef.current.add(event.id);
        const toast = { id: event.id, message: event.message, type: event.type, npcName: event.npcName, fading: false };
        setToasts(prev => [...prev.slice(-4), toast]);

        // Auto-dismiss after 4s with fade
        setTimeout(() => {
          setToasts(prev => prev.map(t => t.id === event.id ? { ...t, fading: true } : t));
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== event.id));
            service.dismissEvent(event.id);
          }, 500);
        }, 4000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (toasts.length === 0) return null;

  const typeColors: Record<string, string> = {
    greeting: 'border-emerald-600/60 bg-emerald-950/90',
    trade_offer: 'border-amber-600/60 bg-amber-950/90',
    challenge: 'border-red-600/60 bg-red-950/90',
    plea: 'border-cyan-600/60 bg-cyan-950/90',
  };
  const typeIcons: Record<string, string> = {
    greeting: '💬', trade_offer: '🤝', challenge: '⚔️', plea: '🆘',
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-3 py-2 rounded-lg border shadow-xl backdrop-blur pointer-events-auto transition-all duration-500 ${
            typeColors[t.type] || 'border-zinc-600/60 bg-zinc-950/90'
          } ${t.fading ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{typeIcons[t.type] || '📢'}</span>
            <div className="min-w-0">
              <p className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">{t.npcName}</p>
              <p className="text-xs text-zinc-400 truncate max-w-[220px]">{t.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

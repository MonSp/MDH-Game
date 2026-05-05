import { useState } from 'react';
import { useGameStore, FORMATION_DATA, getClanTerritoryCenter, type SquadCombatStance } from '../store/gameStore';
import { X, Swords, Shield, Target, Crosshair, ChevronDown, History, BarChart3, Users, Skull, CircleDot, Sword } from 'lucide-react';

interface WarPanelProps {
  onClose: () => void;
}

const STANCE_OPTIONS: { id: SquadCombatStance; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: '进攻', label: '全军进攻', icon: <Swords size={14} />, desc: '正常作战，无加成', color: 'text-rose-400 border-rose-700/50 bg-rose-900/30' },
  { id: '集中火力', label: '集火', icon: <Target size={14} />, desc: '聚焦低血量目标，伤害+20%', color: 'text-amber-400 border-amber-700/50 bg-amber-900/30' },
  { id: '防御阵型', label: '防御', icon: <Shield size={14} />, desc: '受击伤害-50%，输出-30%', color: 'text-blue-400 border-blue-700/50 bg-blue-900/30' },
  { id: '撤退', label: '撤退', icon: <ChevronDown size={14} />, desc: '脱离战斗，不进行攻击', color: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/50' },
];

export const WarPanel = ({ onClose }: WarPanelProps) => {
  const {
    player, clans, playerFactionId, squadMembers, warStats, currentFormation,
    setSquadCombatStance, setFormation,
    getDiplomaticRelations, buildSiegeEquipment,
  } = useGameStore();

  const [tab, setTab] = useState<'active' | 'history'>('active');

  if (!player || !playerFactionId) return null;

  const faction = clans.find(c => c.id === playerFactionId);
  if (!faction) return null;

  const relations = getDiplomaticRelations();
  const activeWars = relations.filter(r => r.diplomacyStatus === '战争');

  // Find enemy clans for active wars
  const warEnemies = activeWars
    .map(rel => clans.find(c => c.id === rel.id))
    .filter((c): c is NonNullable<typeof c> => c != null);

  // Nearby enemy check (for siege display)
  const factionCenter = getClanTerritoryCenter(faction, clans);
  const nearbyEnemy = warEnemies.find(enemy => {
    const ec = getClanTerritoryCenter(enemy, clans);
    const dx = ec.x - factionCenter.x;
    const dy = ec.y - factionCenter.y;
    return Math.abs(dx) <= 3 && Math.abs(dy) <= 3;
  });

  const aliveMembers = squadMembers.filter(m => m.isAlive);

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[580px] max-h-[85vh] flex flex-col text-zinc-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold flex items-center text-red-400">
            <Swords className="mr-2" /> 战争·{faction.name}
          </h2>
          <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {[
            { id: 'active', label: '进行中', count: activeWars.length },
            { id: 'history', label: '战史' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-2 flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-zinc-800 text-red-400 border-b-2 border-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.id === 'active' ? <CircleDot size={14} /> : <History size={14} />}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-900/50 text-red-300 text-xs">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4">
          {/* Tab: Active wars */}
          {tab === 'active' && (
            <>
              {warEnemies.length === 0 ? (
                <div className="p-6 text-center text-zinc-600">
                  <Shield size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">天下太平，暂无战事</p>
                  <p className="text-xs mt-1 text-zinc-700">可在「外交」面板对其他势力宣战</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warEnemies.map(enemy => (
                    <div key={enemy.id} className="p-3 bg-red-900/20 border border-red-700/40 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Swords size={16} className="text-red-400" />
                          <span className="font-medium text-zinc-200">{enemy.name}</span>
                          <span className="text-xs text-zinc-500">【{enemy.country}·{enemy.type}】</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                        <span>声望 {enemy.reputation}</span>
                        <span>国库 {enemy.treasury}</span>
                        <span>士气 {enemy.morale ?? 100}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Squad combat stance selector */}
              <div className="border-t border-zinc-700 pt-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <Crosshair size={14} className="text-amber-400" />
                  战术指令
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {STANCE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSquadCombatStance(opt.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                        squadMembers[0]?.combatStance === opt.id
                          ? `${opt.color} ring-1 ring-inset ring-white/20`
                          : 'text-zinc-400 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                      }`}
                    >
                      {opt.icon}
                      <div className="text-left">
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-zinc-500">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current siege report — show when near enemy */}
              {nearbyEnemy && (
                <div className="border-t border-zinc-700 pt-4">
                  <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <Sword size={14} />
                    围攻 {nearbyEnemy.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>城墙耐久度</span>
                        <span className="text-amber-400">{nearbyEnemy.fortification ?? 0}</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (nearbyEnemy.fortification ?? 0))}%` }} />
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>守军兵力</span>
                        <span className="text-cyan-400">{nearbyEnemy.garrison ?? 0}</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (nearbyEnemy.garrison ?? 0))}%` }} />
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span className="flex items-center gap-1"><Users size={12} />小队状态</span>
                        <span className="text-emerald-400">{aliveMembers.length}/{squadMembers.length} 存活</span>
                      </div>
                      {aliveMembers.length > 0 && (
                        <div className="text-xs text-zinc-500 space-y-0.5 mt-1">
                          {aliveMembers.slice(0, 3).map(m => (
                            <div key={m.id} className="flex justify-between">
                              <span>{m.name}</span>
                              <span>{m.hp}/{m.maxHp}</span>
                            </div>
                          ))}
                          {aliveMembers.length > 3 && <span className="text-zinc-600">...还有 {aliveMembers.length - 3} 人</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Siege equipment build section */}
              {faction && (() => {
                const eq = faction.siegeEquipment;
                return (
                  <div className="border-t border-zinc-700 pt-4">
                    <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                      <Sword size={14} />
                      攻城器械
                    </h3>
                    {!eq ? (
                      <button
                        onClick={() => buildSiegeEquipment(playerFactionId)}
                        disabled={(faction.treasury || 0) < 5000}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-amber-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Swords size={12} />
                        建造攻城器械（消耗 5000 灵石）
                      </button>
                    ) : eq.building ? (
                      <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>建造中</span>
                          <span className="text-amber-400">{eq.progressTicks}/{eq.requiredTicks}</span>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(eq.progressTicks / eq.requiredTicks) * 100}%` }} />
                        </div>
                      </div>
                    ) : eq.ready ? (
                      <div className="p-2 bg-emerald-900/20 border border-emerald-700/40 rounded">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <Swords size={12} />
                          <span>攻城器械已就绪！攻城伤害 ×{eq.multiplier}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              {/* Current formation display */}
              <div className="border-t border-zinc-700 pt-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <BarChart3 size={14} className="text-emerald-400" />
                  当前阵型
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(['散开', '锋矢', '方圆', '雁行', '鱼鳞'] as const).map(ft => {
                    const cfg = FORMATION_DATA[ft];
                    const active = currentFormation === ft;
                    return (
                      <button
                        key={ft}
                        onClick={() => setFormation(ft)}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                          active
                            ? 'bg-emerald-900/40 border-emerald-600 text-emerald-300'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {cfg.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Tab: War history / stats */}
          {tab === 'history' && (
            <div className="space-y-3">
              {/* War stats summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-emerald-900/20 border border-emerald-700/40 rounded text-center">
                  <div className="text-emerald-400 text-lg font-bold">{warStats.battlesWon}</div>
                  <div className="text-xs text-zinc-500">胜仗</div>
                </div>
                <div className="p-3 bg-red-900/20 border border-red-700/40 rounded text-center">
                  <div className="text-red-400 text-lg font-bold">{warStats.battlesLost}</div>
                  <div className="text-xs text-zinc-500">败仗</div>
                </div>
                <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded text-center">
                  <div className="text-amber-400 text-lg font-bold">{warStats.citiesCaptured}</div>
                  <div className="text-xs text-zinc-500">攻城</div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-400">
                <div className="flex justify-between p-2 bg-zinc-800/30 rounded">
                  <span className="flex items-center gap-1"><Skull size={12} /> 击杀敌方修士</span>
                  <span className="text-red-400">{warStats.npcsKilled}</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/30 rounded">
                  <span className="flex items-center gap-1"><Users size={12} /> 我方损失</span>
                  <span className="text-zinc-300">{warStats.alliesLost}</span>
                </div>
                <div className="flex justify-between p-2 bg-zinc-800/30 rounded">
                  <span className="flex items-center gap-1"><CircleDot size={12} /> 缴获灵石</span>
                  <span className="text-amber-400">{warStats.treasuryLooted}</span>
                </div>
              </div>

              {/* Current wars summary */}
              {activeWars.length > 0 && (
                <div className="border-t border-zinc-700 pt-3">
                  <div className="text-xs text-zinc-500 font-medium mb-2">当前交战</div>
                  {warEnemies.map(enemy => (
                    <div key={enemy.id} className="flex justify-between text-xs p-2 bg-red-900/10 rounded border border-red-700/20">
                      <span className="text-zinc-300">{enemy.name}</span>
                      <span className="text-red-400">交战中</span>
                    </div>
                  ))}
                </div>
              )}

              {warStats.battlesWon === 0 && warStats.battlesLost === 0 && (
                <div className="p-6 text-center text-zinc-600">
                  <History size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">尚无战史记录</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Squad member status footer */}
        {aliveMembers.length > 0 && (
          <div className="p-3 border-t border-zinc-700 bg-zinc-800/30">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Users size={12} />小队</span>
              <span>{aliveMembers.length} 人 · 阵型: {FORMATION_DATA[currentFormation]?.name || '散开'}</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-b-lg transition-colors text-sm"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

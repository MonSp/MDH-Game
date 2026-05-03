import { useState } from 'react';
import { useGameStore, BuildingType, BUILDING_EFFECTS, BUILDING_UPGRADE_COST, FACTION_CREATE_REQUIREMENTS, getReputationTitle } from '../store/gameStore';
import { X, Building2, Users, Shield, Coins, Sword, Eye, FlaskRound, BookOpen, Warehouse, ChevronRight, ArrowUpCircle } from 'lucide-react';

const BUILDING_ICONS: Record<BuildingType, React.ReactNode> = {
  '议事厅': <Building2 size={16} />,
  '练功房': <Sword size={16} />,
  '丹房': <FlaskRound size={16} />,
  '藏经阁': <BookOpen size={16} />,
  '库房': <Warehouse size={16} />,
  '哨塔': <Eye size={16} />,
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  '议事厅': 'text-amber-400',
  '练功房': 'text-rose-400',
  '丹房': 'text-green-400',
  '藏经阁': 'text-purple-400',
  '库房': 'text-yellow-400',
  '哨塔': 'text-cyan-400',
};

export const FactionPanel = ({ onClose }: { onClose: () => void }) => {
  const { player, clans, squadMembers, playerFactionId, createFaction, upgradeBuilding, appointOfficer, collectTax, getFactionUpgradeCost } = useGameStore();
  const [tab, setTab] = useState<'overview' | 'buildings' | 'officers'>('overview');
  const [factionName, setFactionName] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);

  if (!player) return null;

  const faction = playerFactionId ? clans.find(c => c.id === playerFactionId) : null;

  // No faction: show create flow
  if (!faction) {
    const aliveMembers = squadMembers.filter(m => m.isAlive).length;
    const repMet = player.reputation >= FACTION_CREATE_REQUIREMENTS.reputation;
    const stonesMet = (player.inventory['灵石'] || 0) >= FACTION_CREATE_REQUIREMENTS.spiritStones;
    const membersMet = aliveMembers >= FACTION_CREATE_REQUIREMENTS.minSquadMembers;
    const allMet = repMet && stonesMet && membersMet;

    return (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[550px] max-h-[85vh] flex flex-col text-zinc-200">
          <div className="flex justify-between items-center p-4 border-b border-zinc-700">
            <h2 className="text-xl font-bold flex items-center text-amber-400">
              <Building2 className="mr-2" /> 创建势力
            </h2>
            <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-zinc-400">自立门户，创建属于自己的势力。你需要满足以下条件：</p>

            {/* Requirements checklist */}
            <div className="space-y-2 bg-zinc-800/50 p-4 rounded">
              <RequirementCheck met={membersMet} label={`至少 ${FACTION_CREATE_REQUIREMENTS.minSquadMembers} 名存活队员`} current={`当前：${aliveMembers} 人`} />
              <RequirementCheck met={repMet} label={`声望达到【${getReputationTitle(FACTION_CREATE_REQUIREMENTS.reputation)}】`} current={`当前：${player.reputation}`} />
              <RequirementCheck met={stonesMet} label={`${FACTION_CREATE_REQUIREMENTS.spiritStones} 块灵石`} current={`当前：${player.inventory['灵石'] || 0} 块`} />
            </div>

            {/* Name input */}
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">势力名称</label>
              <input
                type="text"
                value={factionName}
                onChange={(e) => setFactionName(e.target.value.slice(0, 12))}
                placeholder="输入势力名称..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
                maxLength={12}
              />
            </div>

            {/* Create button */}
            <button
              onClick={() => {
                if (factionName.trim() && createFaction(factionName.trim())) {
                  onClose();
                }
              }}
              disabled={!allMet || !factionName.trim()}
              className="w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-sm text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {allMet && factionName.trim() ? `消耗 ${FACTION_CREATE_REQUIREMENTS.spiritStones} 灵石，创建势力` : '条件未满足'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has faction: show management panel
  const buildings = faction.buildings || [];
  const aliveMembers = squadMembers.filter(m => m.isAlive);
  const upgradeCost = getFactionUpgradeCost();

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[750px] max-h-[85vh] flex flex-col text-zinc-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold flex items-center text-amber-400">
            <Building2 className="mr-2" /> {faction.name}
            <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{faction.type}</span>
            <span className="ml-2 text-xs text-zinc-600">领地{faction.territory || 1}</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { collectTax(); }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded text-sm text-emerald-300 transition-colors"
            >
              <Coins size={14} />
              <span>收税</span>
            </button>
            <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
          </div>
        </div>

        {/* Faction stats bar */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-950/50 border-b border-zinc-700 text-xs">
          <div className="text-center">
            <div className="text-zinc-500">灵石</div>
            <div className="text-amber-400 font-medium">{(faction.treasury || 0).toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">声望</div>
            <div className="text-zinc-200 font-medium">{faction.reputation}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500">士气</div>
            <div className={`font-medium ${(faction.morale ?? 50) < 20 ? 'text-rose-400 animate-pulse' : (faction.morale ?? 50) > 60 ? 'text-green-400' : (faction.morale ?? 50) < 30 ? 'text-red-400' : 'text-zinc-200'}`}>
              {faction.morale ?? 50}/100
            </div>
            {(faction.morale ?? 50) < 20 && (
              <div className="mt-2 px-2 py-1 bg-rose-900/40 border border-rose-700/50 rounded text-rose-300 text-xs">
                士气低落，队员可能叛离！
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-zinc-500">成员</div>
            <div className="text-zinc-200 font-medium">{aliveMembers.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {(['overview', 'buildings', 'officers'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedBuilding(null); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-zinc-800 text-amber-400 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'overview' ? '总览' : t === 'buildings' ? '建筑' : '部属'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Faction level & upgrade */}
              <div className="p-3 bg-zinc-800/50 rounded">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">势力等级</h4>
                {faction.type !== '皇族' ? (
                  <div className="text-xs text-zinc-400">
                    <p>升级至下一级需要：声望 {upgradeCost.reputation}，灵石 {upgradeCost.stones.toLocaleString()}</p>
                    <div className="mt-2 flex space-x-2">
                      <span className={`px-2 py-0.5 rounded ${player.reputation >= upgradeCost.reputation ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-600'}`}>
                        声望 {player.reputation}/{upgradeCost.reputation}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${(player.inventory['灵石'] || 0) >= upgradeCost.stones ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-600'}`}>
                        灵石 {(player.inventory['灵石'] || 0).toLocaleString()}/{upgradeCost.stones.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">已达最高等级！</p>
                )}
              </div>

              {/* Building effects summary */}
              <div className="p-3 bg-zinc-800/50 rounded">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">当前加成</h4>
                <div className="space-y-1 text-xs">
                  {buildings.length === 0 ? (
                    <p className="text-zinc-600">尚未建造任何建筑。</p>
                  ) : (
                    buildings.map(b => (
                      <div key={b.type} className="flex items-center justify-between">
                        <span className={`flex items-center space-x-1 ${BUILDING_COLORS[b.type]}`}>
                          {BUILDING_ICONS[b.type]}
                          <span>{b.type} Lv.{b.level}</span>
                        </span>
                        <span className="text-zinc-500">{BUILDING_EFFECTS[b.type][b.level - 1]}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Squad members summary */}
              <div className="p-3 bg-zinc-800/50 rounded">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">队伍概况</h4>
                <div className="text-xs text-zinc-400">
                  <p>存活队员：{aliveMembers.length} 人</p>
                  <p>总战力：{aliveMembers.reduce((s, m) => s + m.power, 0)}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'buildings' && (
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(BUILDING_EFFECTS) as BuildingType[]).map(buildingType => {
                const existing = buildings.find(b => b.type === buildingType);
                const level = existing?.level || 0;
                const maxed = level >= 3;
                const cost = existing ? BUILDING_UPGRADE_COST[buildingType][existing.level] || 0 : BUILDING_UPGRADE_COST[buildingType][0];

                return (
                  <div
                    key={buildingType}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedBuilding === buildingType
                        ? 'bg-zinc-700/70 border-amber-600'
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setSelectedBuilding(buildingType)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center space-x-1 text-sm font-medium ${BUILDING_COLORS[buildingType]}`}>
                        {BUILDING_ICONS[buildingType]}
                        <span>{buildingType}</span>
                      </span>
                      {level > 0 && (
                        <span className="text-xs text-zinc-500">Lv.{level}/3</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{BUILDING_EFFECTS[buildingType][level > 0 ? level - 1 : 0]}</p>
                    {!maxed && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">升级费用：{cost} 灵石</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); upgradeBuilding(buildingType); }}
                          disabled={(player.inventory['灵石'] || 0) < cost}
                          className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUpCircle size={12} />
                          <span>{level === 0 ? '建造' : '升级'}</span>
                        </button>
                      </div>
                    )}
                    {maxed && <p className="text-xs text-amber-600">已满级</p>}
                    {level === 0 && <p className="text-xs text-zinc-700 mt-1">未建造</p>}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'officers' && (
            <div className="space-y-2">
              {aliveMembers.length === 0 ? (
                <div className="p-6 text-center text-zinc-600">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">队伍中没有可任命的队员</p>
                </div>
              ) : (
                aliveMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-zinc-800/50 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <Shield size={16} className="text-zinc-500" />
                      <div>
                        <span className="text-sm font-medium text-zinc-200">{member.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">【{member.realm}】战力{member.power}</span>
                        <span className="text-xs text-zinc-600 ml-2">{member.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {(['长老', '供奉'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => appointOfficer(member.id, pos)}
                          disabled={member.activity === `职务：${pos}`}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            member.activity === `职务：${pos}`
                              ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                              : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400 border border-transparent'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-zinc-600 mt-2">队员当前职务显示在其活动状态中。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function RequirementCheck({ met, label, current }: { met: boolean; label: string; current: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
          met ? 'bg-emerald-900/40 border-emerald-600 text-emerald-400' : 'bg-zinc-800 border-zinc-600 text-zinc-600'
        }`}>
          {met ? '✓' : '×'}
        </div>
        <span className={`text-sm ${met ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
      </div>
      <span className={`text-xs ${met ? 'text-emerald-500' : 'text-zinc-600'}`}>{current}</span>
    </div>
  );
}

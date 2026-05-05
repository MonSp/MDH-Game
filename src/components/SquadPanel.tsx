import { useState } from 'react';
import { useGameStore, type SquadMember, SQUAD_ROLE_INFO, RECRUIT_REPUTATION_TIER, RECRUIT_SPIRITSTONE_COST, getReputationTitle, EQUIPPABLE_ITEMS } from '../store/gameStore';
import { X, Users, UserPlus, Trash2, Shield, Sword, AlertTriangle } from 'lucide-react';
import { PixelPanel } from './PixelPanel';

export const SquadPanel = ({ onClose }: { onClose: () => void }) => {
  const { player, squadMembers, nearbyNPCs, recruitToSquad, dismissFromSquad, assignSquadRole, getRecruitCost } = useGameStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showRecruit, setShowRecruit] = useState(false);

  if (!player) return null;

  const selectedMember = selectedMemberId ? squadMembers.find(m => m.id === selectedMemberId) ?? null : null;
  const aliveMembers = squadMembers.filter(m => m.isAlive);

  // Nearby NPCs that can be recruited
  const recruitCandidates = nearbyNPCs.map(npc => ({
    npc,
    cost: getRecruitCost(npc),
  }));

  const roleOptions: Array<{ value: string; label: string }> = [
    { value: '战斗型', label: '战斗型' },
    { value: '斥候型', label: '斥候型' },
    { value: '军师型', label: '军师型' },
    { value: '后勤型', label: '后勤型' },
  ];

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <PixelPanel className="w-[750px] max-h-[85vh] flex flex-col text-zinc-200" contentClassName="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold flex items-center text-emerald-400">
            <Users className="mr-2" /> 小队管理
            <span className="ml-2 text-sm text-zinc-500 font-normal">({aliveMembers.length}/{squadMembers.length} 人)</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRecruit(!showRecruit)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-sm text-amber-300 transition-colors"
            >
              <UserPlus size={14} />
              <span>招募</span>
            </button>
            <button onClick={onClose} className="hover:text-rose-400 transition-colors">
              <X />
            </button>
          </div>
        </div>

        {/* Recruit panel (collapsible) */}
        {showRecruit && (
          <div className="border-b border-zinc-700 bg-zinc-950/50">
            <div className="p-3 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">附近可招募的修士</h3>
              {recruitCandidates.length === 0 ? (
                <p className="text-zinc-600 text-sm p-2">附近没有可招募的修士。</p>
              ) : (
                <div className="space-y-1">
                  {recruitCandidates.map(({ npc, cost }) => (
                    <div key={npc.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{npc.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">【{npc.realm}】</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-zinc-400">
                        <span>声望: {cost.reputationRequired}</span>
                        <span>灵石: {cost.spiritStoneCost}</span>
                      </div>
                      <button
                        onClick={() => { recruitToSquad(npc.id); setShowRecruit(false); }}
                        disabled={!cost.canRecruit}
                        className="ml-3 px-3 py-1 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded text-xs text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={cost.reason}
                      >
                        招募
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content: two-column layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left: member list */}
          <div className="w-64 border-r border-zinc-700 overflow-y-auto">
            {squadMembers.length === 0 ? (
              <div className="p-6 text-center text-zinc-600">
                <Shield size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">你还没有招募任何队员</p>
                <p className="text-xs mt-1">在大地图上找到修士，点击招募加入你的队伍</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {squadMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      selectedMemberId === member.id
                        ? 'bg-zinc-700/70 border border-zinc-600'
                        : 'hover:bg-zinc-800 border border-transparent'
                    } ${!member.isAlive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${!member.isAlive ? 'text-red-400' : 'text-zinc-200'}`}>
                        {member.name}
                        {!member.isAlive && ' (已故)'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        member.role === '战斗型' ? 'bg-red-900/40 text-red-300' :
                        member.role === '斥候型' ? 'bg-blue-900/40 text-blue-300' :
                        member.role === '军师型' ? 'bg-purple-900/40 text-purple-300' :
                        'bg-amber-900/40 text-amber-300'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2 text-xs text-zinc-500">
                      <span>HP {member.hp}/{member.maxHp}</span>
                      {member.isAlive && <span className="text-emerald-500">{member.activity}</span>}
                    </div>
                    {member.isAlive && (
                      <div className="w-full bg-zinc-950 rounded-full h-1 mt-1">
                        <div className="bg-rose-500 h-1 rounded-full" style={{ width: `${(member.hp / member.maxHp) * 100}%` }}></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: member detail */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!selectedMember ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                <p className="text-sm">选择一个队员查看详情</p>
              </div>
            ) : (
              <MemberDetail
                member={selectedMember}
                onRoleChange={(role) => assignSquadRole(selectedMember.id, role as any)}
                onDismiss={() => dismissFromSquad(selectedMember.id)}
              />
            )}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

// Member detail sub-component
function MemberDetail({ member, onRoleChange, onDismiss }: {
  member: SquadMember;
  onRoleChange: (role: string) => void;
  onDismiss: () => void;
}) {
  const { player, equipMember, unequipMember } = useGameStore();
  const roleInfo = SQUAD_ROLE_INFO[member.role];
  const daysSinceJoin = Math.floor((Date.now() - member.joinDate) / (1000 * 60 * 60 * 24));

  // Items from player inventory that can be equipped
  const equippableItems = player?.inventory
    ? Object.entries(player.inventory).filter(([name, qty]) => qty > 0 && name in EQUIPPABLE_ITEMS)
    : [];

  return (
    <div className="space-y-4">
      {/* Name + status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-bold ${!member.isAlive ? 'text-red-400' : 'text-emerald-400'}`}>
            {member.name}
            {!member.isAlive && ' (已故)'}
          </h3>
          <p className="text-sm text-zinc-400">【{member.realm}】 Lv.{member.level ?? 1}</p>
        </div>
        {member.isAlive && (
          <button
            onClick={onDismiss}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded text-xs text-red-300 transition-colors"
          >
            <Trash2 size={12} />
            <span>逐出队伍</span>
          </button>
        )}
      </div>

      {/* Role info */}
      <div className="p-3 bg-zinc-800/50 rounded space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">定位</span>
          <select
            value={member.role}
            onChange={(e) => onRoleChange(e.target.value)}
            disabled={!member.isAlive}
            className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 disabled:opacity-50"
          >
            {Object.entries(SQUAD_ROLE_INFO).map(([key, info]) => (
              <option key={key} value={key}>{info.label} — {info.description}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-emerald-400">{roleInfo.statBonus}</p>
      </div>

      {/* Exp bar */}
      {member.isAlive && (
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>经验</span><span>{(member.exp ?? 0)}/{(member.maxExp ?? 80)}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, ((member.exp ?? 0) / (member.maxExp ?? 80)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-zinc-800/50 rounded">
          <span className="text-zinc-500">战力</span>
          <p className="text-zinc-200 font-medium">{member.power}</p>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <span className="text-zinc-500">击杀</span>
          <p className="text-zinc-200 font-medium">{member.kills}</p>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <span className="text-zinc-500">入队</span>
          <p className="text-zinc-200 font-medium">{daysSinceJoin} 天前</p>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <span className="text-zinc-500">状态</span>
          <p className={`font-medium ${member.isAlive ? 'text-emerald-400' : 'text-red-400'}`}>
            {member.isAlive ? member.activity : '已阵亡'}
          </p>
        </div>
      </div>

      {/* HP/MP bars */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>气血</span><span>{member.hp}/{member.maxHp}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2">
            <div className={`h-2 rounded-full ${!member.isAlive ? 'bg-red-950' : 'bg-rose-500'}`}
              style={{ width: `${(member.hp / member.maxHp) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>灵力</span><span>{member.mp}/{member.maxMp}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(member.mp / member.maxMp) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Equipment */}
      {member.isAlive && (
        <div className="p-3 bg-zinc-800/50 rounded">
          <h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center">
            <Sword size={12} className="mr-1" /> 装备
          </h4>
          {(!member.equipment || member.equipment.length === 0) ? (
            <p className="text-xs text-zinc-600">无装备</p>
          ) : (
            <div className="space-y-1">
              {member.equipment.map(eq => (
                <div key={eq} className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300">{eq}</span>
                  <button
                    onClick={() => unequipMember(member.id, eq)}
                    className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-400"
                  >
                    卸下
                  </button>
                </div>
              ))}
            </div>
          )}
          {equippableItems.length > 0 && (!member.equipment || member.equipment.length === 0) && (
            <div className="mt-2 pt-2 border-t border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">背包中可装备：</p>
              {equippableItems.map(([itemName, qty]) => (
                <button
                  key={itemName}
                  onClick={() => equipMember(member.id, itemName)}
                  className="mr-1 px-2 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded text-xs text-amber-300"
                >
                  {itemName} ({qty})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Personality */}
      <div className="p-3 bg-zinc-800/50 rounded">
        <h4 className="text-xs font-medium text-zinc-400 mb-2">性格</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div><span className="text-zinc-500">野心</span><p>{member.personality.ambition}</p></div>
          <div><span className="text-zinc-500">谨慎</span><p>{member.personality.caution}</p></div>
          <div>
            <span className="text-zinc-500">忠诚</span>
            <p className={member.personality.loyalty < 20 ? 'text-rose-400' : member.personality.loyalty < 40 ? 'text-yellow-400' : ''}>
              {member.personality.loyalty}
            </p>
          </div>
          <div><span className="text-zinc-500">贪婪</span><p>{member.personality.greed}</p></div>
        </div>
        {member.isAlive && member.personality.loyalty < 20 && (
          <div className="mt-2 flex items-center space-x-1 text-rose-400 text-xs">
            <AlertTriangle size={12} />
            <span>忠诚度极低，可能在战斗中叛逃！</span>
          </div>
        )}
      </div>

      {/* Dead member dismiss */}
      {!member.isAlive && (
        <div className="p-3 bg-red-950/30 border border-red-800/50 rounded">
          <p className="text-xs text-red-300 mb-2">此队员已阵亡。将其移出队伍以释放位置。</p>
          <button
            onClick={onDismiss}
            className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-300 transition-colors"
          >
            移出队伍
          </button>
        </div>
      )}
    </div>
  );
}

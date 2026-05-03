import { useState } from 'react';
import { useGameStore, type DiplomaticStatus, type ConflictLevel, type Clan } from '../store/gameStore';
import { X, Handshake, Swords, Heart, Flag, Search, Shield, AlertTriangle } from 'lucide-react';

const STATUS_LABELS: Record<DiplomaticStatus, string> = {
  '中立': '中立',
  '同盟': '同盟',
  '战争': '战争',
  '停战': '停战',
  '臣服': '臣服',
};

const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  '中立': 'text-zinc-500',
  '同盟': 'text-green-400',
  '战争': 'text-red-400',
  '停战': 'text-yellow-400',
  '臣服': 'text-purple-400',
};

const STATUS_BG_COLORS: Record<DiplomaticStatus, string> = {
  '中立': 'bg-zinc-800 border-zinc-600',
  '同盟': 'bg-green-900/30 border-green-700/50',
  '战争': 'bg-red-900/30 border-red-700/50',
  '停战': 'bg-yellow-900/30 border-yellow-700/50',
  '臣服': 'bg-purple-900/30 border-purple-700/50',
};

export const DiplomacyPanel = ({ onClose }: { onClose: () => void }) => {
  const {
    player, clans, playerFactionId,
    declareWar, proposeAlliance, proposeTruce, surrenderTo, breakAlliance,
    getDiplomaticRelations, getDiplomaticStatus,
  } = useGameStore();

  const [tab, setTab] = useState<'relations' | 'actions'>('relations');
  const [search, setSearch] = useState('');

  if (!player || !playerFactionId) return null;

  const faction = clans.find(c => c.id === playerFactionId);
  if (!faction) return null;

  const relations = getDiplomaticRelations();

  // All other factions (excluding player's own) for the actions tab
  const otherClans = clans.filter(c =>
    c.id !== playerFactionId &&
    (c.type === '1级' || c.type === '2级' || c.type === '3级' || c.type === '皇族') &&
    (search === '' || c.name.includes(search) || c.country.includes(search))
  );

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[650px] max-h-[85vh] flex flex-col text-zinc-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold flex items-center text-purple-400">
            <Handshake className="mr-2" /> 外交·{faction.name}
          </h2>
          <button onClick={onClose} className="hover:text-rose-400 transition-colors"><X /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {(['relations', 'actions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-zinc-800 text-purple-400 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'relations' ? '外交关系' : '外交行动'}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          {tab === 'relations' && (
            <div className="space-y-2">
              {relations.length === 0 ? (
                <div className="p-6 text-center text-zinc-600">
                  <Handshake size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无外交关系</p>
                  <p className="text-xs mt-1">前往「外交行动」与其他势力建立关系</p>
                </div>
              ) : (
                relations.map(rel => {
                  const targetClan = clans.find(c => c.id === rel.id);
                  if (!targetClan) return null;
                  return (
                    <div key={rel.id} className={`flex items-center justify-between p-3 rounded border ${STATUS_BG_COLORS[rel.diplomacyStatus]}`}>
                      <div className="flex items-center space-x-3">
                        <div>
                          <span className="text-sm font-medium text-zinc-200">{targetClan.name}</span>
                          <span className="text-xs text-zinc-500 ml-2">【{targetClan.country}·{targetClan.type}】</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium ${STATUS_COLORS[rel.diplomacyStatus]}`}>
                          {rel.conflictLevel !== '和平' && rel.diplomacyStatus === '战争' ? (
                            <span className="flex items-center space-x-1">
                              <Swords size={12} />
                              <span>{STATUS_LABELS[rel.diplomacyStatus]}·{rel.conflictLevel}</span>
                            </span>
                          ) : (
                            STATUS_LABELS[rel.diplomacyStatus]
                          )}
                        </span>
                        {rel.diplomacyStatus === '同盟' && (
                          <button
                            onClick={() => breakAlliance(rel.id)}
                            className="px-2 py-1 text-xs rounded bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50 transition-colors"
                          >
                            毁盟
                          </button>
                        )}
                        {rel.diplomacyStatus === '战争' && (
                          <button
                            onClick={() => proposeTruce(rel.id)}
                            className="px-2 py-1 text-xs rounded bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-300 border border-yellow-700/50 transition-colors"
                          >
                            停战
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索势力名称或国家..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
                />
              </div>

              {otherClans.map(targetClan => {
                const status = getDiplomaticStatus(targetClan.id);
                return (
                  <div key={targetClan.id} className="flex items-center justify-between bg-zinc-800/50 p-3 rounded border border-zinc-700">
                    <div>
                      <span className="text-sm font-medium text-zinc-200">{targetClan.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">【{targetClan.country}·{targetClan.type}】</span>
                      <div className="mt-1">
                        <span className={`text-xs ${STATUS_COLORS[status]}`}>
                          当前关系：{STATUS_LABELS[status]}
                        </span>
                        <span className="text-xs text-zinc-600 ml-2">声望 {targetClan.reputation}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-wrap gap-1">
                      {status === '中立' || status === '停战' ? (
                        <>
                          <ActionButton
                            icon={<Swords size={12} />}
                            label="宣战"
                            onClick={() => declareWar(targetClan.id)}
                            color="rose"
                          />
                          <ActionButton
                            icon={<Heart size={12} />}
                            label="结盟"
                            onClick={() => proposeAlliance(targetClan.id)}
                            color="emerald"
                          />
                          <ActionButton
                            icon={<Flag size={12} />}
                            label="臣服"
                            onClick={() => surrenderTo(targetClan.id)}
                            color="purple"
                          />
                        </>
                      ) : status === '战争' ? (
                        <ActionButton
                          icon={<Shield size={12} />}
                          label="停战"
                          onClick={() => proposeTruce(targetClan.id)}
                          color="yellow"
                        />
                      ) : status === '同盟' ? (
                        <ActionButton
                          icon={<X size={12} />}
                          label="毁盟"
                          onClick={() => breakAlliance(targetClan.id)}
                          color="rose"
                        />
                      ) : status === '臣服' ? (
                        <span className="text-xs text-purple-400 px-2">已臣服</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {otherClans.length === 0 && (
                <div className="p-6 text-center text-zinc-600">
                  <Search size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">没有找到匹配的势力</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function ActionButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border-rose-700/50',
    emerald: 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border-emerald-700/50',
    yellow: 'bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-300 border-yellow-700/50',
    purple: 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border-purple-700/50',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1 px-2 py-1 text-xs rounded border transition-colors ${colorMap[color] || colorMap.rose}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

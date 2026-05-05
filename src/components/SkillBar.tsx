import { useGameStore, TECHNIQUES_DATA, REALM_LIST, type Equipment, type EquipmentSlot, type Technique } from '../store/gameStore';
import { EquipmentRarity } from '../shared/types/cultivation';
import { useState } from 'react';
import { BookOpen, Zap, Shield, Heart, ArrowUp, Sword, Star } from 'lucide-react';
import { PixelPanel } from './PixelPanel';
import { PixelTechniqueIcon } from './PixelTechniqueIcon';

interface SkillBarProps {
  onClose: () => void;
}

const STAT_LABELS: Record<string, string> = {
  attack: '攻击', defense: '防御', hp: '生命', mp: '灵力',
  expRate: '经验加成', cultivationRate: '修炼速度',
};

const EQUIP_SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: '武器', armor: '护甲', artifact: '法宝', accessory: '饰品', pill: '丹药',
};

export const SkillBar = ({ onClose }: SkillBarProps) => {
  const { player, learnTechnique, cultivateTechnique, equipItem, unequipItem, getTechniqueEffects, addLog } = useGameStore();
  const [activeTab, setActiveTab] = useState<'techniques' | 'equipment' | 'learn'>('techniques');
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  if (!player) return null;

  const techniques = player.learnedTechniques;
  const effects = getTechniqueEffects();
  const inventory = player.inventory;
  const equipmentSlots = player.equipmentSlots || {};
  const realmIndex = REALM_LIST.indexOf(player.realm);

  // Available (not yet learned) techniques
  const availableTechs = TECHNIQUES_DATA.filter(t =>
    !techniques.some(lt => lt.techniqueId === t.id) &&
    realmIndex + 1 >= t.requiredRealm
  );

  // Techniques beyond player's realm
  const lockedTechs = TECHNIQUES_DATA.filter(t =>
    !techniques.some(lt => lt.techniqueId === t.id) &&
    realmIndex + 1 < t.requiredRealm
  );

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <PixelPanel className="p-6 w-[520px] max-h-[80vh] flex flex-col" contentClassName="flex flex-col flex-1 min-h-0">
        <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
          <BookOpen size={20} className="mr-2" />功法与装备
        </h3>

        {/* Tab navigation */}
        <div className="flex space-x-1 mb-4 border-b border-zinc-700 pb-2">
          {[
            { id: 'techniques', label: '已学功法', count: techniques.filter(t => {
              const tech = TECHNIQUES_DATA.find(tc => tc.id === t.techniqueId);
              return tech?.type === 'active';
            }).length },
            { id: 'equipment', label: '装备栏' },
            { id: 'learn', label: '可学功法', count: availableTechs.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {tab.count !== undefined && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-800 text-xs">
                  {tab.count}
                </span>
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active technique effects summary */}
        {effects.length > 0 && (
          <div className="mb-3 p-2 bg-emerald-900/20 border border-emerald-700/30 rounded text-xs flex flex-wrap gap-x-4 gap-y-1">
            {effects.map((eff, i) => (
              <span key={i} className="text-emerald-400">
                {STAT_LABELS[eff.stat] || eff.stat}: +{eff.value}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {/* Tab: Learned techniques */}
          {activeTab === 'techniques' && (
            <>
              {techniques.length === 0 ? (
                <div className="text-zinc-500 text-sm text-center py-8">尚未学习任何功法</div>
              ) : (
                TECHNIQUES_DATA.filter(t => techniques.some(lt => lt.techniqueId === t.id)).map(tech => {
                  const lt = techniques.find(t => t.techniqueId === tech.id)!;
                  const isActive = tech.type === 'active';
                  const gradeColors: Record<string, string> = {
                    '凡品': 'text-zinc-400', '灵品': 'text-green-400', '地品': 'text-blue-400', '天品': 'text-purple-400', '仙品': 'text-amber-400',
                  };
                  return (
                    <div
                      key={tech.id}
                      className={`p-3 rounded border transition-colors cursor-pointer ${
                        selectedTech === tech.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                      onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PixelTechniqueIcon techniqueId={tech.id} size={16} />
                          <span className="text-sm font-medium text-zinc-200">{tech.name}</span>
                          <span className={`text-xs ${gradeColors[tech.grade] || 'text-zinc-400'}`}>{tech.grade}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">Lv.{lt.level}/{tech.maxLevel}</span>
                          {lt.level < tech.maxLevel && (
                            <button
                              onClick={(e) => { e.stopPropagation(); cultivateTechnique(tech.id); }}
                              className="px-2 py-0.5 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 text-xs rounded transition-colors"
                            >
                              提升 ({tech.levelUpCost})
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{tech.description}</p>
                      {selectedTech === tech.id && (
                        <div className="mt-2 pt-2 border-t border-zinc-700 text-xs space-y-1">
                          {tech.effects.map((eff, i) => (
                            <div key={i} className="flex justify-between text-zinc-400">
                              <span>{STAT_LABELS[eff.stat] || eff.stat}</span>
                              <span className="text-emerald-400">+{eff.value + eff.perLevel * (lt.level - 1)}</span>
                            </div>
                          ))}
                          {tech.skill && (
                            <div className="mt-1 text-zinc-400">
                              <span className="text-amber-400">技能：</span>{tech.skill.name} — {tech.skill.description}
                              <span className="text-zinc-500"> (CD:{tech.skill.cooldown}t, 消耗:{tech.skill.cost.mp || 0}MP)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* Tab: Equipment slots */}
          {activeTab === 'equipment' && (
            <div className="space-y-2">
              {(['weapon', 'armor', 'artifact', 'accessory', 'pill'] as EquipmentSlot[]).map(slot => {
                const equipped = equipmentSlots[slot];
                const rarityColors: Record<string, string> = {
                  '凡品': 'text-zinc-400', '灵品': 'text-green-400', '仙品': 'text-purple-400', '神品': 'text-amber-400',
                };
                return (
                  <div key={slot} className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-400 w-10">{EQUIP_SLOT_LABELS[slot]}</span>
                        {equipped ? (
                          <>
                            <span className={`text-sm ${rarityColors[equipped.rarity] || 'text-zinc-200'}`}>{equipped.name}</span>
                            {equipped.baseStats && (
                              <span className="text-xs text-zinc-500">
                                {Object.entries(equipped.baseStats).map(([k, v]) => `${STAT_LABELS[k] || k}+${v}`).join(' ')}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-zinc-600">空</span>
                        )}
                      </div>
                      {equipped && (
                        <button
                          onClick={() => unequipItem(slot)}
                          className="px-2 py-0.5 bg-red-900/30 hover:bg-red-800/50 text-red-300 text-xs rounded transition-colors"
                        >
                          卸下
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Learn new techniques */}
          {activeTab === 'learn' && (
            <>
              {availableTechs.length === 0 && lockedTechs.length === 0 ? (
                <div className="text-zinc-500 text-sm text-center py-8">所有功法已学或无法获取</div>
              ) : (
                <>
                  {availableTechs.length > 0 && (
                    <>
                      <div className="text-xs text-zinc-500 mb-1 font-medium">可学习</div>
                      {availableTechs.map(tech => (
                        <div key={tech.id} className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PixelTechniqueIcon techniqueId={tech.id} size={16} />
                              <span className="text-sm text-zinc-200">{tech.name}</span>
                              <span className="text-xs text-zinc-500">{tech.grade}</span>
                            </div>
                            <span className="text-xs text-zinc-500">灵石: {tech.learnCost}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{tech.description}</p>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => learnTechnique(tech.id)}
                              disabled={(inventory['灵石'] || 0) < tech.learnCost}
                              className="px-3 py-1 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 text-xs rounded transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                            >
                              {(inventory['灵石'] || 0) >= tech.learnCost ? '学习' : '灵石不足'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {lockedTechs.length > 0 && (
                    <>
                      <div className="text-xs text-zinc-500 mt-3 mb-1 font-medium">境界不足</div>
                      {lockedTechs.map(tech => (
                        <div key={tech.id} className="p-3 bg-zinc-800/20 border border-zinc-800 rounded opacity-60">
                          <div className="flex items-center gap-2">
                            <PixelTechniqueIcon techniqueId={tech.id} size={16} />
                            <span className="text-sm text-zinc-400">{tech.name}</span>
                            <span className="text-xs text-zinc-500">{tech.grade}</span>
                            <span className="text-xs text-zinc-600 ml-auto">
                              需要{['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'][tech.requiredRealm - 1]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
        >
          关闭
        </button>
      </PixelPanel>
    </div>
  );
};

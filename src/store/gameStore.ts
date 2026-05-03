import { create } from 'zustand';
import { saveGame, loadGame, deleteSave, getSaveSlots, type SaveSlotInfo } from './saveManager';

// Import everything needed for the store body's local scope
import {
  HEAVEN_INFO, HEAVEN_MAX_REALM, REALM_LIST, REALM_BREAKTHROUGH_COST, REALM_MAX_EXP,
  getReputationTitle, REPUTATION_SOURCES, RECRUIT_REPUTATION_TIER, RECRUIT_SPIRITSTONE_COST,
  FACTION_CREATE_REQUIREMENTS, BUILDING_UPGRADE_COST, BUILDING_TREASURY_CAP_BASE,
  BUILDING_TREASURY_CAP_PER_LEVEL, EQUIPPABLE_ITEMS, MAX_MONSTERS, SPAWN_CHANCE, DESPAWN_DIST,
  MONSTER_TYPES_DATA, MONSTER_REALM_ORDER, COUNTRIES_DATA, COUNTRIES, IMMORTAL_DOMAINS_DATA,
  SURNAMES, calculateDamage, createWildMonster, getMonstersForPlayerRealm,
  getDiplomaticStatusFrom, getDiplomaticStatusFromClans, BUILDING_SPEED_MULTIPLIERS,
  getFactionBuildingLevel, generateClans, generateNearbyNPCs, generateResourcePoints,
  evaluateNPCBehavior, SQUAD_ROLE_INFO, BODY_TYPES_DATA, TALENT_GRADE_TABLE, computeTalentGrade,
  BUILDING_EFFECTS, BUILDING_VISION_BONUS, type GameState, type Player, type Clan, type NPC,
  type WildMonster, type SquadMember, type Realm, type HeavenLevel, type BodyType,
  type BuildingType, type DiplomaticStatus, type ConflictLevel, type MonsterType,
  type FactionBuilding, type ClanDiplomacy, type CycleType, type SquadRole, type BuildingLevel, type TalentAttributes,
} from './gameConstants';

// Re-export all public API from gameConstants
export * from './gameConstants';
let lastMoraleWarningAt: number | undefined;

export const useGameStore = create<GameState>((set, get) => ({
  servers: [
    { id: 's1-9', name: '太古一区(凡界)', playerCount: 100, status: '爆满' },
    { id: 's2-9', name: '洪荒二区(凡界)', playerCount: 89, status: '拥挤' },
    { id: 's3-8', name: '灵界·汇聚地', playerCount: 45, status: '流畅' },
  ],
  currentServer: null,
  player: null,
  clans: [],
  nearbyNPCs: [],
  wildMonsters: [],
  resourcePoints: [],
  logs: [],
  market: {
    '洗髓丹': { name: '洗髓丹', basePrice: 500, currentPrice: 500, stock: 10 },
    '低级法器': { name: '低级法器', basePrice: 200, currentPrice: 200, stock: 50 },
    '回血丹': { name: '回血丹', basePrice: 50, currentPrice: 50, stock: 100 },
    '聚气散': { name: '聚气散', basePrice: 100, currentPrice: 100, stock: 80 },
    '飞升令': { name: '飞升令', basePrice: 10000, currentPrice: 10000, stock: 5 },
  },
  metNpcs: [],
  npcMemory: {},
  squadMembers: [],
  playerFactionId: null,
  ascensionQuests: [],

  joinServer: (serverId, playerName) => {
    const heavenLevel: HeavenLevel = 9;
    const clans = generateClans(heavenLevel);
    const randomClan = clans[Math.floor(Math.random() * clans.length)];
    const spiritMultiplier = HEAVEN_INFO[heavenLevel].spiritMultiplier;
    
    const initialPos = { x: 50, y: 50 };
    const defaultTalent = { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 };
    const player: Player = {
      id: 'p1',
      name: playerName || '无名修士',
      heavenLevel,
      realm: '凡人',
      bodyType: '凡体',
      potential: '无',
      hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
      reputation: 0,
      country: randomClan.country,
      clanId: randomClan.id,
      stats: {
        hp: 100,
        maxHp: 100 * spiritMultiplier + (defaultTalent.boneConstitution) * 2,
        mp: randomClan.country === '魏' ? Math.floor(22 * spiritMultiplier) : Math.floor(20 * spiritMultiplier),
        maxMp: randomClan.country === '魏' ? Math.floor(22 * spiritMultiplier) : Math.floor(20 * spiritMultiplier),
        attack: Math.floor(5 * spiritMultiplier + (defaultTalent.boneConstitution) * 0.5),
        defense: Math.floor(10 + (defaultTalent.boneConstitution) * 0.5),
        exp: 0,
        maxExp: REALM_MAX_EXP['凡人']
      },
      position: initialPos,
      inventory: { '灵石': 500 },
      cycleInfo: { type: null },
      isAscending: false,
      talent: defaultTalent,
    };

    set({
      currentServer: serverId,
      clans,
      player,
      nearbyNPCs: generateNearbyNPCs(randomClan.id, initialPos.x, initialPos.y, randomClan.country, heavenLevel),
      resourcePoints: generateResourcePoints(initialPos.x, initialPos.y, heavenLevel),
      logs: [
        { id: Date.now().toString(), time: new Date().toLocaleTimeString(), type: 'system', message: `欢迎来到【${HEAVEN_INFO[heavenLevel].name}】，你出生在${randomClan.country}国 ${randomClan.name} 的支脉。` },
        { id: Date.now().toString() + '2', time: new Date().toLocaleTimeString(), type: 'system', message: `【国家特质】${randomClan.country}国属${COUNTRIES_DATA[randomClan.country].culture}，${COUNTRIES_DATA[randomClan.country].feature}。你获得了专属增益：${COUNTRIES_DATA[randomClan.country].buff}！` },
        { id: Date.now().toString() + '3', time: new Date().toLocaleTimeString(), type: 'system', message: `【灵气倍率】当前世界灵气浓度×${spiritMultiplier}，资源丰度×${HEAVEN_INFO[heavenLevel].resourceMultiplier}。` }
      ],
      ascensionQuests: [
        { name: '完成3次天道任务', description: '参与国家战争、守护家族、探索遗迹', completed: false },
        { name: '达到当前世界最高境界', description: `达到${HEAVEN_MAX_REALM[heavenLevel]}境界`, completed: false },
        { name: '积累足够功德', description: '完成善举，提升功德值', completed: false },
      ]
    });
  },

  addLog: (log) => set(state => ({
    logs: [...state.logs, { ...log, id: Date.now().toString() + Math.random(), time: new Date().toLocaleTimeString() }].slice(-50)
  })),

  movePlayer: (dx, dy) => set(state => {
    if (!state.player) return state;
    
    // 赵国特质：移动速度/距离影响 (这里简单处理为偶尔能移动更远)
    let moveMultiplier = 1;
    if (state.player.country === '赵' && Math.random() < 0.2) {
      moveMultiplier = 2; // 有20%几率触发“游侠身法”，移动2格
    }
    
    return {
      player: {
        ...state.player,
        position: { x: state.player.position.x + dx * moveMultiplier, y: state.player.position.y + dy * moveMultiplier }
      }
    };
  }),

  interactWithNPC: (npcId, action) => {
    const state = get();
    const npc = state.nearbyNPCs.find(n => n.id === npcId);
    if (!npc || !state.player) return;

    if (action === '攻击') {
      state.addLog({ type: 'combat', message: `你向 ${npc.name}(${npc.role}) 发起了攻击！` });
      
      // 秦国战力加成或简单对比
      const playerAttack = state.player.country === '秦' ? state.player.stats.attack * 1.1 : state.player.stats.attack;
      const winChance = playerAttack / (playerAttack + (npc.power / 10));
      const win = Math.random() < Math.max(0.1, Math.min(0.9, winChance));
      
      if (win) {
        // 战斗经验加成
        const expGain = state.player.country === '秦' ? Math.floor(50 * 1.1) : 50;
        
        let dropStones = npc.resources.spiritStone;
        let isMerchant = npc.activity === '坊市跑商';
        if (isMerchant) {
          dropStones += Math.floor(Math.random() * 200) + 100; // 大幅增加掉落
        }
        
        let dropMessage = `你击败了 ${npc.name}，夺取了 ${dropStones} 块灵石！获得 ${expGain} 点修为。`;
        let droppedItem = '';
        if (Math.random() < 0.2) {
          droppedItem = '洗髓丹';
          dropMessage += ` 并在其储物袋中发现了一枚【洗髓丹】！`;
        }

        set(s => {
          let updatedInventory = { ...s.player!.inventory };
          if (droppedItem) {
            updatedInventory[droppedItem] = (updatedInventory[droppedItem] || 0) + 1;
          }
          updatedInventory['灵石'] = (updatedInventory['灵石'] || 0) + dropStones;

          let newPlayer = { 
            ...s.player!, 
            stats: { ...s.player!.stats, exp: s.player!.stats.exp + expGain },
            hiddenStats: { ...s.player!.hiddenStats, killCount: s.player!.hiddenStats.killCount + 1 },
            inventory: updatedInventory
          };

          // @ts-ignore
          if (typeof checkPotentialAwakening === 'function') {
            // @ts-ignore
            newPlayer = checkPotentialAwakening(newPlayer, (msg: string) => state.addLog({ type: 'event', message: msg }));
          }

          state.addLog({ type: 'event', message: dropMessage });

          let updatedClans = [...s.clans];
          let updatedNearbyNPCs = s.nearbyNPCs.filter(n => n.id !== npcId);
          let spawnedEnforcer = false;

          updatedClans = updatedClans.map(c => {
            if (c.id === npc.clanId) {
              const repLoss = isMerchant ? 20 : 10;
              const newReputation = c.reputation - repLoss;
              // 当声望首次低于0，或每低10点时，概率生成执法堂长老
              if (newReputation < 0 && Math.random() > 0.3) {
                spawnedEnforcer = true;
                const enforcerPower = s.player!.stats.attack * 3;
                const enforcer: NPC = {
                  id: `enforcer-${Date.now()}`,
                  clanId: c.id,
                  name: `${c.name.charAt(0)}执法长老`,
                  role: '执法堂长老',
                  realm: '化神', // 执法长老统一化神境界
                  power: enforcerPower, // 强于玩家
                  hp: enforcerPower * 10,
                  maxHp: enforcerPower * 10,
                  mp: enforcerPower * 5,
                  maxMp: enforcerPower * 5,
                  personality: { ambition: 50, caution: 50, loyalty: 100, greed: 10 },
                  resources: { spiritStone: 500 },
                  activity: '追杀中',
                  position: { 
                    x: s.player!.position.x + (Math.random() > 0.5 ? 10 : -10), 
                    y: s.player!.position.y + (Math.random() > 0.5 ? 10 : -10) 
                  },
                  targetPlayerId: s.player!.id
                };
                updatedNearbyNPCs.push(enforcer);
              }
              return { ...c, reputation: newReputation };
            }
            return c;
          });

          return {
            clans: updatedClans,
            nearbyNPCs: updatedNearbyNPCs,
            player: newPlayer
          };
        });
        
        const clan = get().clans.find(c => c.id === npc.clanId);
        // 击败NPC获得声望
        get().addReputation(Math.floor((npc.power / 1000) + 5), 'npc_combat_win');
        if (clan && clan.reputation < 0) {
          get().addLog({ type: 'system', message: `警告！${clan.name} 对你的仇恨已达冰点，已派出执法堂长老前来围剿！` });
        } else if (clan && clan.reputation < 20) {
          get().addLog({ type: 'system', message: `警告！${clan.name} 对你的仇恨极高！` });
        }
      } else {
        get().addLog({ type: 'combat', message: `你不敌 ${npc.name}，重伤逃遁，损失部分修为。` });
        set(s => ({
          player: s.player ? { ...s.player, stats: { ...s.player.stats, hp: Math.max(1, s.player.stats.hp - 30) } } : s.player
        }));
      }
    } else if (action === '交谈') {
      get().addLog({ type: 'event', message: `${npc.name} 看了你一眼：“支脉子弟，也要努力修炼才是。”` });
    } else if (action === '交易') {
      get().addLog({ type: 'event', message: `你与 ${npc.name} 进行了交易，换取了一些低级丹药。` });
    }
  },

  interactWithResource: (resourceId) => {
    const state = get();
    if (!state.player) return;
    
    const resourceIndex = state.resourcePoints.findIndex(r => r.id === resourceId);
    if (resourceIndex === -1) return;
    
    const resource = state.resourcePoints[resourceIndex];
    const dx = Math.abs(resource.position.x - state.player.position.x);
    const dy = Math.abs(resource.position.y - state.player.position.y);
    
    if (dx > 1 || dy > 1) {
      state.addLog({ type: 'system', message: `距离太远，无法采集【${resource.type}】。` });
      return;
    }

    let expGain = 0;
    let logMsg = '';

    // 机缘判定：概率触发双倍资源
    const fortuneProc = Math.random() < (state.player.talent?.fortune ?? 20) / 100;
    const fortuneMult = fortuneProc ? 2 : 1;

    const fortuneTag = fortuneProc ? '（双倍）' : '';
    if (resource.type === '灵田') {
      expGain = Math.floor(30 * fortuneMult);
      logMsg = `你在灵田采摘了仙草，获得了 ${expGain} 点修为${fortuneTag}。`;
    } else if (resource.type === '矿脉') {
      const yieldAmt = Math.floor(50 * fortuneMult);
      logMsg = `你在矿脉开采了 ${yieldAmt} 块灵石${fortuneTag}`;
      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory['灵石'] = (newInventory['灵石'] || 0) + yieldAmt;
        return { player: { ...s.player, inventory: newInventory } };
      });
    } else if (resource.type === '遗迹') {
      const foundAmt = Math.floor(100 * fortuneMult);
      const isLucky = Math.random() < 0.3 * fortuneMult;
      logMsg = `你在遗迹中探索，发现了 ${foundAmt} 块灵石${fortuneTag}`;
      if (isLucky) {
        logMsg += '，以及一枚珍贵的【洗髓丹】！';
      } else {
        logMsg += '。';
      }
      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory['灵石'] = (newInventory['灵石'] || 0) + foundAmt;
        if (isLucky) {
          newInventory['洗髓丹'] = (newInventory['洗髓丹'] || 0) + 1;
        }
        return { player: { ...s.player, inventory: newInventory } };
      });
    }


    state.addLog({ type: 'event', message: logMsg });
    // 采集获得声望
    get().addReputation(REPUTATION_SOURCES.gather.base, 'gather');
    state.updateMarketPrices();
    
    set(s => {
      if (!s.player) return s;
      const newPoints = [...s.resourcePoints];
      newPoints.splice(resourceIndex, 1);
      
      // 概率在附近生成新的资源点
      if (Math.random() > 0.3) {
        const types: ('灵田' | '矿脉' | '遗迹')[] = ['灵田', '矿脉', '遗迹'];
        newPoints.push({
          id: `res-${Date.now()}`,
          type: types[Math.floor(Math.random() * types.length)],
          amount: Math.floor(Math.random() * 100) + 50,
          position: { 
            x: s.player.position.x + Math.floor(Math.random() * 20) - 10, 
            y: s.player.position.y + Math.floor(Math.random() * 20) - 10 
          },
          heavenLevel: s.player.heavenLevel
        });
      }
      
      return {
        player: {
          ...s.player,
          stats: { ...s.player.stats, exp: s.player.stats.exp + expGain }
        },
        resourcePoints: newPoints
      };
    });
  },

  useItem: (itemName) => {
    const state = get();
    const player = state.player;
    if (!player || !player.inventory[itemName] || player.inventory[itemName] <= 0) return;

    if (itemName === '洗髓丹') {
      if (player.bodyType !== '凡体') {
        state.addLog({ type: 'system', message: '你已非凡体，洗髓丹对你无效。' });
        return;
      }

      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory[itemName] -= 1;
        
        // 触发突破试炼：扣除当前 80% 血量
        const damage = Math.floor(s.player.stats.maxHp * 0.8);
        const newHp = s.player.stats.hp - damage;
        
        if (newHp <= 0) {
          return {
            player: {
              ...s.player,
              inventory: newInventory,
              stats: { ...s.player.stats, hp: 1 } // 留 1 滴血
            }
          };
        }

        // 根据潜质决定进阶方向
        let newType: BodyType;
        if (s.player.potential === '剑心潜质') newType = '剑体';
        else if (s.player.potential === '雷灵潜质') newType = '雷灵体';
        else if (s.player.potential === '丹道潜质') newType = '药王体';
        else if (s.player.potential === '战意潜质') newType = '战体';
        else {
          // 无潜质则随机
          const advancedTypes: BodyType[] = ['剑体', '雷灵体', '药王体', '战体'];
          newType = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
        }

        let buffedStats = { ...s.player.stats, hp: newHp };
        // 丹房加成：丹药效果提升
        const pillLevel = getFactionBuildingLevel(s.clans, s.playerFactionId, '丹房');
        const pillBonus = pillLevel > 0 ? BUILDING_SPEED_MULTIPLIERS['丹房'][pillLevel - 1] : 1;
        // 战体额外加成生命上限
        if (newType === '战体') buffedStats.maxHp = Math.floor(buffedStats.maxHp * 1.3 * pillBonus);
        if (newType === '剑体') buffedStats.attack = Math.floor(buffedStats.attack * 1.3 * pillBonus);

        return {
          player: {
            ...s.player,
            bodyType: newType,
            stats: buffedStats,
            inventory: newInventory
          }
        };
      });
      
      const newPlayer = get().player!;
      if (newPlayer.stats.hp <= 1) {
        state.addLog({ type: 'system', message: `【突破失败】洗髓药力狂暴，你气血不足，经脉尽断险些身亡！` });
      } else {
        state.addLog({ type: 'event', message: `【突破成功】你强忍洗髓剧痛，破茧成蝶，进阶为【${newPlayer.bodyType}】！` });
      }
    }
  },

  cultivate: () => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    const spiritMultiplier = HEAVEN_INFO[player.heavenLevel].spiritMultiplier;
    let expGain = Math.floor(10 * spiritMultiplier);

    // 灵根加成：每 500 点灵根 = 100% 修炼速度
    const talentBonus = 1 + (player.talent?.spiritualRoot ?? 25) / 500;
    expGain = Math.floor(expGain * talentBonus);
    
    if (player.country === '燕') expGain = Math.floor(expGain * 1.1);
    if (player.country === '齐') expGain = Math.floor(expGain * 1.2);

    // 练功房加成：修炼速度提升
    const trainingLevel = getFactionBuildingLevel(state.clans, state.playerFactionId, '练功房');
    if (trainingLevel > 0) {
      expGain = Math.floor(expGain * BUILDING_SPEED_MULTIPLIERS['练功房'][trainingLevel - 1]);
    }
    
    let newExp = player.stats.exp + expGain;
    const wasExpFull = player.stats.exp >= player.stats.maxExp;
    const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
    const realmIndex = REALM_LIST.indexOf(player.realm);
    const maxRealmIndex = REALM_LIST.indexOf(maxRealm);

    if (newExp >= player.stats.maxExp) {
      newExp = player.stats.maxExp;

      if (realmIndex >= maxRealmIndex) {
        state.addLog({ type: 'system', message: `你已达到当前世界最高境界【${maxRealm}】，修炼无法再提升修为。` });
        return;
      }

      if (wasExpFull) {
        const baseCost = REALM_BREAKTHROUGH_COST[player.realm] || 0;
        const compFactor = 1 - (player.talent?.comprehension ?? 40) / 200;
        const cost = Math.floor(baseCost * compFactor);
        const currentStones = player.inventory['灵石'] || 0;

        if (currentStones >= cost) {
          const nextRealmIdx = REALM_LIST.indexOf(player.realm) + 1;
          const nextRealm = REALM_LIST[nextRealmIdx] || player.realm;

          if (nextRealm !== player.realm) {
            state.addLog({ type: 'system', message: `消耗了 ${cost} 灵石，天地灵气汇聚！你突破到了【${nextRealm}】境界！` });

            // 突破获得声望
            const realmRepMap: Record<string, number> = { '练气': 50, '筑基': 100, '金丹': 200, '元婴': 350, '化神': 500, '炼虚': 750, '合体': 1000, '大乘': 1500, '渡劫': 2000 };
            get().addReputation(realmRepMap[nextRealm] ?? 50, 'breakthrough');

            if (nextRealm === maxRealm) {
              state.addLog({ type: 'system', message: `你已达到当前世界【${HEAVEN_INFO[player.heavenLevel].name}】最高境界！可以准备飞升上界了！` });
            }

            const newInventory = { ...player.inventory };
            newInventory['灵石'] = currentStones - cost;

            set({
              player: {
                ...player,
                realm: nextRealm,
                inventory: newInventory,
                stats: {
                  ...player.stats,
                  hp: player.stats.maxHp * 2,
                  maxHp: Math.floor(player.stats.maxHp * 2 * spiritMultiplier + (player.talent?.boneConstitution ?? 30) * 2),
                  attack: Math.floor(player.stats.attack * 2 * spiritMultiplier + (player.talent?.boneConstitution ?? 30) * 0.5),
                  defense: Math.floor((player.stats.defense || 10) * 2 * spiritMultiplier + (player.talent?.boneConstitution ?? 30) * 0.3),
                  exp: 0,
                  maxExp: REALM_MAX_EXP[nextRealm]
                }
              }
            });
          }
        } else {
          state.addLog({ type: 'system', message: `【突破失败】需要 ${cost} 灵石，当前仅有 ${currentStones} 灵石。修为保留，无法进阶。` });
          set({
            player: {
              ...player,
              stats: { ...player.stats, exp: newExp }
            }
          });
        }
      } else {
        // 修炼自然充满修为 — 不自动突破，等待玩家手动点击突破按钮
        set({
          player: {
            ...player,
            stats: { ...player.stats, exp: newExp }
          }
        });
      }
    } else {
      set({
        player: {
          ...player,
          stats: { ...player.stats, exp: newExp }
        }
      });
      if (player.hiddenStats.cultivateCount % 10 === 0) {
        state.addLog({ type: 'event', message: `你运功一个大周天，修为提升了${expGain}点。` });
      }
    }
    
    set(s => ({
      player: s.player ? {
        ...s.player,
        hiddenStats: { ...s.player.hiddenStats, cultivateCount: s.player.hiddenStats.cultivateCount + 1 }
      } : s.player
    }));
  },

  modifyTalent: (effect: Partial<TalentAttributes>) => {
    const state = get();
    if (!state.player?.talent) return;
    const updated: Partial<TalentAttributes> = {};
    for (const [key, val] of Object.entries(effect)) {
      if (typeof val === 'number') {
        const current = state.player.talent[key as keyof TalentAttributes] ?? 50;
        updated[key as keyof TalentAttributes] = Math.max(0, Math.min(100, current + val));
      }
    }
    set({
      player: {
        ...state.player,
        talent: { ...state.player.talent, ...updated }
      }
    });
  },

  addReputation: (amount, source) => {
    const state = get();
    if (!state.player) return;
    const oldTitle = getReputationTitle(state.player.reputation);
    const newRep = state.player.reputation + amount;
    const newTitle = getReputationTitle(newRep);
    const sourceLabel = REPUTATION_SOURCES[source]?.label ?? source;
    set(s => ({
      player: s.player ? { ...s.player, reputation: newRep } : s.player
    }));
    state.addLog({ type: 'event', message: `声望 +${amount}（${sourceLabel}）。` });
    if (newTitle !== oldTitle) {
      state.addLog({ type: 'event', message: `【声望提升】你从【${oldTitle}】晋升为【${newTitle}】！` });
    }
  },

  getRecruitCost: (npc) => {
    const state = get();
    if (!state.player) return { reputationRequired: 0, spiritStoneCost: 0, canRecruit: false, reason: '无玩家数据' };

    // Auto-detect best role from personality
    let role: SquadRole;
    if (npc.personality.ambition > 60 && npc.personality.caution < 40) role = '战斗型';
    else if (npc.personality.ambition > 50 && npc.personality.caution > 50) role = '军师型';
    else if (npc.personality.caution > 60 && npc.personality.greed > 50) role = '后勤型';
    else role = '斥候型';

    const repRequired = RECRUIT_REPUTATION_TIER[role];
    const baseCost = RECRUIT_SPIRITSTONE_COST[role];
    const greedMod = npc.personality.greed > 70 ? 1 + (npc.personality.greed - 70) / 100 : 1;
    const stoneCost = Math.floor(baseCost * greedMod);

    if (state.player.reputation < repRequired) {
      return { reputationRequired: repRequired, spiritStoneCost: stoneCost, canRecruit: false, reason: `声望不足，需要【${getReputationTitle(repRequired)}】` };
    }
    if ((state.player.inventory['灵石'] || 0) < stoneCost) {
      return { reputationRequired: repRequired, spiritStoneCost: stoneCost, canRecruit: false, reason: `灵石不足，需要 ${stoneCost} 块` };
    }
    if (npc.personality.loyalty > 80) {
      return { reputationRequired: repRequired, spiritStoneCost: stoneCost, canRecruit: false, reason: '此人极为忠诚，难以招揽' };
    }
    return { reputationRequired: repRequired, spiritStoneCost: stoneCost, canRecruit: true, reason: '' };
  },

  recruitToSquad: (npcId) => {
    const state = get();
    if (!state.player) return;

    // Check squad size cap
    const aliveCount = state.squadMembers.filter(m => m.isAlive).length;
    const maxSize = get().getMaxSquadSize();
    if (aliveCount >= maxSize) {
      state.addLog({ type: 'system', message: `队伍已满（${aliveCount}/${maxSize}）。提升声望可扩大队伍上限。` });
      return;
    }

    const npc = state.nearbyNPCs.find(n => n.id === npcId);
    if (!npc) { state.addLog({ type: 'system', message: '该修士不在附近。' }); return; }

    const { canRecruit, reason, spiritStoneCost } = get().getRecruitCost(npc);
    if (!canRecruit) {
      state.addLog({ type: 'system', message: `无法招募 ${npc.name}：${reason}` });
      return;
    }

    // Auto-detect role
    let role: SquadRole;
    if (npc.personality.ambition > 60 && npc.personality.caution < 40) role = '战斗型';
    else if (npc.personality.ambition > 50 && npc.personality.caution > 50) role = '军师型';
    else if (npc.personality.caution > 60 && npc.personality.greed > 50) role = '后勤型';
    else role = '斥候型';

    const newMember: SquadMember = {
      id: `squad-${Date.now()}`,
      npcId: npc.id,
      name: npc.name,
      clanId: npc.clanId,
      role,
      realm: npc.realm,
      power: npc.power,
      hp: npc.hp,
      maxHp: npc.maxHp,
      mp: npc.mp,
      maxMp: npc.maxMp,
      personality: { ...npc.personality },
      joinDate: Date.now(),
      kills: 0,
      isAlive: true,
      position: { ...npc.position },
      activity: '跟随中',
      equipment: [],
      level: 1,
      exp: 0,
      maxExp: 80,
    };

    set(s => ({
      squadMembers: [...s.squadMembers, newMember],
      nearbyNPCs: s.nearbyNPCs.filter(n => n.id !== npcId),
      player: s.player ? {
        ...s.player,
        inventory: { ...s.player.inventory, '灵石': (s.player.inventory['灵石'] || 0) - spiritStoneCost }
      } : s.player,
    }));
    state.addLog({ type: 'event', message: `【招募】${npc.name} 加入了你的队伍，定位【${role}】！消耗了 ${spiritStoneCost} 块灵石。` });
  },

  dismissFromSquad: (squadMemberId) => {
    const state = get();
    if (!state.player) return;
    const member = state.squadMembers.find(m => m.id === squadMemberId);
    if (!member) return;

    // Convert back to NPC and add to nearby
    const newNpc: NPC = {
      id: `former-squad-${Date.now()}`,
      clanId: member.clanId,
      name: member.name,
      role: '支脉子弟',
      realm: member.realm,
      power: member.power,
      hp: member.maxHp,
      maxHp: member.maxHp,
      mp: member.maxMp,
      maxMp: member.maxMp,
      personality: { ...member.personality },
      resources: { spiritStone: Math.floor(Math.random() * 50) },
      activity: '闲逛中',
      position: { ...state.player.position },
    };

    set(s => {
      // Return equipment to player inventory on dismissal
      let inv = s.player ? { ...s.player.inventory } : {};
      if (member.equipment && member.equipment.length > 0) {
        for (const eq of member.equipment) {
          inv[eq] = (inv[eq] || 0) + 1;
        }
      }
      return {
        squadMembers: s.squadMembers.filter(m => m.id !== squadMemberId),
        nearbyNPCs: [...s.nearbyNPCs, newNpc],
        player: s.player ? { ...s.player, inventory: inv } : s.player,
      };
    });
    state.addLog({ type: 'event', message: `${member.name} 离开了你的队伍。` });
  },

  assignSquadRole: (squadMemberId, role) => {
    const state = get();
    set(s => ({
      squadMembers: s.squadMembers.map(m => m.id === squadMemberId ? { ...m, role } : m),
    }));
    state.addLog({ type: 'event', message: `小队成员职务已调整。` });
  },

  // === P1 小队增强 ===

  getMaxSquadSize: () => {
    const state = get();
    const rep = state.player?.reputation ?? 0;
    if (rep >= 500) return 15;
    if (rep >= 200) return 7;
    if (rep >= 50) return 3;
    return 1;
  },

  equipMember: (squadMemberId, itemName) => {
    const state = get();
    if (!state.player) return;
    const member = state.squadMembers.find(m => m.id === squadMemberId);
    if (!member || !member.isAlive) { state.addLog({ type: 'system', message: '该队员无法装备。' }); return; }
    if (!state.player.inventory[itemName] || state.player.inventory[itemName] <= 0) return;
    // Only allow one equipment item per member
    if (member.equipment && member.equipment.length > 0) {
      state.addLog({ type: 'system', message: `该队员已有装备，请先卸下。` });
      return;
    }
    const powerBonus = EQUIPPABLE_ITEMS[itemName] ?? 5;
    set(s => ({
      player: s.player ? { ...s.player, inventory: { ...s.player.inventory, [itemName]: (s.player.inventory[itemName] || 0) - 1 } } : s.player,
      squadMembers: s.squadMembers.map(m =>
        m.id === squadMemberId
          ? { ...m, equipment: [...(m.equipment || []), itemName], power: m.power + powerBonus }
          : m
      ),
    }));
    state.addLog({ type: 'event', message: `${member.name} 装备了【${itemName}】！` });
  },

  unequipMember: (squadMemberId, itemName) => {
    const state = get();
    if (!state.player) return;
    const member = state.squadMembers.find(m => m.id === squadMemberId);
    if (!member || !member.isAlive || !member.equipment?.includes(itemName)) return;
    const powerPenalty = -(EQUIPPABLE_ITEMS[itemName] ?? 5);
    set(s => ({
      player: s.player ? { ...s.player, inventory: { ...s.player.inventory, [itemName]: (s.player.inventory[itemName] || 0) + 1 } } : s.player,
      squadMembers: s.squadMembers.map(m =>
        m.id === squadMemberId
          ? { ...m, equipment: (m.equipment || []).filter(e => e !== itemName), power: Math.max(1, m.power + powerPenalty) }
          : m
      ),
    }));
    state.addLog({ type: 'event', message: `${member.name} 卸下了【${itemName}】。` });
  },

  // === 势力系统 ===

  createFaction: (name) => {
    const state = get();
    if (!state.player) return false;
    if (state.squadMembers.filter(m => m.isAlive).length < FACTION_CREATE_REQUIREMENTS.minSquadMembers) {
      state.addLog({ type: 'system', message: `【创建势力】需要至少 ${FACTION_CREATE_REQUIREMENTS.minSquadMembers} 名存活队员。` });
      return false;
    }
    if (state.player.reputation < FACTION_CREATE_REQUIREMENTS.reputation) {
      state.addLog({ type: 'system', message: `【创建势力】需要声望达到【${getReputationTitle(FACTION_CREATE_REQUIREMENTS.reputation)}】。` });
      return false;
    }
    if ((state.player.inventory['灵石'] || 0) < FACTION_CREATE_REQUIREMENTS.spiritStones) {
      state.addLog({ type: 'system', message: `【创建势力】需要 ${FACTION_CREATE_REQUIREMENTS.spiritStones} 块灵石。` });
      return false;
    }

    const factionId = `faction-${Date.now()}`;
    const newClan: Clan = {
      id: factionId,
      name,
      country: state.player.country,
      type: '3级',
      reputation: 100,
      treasury: 0,
      heavenLevel: state.player.heavenLevel,
      isAscendingFamily: false,
      buildings: [{ type: '议事厅', level: 1 as BuildingLevel, hp: 100 }],
      territory: 1,
      morale: 50,
    };

    set(s => ({
      clans: [...s.clans, newClan],
      player: s.player ? {
        ...s.player,
        clanId: factionId,
        inventory: { ...s.player.inventory, '灵石': (s.player.inventory['灵石'] || 0) - FACTION_CREATE_REQUIREMENTS.spiritStones }
      } : s.player,
      playerFactionId: factionId,
    }));
    state.addLog({ type: 'event', message: `【创立势力】你消耗了 ${FACTION_CREATE_REQUIREMENTS.spiritStones} 块灵石，创立了【${name}】！` });
    return true;
  },

  upgradeBuilding: (buildingType) => {
    const state = get();
    if (!state.player || !state.playerFactionId) {
      state.addLog({ type: 'system', message: '你没有管理任何势力。' });
      return;
    }

    const faction = state.clans.find(c => c.id === state.playerFactionId);
    if (!faction) return;
    const buildings = faction.buildings || [];
    const existing = buildings.find(b => b.type === buildingType);

    if (!existing) {
      // Build new
      const cost = BUILDING_UPGRADE_COST[buildingType][0];
      if ((state.player.inventory['灵石'] || 0) < cost) {
        state.addLog({ type: 'system', message: `灵石不足，需要 ${cost} 块才能建造【${buildingType}】。` });
        return;
      }
      set(s => ({
        clans: s.clans.map(c => c.id === state.playerFactionId ? {
          ...c,
          buildings: [...(c.buildings || []), { type: buildingType, level: 1 as BuildingLevel, hp: 100 }]
        } : c),
        player: s.player ? {
          ...s.player,
          inventory: { ...s.player.inventory, '灵石': (s.player.inventory['灵石'] || 0) - cost }
        } : s.player,
      }));
      state.addLog({ type: 'event', message: `【建造】你在驻地建造了【${buildingType}】！消耗了 ${cost} 块灵石。` });
    } else if (existing.level < 3) {
      const newLevel = (existing.level + 1) as BuildingLevel;
      const cost = BUILDING_UPGRADE_COST[buildingType][existing.level];
      if ((state.player.inventory['灵石'] || 0) < cost) {
        state.addLog({ type: 'system', message: `灵石不足，需要 ${cost} 块才能升级【${buildingType}】。` });
        return;
      }
      set(s => ({
        clans: s.clans.map(c => c.id === state.playerFactionId ? {
          ...c,
          buildings: (c.buildings || []).map(b => b.type === buildingType ? { ...b, level: newLevel } : b)
        } : c),
        player: s.player ? {
          ...s.player,
          inventory: { ...s.player.inventory, '灵石': (s.player.inventory['灵石'] || 0) - cost }
        } : s.player,
      }));
      state.addLog({ type: 'event', message: `【升级】${buildingType} 升至 ${newLevel} 级！消耗了 ${cost} 块灵石。` });
    } else {
      state.addLog({ type: 'system', message: `${buildingType} 已达最高等级。` });
    }
  },

  appointOfficer: (squadMemberId, position) => {
    const state = get();
    set(s => ({
      squadMembers: s.squadMembers.map(m => m.id === squadMemberId ? { ...m, activity: `职务：${position}` } : m),
    }));
    const member = state.squadMembers.find(m => m.id === squadMemberId);
    state.addLog({ type: 'event', message: `【任命】${member?.name || '未知'} 被任命为【${position}】。` });
  },

  collectTax: () => {
    const state = get();
    if (!state.player || !state.playerFactionId) {
      state.addLog({ type: 'system', message: '你没有管理任何势力。' });
      return 0;
    }
    const faction = state.clans.find(c => c.id === state.playerFactionId);
    if (!faction) return 0;

    const territory = faction.territory || 1;
    const buildings = faction.buildings || [];
    const hallLevel = (buildings.find(b => b.type === '议事厅')?.level || 1);
    const treasuryBldg = buildings.find(b => b.type === '库房');
    const treasuryLevel = treasuryBldg?.level || 1;

    const baseIncome = territory * 50 + treasuryLevel * 30;
    const taxMultiplier = 1 + (hallLevel - 1) * 0.1;
    let total = Math.floor(baseIncome * taxMultiplier);
    // Morale debuff: income halved when morale < 20
    if ((faction.morale ?? 50) < 20) {
      total = Math.floor(total * 0.5);
    }
    const treasuryCap = treasuryBldg ? BUILDING_TREASURY_CAP_BASE + treasuryBldg.level * BUILDING_TREASURY_CAP_PER_LEVEL : null;

    set(s => ({
      clans: s.clans.map(c => c.id === state.playerFactionId ? {
        ...c,
        treasury: treasuryCap !== null ? Math.min((c.treasury || 0) + total, treasuryCap) : (c.treasury || 0) + total,
        morale: Math.min(100, (c.morale || 50) + 1),
      } : c),
    }));
    state.addLog({ type: 'event', message: `【税收】收取了 ${total} 块灵石的势力税收（领地${territory}，税率×${taxMultiplier.toFixed(1)}）。` });
    return total;
  },

  getFactionUpgradeCost: () => {
    const state = get();
    if (!state.playerFactionId) return { reputation: 0, stones: 0 };
    const faction = state.clans.find(c => c.id === state.playerFactionId);
    if (!faction) return { reputation: 0, stones: 0 };
    if (faction.type === '3级') return { reputation: 2000, stones: 500000 };
    if (faction.type === '2级') return { reputation: 5000, stones: 2000000 };
    return { reputation: 0, stones: 0 };
  },

  // === 外交/战争系统 ===

  setDiplomacy: (clanId: string, targetId: string, diplomacy: ClanDiplomacy) => {
    set(s => ({
      clans: s.clans.map(c => {
        if (c.id === clanId) {
          return { ...c, diplomacy: { ...(c.diplomacy || {}), [targetId]: diplomacy } };
        }
        if (c.id === targetId) {
          // Mirror: set the reverse relation
          const reverse: ClanDiplomacy = {
            status: diplomacy.status === '臣服' ? '皇族' : diplomacy.status, // 接收臣服的一方
            conflictLevel: diplomacy.conflictLevel,
            declaredBy: targetId,
            truceUntil: diplomacy.truceUntil,
            allianceDate: diplomacy.allianceDate,
            vassalTribute: diplomacy.status === '臣服' ? diplomacy.vassalTribute : undefined,
          };
          return { ...c, diplomacy: { ...(c.diplomacy || {}), [clanId]: reverse } };
        }
        return c;
      }),
    }));
  },

  removeDiplomacy: (clanId: string, targetId: string) => {
    set(s => ({
      clans: s.clans.map(c => {
        if (c.id === clanId || c.id === targetId) {
          const d = { ...(c.diplomacy || {}) };
          delete d[clanId === c.id ? targetId : clanId];
          return { ...c, diplomacy: d };
        }
        return c;
      }),
    }));
  },

  declareWar: (clanId: string) => {
    const state = get();
    if (!state.player || !state.playerFactionId) {
      state.addLog({ type: 'system', message: '你没有管理任何势力，无法宣战。' });
      return;
    }
    if (clanId === state.playerFactionId) {
      state.addLog({ type: 'system', message: '不能对自己宣战。' });
      return;
    }
    const target = state.clans.find(c => c.id === clanId);
    if (!target) return;
    const currentStatus = getDiplomaticStatusFrom(state, state.playerFactionId, clanId);
    if (currentStatus === '战争') {
      state.addLog({ type: 'system', message: `已处于战争状态。` });
      return;
    }

    get().setDiplomacy(state.playerFactionId, clanId, {
      status: '战争',
      conflictLevel: '局部冲突',
      declaredBy: state.playerFactionId,
    });
    state.addLog({ type: 'event', message: `【宣战】向 ${target.name} 正式宣战！` });
  },

  proposeAlliance: (clanId: string) => {
    const state = get();
    if (!state.player || !state.playerFactionId) {
      state.addLog({ type: 'system', message: '你没有管理任何势力。' });
      return;
    }
    if (clanId === state.playerFactionId) return;
    const target = state.clans.find(c => c.id === clanId);
    if (!target) return;
    const currentStatus = getDiplomaticStatusFrom(state, state.playerFactionId, clanId);
    if (currentStatus === '同盟') {
      state.addLog({ type: 'system', message: '已与该势力结盟。' });
      return;
    }

    get().setDiplomacy(state.playerFactionId, clanId, {
      status: '同盟',
      conflictLevel: '和平',
      declaredBy: state.playerFactionId,
      allianceDate: Date.now(),
    });
    state.addLog({ type: 'event', message: `【结盟】与 ${target.name} 缔结同盟！` });
  },

  proposeTruce: (clanId: string) => {
    const state = get();
    if (!state.player || !state.playerFactionId) return;
    const target = state.clans.find(c => c.id === clanId);
    if (!target) return;

    get().setDiplomacy(state.playerFactionId, clanId, {
      status: '停战',
      conflictLevel: '和平',
      declaredBy: state.playerFactionId,
      truceUntil: Date.now() + 120000, // 2 minutes truce
    });
    state.addLog({ type: 'event', message: `【停战】与 ${target.name} 达成停战协议。` });
  },

  surrenderTo: (clanId: string) => {
    const state = get();
    if (!state.player || !state.playerFactionId) return;
    const target = state.clans.find(c => c.id === clanId);
    if (!target) return;

    get().setDiplomacy(state.playerFactionId, clanId, {
      status: '臣服',
      conflictLevel: '和平',
      declaredBy: state.playerFactionId, // 臣服方
      vassalTribute: Math.floor((state.clans.find(c => c.id === state.playerFactionId)?.treasury || 0) * 0.1),
    });
    state.addLog({ type: 'event', message: `【臣服】向 ${target.name} 表示臣服，每周期进贡灵石。` });
  },

  breakAlliance: (clanId: string) => {
    const state = get();
    if (!state.player || !state.playerFactionId) return;
    const target = state.clans.find(c => c.id === clanId);
    if (!target) return;

    get().removeDiplomacy(state.playerFactionId, clanId);
    state.addLog({ type: 'event', message: `【毁盟】解除了与 ${target.name} 的同盟关系。` });
  },

  getDiplomaticRelations: () => {
    const state = get();
    if (!state.playerFactionId) return [];
    const faction = state.clans.find(c => c.id === state.playerFactionId);
    if (!faction || !faction.diplomacy) return [];

    return state.clans
      .filter(c => faction.diplomacy![c.id])
      .map(c => ({
        ...c,
        diplomacyStatus: faction.diplomacy![c.id].status as DiplomaticStatus,
        conflictLevel: faction.diplomacy![c.id].conflictLevel as ConflictLevel,
      }));
  },

  getDiplomaticStatus: (clanId: string) => {
    const state = get();
    if (!state.playerFactionId) return '中立';
    return getDiplomaticStatusFrom(state, state.playerFactionId, clanId);
  },

  buyItem: (itemName, amount) => {
    const state = get();
    if (!state.player) return;
    const item = state.market[itemName];
    if (!item || item.stock < amount) {
      state.addLog({ type: 'system', message: `坊市中【${itemName}】库存不足。` });
      return;
    }
    const cost = item.currentPrice * amount;
    const currentStones = state.player.inventory['灵石'] || 0;
    
    // 计算关税（假设如果玩家不是魏国，则加收 15% 关税，因为坊市设在魏国中州）
    const taxRate = state.player.country !== '魏' ? 0.15 : 0;
    const finalCost = Math.floor(cost * (1 + taxRate));

    if (currentStones >= finalCost) {
      set(s => {
        const newInventory = { ...s.player!.inventory };
        newInventory['灵石'] -= finalCost;
        newInventory[itemName] = (newInventory[itemName] || 0) + amount;
        
        const newMarket = { ...s.market };
        newMarket[itemName] = { ...newMarket[itemName], stock: newMarket[itemName].stock - amount };
        
        return {
          player: { ...s.player!, inventory: newInventory },
          market: newMarket
        };
      });
      state.addLog({ type: 'system', message: `花费 ${finalCost} 灵石购买了 ${amount} 个【${itemName}】${taxRate > 0 ? '(含15%跨国关税)' : ''}。` });
      if (amount >= 10) state.updateMarketPrices(); // 大规模交易引起价格波动
    } else {
      state.addLog({ type: 'system', message: `灵石不足，需要 ${finalCost} 灵石。` });
    }
  },

  sellItem: (itemName: string, amount: number) => {
    const state = get();
    if (!state.player) return;
    const currentAmount = state.player.inventory[itemName] || 0;
    if (currentAmount < amount) {
      state.addLog({ type: 'system', message: `你没有足够的【${itemName}】。` });
      return;
    }
    const item = state.market[itemName];
    if (!item) return;

    // 出售价格为当前价格的 80%
    const sellPrice = Math.floor(item.currentPrice * 0.8);
    const totalEarned = sellPrice * amount;

    // 出售不收跨国关税，或按需求也可以收，这里暂定出售收税为扣除利润的 15%
    const taxRate = state.player.country !== '魏' ? 0.15 : 0;
    const finalEarned = Math.floor(totalEarned * (1 - taxRate));

    set(s => {
      const newInventory = { ...s.player!.inventory };
      newInventory['灵石'] = (newInventory['灵石'] || 0) + finalEarned;
      newInventory[itemName] -= amount;
      
      const newMarket = { ...s.market };
      newMarket[itemName] = { ...newMarket[itemName], stock: newMarket[itemName].stock + amount };
      
      return {
        player: { ...s.player!, inventory: newInventory },
        market: newMarket
      };
    });
    state.addLog({ type: 'system', message: `出售 ${amount} 个【${itemName}】，获得 ${finalEarned} 灵石${taxRate > 0 ? '(已扣除15%跨国关税)' : ''}。` });
    if (amount >= 10) state.updateMarketPrices();
  },

  updateMarketPrices: () => {
    set(s => {
      const newMarket = { ...s.market };
      for (const key in newMarket) {
        const item = newMarket[key];
        const fluctuation = (Math.random() * 0.1) - 0.05;
        let priceMultiplier = 1 + fluctuation;
        
        if (item.stock < 20) priceMultiplier += 0.05;
        else if (item.stock > 100) priceMultiplier -= 0.05;

        let newPrice = Math.floor(item.currentPrice * priceMultiplier);
        newPrice = Math.max(Math.floor(item.basePrice * 0.5), Math.min(newPrice, item.basePrice * 2));
        newMarket[key] = { ...item, currentPrice: newPrice };
      }
      return { market: newMarket };
    });
  },

  attemptAscension: () => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    const heavenInfo = HEAVEN_INFO[player.heavenLevel];
    if (!heavenInfo.ascensionRequired) {
      state.addLog({ type: 'ascension', message: `你已在【${heavenInfo.name}】，此处已是飞升终点，无需再飞升。` });
      return;
    }
    
    const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
    if (player.realm !== maxRealm) {
      state.addLog({ type: 'system', message: `【飞升条件】必须达到当前世界最高境界【${maxRealm}】才能飞升。` });
      return;
    }
    
    const flypanCost = 100000;
    const flypanStone = player.inventory['飞升令'] || 0;
    if (flypanStone < 1) {
      state.addLog({ type: 'system', message: `【飞升条件】需要【飞升令】×1 才能引动天劫。当前飞升令：${flypanStone}` });
      return;
    }
    if ((player.inventory['灵石'] || 0) < flypanCost) {
      state.addLog({ type: 'system', message: `【飞升条件】需要灵石×${flypanCost}作为飞升消耗。当前灵石：${player.inventory['灵石'] || 0}` });
      return;
    }
    
    const quests = state.ascensionQuests;
    const incompleteQuests = quests.filter(q => !q.completed);
    if (incompleteQuests.length > 0) {
      state.addLog({ type: 'system', message: `【飞升条件】还需完成 ${incompleteQuests.length} 个天道任务才能飞升。` });
      return;
    }
    
    const nextHeavenLevel = (player.heavenLevel - 1) as HeavenLevel;
    const nextHeavenInfo = HEAVEN_INFO[nextHeavenLevel];
    
    state.addLog({ type: 'ascension', message: `━━━━━━━━━━━━━━━` });
    state.addLog({ type: 'ascension', message: `【飞升开始】你立于飞升台，消耗飞升令×1、灵石×${flypanCost}，引动九重天劫！` });
    state.addLog({ type: 'ascension', message: `天劫降临，雷光万丈...` });
    
    const success = Math.random() > 0.1;
    
    if (success) {
      const newInventory = { ...player.inventory };
      newInventory['飞升令'] = (newInventory['飞升令'] || 1) - 1;
      newInventory['灵石'] = (newInventory['灵石'] || flypanCost) - flypanCost;
      
      const ascendingFamily = state.clans.find(c => c.id === player.clanId && c.type !== '皇族');
      const newClans = state.clans.map(c => {
        if (c.id === player.clanId && ascendingFamily && nextHeavenLevel >= 8) {
          return { ...c, isAscendingFamily: true };
        }
        return c;
      });
      
      const nextCountries = nextHeavenLevel <= 2 ? Object.keys(IMMORTAL_DOMAINS_DATA) : COUNTRIES;
      const newCountry = nextCountries[Math.floor(Math.random() * nextCountries.length)];
      const clansInNewHeaven = newClans.filter(c => c.heavenLevel === nextHeavenLevel);
      const randomClan = clansInNewHeaven[Math.floor(Math.random() * clansInNewHeaven.length)] || clansInNewHeaven[0];
      
      const newHeavenClans = generateClans(nextHeavenLevel);
      const newRandomClan = newHeavenClans[Math.floor(Math.random() * newHeavenClans.length)];
      
      set({
        clans: [...newClans, ...newHeavenClans.filter(c => !newClans.some(existing => existing.id === c.id))],
        player: {
          ...player,
          heavenLevel: nextHeavenLevel,
          country: newRandomClan.country,
          clanId: newRandomClan.id,
          inventory: newInventory,
          hiddenStats: {
            ...player.hiddenStats,
            ascensionCount: player.hiddenStats.ascensionCount + 1
          },
          stats: {
            hp: Math.floor(player.stats.maxHp * 0.5),
            maxHp: Math.floor(player.stats.maxHp * 0.5),
            mp: Math.floor(player.stats.maxMp * 0.5),
            maxMp: Math.floor(player.stats.maxMp * 0.5),
            attack: Math.floor(player.stats.attack * 0.5),
            defense: Math.floor((player.stats.defense || 10) * 0.5),
            exp: 0,
            maxExp: REALM_MAX_EXP['凡人']
          },
          realm: '化神',
          isAscending: false
        },
        resourcePoints: generateResourcePoints(player.position.x, player.position.y, nextHeavenLevel),
        nearbyNPCs: generateNearbyNPCs(newRandomClan.id, player.position.x, player.position.y, newRandomClan.country, nextHeavenLevel),
        squadMembers: [],
        playerFactionId: null,
        logs: [
          ...state.logs,
          { id: Date.now().toString() + 'a1', time: new Date().toLocaleTimeString(), type: 'ascension', message: `【飞升成功】你渡过九重天劫，肉身重塑，魂魄升华！` },
          { id: Date.now().toString() + 'a2', time: new Date().toLocaleTimeString(), type: 'ascension', message: `你来到了【${nextHeavenInfo.name}】！` },
          { id: Date.now().toString() + 'a3', time: new Date().toLocaleTimeString(), type: 'ascension', message: `灵气倍率×${nextHeavenInfo.spiritMultiplier}，资源丰度×${nextHeavenInfo.resourceMultiplier}！` },
          { id: Date.now().toString() + 'a4', time: new Date().toLocaleTimeString(), type: 'ascension', message: `欢迎来到${newRandomClan.country}国${newRandomClan.name}！` }
        ]
      });
      
      state.addLog({ type: 'ascension', message: `【飞升成功】你渡过九重天劫，来到【${nextHeavenInfo.name}】！` });
    } else {
      state.addLog({ type: 'ascension', message: `【飞升失败】天劫过于强大，你重伤逃遁，损耗30%修为！` });
      set({
        player: {
          ...player,
          stats: {
            ...player.stats,
            hp: Math.floor(player.stats.hp * 0.3),
            exp: Math.floor(player.stats.exp * 0.7)
          }
        }
      });
    }
    state.addLog({ type: 'ascension', message: `━━━━━━━━━━━━━━━` });
  },

  performCycleRebirth: (type: CycleType) => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    if (player.heavenLevel < 6) {
      state.addLog({ type: 'cycle', message: `【轮回转生】只有第6层及以上的高手才能进行轮回转生。` });
      return;
    }
    
    if (state.player.cycleInfo.cooldownEndTime && Date.now() < state.player.cycleInfo.cooldownEndTime) {
      const remaining = Math.ceil((state.player.cycleInfo.cooldownEndTime! - Date.now()) / 1000);
      state.addLog({ type: 'cycle', message: `【轮回转生】转生冷却中，还需 ${remaining} 秒。` });
      return;
    }
    
    if (type === '神念投影') {
      state.addLog({ type: 'cycle', message: `【神念投影】你在凡界创建了一个临时分身，存在2小时。` });
    } else if (type === '真灵转世') {
      state.addLog({ type: 'cycle', message: `【真灵转世】你放弃当前修为，转世于凡界，保留部分记忆与天赋！` });
      
      set({
        player: {
          ...player,
          heavenLevel: 9,
          realm: '凡人',
          country: player.cycleInfo.previousCountry || COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
          clanId: player.cycleInfo.previousClanId || 'unknown',
          bodyType: player.bodyType,
          stats: {
            hp: 100,
            maxHp: 100,
            mp: 20,
            maxMp: 20,
            attack: 5,
            defense: 10,
            exp: 0,
            maxExp: REALM_MAX_EXP['凡人']
          },
          hiddenStats: {
            killCount: 0,
            cultivateCount: 0,
            gatherCount: 0,
            ascensionCount: 0,
            merit: 0
          },
          inventory: { '灵石': 100, '转世灵童印记': 1 },
          cycleInfo: {
            type: '真灵转世',
            cooldownEndTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
            previousHeavenLevel: player.heavenLevel,
            previousClanId: player.clanId,
            previousCountry: player.country,
          },
          isAscending: false
        },
        clans: generateClans(9),
        resourcePoints: generateResourcePoints(50, 50, 9),
        nearbyNPCs: generateNearbyNPCs('9-秦-1级-1', 50, 50, '秦', 9),
        squadMembers: [],
        playerFactionId: null,
      });
      
      state.addLog({ type: 'cycle', message: `你以【转世灵童】之身重生于凡界，保留了前世的部分记忆与体质！` });
    } else if (type === '道统传承') {
      state.addLog({ type: 'cycle', message: `【道统传承】你在原家族留下了传承石碑，后人可参悟获得功法！` });
      
      const clan = state.clans.find(c => c.id === player.clanId);
      if (clan) {
        set({
          clans: state.clans.map(c => 
            c.id === player.clanId 
              ? { ...c, treasury: c.treasury + Math.floor(player.inventory['灵石'] || 0) * 0.5 } 
              : c
          )
        });
      }
    }
  },

  checkCycleCooldown: () => {
    const state = get();
    if (!state.player) return false;
    if (state.player.cycleInfo.cooldownEndTime) {
      return Date.now() >= state.player.cycleInfo.cooldownEndTime;
    }
    return true;
  },

  getAscensionQuests: () => {
    return get().ascensionQuests;
  },

  completeAscensionQuest: (questName: string) => {
    set(state => ({
      ascensionQuests: state.ascensionQuests.map(q => 
        q.name === questName ? { ...q, completed: true } : q
      )
    }));
  },

  updateNPCs: () => {
    const state = get();
    if (!state.player) return;

    // --- Monster spawning ---
    let monsters = state.wildMonsters.filter(m => m.isAlive);
    if (monsters.length < MAX_MONSTERS && Math.random() < SPAWN_CHANCE) {
      const newMonster = createWildMonster(state.player.position, state.player.realm);
      if (newMonster) monsters.push(newMonster);
    }

    // --- Monster despawn (farther than 20 tiles from player) ---
    monsters = monsters.filter(m => {
      const dx = Math.abs(m.position.x - state.player!.position.x);
      const dy = Math.abs(m.position.y - state.player!.position.y);
      return dx <= DESPAWN_DIST && dy <= DESPAWN_DIST;
    });

    // --- Monster movement: seek nearest entity ---
    monsters = monsters.map(m => {
      // Find nearest target (player or NPC)
      let targetPos = state.player!.position;
      let minDist = Math.abs(m.position.x - targetPos.x) + Math.abs(m.position.y - targetPos.y);

      for (const npc of state.nearbyNPCs) {
        const d = Math.abs(m.position.x - npc.position.x) + Math.abs(m.position.y - npc.position.y);
        if (d < minDist) {
          minDist = d;
          targetPos = npc.position;
        }
      }

      // Move 1 tile toward target
      const dx = Math.sign(targetPos.x - m.position.x);
      const dy = Math.sign(targetPos.y - m.position.y);
      return { ...m, position: { x: m.position.x + dx, y: m.position.y + dy } };
    });

    // Track which monsters already fought this tick
    const foughtThisTick = new Set<string>();

    let playerHit = false;
    let clanTreasuryUpdates: Record<string, number> = {};
    let playerMonsterHit = false; // player engaged with a monster this tick

    // Process NPCs: behavior + NPC vs Monster combat
    let npcs = state.nearbyNPCs.map(npc => {
      // Phase 3: NPC retreat handling
      if (npc.retreatTicksRemaining && npc.retreatTicksRemaining > 0) {
        const next = npc.retreatTicksRemaining - 1;
        if (next <= 0) {
          state.addLog({ type: 'combat', message: `${npc.name} 伤势恢复，重回战场！` });
          const { retreatTicksRemaining: _, ...rest } = npc;
          return { ...rest, hp: rest.maxHp };
        }
        return { ...npc, retreatTicksRemaining: next };
      }

      // Phase 1: NPC vs Monster
      let updatedNpc = { ...npc };
      let nearestMonster: WildMonster | null = null;
      let nearestDist = Infinity;

      for (const monster of monsters) {
        if (!monster.isAlive || foughtThisTick.has(monster.id)) continue;
        const dx = Math.abs(monster.position.x - updatedNpc.position.x);
        const dy = Math.abs(monster.position.y - updatedNpc.position.y);
        if (dx <= 1 && dy <= 1) {
          const dist = Math.max(dx, dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestMonster = monster;
          }
        }
      }

      if (nearestMonster) {
        foughtThisTick.add(nearestMonster.id);
        const npcAtk = Math.floor(updatedNpc.power / 10);
        const npcDef = Math.floor(updatedNpc.power / 20);
        const dmgToMonster = calculateDamage(npcAtk, nearestMonster.defense);
        const dmgToNpc = calculateDamage(nearestMonster.attack, npcDef);

        nearestMonster.hp -= dmgToMonster;
        updatedNpc.hp -= dmgToNpc;

        state.addLog({ type: 'combat', message: `${updatedNpc.name} 向 ${nearestMonster.name} 发起攻击，造成 ${dmgToMonster} 点伤害！` });

        if (nearestMonster.hp <= 0) {
          nearestMonster.isAlive = false;
          state.addLog({ type: 'combat', message: `${updatedNpc.name} 击败了 ${nearestMonster.name}！` });
        }

        if (updatedNpc.hp <= 0) {
          updatedNpc.hp = 0;
          updatedNpc.retreatTicksRemaining = 5;
          state.addLog({ type: 'combat', message: `${updatedNpc.name} 不敌 ${nearestMonster.name}，重伤退却！` });
        }
      }

      // Existing behavior tree evaluation
      const behaviorNpc = evaluateNPCBehavior(updatedNpc, state);

      // Existing trade route logic
      if (behaviorNpc.activity === '坊市跑商') {
        const profit = 10;
        if (behaviorNpc.resources.spiritStone >= profit) {
          behaviorNpc.resources.spiritStone -= profit;
          clanTreasuryUpdates[behaviorNpc.clanId] = (clanTreasuryUpdates[behaviorNpc.clanId] || 0) + profit;
        }
      }

      // Existing enforcer pursuit
      if (behaviorNpc.role === '执法堂长老' && behaviorNpc.targetPlayerId === state.player!.id) {
        const dx = state.player!.position.x - behaviorNpc.position.x;
        const dy = state.player!.position.y - behaviorNpc.position.y;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          playerHit = true;
        }
      }

      // War hostility: NPCs from enemy clans target player
      if (state.playerFactionId && behaviorNpc.clanId !== state.playerFactionId && !behaviorNpc.retreatTicksRemaining) {
        const warStatus = getDiplomaticStatusFromClans(state.clans, state.playerFactionId, behaviorNpc.clanId);
        if (warStatus === '战争') {
          const dx = state.player!.position.x - behaviorNpc.position.x;
          const dy = state.player!.position.y - behaviorNpc.position.y;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            playerHit = true;
            if (!behaviorNpc.targetPlayerId) {
              behaviorNpc.targetPlayerId = state.player!.id;
            }
          }
        }
      }

      return behaviorNpc;
    });

    // Phase 2: Player vs Monster
    let updatedPlayer = state.player ? { ...state.player, inventory: { ...state.player.inventory } } : null;
    for (const monster of monsters) {
      if (!monster.isAlive || foughtThisTick.has(monster.id) || playerMonsterHit) continue;
      if (!updatedPlayer) continue;

      const dx = Math.abs(monster.position.x - updatedPlayer.position.x);
      const dy = Math.abs(monster.position.y - updatedPlayer.position.y);
      if (dx > 1 || dy > 1) continue;

      foughtThisTick.add(monster.id);
      playerMonsterHit = true;

      const playerDmg = calculateDamage(updatedPlayer.stats.attack, monster.defense);
      const monsterDmg = calculateDamage(monster.attack, updatedPlayer.stats.defense || 0);

      monster.hp -= playerDmg;
      updatedPlayer.stats.hp -= monsterDmg;

      state.addLog({ type: 'combat', message: `你向 ${monster.name} 发起攻击，造成 ${playerDmg} 点伤害！` });
      state.addLog({ type: 'combat', message: `${monster.name} 向你反击，造成 ${monsterDmg} 点伤害！` });

      if (monster.hp <= 0) {
        monster.isAlive = false;
        // Grant exp + loot to player
        const expGain = monster.expReward;
        const stonesGain = MONSTER_TYPES_DATA[monster.name].spiritStoneDrop;
        updatedPlayer.stats.exp = Math.min(updatedPlayer.stats.exp + expGain, updatedPlayer.stats.maxExp);
        const newInventory = { ...updatedPlayer.inventory };
        newInventory['灵石'] = (newInventory['灵石'] || 0) + stonesGain;
        updatedPlayer.inventory = newInventory;
        updatedPlayer.hiddenStats = {
          ...updatedPlayer.hiddenStats,
          killCount: updatedPlayer.hiddenStats.killCount + 1,
        };
        state.addLog({ type: 'combat', message: `你击败了 ${monster.name}！获得 ${expGain} 点修为和 ${stonesGain} 灵石。` });
        // 击杀怪物获得声望
        get().addReputation(Math.max(2, Math.floor(monster.expReward / 6)), 'monster_kill');
      }

      // Player death: flee to capital with HP=1
      if (updatedPlayer.stats.hp <= 0) {
        const capital = COUNTRIES_DATA[updatedPlayer.country]?.capital || { x: 50, y: 50 };
        updatedPlayer.stats.hp = 1;
        updatedPlayer.position = { ...capital };
        state.addLog({ type: 'combat', message: `你不敌 ${monster.name}，重伤逃遁至${updatedPlayer.country}国都城！` });
      }
    }

    // Phase 3: Squad member combat with monsters
    const scriptureLevel = getFactionBuildingLevel(state.clans, state.playerFactionId, '藏经阁');
    const scriptureBonus = scriptureLevel > 0 ? BUILDING_SPEED_MULTIPLIERS['藏经阁'][scriptureLevel - 1] : 1;
    let updatedSquadMembers = state.squadMembers.map(m => ({ ...m, equipment: [...(m.equipment || [])], position: { ...m.position } }));
    for (const member of updatedSquadMembers) {
      if (!member.isAlive) continue;
      // Loyalty modifier: 0.7 at 0 -> 1.0 at 100
      const loyaltyMult = 0.7 + (member.personality?.loyalty ?? 50) * 0.003;
      for (const monster of monsters) {
        if (!monster.isAlive || foughtThisTick.has(monster.id)) continue;
        const dx = Math.abs(monster.position.x - member.position.x);
        const dy = Math.abs(monster.position.y - member.position.y);
        if (dx <= 1 && dy <= 1) {
          foughtThisTick.add(monster.id);

          const memberAtk = Math.floor(member.power / 10 * scriptureBonus * loyaltyMult);
          const memberDef = Math.floor(member.power / 20 * scriptureBonus * loyaltyMult);
          const dmgToMonster = calculateDamage(memberAtk, monster.defense);
          const dmgToMember = calculateDamage(monster.attack, memberDef);

          monster.hp -= dmgToMonster;
          member.hp -= dmgToMember;

          state.addLog({ type: 'combat', message: `【${member.name}】向 ${monster.name} 发起攻击，造成 ${dmgToMonster} 点伤害！` });

          if (monster.hp <= 0) {
            monster.isAlive = false;
            member.kills += 1;

            // Grant squad exp
            const squadExp = Math.max(1, Math.floor((monster.expReward ?? 0) / 3));
            member.exp = (member.exp || 0) + squadExp;
            state.addLog({ type: 'combat', message: `【${member.name}】击败了 ${monster.name}！获得 ${squadExp} 点经验。` });

            // Level up check
            const curMaxExp = member.maxExp || 80;
            if (member.exp >= curMaxExp) {
              member.exp = 0;
              member.level = (member.level || 1) + 1;
              member.maxExp = Math.floor(curMaxExp * 1.4);
              member.power += 5;
              member.maxHp += 10;
              member.maxMp += 5;
              member.hp = Math.min(member.hp + 20, member.maxHp);
              state.addLog({ type: 'event', message: `【升级】${member.name} 提升至 ${member.level} 级！战力+5。` });
            }
          }

          if (member.hp <= 0) {
            member.isAlive = false;
            member.hp = 0;
            // Return equipment to player inventory
            if (member.equipment && member.equipment.length > 0) {
              const targetPlayer = updatedPlayer || state.player;
              if (targetPlayer) {
                if (!updatedPlayer) updatedPlayer = { ...state.player!, inventory: { ...state.player!.inventory } };
                for (const eq of member.equipment) {
                  updatedPlayer.inventory[eq] = (updatedPlayer.inventory[eq] || 0) + 1;
                }
              }
            }
            member.equipment = [];
            state.addLog({ type: 'combat', message: `【战死】${member.name} 在战斗中力竭身亡！你的心腹就此陨落...` });
          }
          break; // one monster per member per tick
        }
      }
    }

    // Phase 4: Squad follow behavior
    if (state.player) {
      updatedSquadMembers = updatedSquadMembers.map(member => {
        if (!member.isAlive) return member;

        const roleOrder: SquadRole[] = ['战斗型', '斥候型', '军师型', '后勤型'];
        const roleIndex = roleOrder.indexOf(member.role);
        const angle = (roleIndex / 4) * Math.PI * 2;
        const radius = member.role === '战斗型' ? 1.5 : member.role === '斥候型' ? 3 : member.role === '军师型' ? 2 : 1.5;
        const offsetX = Math.round(Math.cos(angle) * radius);
        const offsetY = Math.round(Math.sin(angle) * radius);

        const targetX = state.player!.position.x + offsetX;
        const targetY = state.player!.position.y + offsetY;
        const fdx = targetX - member.position.x;
        const fdy = targetY - member.position.y;

        if (Math.abs(fdx) <= 1 && Math.abs(fdy) <= 1) {
          return { ...member, position: { ...member.position }, activity: '待命中' };
        }

        return {
          ...member,
          activity: '跟随中',
          position: {
            x: member.position.x + (fdx > 0 ? 1 : fdx < 0 ? -1 : 0),
            y: member.position.y + (fdy > 0 ? 1 : fdy < 0 ? -1 : 0),
          }
        };
      });
    }

    // Remove dead monsters
    const aliveMonsters = monsters.filter(m => m.isAlive);

    // Squad desertion check: low loyalty + low morale
    const factionMorale = state.playerFactionId
      ? state.clans.find(c => c.id === state.playerFactionId)?.morale ?? 50
      : 50;
    const deserters: SquadMember[] = [];
    updatedSquadMembers = updatedSquadMembers.filter(m => {
      if (!m.isAlive) return true;
      if ((m.personality?.loyalty ?? 50) < 20 && factionMorale < 30 && Math.random() < 0.05) {
        deserters.push(m);
        return false;
      }
      return true;
    });
    for (const d of deserters) {
      // Return equipment to player inventory before removal
      if (d.equipment && d.equipment.length > 0) {
        const targetPlayer = updatedPlayer || state.player;
        if (targetPlayer) {
          if (!updatedPlayer) updatedPlayer = { ...state.player! };
          for (const eq of d.equipment) {
            updatedPlayer.inventory[eq] = (updatedPlayer.inventory[eq] || 0) + 1;
          }
        }
      }
      state.addLog({ type: 'event', message: `【叛逃】${d.name} 因忠诚度低下而离开了你的队伍！` });
    }

    // Update clans treasury
    let updatedClans = [...state.clans];
    if (Object.keys(clanTreasuryUpdates).length > 0) {
      updatedClans = updatedClans.map(c => {
        if (clanTreasuryUpdates[c.id]) {
          return { ...c, treasury: c.treasury + clanTreasuryUpdates[c.id] };
        }
        return c;
      });
    }

    // Faction tick: passive income, morale drift
    if (state.playerFactionId && state.player) {
      const faction = updatedClans.find(c => c.id === state.playerFactionId);
      if (faction) {
        const buildings = faction.buildings || [];
        const treasuryLevel = (buildings.find(b => b.type === '库房')?.level || 0);
        if (treasuryLevel > 0) {
          const passiveIncome = treasuryLevel * 5;
          const cap = BUILDING_TREASURY_CAP_BASE + treasuryLevel * BUILDING_TREASURY_CAP_PER_LEVEL;
          updatedClans = updatedClans.map(c =>
            c.id === state.playerFactionId
              ? { ...c, treasury: Math.min((c.treasury || 0) + passiveIncome, cap) }
              : c
          );
        }
        // Morale drift toward 50
        const curMorale = faction.morale ?? 50;
        if (curMorale < 50) {
          updatedClans = updatedClans.map(c =>
            c.id === state.playerFactionId
              ? { ...c, morale: Math.min(50, curMorale + 1) }
              : c
          );
        } else if (curMorale > 50 && (faction.treasury || 0) > 0) {
          updatedClans = updatedClans.map(c =>
            c.id === state.playerFactionId
              ? { ...c, morale: Math.max(50, curMorale - 1) }
              : c
          );
        }
        // Morale < 20 warning (throttled to once per 30s)
        if ((faction.morale ?? 50) < 20) {
          const now = Date.now();
          if (now - (lastMoraleWarningAt || 0) > 30000) {
            state.addLog({ type: 'event', message: '【士气低落】势力士气低于 20，队员可能叛离！' });
            lastMoraleWarningAt = now;
          }
        }
      }
    }

    // Diplomacy tick: truce expiry
    const expiredTruces: Array<{ clanId: string; targetId: string; targetName: string; isPlayer: boolean }> = [];
    for (const c of updatedClans) {
      if (!c.diplomacy) continue;
      for (const [targetId, entry] of Object.entries(c.diplomacy)) {
        if (entry.status === '停战' && entry.truceUntil && Date.now() > entry.truceUntil) {
          const targetClan = updatedClans.find(rc => rc.id === targetId);
          expiredTruces.push({ clanId: c.id, targetId, targetName: targetClan?.name || targetId, isPlayer: c.id === state.playerFactionId });
        }
      }
    }
    for (const et of expiredTruces) {
      updatedClans = updatedClans.map(c => {
        if (c.id === et.clanId || c.id === et.targetId) {
          const otherId = c.id === et.clanId ? et.targetId : et.clanId;
          const d = { ...(c.diplomacy || {}) };
          delete d[otherId];
          return { ...c, diplomacy: d };
        }
        return c;
      });
      if (et.isPlayer) {
        state.addLog({ type: 'event', message: `【停战到期】与 ${et.targetName} 的停战协议已到期。` });
      }
    }

    set({
      nearbyNPCs: npcs,
      clans: updatedClans,
      wildMonsters: aliveMonsters,
      player: updatedPlayer || state.player,
      squadMembers: updatedSquadMembers,
    });

    // Handle enforcer combat (existing)
    if (playerHit) {
      const enforcer = npcs.find(n => n.role === '执法堂长老' && Math.abs(state.player!.position.x - n.position.x) <= 1 && Math.abs(state.player!.position.y - n.position.y) <= 1);
      if (enforcer) {
        get().interactWithNPC(enforcer.id, '攻击');
      }
    }
  },
  markNpcMet: (npcId: string) => {
    const state = get();
    if (!state.metNpcs.includes(npcId)) {
      set({ metNpcs: [...state.metNpcs, npcId] });
    }
  },
  setNpcMemory: (npcId: string, memoryState: string) => {
    set(state => ({
      npcMemory: { ...state.npcMemory, [npcId]: memoryState }
    }));
  },

  saveToSlot: (slot: number) => {
    const s = get();
    if (!s.player) return;
    saveGame(slot, {
      player: s.player,
      clans: s.clans,
      nearbyNPCs: s.nearbyNPCs,
      wildMonsters: s.wildMonsters,
      resourcePoints: s.resourcePoints,
      logs: s.logs.slice(-50),
      market: s.market,
      metNpcs: s.metNpcs,
      npcMemory: s.npcMemory,
      squadMembers: s.squadMembers,
      ascensionQuests: s.ascensionQuests,
      playerFactionId: s.playerFactionId,
    }, s.player.name, s.player.realm, s.player.heavenLevel);
  },

  loadFromSlot: (slot: number) => {
    const raw = loadGame(slot);
    if (!raw) return false;
    try {
      const { gameState } = raw as { gameState: any };
      if (!gameState) return false;
      set({
        player: gameState.player ? { ...gameState.player, reputation: gameState.player.reputation ?? 0 } : null,
        clans: gameState.clans ?? [],
        nearbyNPCs: gameState.nearbyNPCs ?? [],
        wildMonsters: gameState.wildMonsters ?? [],
        resourcePoints: gameState.resourcePoints ?? [],
        logs: (gameState.logs ?? []).slice(-50),
        market: gameState.market ?? {},
        metNpcs: gameState.metNpcs ?? [],
        npcMemory: gameState.npcMemory ?? {},
        squadMembers: gameState.squadMembers ?? [],
        ascensionQuests: gameState.ascensionQuests ?? [],
        playerFactionId: gameState.playerFactionId ?? null,
      });
      return true;
    } catch {
      return false;
    }
  },

  getSaveSlots: () => getSaveSlots(),

  deleteSaveSlot: (slot: number) => {
    deleteSave(slot);
  },
}));

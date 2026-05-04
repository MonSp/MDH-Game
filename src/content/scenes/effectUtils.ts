import type { SceneEffect, SceneEntry } from '../../shared/types/scene';
import type { Player, SquadMember, ActiveDebuff } from '../../store/gameConstants';
import { LI_SI_ID, LI_SI_ROBBED, LI_SI_HELPED, LI_SI_IGNORED } from './grudge/grudgeScene';

// =============================================================
// Effect handlers — pure functions, no side effects
// =============================================================

export interface EffectContext {
  now?: number;
  rng?: () => number;
  protectedItems?: Set<string>;
}

export interface EffectResult {
  player: Partial<Player>;
  logs: string[];
}

export function applyHpEffect(player: Player, delta: number): EffectResult {
  const newHp = Math.max(1, Math.min(player.stats.maxHp, player.stats.hp + delta));
  return {
    player: { stats: { ...player.stats, hp: newHp } },
    logs: [`生命 ${delta >= 0 ? '+' : ''}${delta}`],
  };
}

export function applyAddItemEffect(player: Player, items: Record<string, number>): EffectResult {
  const newInventory = { ...player.inventory };
  const logs: string[] = [];
  for (const [item, count] of Object.entries(items)) {
    newInventory[item] = (newInventory[item] || 0) + count;
    logs.push(`获得 ${item} ×${count}`);
  }
  return {
    player: { inventory: newInventory },
    logs,
  };
}

export function applyRemoveItemEffect(
  player: Player,
  count: number,
  ctx: EffectContext = {},
): EffectResult {
  const { rng = Math.random, protectedItems = new Set(['灵石']) } = ctx;
  const newInventory = { ...player.inventory };
  let removed = 0;
  const logs: string[] = [];
  const removable = Object.entries(newInventory)
    .filter(([name, qty]) => !protectedItems.has(name) && qty > 0);

  for (let i = 0; i < count && removable.length > 0; i++) {
    const idx = Math.floor(rng() * removable.length);
    const [name] = removable[idx];
    newInventory[name] = Math.max(0, (newInventory[name] || 0) - 1);
    if (newInventory[name] === 0) delete newInventory[name];
    logs.push(`你失去了 ${name} ×1`);
    removable.splice(idx, 1);
    removed++;
  }
  if (removed === 0) {
    logs.push('对方没找到值钱的东西，啐了一口');
  }
  return {
    player: { inventory: newInventory },
    logs,
  };
}

export function applyDebuffEffect(
  player: Player,
  debuff: { name: string; durationMs: number; statPenalty: number },
  ctx: EffectContext = {},
): EffectResult {
  const now = ctx.now ?? Date.now();
  const penalty = Math.max(0, Math.min(1, debuff.statPenalty));
  const debuffEntry: ActiveDebuff = {
    id: `debuff-${now}`,
    name: debuff.name,
    expiresAt: now + Math.max(0, debuff.durationMs),
    attackPenalty: penalty,
    defensePenalty: penalty,
  };
  const debuffs = [...(player.activeDebuffs || [])];
  const existingIdx = debuffs.findIndex(d => d.name === debuff.name);
  if (existingIdx >= 0) {
    debuffs[existingIdx] = debuffEntry;
  } else {
    debuffs.push(debuffEntry);
  }
  return {
    player: { activeDebuffs: debuffs },
    logs: [`【${debuff.name}】全属性-${Math.round(penalty * 100)}%，持续${Math.round(Math.max(0, debuff.durationMs) / 60000)}分钟`],
  };
}

export function applyLoseStonesFractionEffect(player: Player, fraction: number): EffectResult {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const currentStones = player.inventory['灵石'] || 0;
  const toLose = Math.floor(currentStones * clampedFraction);
  if (toLose > 0) {
    const newInventory = { ...player.inventory };
    newInventory['灵石'] = Math.max(0, currentStones - toLose);
    return {
      player: { inventory: newInventory },
      logs: [`你被迫交出了 ${toLose} 块灵石`],
    };
  }
  return {
    player: {},
    logs: ['对方翻了翻你的储物袋，嫌弃地啐了一口'],
  };
}

// =============================================================
// Scene routing
// =============================================================

export function resolveReunionScene(memory: string | undefined): string | null {
  if (!memory) return null;
  if (memory === LI_SI_ROBBED) return 'grudge_reunion_robbed';
  if (memory === LI_SI_HELPED) return 'grudge_reunion_helped';
  return 'grudge_reunion_neutral';
}

export function shouldTriggerIgnoreDeathRouter(memory: string | undefined): boolean {
  return memory === LI_SI_IGNORED;
}

// =============================================================
// Li Si squad member creation
// =============================================================

export function createLiSiSquadMember(
  player: Player,
  ctx: { now?: number } = {},
): SquadMember {
  const now = ctx.now ?? Date.now();
  return {
    id: `squad-${now}`,
    npcId: LI_SI_ID,
    name: '李四',
    clanId: player.clanId,
    role: '后勤型',
    realm: player.realm,
    power: Math.floor((player.stats.attack + player.stats.defense) * 0.6),
    hp: 80,
    maxHp: 100,
    mp: 60,
    maxMp: 80,
    personality: { ambition: 30, caution: 60, loyalty: 80, greed: 20 },
    joinDate: now,
    kills: 0,
    isAlive: true,
    position: { ...player.position },
    activity: '跟随中',
    equipment: [],
    level: 1,
    exp: 0,
    maxExp: 80,
  };
}

// =============================================================
// Li Si passive protection
// =============================================================

export const LI_SI_HEAL_HP_THRESHOLD = 0.2;
export const LI_SI_HEAL_COOLDOWN_MS = 30000;
export const LI_SI_HEAL_AMOUNT = 10;

export interface LiSiHealDecision {
  healAmount: number;
}

export function evaluateLiSiPassiveHeal(
  player: Player,
  squadMembers: SquadMember[],
  lastHealTime: number,
  now: number,
): LiSiHealDecision | null {
  if (!squadMembers.some(m => m.npcId === LI_SI_ID)) return null;
  const hpPct = player.stats.hp / player.stats.maxHp;
  if (hpPct >= LI_SI_HEAL_HP_THRESHOLD || hpPct <= 0) return null;
  if (now - lastHealTime <= LI_SI_HEAL_COOLDOWN_MS) return null;
  return { healAmount: LI_SI_HEAL_AMOUNT };
}

// =============================================================
// Auto-advance from grudge_lisi_rob
// =============================================================

export function resolveRobAdvance(memory: string | undefined): string | null {
  if (!memory) return null;
  return 'grudge_leave_village';
}

import type { Server as SocketIOServer } from 'socket.io';
import { PlayerService } from '../services';
import { MarketService } from '../services/MarketService';
import { DeathService } from '../services/DeathService';
import { NPCWorldService } from '../services/NPCWorldService';
import { MONSTER_TEMPLATES, getMonstersForPlayerRealm, type MonsterTemplate } from './GameEngine';
import type { MonsterState, CombatEvent } from '../../shared/types/socket-events';

// ─── Server-Side Monster Spawning ───────────────────────────────

export interface ServerMonster {
  id: string;
  template: MonsterTemplate;
  hp: number;
  maxHp: number;
  position: { x: number; y: number };
  targetPlayerId: string | null;
  spawnedAt: number;
}

const serverMonsters = new Map<string, ServerMonster>();
let monsterIdCounter = 0;

const MAX_MONSTERS_PER_PLAYER = 3;
const SPAWN_CHANCE = 0.15;
const DESPAWN_DISTANCE = 20;
const SPAWN_DISTANCE_MIN = 5;
const SPAWN_DISTANCE_MAX = 10;

export function getServerMonsters(): ServerMonster[] {
  return Array.from(serverMonsters.values());
}

export function getMonstersNearPlayer(playerId: string): MonsterState[] {
  const player = PlayerService.getInstance().getPlayer(playerId);
  if (!player) return [];

  const result: MonsterState[] = [];
  for (const m of serverMonsters.values()) {
    if (m.targetPlayerId === playerId) {
      result.push({
        id: m.id,
        type: m.template.name,
        name: m.template.name,
        hp: m.hp,
        maxHp: m.maxHp,
        attack: m.template.attack,
        defense: m.template.defense,
        position: m.position,
      });
    }
  }
  return result;
}

export function damageMonster(monsterId: string, damage: number): ServerMonster | null {
  const m = serverMonsters.get(monsterId);
  if (!m) return null;
  m.hp = Math.max(0, m.hp - damage);
  if (m.hp <= 0) serverMonsters.delete(monsterId);
  return m;
}

export function spawnMonstersTick(io: SocketIOServer) {
  const onlinePlayers = PlayerService.getInstance().getOnlinePlayers();

  for (const player of onlinePlayers) {
    // Count monsters already targeting this player
    let count = 0;
    for (const m of serverMonsters.values()) {
      if (m.targetPlayerId === player.id) count++;
    }

    if (count >= MAX_MONSTERS_PER_PLAYER) continue;
    if (Math.random() > SPAWN_CHANCE) continue;

    // Get appropriate monster for player realm
    const candidates = getMonstersForPlayerRealm(
      ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'][player.realm - 1] || '凡人'
    );
    if (candidates.length === 0) continue;

    const template = candidates[Math.floor(Math.random() * candidates.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN);

    const monster: ServerMonster = {
      id: `srv_monster_${++monsterIdCounter}`,
      template,
      hp: template.hp,
      maxHp: template.hp,
      position: {
        x: Math.floor(player.position.x + Math.cos(angle) * dist),
        y: Math.floor(player.position.y + Math.sin(angle) * dist),
      },
      targetPlayerId: player.id,
      spawnedAt: Date.now(),
    };

    serverMonsters.set(monster.id, monster);
  }

  // Despawn far-away monsters
  for (const [id, m] of serverMonsters) {
    if (!m.targetPlayerId) { serverMonsters.delete(id); continue; }
    const player = PlayerService.getInstance().getPlayer(m.targetPlayerId);
    if (!player) { serverMonsters.delete(id); continue; }
    const dx = m.position.x - player.position.x;
    const dy = m.position.y - player.position.y;
    if (Math.sqrt(dx * dx + dy * dy) > DESPAWN_DISTANCE) {
      serverMonsters.delete(id);
    }
  }
}

// ─── Market Price Tick ──────────────────────────────────────────

const marketCommodities = [
  { name: '甘草', basePrice: 5 },
  { name: '薄荷', basePrice: 4 },
  { name: '灵泉水', basePrice: 8 },
  { name: '灵芝', basePrice: 30 },
  { name: '人参', basePrice: 25 },
  { name: '朱果', basePrice: 40 },
  { name: '精铁', basePrice: 10 },
  { name: '玄铁', basePrice: 25 },
  { name: '星辰砂', basePrice: 50 },
  { name: '凤羽', basePrice: 80 },
  { name: '龙骨', basePrice: 100 },
  { name: '妖兽内丹', basePrice: 60 },
];

const marketSupply = new Map<string, number>();
const marketDemand = new Map<string, number>();

// Initialize supply/demand
for (const c of marketCommodities) {
  marketSupply.set(c.name, 100);
  marketDemand.set(c.name, 100);
}

export function getMarketPrices() {
  const ELASTICITY = 0.3;
  const FLOOR = 0.3;
  const CEIL = 3.0;

  return marketCommodities.map(c => {
    const supply = marketSupply.get(c.name) ?? 100;
    const demand = marketDemand.get(c.name) ?? 100;
    const ratio = demand / Math.max(1, supply);
    const price = Math.floor(c.basePrice * Math.max(FLOOR, Math.min(CEIL, 1 + ELASTICITY * Math.log(ratio))));
    return {
      commodity: c.name,
      basePrice: c.basePrice,
      currentPrice: price,
      supply,
      demand,
    };
  });
}

export function adjustMarketSupply(commodity: string, delta: number) {
  marketSupply.set(commodity, Math.max(1, (marketSupply.get(commodity) ?? 100) + delta));
}

export function adjustMarketDemand(commodity: string, delta: number) {
  marketDemand.set(commodity, Math.max(1, (marketDemand.get(commodity) ?? 100) + delta));
}

export function marketPriceTick() {
  // Natural supply regeneration + demand fluctuation
  for (const c of marketCommodities) {
    const supply = marketSupply.get(c.name) ?? 100;
    const demand = marketDemand.get(c.name) ?? 100;
    // Supply slowly regenerates toward 100
    marketSupply.set(c.name, Math.floor(supply + (100 - supply) * 0.05));
    // Demand fluctuates randomly
    marketDemand.set(c.name, Math.max(10, Math.floor(demand + (Math.random() - 0.5) * 10)));
  }
}

// ─── DeathService Wiring ────────────────────────────────────────

export function processNPCDeath(npc: any, killerId: string | null) {
  try {
    const deathSvc = DeathService.getInstance();
    const result = deathSvc.processDeath(npc, {
      cause: 'combat' as any,
      killerId,
      killerType: killerId ? 'player' : null,
    });
    return result;
  } catch {
    // DeathService may not be fully initialized
    return null;
  }
}

// ─── Combat Events Buffer ───────────────────────────────────────

const combatEvents: CombatEvent[] = [];

export function pushCombatEvent(event: CombatEvent) {
  combatEvents.push(event);
}

export function drainCombatEvents(): CombatEvent[] {
  return combatEvents.splice(0);
}

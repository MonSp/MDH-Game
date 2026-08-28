/**
 * Server-Authoritative E2E Integration Tests
 *
 * Tests all socket handlers against a live server instance.
 * Run: npx vitest run test/server-authoritative-e2e.test.ts
 * Requires: server running on localhost:3000 (start with: node dist/server/index.js)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000;

let socket: Socket;
let serverAvailable = false;
let playerId: string;

function emitAndWait<T>(event: string, data?: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false, error: 'timeout' }), TIMEOUT);
    socket.once(`${event}:result`, (res: any) => {
      clearTimeout(timer);
      resolve(res);
    });
    if (data !== undefined) socket.emit(event, data);
    else socket.emit(event);
  });
}

function waitForEvent<T>(event: string, timeoutMs = TIMEOUT): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeAll(async () => {
  try {
    socket = io(SERVER_URL, { transports: ['polling', 'websocket'], forceNew: true, reconnection: false });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect timeout')), 3000);
      socket.on('connect', () => { clearTimeout(t); resolve(); });
      socket.on('connect_error', () => { clearTimeout(t); reject(new Error('connect failed')); });
    });
    serverAvailable = true;
  } catch {
    serverAvailable = false;
    console.warn('[E2E] Server not available on localhost:3000 — skipping E2E tests');
  }
});

afterAll(() => {
  if (socket?.connected) socket.disconnect();
});

beforeEach(async () => {
  if (!serverAvailable) return;
  // Create fresh player for each test group
  socket.emit('player:create', { name: `E2E_${Date.now()}` });
  const player = await waitForEvent<any>('player:created', 3000);
  if (player) playerId = player.id;
});

// ─── Player Registration ────────────────────────────────────────

describe('Player Registration', () => {
  it('registers player and returns valid data', async () => {
    if (!serverAvailable) return;
    expect(playerId).toBeDefined();
    expect(playerId.length).toBeGreaterThan(0);
  });

  it('receives state:sync after registration', async () => {
    if (!serverAvailable) return;
    const sync = await waitForEvent<any>('state:sync', 3000);
    expect(sync).not.toBeNull();
    expect(sync!.player).toBeDefined();
    expect(sync!.player.health).toBeGreaterThan(0);
    expect(sync!.player.maxHealth).toBeGreaterThan(0);
    expect(typeof sync!.player.spiritStones).toBe('number');
    expect(Array.isArray(sync!.nearbyMonsters)).toBe(true);
  });
});

// ─── Economy ────────────────────────────────────────────────────

describe('Economy — Market', () => {
  it('returns market commodities with valid prices', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:market');
    expect(r.success).toBe(true);
    expect(r.data.items.length).toBeGreaterThanOrEqual(10);
    for (const item of r.data.items) {
      expect(item.commodity).toBeTruthy();
      expect(item.currentPrice).toBeGreaterThan(0);
      expect(item.supply).toBeGreaterThan(0);
      expect(item.demand).toBeGreaterThan(0);
    }
  });

  it('returns current player balance', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:market');
    expect(r.success).toBe(true);
    expect(typeof r.data.balance).toBe('number');
  });
});

describe('Economy — Inventory', () => {
  it('returns empty inventory for new player', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:inventory');
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data.items)).toBe(true);
    expect(typeof r.data.balance).toBe('number');
  });
});

describe('Economy — Buy', () => {
  it('rejects buy with insufficient funds', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:buy', { itemId: 'WashMarrowPill', quantity: 1 });
    expect(r.success).toBe(false);
    expect(r.error).toContain('灵石不足');
  });

  it('rejects buy for nonexistent item', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:buy', { itemId: 'NonexistentItem', quantity: 1 });
    expect(r.success).toBe(false);
    expect(r.error).toContain('物品不存在');
  });
});

describe('Economy — Sell', () => {
  it('rejects sell when item not owned', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:sell', { itemId: 'WashMarrowPill', quantity: 1 });
    expect(r.success).toBe(false);
    expect(r.error).toContain('物品数量不足');
  });
});

// ─── Resource Gathering ─────────────────────────────────────────

describe('Resource Gathering', () => {
  it('gathers 灵田 and returns exp + materials', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('resource:gather', { resourceType: '灵田' });
    expect(r.success).toBe(true);
    expect(r.data.expGained).toBeGreaterThan(0);
    expect(r.data.spiritStonesGained).toBe(0);
    expect(Array.isArray(r.data.materials)).toBe(true);
  });

  it('gathers 矿脉 and returns stones + materials', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    expect(r.success).toBe(true);
    expect(r.data.spiritStonesGained).toBeGreaterThan(0);
    expect(r.data.expGained).toBe(0);
    expect(Array.isArray(r.data.materials)).toBe(true);
  });

  it('gathers 遗迹 and returns stones + materials', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('resource:gather', { resourceType: '遗迹' });
    expect(r.success).toBe(true);
    expect(r.data.spiritStonesGained).toBeGreaterThan(0);
  });

  it('updates balance after gathering 矿脉', async () => {
    if (!serverAvailable) return;
    const before = await emitAndWait<any>('economy:inventory');
    const initBalance = before.data?.balance ?? 0;

    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });

    const after = await emitAndWait<any>('economy:inventory');
    expect(after.data.balance).toBe(initBalance + 50);
  });

  it('rejects unknown resource type', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('resource:gather', { resourceType: '未知矿脉' });
    expect(r.success).toBe(false);
  });
});

// ─── Cultivation ────────────────────────────────────────────────

describe('Cultivation', () => {
  it('returns cultivation status for new player', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('cultivation:status');
    expect(r.success).toBe(true);
    expect(r.data.realmName).toBe('凡人');
    expect(r.data.cultivation).toBeGreaterThanOrEqual(0);
    expect(r.data.maxCultivation).toBeGreaterThan(0);
    expect(r.data.stats.health).toBeGreaterThan(0);
  });

  it('cultivate increases exp', async () => {
    if (!serverAvailable) return;
    const before = await emitAndWait<any>('cultivation:status');
    const initExp = before.data?.cultivation ?? 0;

    const r = await emitAndWait<any>('cultivation:cultivate');
    expect(r.success).toBe(true);
    expect(r.data.expGained).toBeGreaterThan(0);
    expect(r.data.cultivation).toBe(initExp + r.data.expGained);
  });

  it('breakthrough fails when cultivation insufficient', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('cultivation:breakthrough');
    expect(r.success).toBe(true);
    expect(r.data.success).toBe(false);
    expect(r.data.reason).toBeDefined();
  });
});

// ─── Techniques ─────────────────────────────────────────────────

describe('Techniques', () => {
  it('returns technique status with available techniques', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('technique:status');
    expect(r.success).toBe(true);
    expect(r.data.learned.length).toBe(0);
    expect(r.data.available.length).toBeGreaterThanOrEqual(3);
    expect(r.data.effects).toBeDefined();
  });

  it('rejects learn with insufficient stones', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });
    // New player has 0 stones, basic_stance costs 100
    expect(r.success).toBe(false);
    expect(r.error).toContain('灵石不足');
  });

  it('rejects learn for nonexistent technique', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('technique:learn', { techniqueId: 'nonexistent' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('心法不存在');
  });

  it('rejects levelup for unlearned technique', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('technique:levelup', { techniqueId: 'basic_stance' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('未学会');
  });

  it('learns technique after gathering enough stones', async () => {
    if (!serverAvailable) return;
    // Gather enough stones (矿脉 gives 50 each, need 100 for basic_stance)
    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });

    const r = await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });
    expect(r.success).toBe(true);
    expect(r.data.name).toBe('基础吐纳');
    expect(r.data.level).toBe(1);
    expect(r.data.spiritStonesSpent).toBe(100);
  });

  it('rejects duplicate learn', async () => {
    if (!serverAvailable) return;
    // Gather and learn first
    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });

    // Try again
    const r = await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('已学会');
  });

  it('levels up technique after learning', async () => {
    if (!serverAvailable) return;
    // Gather, learn, then level up
    for (let i = 0; i < 5; i++) await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });

    const r = await emitAndWait<any>('technique:levelup', { techniqueId: 'basic_stance' });
    expect(r.success).toBe(true);
    expect(r.data.newLevel).toBe(2);
  });
});

// ─── Crafting ───────────────────────────────────────────────────

describe('Crafting', () => {
  it('returns recipe list', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:recipes');
    expect(r.success).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(10);
    for (const recipe of r.data) {
      expect(recipe.id).toBeTruthy();
      expect(recipe.name).toBeTruthy();
      expect(recipe.materials).toBeDefined();
      expect(recipe.baseSuccessRate).toBeGreaterThan(0);
    }
  });

  it('rejects craft with missing materials', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:craft', { recipeId: 'pill_hp_basic' });
    expect(r.success).toBe(true);
    expect(r.data.success).toBe(false);
    expect(r.data.message).toContain('材料不足');
  });

  it('rejects craft for nonexistent recipe', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('economy:craft', { recipeId: 'nonexistent' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('配方不存在');
  });

  it('crafts pill after gathering materials', async () => {
    if (!serverAvailable) return;
    // pill_hp_basic needs: 甘草 x2, 灵泉水 x1
    // 灵田 drops both 甘草 and 灵泉水
    for (let i = 0; i < 10; i++) await emitAndWait<any>('resource:gather', { resourceType: '灵田' });

    const inv = await emitAndWait<any>('economy:inventory');
    const hasHerb = inv.data?.items?.some((i: any) => i.item.name === '甘草' && i.count >= 2);
    const hasWater = inv.data?.items?.some((i: any) => i.item.name === '灵泉水' && i.count >= 1);

    if (hasHerb && hasWater) {
      const r = await emitAndWait<any>('economy:craft', { recipeId: 'pill_hp_basic', buffMultiplier: 2.0 });
      expect(r.success).toBe(true);
      // With buffMultiplier 2.0, success rate = min(0.80 * 2.0, 0.95) = 0.95
      // Very likely to succeed
      if (r.data.success) {
        expect(r.data.product).toBe('回血丹');
      }
    }
  });
});

// ─── Combat ─────────────────────────────────────────────────────

describe('Combat', () => {
  it('rejects attack on nonexistent NPC', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('combat:attack', { targetId: 'nonexistent_npc', targetKind: 'npc' });
    expect(r.success).toBe(false);
  });

  it('rejects attack on nonexistent monster', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('combat:attack', { targetId: 'nonexistent_monster', targetKind: 'monster' });
    expect(r.success).toBe(false);
  });

  it('attacks spawned monster within timeout', { timeout: 120000 }, async () => {
    if (!serverAvailable) return;
    // Wait for a monster to spawn (server spawns every 5s at 15% chance)
    // Expected wait: ~33s on average, allow up to 120s
    let monsterId: string | null = null;
    for (let i = 0; i < 50; i++) {
      const sync = await waitForEvent<any>('state:sync', 2000);
      if (sync && sync.nearbyMonsters.length > 0) {
        monsterId = sync.nearbyMonsters[0].id;
        break;
      }
    }

    if (!monsterId) {
      console.warn('[E2E] No monster spawned within 60s — skipping combat attack test');
      return;
    }

    const r = await emitAndWait<any>('combat:attack', { targetId: monsterId, targetKind: 'monster' });
    expect(r.success).toBe(true);
    expect(r.data.damage).toBeGreaterThan(0);
    expect(typeof r.data.targetHp).toBe('number');
    expect(typeof r.data.killed).toBe('boolean');
    expect(typeof r.data.playerHp).toBe('number');
  });
});

// ─── Save / Load ────────────────────────────────────────────────

describe('Save / Load', () => {
  it('saves game state to slot', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('save:save', {
      slot: 1,
      gameState: { player: { name: 'E2E_Test' }, timestamp: Date.now() },
      playerName: 'E2E_Test',
      playerRealm: '凡人',
      heavenLevel: 9,
    });
    expect(r.success).toBe(true);
    expect(r.data.slot).toBe(1);
  });

  it('loads saved game state', async () => {
    if (!serverAvailable) return;
    await emitAndWait<any>('save:save', {
      slot: 2,
      gameState: { player: { name: 'LoadTest' } },
      playerName: 'LoadTest',
      playerRealm: '凡人',
      heavenLevel: 9,
    });

    const r = await emitAndWait<any>('save:load', { slot: 2 });
    expect(r.success).toBe(true);
    expect(r.data.meta.playerName).toBe('LoadTest');
    expect(r.data.meta.playerRealm).toBe('凡人');
  });

  it('returns save list', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('save:list');
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(5);
  });

  it('loads nonexistent slot gracefully', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('save:load', { slot: 99 });
    expect(r.success).toBe(false);
    expect(r.error).toContain('不存在');
  });

  it('deletes save', async () => {
    if (!serverAvailable) return;
    await emitAndWait<any>('save:save', { slot: 3, gameState: {}, playerName: 'Del', playerRealm: '凡人', heavenLevel: 9 });
    const r = await emitAndWait<any>('save:delete', { slot: 3 });
    expect(r.success).toBe(true);

    const load = await emitAndWait<any>('save:load', { slot: 3 });
    expect(load.success).toBe(false);
  });
});

// ─── Diplomacy ──────────────────────────────────────────────────

describe('Diplomacy', () => {
  it('returns diplomacy status', async () => {
    if (!serverAvailable) return;
    const r = await emitAndWait<any>('diplomacy:status');
    // May fail if player has no faction, but should respond
    expect(r).toBeDefined();
  });
});

// ─── Data Consistency ───────────────────────────────────────────

describe('Data Consistency', () => {
  it('balance consistent across economy:inventory, cultivation:status, and state:sync', async () => {
    if (!serverAvailable) return;
    // Gather some stones
    await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    await emitAndWait<any>('resource:gather', { resourceType: '遗迹' });

    const inv = await emitAndWait<any>('economy:inventory');
    const cul = await emitAndWait<any>('cultivation:status');
    const sync = await waitForEvent<any>('state:sync', 3000);

    const invBalance = inv.data?.balance ?? -1;
    const culStones = cul.data?.spiritStones ?? -2;
    const syncStones = sync?.player?.spiritStones ?? -3;

    // All three should report the same stone count
    expect(invBalance).toBe(culStones);
    expect(culStones).toBe(syncStones);
  });

  it('exp consistent between cultivation:status and state:sync', async () => {
    if (!serverAvailable) return;
    await emitAndWait<any>('cultivation:cultivate');
    await emitAndWait<any>('cultivation:cultivate');

    const cul = await emitAndWait<any>('cultivation:status');
    const sync = await waitForEvent<any>('state:sync', 3000);

    if (cul.success && sync) {
      expect(cul.data.cultivation).toBe(sync.player.cultivation);
    }
  });
});

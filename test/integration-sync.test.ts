/**
 * Integration test: Server-Client state synchronization
 * Tests that the server game loop broadcasts authoritative state
 * and the client can apply it correctly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 15000;

function connectClient(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);
    const socket = ioClient(SERVER_URL, { transports: ['polling'], reconnection: false });
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('connect_error', (e) => { clearTimeout(timer); reject(e); });
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => { clearTimeout(timer); resolve(data); });
  });
}

function emitAndWait<T>(socket: Socket, event: string, data: any, responseEvent: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${responseEvent}`)), timeoutMs);
    socket.once(responseEvent, (result: T) => { clearTimeout(timer); resolve(result); });
    socket.emit(event, data);
  });
}

describe('Server-Client State Sync Integration', () => {
  let socket: Socket;

  beforeAll(async () => {
    socket = await connectClient();
    // Create a player
    const result = await emitAndWait<any>(socket, 'player:create', { name: '集成测试' }, 'player:created', 5000);
    expect(result.name).toBe('集成测试');
  }, TIMEOUT);

  afterAll(() => {
    socket?.disconnect();
  });

  // ===== 1. Game Tick Broadcast =====
  it('server broadcasts game:tick with market, monsters, combatResults', async () => {
    const tick = await waitForEvent<any>(socket, 'game:tick', 10000);

    expect(tick).toBeDefined();
    expect(tick.market).toBeDefined();
    expect(tick.monsters).toBeDefined();
    expect(tick.combatResults).toBeDefined();
    expect(tick.npcStates).toBeDefined();
    expect(tick.timestamp).toBeGreaterThan(0);

    // Market should have prices for known items
    const items = Object.keys(tick.market);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(tick.market[item].currentPrice).toBeGreaterThan(0);
      expect(tick.market[item].basePrice).toBeGreaterThan(0);
    }

    // Monster list should be an array
    expect(Array.isArray(tick.monsters)).toBe(true);
    for (const m of tick.monsters) {
      expect(m.id).toBeDefined();
      expect(m.name).toBeDefined();
      expect(m.hp).toBeGreaterThan(0);
      expect(m.maxHp).toBeGreaterThan(0);
      expect(m.position).toBeDefined();
      expect(m.isAlive).toBe(true);
    }

    // Combat results should be an array
    expect(Array.isArray(tick.combatResults)).toBe(true);

    // NPC states should be an array
    expect(Array.isArray(tick.npcStates)).toBe(true);
    expect(tick.npcStates.length).toBeGreaterThan(0);
    for (const npc of tick.npcStates) {
      expect(npc.id).toBeDefined();
      expect(npc.name).toBeDefined();
      expect(npc.position).toBeDefined();
      expect(npc.activity).toBeDefined();
    }
  });

  // ===== 2. Market Price Changes =====
  it('market prices are valid positive numbers', async () => {
    const tick1 = await waitForEvent<any>(socket, 'game:tick', 10000);
    const tick2 = await waitForEvent<any>(socket, 'game:tick', 10000);

    const items = Object.keys(tick1.market);
    expect(items.length).toBeGreaterThan(0);

    // All prices should be positive in both ticks
    for (const item of items) {
      expect(tick1.market[item].currentPrice).toBeGreaterThan(0);
      expect(tick1.market[item].basePrice).toBeGreaterThan(0);
      expect(tick2.market[item].currentPrice).toBeGreaterThan(0);
    }
    // Same items in both ticks
    expect(Object.keys(tick2.market).length).toBe(items.length);
  });

  // ===== 3. Resource Gathering =====
  it('resource gathering returns valid results from server', async () => {
    const result = await emitAndWait<any>(socket, 'resource:gather', {
      resourceId: 'test-res-灵田', resourceType: '灵田',
      playerPosition: { x: 300, y: 300 }, fortune: 25, heavenLevel: 9,
    }, 'resource:gather-result', 5000);

    expect(result.ok).toBe(true);
    expect(result.expGain).toBeGreaterThanOrEqual(0);
    expect(result.stonesGain).toBeGreaterThanOrEqual(0);
    expect(result.message).toBeDefined();
  });

  // ===== 4. Combat: Attack NPC =====
  it('combat:attack-npc returns valid result from server', async () => {
    const result = await emitAndWait<any>(socket, 'combat:attack-npc', {
      npcId: 'test-npc-1', npcName: '测试敌人', npcPower: 200,
      npcClanId: 'clan-test', npcRealm: '练气', npcActivity: '闲逛中',
      npcSpiritStone: 50, playerAttack: 600, playerCountry: '秦',
      playerRealm: '筑基', playerPosition: { x: 300, y: 300 },
    }, 'combat:attack-npc-result', 5000);

    expect(result).toBeDefined();
    expect(typeof result.win).toBe('boolean');
    expect(typeof result.expGain).toBe('number');
    expect(typeof result.dropStones).toBe('number');
    expect(typeof result.reputationGain).toBe('number');

    if (result.win) {
      expect(result.expGain).toBeGreaterThan(0);
      expect(result.dropStones).toBeGreaterThanOrEqual(0);
    }
  });

  // ===== 5. Combat: Duel NPC =====
  it('combat:duel-npc returns valid result with duel modifiers', async () => {
    const result = await emitAndWait<any>(socket, 'combat:duel-npc', {
      npcId: 'test-duel-1', npcName: '决斗对手', npcPower: 300,
      npcClanId: 'clan-test', npcRealm: '练气', npcActivity: '闲逛中',
      npcSpiritStone: 100, playerAttack: 600, playerCountry: '秦',
      playerRealm: '筑基', playerPosition: { x: 300, y: 300 },
    }, 'combat:duel-npc-result', 5000);

    expect(result).toBeDefined();
    expect(typeof result.win).toBe('boolean');
    // Duel should NOT capture (captureSuccess should be false when win)
    if (result.win) {
      expect(result.captureSuccess).toBe(false);
      expect(result.expGain).toBeGreaterThanOrEqual(80); // Duel base exp is 80
    }
  });

  // ===== 6. Combat: Rob NPC =====
  it('combat:rob-npc returns valid result', async () => {
    const result = await emitAndWait<any>(socket, 'combat:rob-npc', {
      npcId: 'test-rob-1', npcName: '路人', npcPower: 200,
      npcClanId: 'clan-test', npcRealm: '练气', npcSpiritStone: 150,
      playerAttack: 500, playerRealm: '筑基',
    }, 'combat:rob-npc-result', 5000);

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(result.repLoss).toBeGreaterThan(0);

    if (result.success) {
      expect(result.stolenStones).toBeGreaterThanOrEqual(1);
    } else {
      expect(result.hpLoss).toBeGreaterThan(0);
    }
  });

  // ===== 7. Market Buy/Sell =====
  it('market:buy and market:sell return valid results', async () => {
    const buyResult = await emitAndWait<any>(socket, 'market:buy',
      { itemName: '回血丹', amount: 1 }, 'market:buy-result', 5000);
    expect(buyResult.ok).toBe(true);
    expect(buyResult.itemName).toBe('回血丹');

    const sellResult = await emitAndWait<any>(socket, 'market:sell',
      { itemName: '洗髓丹', amount: 1 }, 'market:sell-result', 5000);
    expect(sellResult.ok).toBe(true);
  });

  // ===== 8. Save/Load =====
  it('save and load game state persists correctly', async () => {
    const saveResult = await emitAndWait<any>(socket, 'game:save', {
      slot: 1, meta: { playerName: '集成测试', playerRealm: '练气', heavenLevel: 9, timestamp: Date.now(), version: '1.0.0' },
      state: { player: { name: '集成测试' }, test: true },
    }, 'game:save-result', 5000);
    expect(saveResult.ok).toBe(true);

    const loadResult = await emitAndWait<any>(socket, 'game:load', { slot: 1 }, 'game:load-result', 5000);
    expect(loadResult.ok).toBe(true);
    expect(loadResult.state).toBeDefined();
    expect(loadResult.state.test).toBe(true);

    const slotsResult = await emitAndWait<any>(socket, 'game:save-slots', {}, 'game:save-slots-result', 5000);
    expect(slotsResult.ok).toBe(true);
    expect(slotsResult.slots.length).toBe(5);
    expect(slotsResult.slots[0].meta).toBeDefined();

    // Cleanup
    await emitAndWait<any>(socket, 'game:delete-save', { slot: 1 }, 'game:delete-save-result', 5000);
  });

  // ===== 9. Diplomacy =====
  it('diplomacy actions are processed by server', async () => {
    const result = await emitAndWait<any>(socket, 'diplomacy:action', {
      action: 'declare-war', fromClanId: 'clan-A', toClanId: 'clan-B',
    }, 'diplomacy:result', 5000);
    expect(result.ok).toBe(true);
    expect(result.action).toBe('declare-war');
  });

  // ===== 10. Squad Actions =====
  it('squad actions are processed by server', async () => {
    const result = await emitAndWait<any>(socket, 'squad:action', {
      action: 'recruit', params: { npcId: 'test-npc', role: '战斗型', spiritStoneCost: 100 },
    }, 'squad:result', 5000);
    expect(result.ok).toBe(true);
    expect(result.action).toBe('recruit');
  });

  // ===== 11. Siege Resolution =====
  it('siege:resolve returns valid result', async () => {
    const result = await emitAndWait<any>(socket, 'siege:resolve', {
      attackerClanId: 'clan-A', targetClanId: 'clan-B', attackPower: 500,
      targetFortification: 100, targetGarrison: 50, targetTreasury: 10000,
      targetMorale: 50, targetTerritory: 3,
    }, 'siege:result', 5000);
    expect(result).toBeDefined();
    expect(typeof result.fortDmg).toBe('number');
    expect(typeof result.garrisonDmg).toBe('number');
    expect(typeof result.captured).toBe('boolean');
  });

  // ===== 12. Ascension Validation =====
  it('ascension:attempt validates conditions server-side', async () => {
    const result = await emitAndWait<any>(socket, 'ascension:attempt', {
      heavenLevel: 9, realm: '练气', inventory: { '灵石': 1000, '飞升令': 0 },
      ascensionQuests: [],
    }, 'ascension:result', 5000);
    // Should fail — not at max realm for heaven 9
    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
  });

  // ===== 13. Cycle Rebirth Validation =====
  it('cycle:rebirth validates conditions server-side', async () => {
    const result = await emitAndWait<any>(socket, 'cycle:rebirth', {
      type: '真灵转世', heavenLevel: 3, // Too low
      inventory: {}, clanId: 'test',
    }, 'cycle:rebirth-result', 5000);
    expect(result.success).toBe(false);
    expect(result.message).toContain('第6层');
  });

  // ===== 14. NPC Combat & Army Results in game:tick =====
  it('game:tick includes npcCombatResults and armyCombatResults arrays', async () => {
    const tick = await waitForEvent<any>(socket, 'game:tick', 10000);
    expect(Array.isArray(tick.npcCombatResults)).toBe(true);
    expect(Array.isArray(tick.armyCombatResults)).toBe(true);
  });

  // ===== 15. Multiple game:tick stability =====
  it('receives 5 consecutive game:tick without errors', { timeout: 15000 }, async () => {
    for (let i = 0; i < 5; i++) {
      const tick = await waitForEvent<any>(socket, 'game:tick', 10000);
      expect(tick.market).toBeDefined();
      expect(tick.monsters).toBeDefined();
      expect(tick.timestamp).toBeGreaterThan(0);
    }
  });
});

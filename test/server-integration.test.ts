import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { transports: ['websocket', 'polling'] });

const results: Record<string, string> = {};
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return fn().then(() => {
    results[name] = 'PASS';
    passed++;
    console.log(`  ✓ ${name}`);
  }).catch(e => {
    results[name] = `FAIL: ${e.message || e}`;
    failed++;
    console.log(`  ✗ ${name}: ${e.message || e}`);
  });
}

function emitAndWait<T>(event: string, data?: any, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    socket.once(`${event}:result`, (res: any) => {
      clearTimeout(timer);
      if (res.success) resolve(res.data);
      else reject(new Error(res.error || 'unknown error'));
    });
    if (data !== undefined) socket.emit(event, data);
    else socket.emit(event);
  });
}

async function run() {
  await new Promise<void>((resolve) => {
    if (socket.connected) return resolve();
    socket.once('connect', () => resolve());
  });
  console.log('Connected to server\n');

  // Create a player first
  console.log('--- Player Setup ---');
  const playerData = await new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('player:create timeout')), 5000);
    socket.once('player:created', (data) => { clearTimeout(t); resolve(data); });
    socket.emit('player:create', { name: '测试修士' });
  });
  console.log(`  Player: ${playerData.name}, realm: ${playerData.realm.name}, stones: ${playerData.spiritStones}\n`);

  // --- Economy Tests ---
  console.log('--- Economy ---');
  await test('economy:market', async () => {
    const data = await emitAndWait<any>('economy:market');
    if (!data.items || data.items.length === 0) throw new Error('no market items');
    console.log(`    Market: ${data.items.length} commodities, balance: ${data.balance}`);
  });

  await test('economy:inventory', async () => {
    const data = await emitAndWait<any>('economy:inventory');
    console.log(`    Inventory: ${data.items.length} item types, balance: ${data.balance}`);
  });

  await test('economy:buy (洗髓丹)', async () => {
    const data = await emitAndWait<any>('economy:buy', { itemId: 'WashMarrowPill', quantity: 1 });
    console.log(`    Bought! New balance: ${data.balance}`);
  });

  await test('economy:sell (洗髓丹)', async () => {
    const data = await emitAndWait<any>('economy:sell', { itemId: 'WashMarrowPill', quantity: 1 });
    console.log(`    Sold! New balance: ${data.balance}`);
  });

  await test('economy:buy insufficient funds', async () => {
    try {
      await emitAndWait<any>('economy:buy', { itemId: 'FoundationPill', quantity: 9999 });
      throw new Error('should have failed');
    } catch (e: any) {
      if (e.message.includes('灵石不足')) return;
      throw e;
    }
  });

  await test('economy:craft (pill_hp_basic)', async () => {
    const data = await emitAndWait<any>('economy:craft', { recipeId: 'pill_hp_basic', buffMultiplier: 1.0 });
    console.log(`    Craft: success=${data.success}, msg=${data.message}`);
  });

  await test('economy:recipes list', async () => {
    const data = await emitAndWait<any>('economy:recipes');
    console.log(`    Recipes: ${data.length} total`);
  });

  // --- Cultivation Tests ---
  console.log('\n--- Cultivation ---');
  await test('cultivation:status', async () => {
    const data = await emitAndWait<any>('cultivation:status');
    console.log(`    Realm: ${data.realmName}, exp: ${data.cultivation}/${data.maxCultivation}, stones: ${data.spiritStones}`);
  });

  await test('cultivation:cultivate', async () => {
    const data = await emitAndWait<any>('cultivation:cultivate');
    console.log(`    Cultivated! +${data.expGained} exp, total: ${data.cultivation}/${data.maxCultivation}`);
  });

  // --- Technique Tests ---
  console.log('\n--- Techniques ---');
  await test('technique:status', async () => {
    const data = await emitAndWait<any>('technique:status');
    console.log(`    Learned: ${data.learned.length}, available: ${data.available.length}`);
  });

  await test('technique:learn (basic_stance)', async () => {
    const data = await emitAndWait<any>('technique:learn', { techniqueId: 'basic_stance' });
    console.log(`    Learned ${data.name} lv${data.level}, spent ${data.spiritStonesSpent} stones`);
  });

  await test('technique:levelup (basic_stance)', async () => {
    const data = await emitAndWait<any>('technique:levelup', { techniqueId: 'basic_stance' });
    console.log(`    Upgraded ${data.name} to lv${data.newLevel}, spent ${data.spiritStonesSpent} stones`);
  });

  // --- Diplomacy Tests ---
  console.log('\n--- Diplomacy ---');
  await test('diplomacy:status', async () => {
    const data = await emitAndWait<any>('diplomacy:status');
    console.log(`    Relations: ${data.relationships.length}, clan: ${data.currentClan}`);
  });

  // --- Resource Tests ---
  console.log('\n--- Resources ---');
  await test('resource:gather (灵田)', async () => {
    const data = await emitAndWait<any>('resource:gather', { resourceType: '灵田' });
    console.log(`    Gathered: +${data.expGained} exp, ${data.materials.length} material types`);
    for (const m of data.materials) console.log(`      ${m.name} x${m.count}`);
  });

  await test('resource:gather (矿脉)', async () => {
    const data = await emitAndWait<any>('resource:gather', { resourceType: '矿脉' });
    console.log(`    Gathered: +${data.spiritStonesGained} stones, ${data.materials.length} material types`);
  });

  await test('resource:gather (遗迹)', async () => {
    const data = await emitAndWait<any>('resource:gather', { resourceType: '遗迹' });
    console.log(`    Gathered: +${data.spiritStonesGained} stones, ${data.materials.length} material types`);
  });

  // --- Save/Load Tests ---
  console.log('\n--- Save/Load ---');
  await test('save:list', async () => {
    const data = await emitAndWait<any>('save:list');
    console.log(`    Slots: ${data.length}`);
  });

  await test('save:save slot 1', async () => {
    const data = await emitAndWait<any>('save:save', {
      slot: 1,
      gameState: { player: { name: '测试修士', realm: '凡人' }, clans: [] },
      playerName: '测试修士',
      playerRealm: '凡人',
      heavenLevel: 9,
    });
    console.log(`    Saved to slot ${data.slot}`);
  });

  await test('save:load slot 1', async () => {
    const data = await emitAndWait<any>('save:load', { slot: 1 });
    console.log(`    Loaded: ${data.meta.playerName}, realm: ${data.meta.playerRealm}`);
  });

  // --- State Sync Test ---
  console.log('\n--- State Sync ---');
  await test('state:sync received', async () => {
    const sync = await new Promise<any>((resolve) => {
      socket.once('state:sync', resolve);
    });
    console.log(`    Player HP: ${sync.player.health}/${sync.player.maxHealth}, stones: ${sync.player.spiritStones}`);
    console.log(`    Monsters: ${sync.nearbyMonsters.length}, combat events: ${sync.combatEvents.length}`);
  });

  // --- Combat Test ---
  console.log('\n--- Combat ---');
  // Wait for a monster to spawn
  let monsterId: string | null = null;
  for (let i = 0; i < 20; i++) {
    const sync = await new Promise<any>((resolve) => {
      socket.once('state:sync', resolve);
    });
    if (sync.nearbyMonsters.length > 0) {
      monsterId = sync.nearbyMonsters[0].id;
      console.log(`    Monster spawned: ${sync.nearbyMonsters[0].name} (HP: ${sync.nearbyMonsters[0].hp})`);
      break;
    }
    await new Promise(r => setTimeout(r, 1100));
  }

  if (monsterId) {
    await test('combat:attack monster', async () => {
      const data = await emitAndWait<any>('combat:attack', { targetId: monsterId, targetKind: 'monster' });
      console.log(`    Hit! damage=${data.damage}, targetHp=${data.targetHp}, killed=${data.killed}`);
    });
  } else {
    console.log('    (No monster spawned within 20s — expected with 15% spawn chance)');
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  socket.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

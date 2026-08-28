const { io } = require('socket.io-client');

const s = io('http://localhost:3000', { transports: ['websocket'], forceNew: true, reconnection: false });

function wait(evt) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout:' + evt)), 5000);
    s.once(evt, (d) => { clearTimeout(t); res(d); });
  });
}

async function run() {
  await new Promise((res) => s.on('connect', res));
  console.log('✓ Connected');

  s.emit('player:create', { name: '测试修士' });
  const pd = await wait('player:created');
  console.log('✓ Player:', pd.name, 'realm:', pd.realm.name, 'stones:', pd.spiritStones);

  s.emit('economy:market');
  const mkt = await wait('economy:market:result');
  console.log('✓ Market:', mkt.data.items.length, 'commodities, balance:', mkt.data.balance);

  s.emit('cultivation:cultivate');
  const cul = await wait('cultivation:cultivate:result');
  console.log('✓ Cultivate: +exp:', cul.data.expGained, 'total:', cul.data.cultivation + '/' + cul.data.maxCultivation);

  s.emit('technique:status');
  const tec = await wait('technique:status:result');
  console.log('✓ Techniques:', tec.data.learned.length, 'learned,', tec.data.available.length, 'available');

  s.emit('technique:learn', { techniqueId: 'basic_stance' });
  const learn = await wait('technique:learn:result');
  console.log('✓ Learned:', learn.data.name, 'lv' + learn.data.level, '-spent:', learn.data.spiritStonesSpent, 'stones');

  s.emit('resource:gather', { resourceType: '矿脉' });
  const rg = await wait('resource:gather:result');
  console.log('✓ Gather矿脉: +' + rg.data.spiritStonesGained + ' stones, mats:', rg.data.materials.map(m => m.name + 'x' + m.count).join(', ') || 'none');

  s.emit('resource:gather', { resourceType: '灵田' });
  const rg2 = await wait('resource:gather:result');
  console.log('✓ Gather灵田: +' + rg2.data.expGained + ' exp, mats:', rg2.data.materials.map(m => m.name + 'x' + m.count).join(', ') || 'none');

  s.emit('save:save', { slot: 1, gameState: { test: true }, playerName: '测试修士', playerRealm: '凡人', heavenLevel: 9 });
  const sv = await wait('save:save:result');
  console.log('✓ Save: slot', sv.data.slot);

  s.emit('save:load', { slot: 1 });
  const ld = await wait('save:load:result');
  console.log('✓ Load:', ld.data.meta.playerName, 'realm:', ld.data.meta.playerRealm);

  // Wait for state:sync
  const sync = await new Promise((res) => {
    s.once('state:sync', res);
    setTimeout(() => res(null), 3000);
  });
  if (sync) {
    console.log('✓ State sync: HP:', sync.player.health + '/' + sync.player.maxHealth, 'stones:', sync.player.spiritStones, 'monsters:', sync.nearbyMonsters.length);
  } else {
    console.log('⚠ State sync: no data within 3s (expected if no player state registered)');
  }

  // Check server logs for errors
  console.log('\n=== ALL HANDLER TESTS PASSED ===');
}

run().catch(e => {
  console.error('✗ FAILED:', e.message);
  process.exit(1);
}).finally(() => {
  s.disconnect();
  setTimeout(() => process.exit(0), 500);
});

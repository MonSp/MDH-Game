/**
 * Server-Authoritative Handler Benchmark
 *
 * Measures latency (p50/p95/p99) and throughput for each socket handler.
 * Run: npx vitest run test/server-benchmark.test.ts
 * Requires: server running on localhost:3000
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';
const WARMUP = 5;
const ITERATIONS = 50;

let socket: Socket;
let serverAvailable = false;

function emitAndWait<T>(event: string, data?: unknown): Promise<{ success: boolean; data?: T; error?: string; latencyMs: number }> {
  const start = performance.now();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ success: false, error: 'timeout', latencyMs: performance.now() - start }), 5000);
    socket.once(`${event}:result`, (res: any) => {
      clearTimeout(timer);
      resolve({ ...res, latencyMs: performance.now() - start });
    });
    if (data !== undefined) socket.emit(event, data);
    else socket.emit(event);
  });
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(latencies: number[]): { p50: number; p95: number; p99: number; min: number; max: number; avg: number; opsPerSec: number } {
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    p50: +percentile(sorted, 50).toFixed(2),
    p95: +percentile(sorted, 95).toFixed(2),
    p99: +percentile(sorted, 99).toFixed(2),
    min: +sorted[0].toFixed(2),
    max: +sorted[sorted.length - 1].toFixed(2),
    avg: +avg.toFixed(2),
    opsPerSec: +(1000 / avg).toFixed(0),
  };
}

async function bench(name: string, fn: () => Promise<void>, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) await fn();

  const latencies: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    latencies.push(performance.now() - start);
  }

  const s = stats(latencies);
  console.log(`  ${name.padEnd(30)} p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  avg=${s.avg}ms  ops/s=${s.opsPerSec}`);
  return s;
}

beforeAll(async () => {
  try {
    socket = io(SERVER_URL, { transports: ['polling', 'websocket'], forceNew: true, reconnection: false });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 3000);
      socket.on('connect', () => { clearTimeout(t); resolve(); });
      socket.on('connect_error', () => { clearTimeout(t); reject(new Error('no server')); });
    });
    serverAvailable = true;

    // Register player
    socket.emit('player:create', { name: 'Benchmark' });
    await new Promise<void>((resolve) => {
      socket.once('player:created', () => resolve());
    });
  } catch {
    serverAvailable = false;
    console.warn('[Bench] Server not available — skipping benchmarks');
  }
});

afterAll(() => {
  if (socket?.connected) socket.disconnect();
});

describe('Handler Latency Benchmarks', () => {
  it('economy:market', async () => {
    if (!serverAvailable) return;
    await bench('economy:market', async () => {
      await emitAndWait('economy:market');
    });
  });

  it('economy:inventory', async () => {
    if (!serverAvailable) return;
    await bench('economy:inventory', async () => {
      await emitAndWait('economy:inventory');
    });
  });

  it('economy:buy (reject path)', async () => {
    if (!serverAvailable) return;
    await bench('economy:buy (reject)', async () => {
      await emitAndWait('economy:buy', { itemId: 'WashMarrowPill', quantity: 1 });
    });
  });

  it('resource:gather (灵田)', async () => {
    if (!serverAvailable) return;
    await bench('resource:gather (灵田)', async () => {
      await emitAndWait('resource:gather', { resourceType: '灵田' });
    });
  });

  it('resource:gather (矿脉)', async () => {
    if (!serverAvailable) return;
    await bench('resource:gather (矿脉)', async () => {
      await emitAndWait('resource:gather', { resourceType: '矿脉' });
    });
  });

  it('resource:gather (遗迹)', async () => {
    if (!serverAvailable) return;
    await bench('resource:gather (遗迹)', async () => {
      await emitAndWait('resource:gather', { resourceType: '遗迹' });
    });
  });

  it('cultivation:cultivate', async () => {
    if (!serverAvailable) return;
    await bench('cultivation:cultivate', async () => {
      await emitAndWait('cultivation:cultivate');
    });
  });

  it('cultivation:status', async () => {
    if (!serverAvailable) return;
    await bench('cultivation:status', async () => {
      await emitAndWait('cultivation:status');
    });
  });

  it('technique:status', async () => {
    if (!serverAvailable) return;
    await bench('technique:status', async () => {
      await emitAndWait('technique:status');
    });
  });

  it('economy:recipes', async () => {
    if (!serverAvailable) return;
    await bench('economy:recipes', async () => {
      await emitAndWait('economy:recipes');
    });
  });

  it('economy:craft (reject path)', async () => {
    if (!serverAvailable) return;
    await bench('economy:craft (reject)', async () => {
      await emitAndWait('economy:craft', { recipeId: 'pill_hp_basic' });
    });
  });

  it('save:save + save:load roundtrip', async () => {
    if (!serverAvailable) return;
    let slot = 0;
    await bench('save roundtrip', async () => {
      slot = (slot % 5) + 1;
      await emitAndWait('save:save', { slot, gameState: { tick: Date.now() }, playerName: 'Bench', playerRealm: '凡人', heavenLevel: 9 });
      await emitAndWait('save:load', { slot });
    }, 25);
  });

  it('state:sync latency (server push)', { timeout: 120000 }, async () => {
    if (!serverAvailable) return;
    const latencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 2000);
        socket.once('state:sync', () => {
          clearTimeout(t);
          latencies.push(performance.now() - start);
          resolve();
        });
      });
    }
    if (latencies.length === 0) {
      console.log('  state:sync (push): no events received');
      return;
    }
    const s = stats(latencies);
    console.log(`  ${'state:sync (push)'.padEnd(30)} p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  avg=${s.avg}ms  n=${latencies.length}`);
  });
});

describe('Throughput — Concurrent Load', () => {
  it('handles 20 concurrent economy:market requests', async () => {
    if (!serverAvailable) return;
    const start = performance.now();
    const promises = Array.from({ length: 20 }, () => emitAndWait('economy:market'));
    const results = await Promise.all(promises);
    const elapsed = performance.now() - start;
    const allOk = results.every(r => r.success);
    console.log(`  20x economy:market:    ${elapsed.toFixed(0)}ms total, ${(elapsed / 20).toFixed(1)}ms avg, all=${allOk}`);
    if (!allOk) console.log('  ⚠ Some requests failed:', results.filter(r => !r.success).map(r => r.error));
  });

  it('handles 20 concurrent resource:gather requests', async () => {
    if (!serverAvailable) return;
    const start = performance.now();
    const promises = Array.from({ length: 20 }, () => emitAndWait('resource:gather', { resourceType: '矿脉' }));
    const results = await Promise.all(promises);
    const elapsed = performance.now() - start;
    const allOk = results.every(r => r.success);
    console.log(`  20x resource:gather:   ${elapsed.toFixed(0)}ms total, ${(elapsed / 20).toFixed(1)}ms avg, all=${allOk}`);
    if (!allOk) console.log('  ⚠ Some requests failed:', results.filter(r => !r.success).map(r => r.error));
  });

  it('handles 20 concurrent cultivate requests', async () => {
    if (!serverAvailable) return;
    const start = performance.now();
    const promises = Array.from({ length: 20 }, () => emitAndWait('cultivation:cultivate'));
    const results = await Promise.all(promises);
    const elapsed = performance.now() - start;
    const allOk = results.every(r => r.success);
    console.log(`  20x cultivation:       ${elapsed.toFixed(0)}ms total, ${(elapsed / 20).toFixed(1)}ms avg, all=${allOk}`);
  });
});

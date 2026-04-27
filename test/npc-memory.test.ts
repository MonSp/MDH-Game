import { describe, it, expect } from 'vitest';
import {
  NPCRelationshipMatrix,
  NPCInteractionRingBuffer,
  NPCWitnessedEvents,
  NPCMemoryStore,
} from '../src/server/llm/NPCMemory';

// =============================================================
// NPCRelationshipMatrix
// =============================================================
describe('NPCRelationshipMatrix', () => {
  it('returns 0 for non-existent relationship', () => {
    const m = new NPCRelationshipMatrix();
    expect(m.get('npc_a', 'npc_b')).toBe(0);
  });

  it('set and get a relationship', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 50);
    expect(m.get('npc_a', 'npc_b')).toBe(50);
  });

  it('get is directional — reverse pair returns 0', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 50);
    expect(m.get('npc_b', 'npc_a')).toBe(0);
  });

  it('clamps positive affinity to 100', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 150);
    expect(m.get('npc_a', 'npc_b')).toBe(100);
  });

  it('clamps negative affinity to -100', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', -150);
    expect(m.get('npc_a', 'npc_b')).toBe(-100);
  });

  it('set overwrites existing affinity', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 30);
    m.set('npc_a', 'npc_b', 60);
    expect(m.get('npc_a', 'npc_b')).toBe(60);
  });

  it('modify adds delta to current affinity', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 50);
    m.modify('npc_a', 'npc_b', 10, 'helped in battle');
    expect(m.get('npc_a', 'npc_b')).toBe(60);
  });

  it('modify clamps result to [-100, 100]', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 95);
    m.modify('npc_a', 'npc_b', 20, 'great favor');
    expect(m.get('npc_a', 'npc_b')).toBe(100);
  });

  it('modify records modifier with reason and timestamp', () => {
    const m = new NPCRelationshipMatrix();
    m.modify('npc_a', 'npc_b', 15, 'gift');
    const mods = m.getModifiers('npc_a', 'npc_b');
    expect(mods).toHaveLength(1);
    expect(mods[0].reason).toBe('gift');
    expect(mods[0].delta).toBe(15);
    expect(typeof mods[0].timestamp).toBe('number');
  });

  it('modify on non-existent pair creates entry with delta as affinity', () => {
    const m = new NPCRelationshipMatrix();
    m.modify('npc_a', 'npc_b', 25, 'first impression');
    expect(m.get('npc_a', 'npc_b')).toBe(25);
  });

  it('caps modifiers at 20 entries', () => {
    const m = new NPCRelationshipMatrix();
    for (let i = 0; i < 25; i++) {
      m.modify('npc_a', 'npc_b', 1, `event_${i}`);
    }
    const mods = m.getModifiers('npc_a', 'npc_b');
    expect(mods).toHaveLength(20);
    // Should keep the last 20 (indices 5..24)
    expect(mods[0].reason).toBe('event_5');
    expect(mods[19].reason).toBe('event_24');
  });

  it('getModifiers returns empty array for non-existent pair', () => {
    const m = new NPCRelationshipMatrix();
    expect(m.getModifiers('npc_a', 'npc_b')).toEqual([]);
  });

  it('modify creates modifier entry when pair already exists', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 30);
    m.modify('npc_a', 'npc_b', 10, 'friendly chat');
    expect(m.get('npc_a', 'npc_b')).toBe(40);
    expect(m.getModifiers('npc_a', 'npc_b')).toHaveLength(1);
  });

  it('getTopRelationships returns empty for NPC with no relationships', () => {
    const m = new NPCRelationshipMatrix();
    expect(m.getTopRelationships('npc_a', 5)).toEqual([]);
  });

  it('getTopRelationships sorts by absolute affinity descending', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 20);
    m.set('npc_a', 'npc_c', -80);
    m.set('npc_a', 'npc_d', 50);
    const top = m.getTopRelationships('npc_a', 3);
    expect(top).toHaveLength(3);
    // -80 has highest absolute value, then 50, then 20
    expect(top[0].otherId).toBe('npc_c');
    expect(top[1].otherId).toBe('npc_d');
    expect(top[2].otherId).toBe('npc_b');
  });

  it('getTopRelationships respects count parameter', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 10);
    m.set('npc_a', 'npc_c', 20);
    m.set('npc_a', 'npc_d', 30);
    expect(m.getTopRelationships('npc_a', 2)).toHaveLength(2);
  });

  it('toJSON and fromJSON round-trip', () => {
    const m = new NPCRelationshipMatrix();
    m.set('npc_a', 'npc_b', 50);
    m.set('npc_a', 'npc_c', -30);
    m.modify('npc_a', 'npc_b', 10, 'chat');

    const json = m.toJSON();
    const restored = NPCRelationshipMatrix.fromJSON(json);

    expect(restored.get('npc_a', 'npc_b')).toBe(60); // 50 + 10
    expect(restored.get('npc_a', 'npc_c')).toBe(-30);
    expect(restored.getModifiers('npc_a', 'npc_b')).toHaveLength(1);
  });

  it('fromJSON with empty object produces empty matrix', () => {
    const m = NPCRelationshipMatrix.fromJSON({});
    expect(m.get('any', 'other')).toBe(0);
  });
});

// =============================================================
// NPCInteractionRingBuffer
// =============================================================
describe('NPCInteractionRingBuffer', () => {
  it('add and getRecent', () => {
    const buf = new NPCInteractionRingBuffer();
    buf.add('npc_a', { timestamp: 100, otherNpcId: 'npc_b', type: 'chat', summary: '简单交谈', impactScore: 2 });
    const recent = buf.getRecent('npc_a', 5);
    expect(recent).toHaveLength(1);
    expect(recent[0].otherNpcId).toBe('npc_b');
    expect(recent[0].summary).toBe('简单交谈');
  });

  it('getRecent returns empty for unknown NPC', () => {
    const buf = new NPCInteractionRingBuffer();
    expect(buf.getRecent('unknown', 5)).toEqual([]);
  });

  it('getAll returns empty for unknown NPC', () => {
    const buf = new NPCInteractionRingBuffer();
    expect(buf.getAll('unknown')).toEqual([]);
  });

  it('caps interactions at 20 entries', () => {
    const buf = new NPCInteractionRingBuffer();
    for (let i = 0; i < 25; i++) {
      buf.add('npc_a', { timestamp: i, otherNpcId: 'npc_b', type: 'chat', summary: `interaction_${i}`, impactScore: 1 });
    }
    expect(buf.getAll('npc_a')).toHaveLength(20);
    // Should have last 20 (indices 5..24)
    expect(buf.getAll('npc_a')[0].summary).toBe('interaction_5');
    expect(buf.getAll('npc_a')[19].summary).toBe('interaction_24');
  });

  it('getRecent respects count parameter', () => {
    const buf = new NPCInteractionRingBuffer();
    for (let i = 0; i < 10; i++) {
      buf.add('npc_a', { timestamp: i, otherNpcId: 'npc_b', type: 'chat', summary: `interaction_${i}`, impactScore: 1 });
    }
    expect(buf.getRecent('npc_a', 3)).toHaveLength(3);
    expect(buf.getRecent('npc_a', 3)[0].summary).toBe('interaction_7');
  });

  it('toJSON and fromJSON round-trip', () => {
    const buf = new NPCInteractionRingBuffer();
    buf.add('npc_a', { timestamp: 100, otherNpcId: 'npc_b', type: 'chat', summary: '交谈', impactScore: 2 });

    const json = buf.toJSON();
    const restored = NPCInteractionRingBuffer.fromJSON(json);

    expect(restored.getAll('npc_a')).toHaveLength(1);
    expect(restored.getAll('npc_a')[0].summary).toBe('交谈');
  });

  it('fromJSON with empty object produces empty buffer', () => {
    const buf = NPCInteractionRingBuffer.fromJSON({});
    expect(buf.getAll('any')).toEqual([]);
  });
});

// =============================================================
// NPCWitnessedEvents
// =============================================================
describe('NPCWitnessedEvents', () => {
  it('add and getRecent', () => {
    const ev = new NPCWitnessedEvents();
    ev.add('npc_a', { timestamp: 100, description: '掌门举行祭祀', involvedNpcIds: ['npc_a'], location: '宗门大殿', significance: 3 });
    const recent = ev.getRecent('npc_a', 5);
    expect(recent).toHaveLength(1);
    expect(recent[0].description).toBe('掌门举行祭祀');
  });

  it('getRecent returns empty for unknown NPC', () => {
    const ev = new NPCWitnessedEvents();
    expect(ev.getRecent('unknown', 5)).toEqual([]);
  });

  it('caps witnessed events at 30 entries', () => {
    const ev = new NPCWitnessedEvents();
    for (let i = 0; i < 35; i++) {
      ev.add('npc_a', { timestamp: i, description: `event_${i}`, involvedNpcIds: ['npc_a'], location: '宗门', significance: 1 });
    }
    const recent = ev.getRecent('npc_a', 35);
    expect(recent).toHaveLength(30);
    expect(recent[0].description).toBe('event_5');
  });

  it('getRecent respects count parameter', () => {
    const ev = new NPCWitnessedEvents();
    for (let i = 0; i < 10; i++) {
      ev.add('npc_a', { timestamp: i, description: `event_${i}`, involvedNpcIds: ['npc_a'], location: '宗门', significance: 1 });
    }
    expect(ev.getRecent('npc_a', 3)).toHaveLength(3);
    expect(ev.getRecent('npc_a', 3)[0].description).toBe('event_7');
  });

  it('toJSON and fromJSON round-trip', () => {
    const ev = new NPCWitnessedEvents();
    ev.add('npc_a', { timestamp: 100, description: '祭祀', involvedNpcIds: ['npc_a'], location: '大殿', significance: 3 });

    const json = ev.toJSON();
    const restored = NPCWitnessedEvents.fromJSON(json);

    expect(restored.getRecent('npc_a', 5)).toHaveLength(1);
    expect(restored.getRecent('npc_a', 5)[0].description).toBe('祭祀');
  });

  it('fromJSON with empty object produces empty store', () => {
    const ev = NPCWitnessedEvents.fromJSON({});
    expect(ev.getRecent('any', 5)).toEqual([]);
  });
});

// =============================================================
// NPCMemoryStore
// =============================================================
describe('NPCMemoryStore', () => {
  it('constructor initializes all three sub-stores', () => {
    const store = new NPCMemoryStore();
    expect(store.relationships).toBeInstanceOf(NPCRelationshipMatrix);
    expect(store.interactions).toBeInstanceOf(NPCInteractionRingBuffer);
    expect(store.witnessedEvents).toBeInstanceOf(NPCWitnessedEvents);
  });

  it('buildMemoryContext returns empty string for empty store', () => {
    const store = new NPCMemoryStore();
    const ctx = store.buildMemoryContext('npc_a');
    expect(ctx).toBe('');
  });

  it('buildMemoryContext includes relationships when present', () => {
    const store = new NPCMemoryStore();
    store.relationships.set('npc_a', 'npc_b', 80);
    store.relationships.set('npc_a', 'npc_c', -60);

    const ctx = store.buildMemoryContext('npc_a');
    expect(ctx).toContain('重要关系');
    expect(ctx).toContain('友好');
    expect(ctx).toContain('敌对');
  });

  it('buildMemoryContext includes interactions when present', () => {
    const store = new NPCMemoryStore();
    store.interactions.add('npc_a', { timestamp: Date.now(), otherNpcId: 'npc_b', type: 'chat', summary: '交谈', impactScore: 2 });

    const ctx = store.buildMemoryContext('npc_a');
    expect(ctx).toContain('近期互动');
    expect(ctx).toContain('交谈');
  });

  it('buildMemoryContext includes witnessed events when present', () => {
    const store = new NPCMemoryStore();
    store.witnessedEvents.add('npc_a', { timestamp: Date.now(), description: '祭祀仪式', involvedNpcIds: ['npc_a'], location: '大殿', significance: 5 });

    const ctx = store.buildMemoryContext('npc_a');
    expect(ctx).toContain('见证事件');
    expect(ctx).toContain('祭祀仪式');
  });

  it('buildMemoryContext uses nameResolver when provided', () => {
    const store = new NPCMemoryStore();
    store.relationships.set('npc_a', 'npc_b', 50);
    const resolver = (id: string) => id === 'npc_b' ? '赵焰' : id;

    const ctx = store.buildMemoryContext('npc_a', resolver);
    expect(ctx).toContain('赵焰');
    expect(ctx).not.toContain('npc_b');
  });

  it('toJSON and fromJSON round-trip with full data', () => {
    const store = new NPCMemoryStore();
    store.relationships.set('npc_a', 'npc_b', 50);
    store.interactions.add('npc_a', { timestamp: 100, otherNpcId: 'npc_b', type: 'chat', summary: '交谈', impactScore: 2 });
    store.witnessedEvents.add('npc_a', { timestamp: 200, description: '祭祀', involvedNpcIds: ['npc_a'], location: '大殿', significance: 3 });

    const json = store.toJSON();
    const restored = NPCMemoryStore.fromJSON(json);

    expect(restored.relationships.get('npc_a', 'npc_b')).toBe(50);
    expect(restored.interactions.getAll('npc_a')).toHaveLength(1);
    expect(restored.witnessedEvents.getRecent('npc_a', 5)).toHaveLength(1);
  });

  it('fromJSON handles partial data gracefully', () => {
    // Only relationships, no interactions or witnessedEvents
    const restored = NPCMemoryStore.fromJSON({
      relationships: { npc_a: { npc_b: { affinity: 50, modifiers: [] } } },
    });
    expect(restored.relationships.get('npc_a', 'npc_b')).toBe(50);
    expect(restored.interactions.getAll('npc_a')).toEqual([]);
    expect(restored.witnessedEvents.getRecent('npc_a', 5)).toEqual([]);
  });

  it('fromJSON handles empty object', () => {
    const restored = NPCMemoryStore.fromJSON({});
    expect(restored.relationships.get('any', 'other')).toBe(0);
    expect(restored.interactions.getAll('any')).toEqual([]);
  });
});

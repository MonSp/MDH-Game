// NPC Memory Data Model
//
// Three structures per design doc:
// 1. NPCRelationshipMatrix — 50x50 sparse matrix, -100 to +100 affinity
// 2. NPCInteractionRingBuffer — per-NPC last 20 interactions
// 3. NPCWitnessedEvents — per-NPC ring buffer of witnessed events

export interface RelationshipModifier {
  reason: string;
  delta: number;
  timestamp: number;
}

export interface RelationshipEntry {
  affinity: number; // -100 to +100
  modifiers: RelationshipModifier[]; // visible reasons for affinity changes
}

export interface Interaction {
  timestamp: number;
  otherNpcId: string;
  type: string;
  summary: string;
  impactScore: number;
}

export interface WitnessedEvent {
  timestamp: number;
  description: string;
  involvedNpcIds: string[];
  location: string;
  significance: number; // 0-10
}

const MAX_INTERACTIONS = 20;
const MAX_WITNESSED = 30;

export class NPCRelationshipMatrix {
  private matrix: Map<string, Map<string, RelationshipEntry>> = new Map();

  get(from: string, to: string): number {
    return this.matrix.get(from)?.get(to)?.affinity ?? 0;
  }

  set(from: string, to: string, affinity: number): void {
    const clamped = Math.max(-100, Math.min(100, affinity));
    if (!this.matrix.has(from)) {
      this.matrix.set(from, new Map());
    }
    const row = this.matrix.get(from)!;
    if (!row.has(to)) {
      row.set(to, { affinity: clamped, modifiers: [] });
    } else {
      row.get(to)!.affinity = clamped;
    }
  }

  modify(from: string, to: string, delta: number, reason: string): void {
    const current = this.get(from, to);
    const newAffinity = Math.max(-100, Math.min(100, current + delta));

    if (!this.matrix.has(from)) {
      this.matrix.set(from, new Map());
    }
    const row = this.matrix.get(from)!;
    if (!row.has(to)) {
      row.set(to, { affinity: newAffinity, modifiers: [] });
    }
    const entry = row.get(to)!;
    entry.affinity = newAffinity;
    entry.modifiers.push({
      reason,
      delta,
      timestamp: Date.now(),
    });
    // Keep only last 20 modifiers
    if (entry.modifiers.length > 20) {
      entry.modifiers = entry.modifiers.slice(-20);
    }
  }

  getModifiers(from: string, to: string): RelationshipModifier[] {
    return this.matrix.get(from)?.get(to)?.modifiers ?? [];
  }

  getTopRelationships(npcId: string, count: number): Array<{ otherId: string; affinity: number }> {
    const row = this.matrix.get(npcId);
    if (!row) return [];
    return Array.from(row.entries())
      .map(([otherId, entry]) => ({ otherId, affinity: entry.affinity }))
      .sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity))
      .slice(0, count);
  }

  toJSON(): Record<string, Record<string, RelationshipEntry>> {
    const result: Record<string, Record<string, RelationshipEntry>> = {};
    for (const [from, row] of this.matrix) {
      result[from] = {};
      for (const [to, entry] of row) {
        result[from][to] = entry;
      }
    }
    return result;
  }

  static fromJSON(json: Record<string, Record<string, RelationshipEntry>>): NPCRelationshipMatrix {
    const mat = new NPCRelationshipMatrix();
    for (const [from, row] of Object.entries(json)) {
      mat.matrix.set(from, new Map(Object.entries(row)));
    }
    return mat;
  }
}

export class NPCInteractionRingBuffer {
  private interactions: Map<string, Interaction[]> = new Map();

  add(npcId: string, interaction: Interaction): void {
    if (!this.interactions.has(npcId)) {
      this.interactions.set(npcId, []);
    }
    const list = this.interactions.get(npcId)!;
    list.push(interaction);
    if (list.length > MAX_INTERACTIONS) {
      list.shift();
    }
  }

  getRecent(npcId: string, count: number): Interaction[] {
    const list = this.interactions.get(npcId);
    if (!list) return [];
    return list.slice(-count);
  }

  getAll(npcId: string): Interaction[] {
    return this.interactions.get(npcId) ?? [];
  }

  toJSON(): Record<string, Interaction[]> {
    return Object.fromEntries(this.interactions);
  }

  static fromJSON(json: Record<string, Interaction[]>): NPCInteractionRingBuffer {
    const buf = new NPCInteractionRingBuffer();
    buf.interactions = new Map(Object.entries(json));
    return buf;
  }
}

export class NPCWitnessedEvents {
  private events: Map<string, WitnessedEvent[]> = new Map();

  add(npcId: string, event: WitnessedEvent): void {
    if (!this.events.has(npcId)) {
      this.events.set(npcId, []);
    }
    const list = this.events.get(npcId)!;
    list.push(event);
    if (list.length > MAX_WITNESSED) {
      list.shift();
    }
  }

  getRecent(npcId: string, count: number): WitnessedEvent[] {
    const list = this.events.get(npcId);
    if (!list) return [];
    return list.slice(-count);
  }

  toJSON(): Record<string, WitnessedEvent[]> {
    return Object.fromEntries(this.events);
  }

  static fromJSON(json: Record<string, WitnessedEvent[]>): NPCWitnessedEvents {
    const ev = new NPCWitnessedEvents();
    ev.events = new Map(Object.entries(json));
    return ev;
  }
}

export class NPCMemoryStore {
  relationships: NPCRelationshipMatrix;
  interactions: NPCInteractionRingBuffer;
  witnessedEvents: NPCWitnessedEvents;

  constructor() {
    this.relationships = new NPCRelationshipMatrix();
    this.interactions = new NPCInteractionRingBuffer();
    this.witnessedEvents = new NPCWitnessedEvents();
  }

  /**
   * Build the memory context string for LLM prompt injection.
   * Design doc budget: ~1,500 tokens per NPC.
   */
  buildMemoryContext(npcId: string): string {
    const parts: string[] = [];

    // Top 5 relationships
    const topRel = this.relationships.getTopRelationships(npcId, 5);
    if (topRel.length > 0) {
      parts.push('重要关系:');
      for (const rel of topRel) {
        const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
        parts.push(`  - ${rel.otherId}: ${label} (好感度 ${rel.affinity})`);
      }
    }

    // Last 5 interactions
    const recentInt = this.interactions.getRecent(npcId, 5);
    if (recentInt.length > 0) {
      parts.push('近期互动:');
      for (const int of recentInt) {
        parts.push(`  - [${new Date(int.timestamp).toLocaleTimeString()}] 与 ${int.otherNpcId}: ${int.summary}`);
      }
    }

    // Last 3 witnessed events
    const recentEv = this.witnessedEvents.getRecent(npcId, 3);
    if (recentEv.length > 0) {
      parts.push('见证事件:');
      for (const ev of recentEv) {
        parts.push(`  - ${ev.description}`);
      }
    }

    return parts.join('\n');
  }

  toJSON(): object {
    return {
      relationships: this.relationships.toJSON(),
      interactions: this.interactions.toJSON(),
      witnessedEvents: this.witnessedEvents.toJSON(),
    };
  }

  static fromJSON(json: any): NPCMemoryStore {
    const store = new NPCMemoryStore();
    if (json.relationships) {
      store.relationships = NPCRelationshipMatrix.fromJSON(json.relationships);
    }
    if (json.interactions) {
      store.interactions = NPCInteractionRingBuffer.fromJSON(json.interactions);
    }
    if (json.witnessedEvents) {
      store.witnessedEvents = NPCWitnessedEvents.fromJSON(json.witnessedEvents);
    }
    return store;
  }
}

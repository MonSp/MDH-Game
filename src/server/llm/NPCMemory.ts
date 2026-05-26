import { CommandStatus, CommandMemoryEntry } from '../../shared/types/LLMPlanning';

// NPC Memory Data Model
//
// Three structures per design doc:
// 1. NPCRelationshipMatrix — 50x50 sparse matrix, -100 to +100 affinity
// 2. NPCInteractionRingBuffer — per-NPC last 20 interactions
// 3. NPCWitnessedEvents — per-NPC ring buffer of witnessed events
// 4. CommandMemoryRingBuffer — per-NPC last 30 command history entries

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
const MAX_COMMAND_MEMORY = 30;

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

export class CommandMemoryRingBuffer {
  private entries: Map<string, CommandMemoryEntry[]> = new Map();

  add(npcId: string, entry: CommandMemoryEntry): void {
    if (!this.entries.has(npcId)) {
      this.entries.set(npcId, []);
    }
    const list = this.entries.get(npcId)!;
    list.push(entry);
    if (list.length > MAX_COMMAND_MEMORY) {
      list.shift();
    }
  }

  getRecent(npcId: string, count: number): CommandMemoryEntry[] {
    const list = this.entries.get(npcId);
    if (!list) return [];
    return list.slice(-count);
  }

  getByIssuer(npcId: string, issuerId: string): CommandMemoryEntry[] {
    const list = this.entries.get(npcId);
    if (!list) return [];
    return list.filter((e) => e.issuer_id === issuerId);
  }

  getConsecutiveFailures(npcId: string, issuerId: string): number {
    const list = this.entries.get(npcId);
    if (!list) return 0;
    const filtered = list.filter((e) => e.issuer_id === issuerId);
    let consecutive = 0;
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (filtered[i].result === CommandStatus.FAILED || filtered[i].result === CommandStatus.REFUSED) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  getOverachieveCount(npcId: string, issuerId: string): number {
    const list = this.entries.get(npcId);
    if (!list) return 0;
    return list.filter(
      (e) => e.issuer_id === issuerId && e.result === CommandStatus.COMPLETED && e.emotion_tag === 'overachieve'
    ).length;
  }

  toJSON(): Record<string, CommandMemoryEntry[]> {
    return Object.fromEntries(this.entries);
  }

  static fromJSON(json: Record<string, CommandMemoryEntry[]>): CommandMemoryRingBuffer {
    const buf = new CommandMemoryRingBuffer();
    buf.entries = new Map(Object.entries(json));
    return buf;
  }
}

export class NPCMemoryStore {
  relationships: NPCRelationshipMatrix;
  interactions: NPCInteractionRingBuffer;
  witnessedEvents: NPCWitnessedEvents;
  commandMemory: CommandMemoryRingBuffer;

  constructor() {
    this.relationships = new NPCRelationshipMatrix();
    this.interactions = new NPCInteractionRingBuffer();
    this.witnessedEvents = new NPCWitnessedEvents();
    this.commandMemory = new CommandMemoryRingBuffer();
  }

  getCommandInfluence(npcId: string, issuerId: string): number {
    const failures = this.commandMemory.getConsecutiveFailures(npcId, issuerId);
    if (failures >= 3) {
      return -25;
    }
    const overachieve = this.commandMemory.getOverachieveCount(npcId, issuerId);
    if (overachieve > 0) {
      return Math.min(overachieve * 10, 40);
    }
    return 0;
  }

  updateCommandMemory(
    npcId: string,
    issuerId: string,
    commandId: string,
    result: CommandStatus,
    emotionTag: string,
  ): void {
    const entry: CommandMemoryEntry = {
      issuer_id: issuerId,
      command_id: commandId,
      result,
      emotion_tag: emotionTag,
      timestamp: Date.now(),
      influence: 0,
    };

    this.commandMemory.add(npcId, entry);

    const failures = this.commandMemory.getConsecutiveFailures(npcId, issuerId);
    const isOverachieve = result === CommandStatus.COMPLETED && emotionTag === 'overachieve';

    if (failures >= 3) {
      this.relationships.modify(npcId, issuerId, -25, `连续拒绝/失败命令 (${failures}次)`);
    }

    if (isOverachieve) {
      const overachieveCount = this.commandMemory.getOverachieveCount(npcId, issuerId);
      const influence = Math.min(overachieveCount * 10, 40);
      this.relationships.modify(npcId, issuerId, influence, `超额完成任务 (第${overachieveCount}次)`);
    }
  }

  /**
   * Build the memory context string for LLM prompt injection.
   * Design doc budget: ~1,500 tokens per NPC.
   * @param nameResolver optional function to convert NPC IDs to display names
   */
  buildMemoryContext(npcId: string, nameResolver?: (id: string) => string): string {
    const parts: string[] = [];

    // Top 5 relationships
    const topRel = this.relationships.getTopRelationships(npcId, 5);
    if (topRel.length > 0) {
      parts.push('重要关系:');
      for (const rel of topRel) {
        const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
        const displayName = nameResolver ? nameResolver(rel.otherId) : rel.otherId;
        const mods = this.relationships.getModifiers(npcId, rel.otherId);
        const reason = mods.length > 0 ? mods[mods.length - 1].reason : '';
        parts.push(`  - ${displayName}: ${label} (好感度 ${rel.affinity})${reason ? ` — ${reason}` : ''}`);
      }
    }

    // Last 5 interactions
    const recentInt = this.interactions.getRecent(npcId, 5);
    if (recentInt.length > 0) {
      parts.push('近期互动:');
      for (const int of recentInt) {
        const displayName = nameResolver ? nameResolver(int.otherNpcId) : int.otherNpcId;
        parts.push(`  - [${new Date(int.timestamp).toLocaleTimeString()}] 与 ${displayName}: ${int.summary}`);
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

    // Last 3 command memories
    const recentCmd = this.commandMemory.getRecent(npcId, 3);
    if (recentCmd.length > 0) {
      parts.push('近期命令记录:');
      for (const cmd of recentCmd) {
        const issuerName = nameResolver ? nameResolver(cmd.issuer_id) : cmd.issuer_id;
        const statusLabel =
          cmd.result === CommandStatus.COMPLETED ? '已完成' :
          cmd.result === CommandStatus.FAILED ? '失败' :
          cmd.result === CommandStatus.REFUSED ? '已拒绝' :
          cmd.result;
        parts.push(`  - 来自 ${issuerName}: ${statusLabel}${cmd.emotion_tag ? ` (${cmd.emotion_tag})` : ''}`);
      }
    }

    return parts.join('\n');
  }

  toJSON(): object {
    return {
      relationships: this.relationships.toJSON(),
      interactions: this.interactions.toJSON(),
      witnessedEvents: this.witnessedEvents.toJSON(),
      commandMemory: this.commandMemory.toJSON(),
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
    if (json.commandMemory) {
      store.commandMemory = CommandMemoryRingBuffer.fromJSON(json.commandMemory);
    }
    return store;
  }
}

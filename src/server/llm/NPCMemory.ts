import { CommandStatus } from '../../shared/types/LLMPlanning';

import {
  wasmGetTopRelationships,
  wasmGetRecentInteractions,
  wasmGetCommandMemory,
  wasmGetWitnessedEvents,
  wasmGetEventString,
} from '../../ecs/ECSWasmLoader';

interface RelationshipModifier {
  reason: string;
  delta: number;
  timestamp: number;
}

interface RelationshipEntry {
  affinity: number;
  modifiers: RelationshipModifier[];
}

interface InteractionEntry {
  timestamp: number;
  otherNpcId: string;
  type: string;
  summary: string;
  impactScore: number;
}

interface WitnessedEventEntry {
  timestamp: number;
  description: string;
  involvedNpcIds: string[];
  location: string;
  significance: number;
}

export class NPCRelationshipMatrix {
  private data: Map<string, Map<string, RelationshipEntry>> = new Map();
  private static readonly MAX_MODIFIERS = 20;

  get(idA: string, idB: string): number {
    return this.data.get(idA)?.get(idB)?.affinity ?? 0;
  }

  set(idA: string, idB: string, affinity: number): void {
    if (affinity > 100) affinity = 100;
    if (affinity < -100) affinity = -100;
    if (!this.data.has(idA)) this.data.set(idA, new Map());
    const existing = this.data.get(idA)!.get(idB);
    if (existing) {
      existing.affinity = affinity;
    } else {
      this.data.get(idA)!.set(idB, { affinity, modifiers: [] });
    }
  }

  modify(idA: string, idB: string, delta: number, reason: string): void {
    if (!this.data.has(idA)) this.data.set(idA, new Map());
    const entry = this.data.get(idA)!.get(idB);
    if (entry) {
      entry.affinity = Math.max(-100, Math.min(100, entry.affinity + delta));
      entry.modifiers.push({ reason, delta, timestamp: Date.now() });
      if (entry.modifiers.length > NPCRelationshipMatrix.MAX_MODIFIERS) {
        entry.modifiers.shift();
      }
    } else {
      const clamped = Math.max(-100, Math.min(100, delta));
      this.data.get(idA)!.set(idB, {
        affinity: clamped,
        modifiers: [{ reason, delta, timestamp: Date.now() }],
      });
    }
  }

  getModifiers(idA: string, idB: string): RelationshipModifier[] {
    return this.data.get(idA)?.get(idB)?.modifiers ?? [];
  }

  getTopRelationships(npcId: string, count: number): Array<{ otherId: string; affinity: number }> {
    const results: Array<{ otherId: string; affinity: number }> = [];
    const inner = this.data.get(npcId);
    if (inner) {
      for (const [otherId, entry] of inner) {
        results.push({ otherId, affinity: entry.affinity });
      }
    }
    results.sort((x, y) => Math.abs(y.affinity) - Math.abs(x.affinity));
    return results.slice(0, count);
  }

  toJSON(): any {
    const obj: any = {};
    for (const [a, inner] of this.data) {
      obj[a] = {};
      for (const [b, entry] of inner) {
        obj[a][b] = { affinity: entry.affinity, modifiers: [...entry.modifiers] };
      }
    }
    return obj;
  }

  static fromJSON(json: any): NPCRelationshipMatrix {
    const m = new NPCRelationshipMatrix();
    if (!json) return m;
    for (const [a, inner] of Object.entries(json)) {
      for (const [b, entry] of Object.entries(inner as any)) {
        const e = entry as any;
        m.data.set(a, m.data.get(a) ?? new Map());
        m.data.get(a)!.set(b, {
          affinity: e.affinity ?? 0,
          modifiers: e.modifiers ?? [],
        });
      }
    }
    return m;
  }
}

export class NPCInteractionRingBuffer {
  private data: Map<string, InteractionEntry[]> = new Map();
  private static readonly MAX_SIZE = 20;

  add(npcId: string, entry: InteractionEntry): void {
    if (!this.data.has(npcId)) this.data.set(npcId, []);
    const arr = this.data.get(npcId)!;
    arr.push(entry);
    if (arr.length > NPCInteractionRingBuffer.MAX_SIZE) arr.shift();
  }

  getRecent(npcId: string, count: number): InteractionEntry[] {
    const arr = this.data.get(npcId) ?? [];
    return arr.slice(-count);
  }

  getAll(npcId: string): InteractionEntry[] {
    return this.data.get(npcId) ?? [];
  }

  toJSON(): any {
    const obj: any = {};
    for (const [k, v] of this.data) {
      obj[k] = [...v];
    }
    return obj;
  }

  static fromJSON(json: any): NPCInteractionRingBuffer {
    const buf = new NPCInteractionRingBuffer();
    if (!json) return buf;
    for (const [k, v] of Object.entries(json)) {
      buf.data.set(k, [...(v as InteractionEntry[])]);
    }
    return buf;
  }
}

export class NPCWitnessedEvents {
  private data: Map<string, WitnessedEventEntry[]> = new Map();
  private static readonly MAX_SIZE = 30;

  add(npcId: string, entry: WitnessedEventEntry): void {
    if (!this.data.has(npcId)) this.data.set(npcId, []);
    const arr = this.data.get(npcId)!;
    arr.push(entry);
    if (arr.length > NPCWitnessedEvents.MAX_SIZE) arr.shift();
  }

  getRecent(npcId: string, count: number): WitnessedEventEntry[] {
    const arr = this.data.get(npcId) ?? [];
    return arr.slice(-count);
  }

  toJSON(): any {
    const obj: any = {};
    for (const [k, v] of this.data) {
      obj[k] = [...v];
    }
    return obj;
  }

  static fromJSON(json: any): NPCWitnessedEvents {
    const ev = new NPCWitnessedEvents();
    if (!json) return ev;
    for (const [k, v] of Object.entries(json)) {
      ev.data.set(k, [...(v as WitnessedEventEntry[])]);
    }
    return ev;
  }
}

export class NPCMemoryStore {
  private slotMap: Map<string, number> = new Map();
  readonly relationships: NPCRelationshipMatrix = new NPCRelationshipMatrix();
  readonly interactions: NPCInteractionRingBuffer = new NPCInteractionRingBuffer();
  readonly witnessedEvents: NPCWitnessedEvents = new NPCWitnessedEvents();

  constructor() {}

  registerSlot(npcId: string, slot: number): void {
    this.slotMap.set(npcId, slot);
  }

  resolveSlot(npcId: string): number {
    return this.slotMap.get(npcId) ?? -1;
  }

  updateCommandMemory(npcId: string, issuerId: string, commandId: string, result: CommandStatus, emotionTag: string = ''): void {
    const impactScore = result === CommandStatus.COMPLETED ? 2 :
                        result === CommandStatus.FAILED ? -5 :
                        result === CommandStatus.REFUSED ? -8 : 0;
    this.interactions.add(npcId, {
      timestamp: Date.now(),
      otherNpcId: issuerId,
      type: 'command',
      summary: `命令${commandId}: ${result}${emotionTag ? ` (${emotionTag})` : ''}`,
      impactScore,
    });
  }

  getCommandInfluence(npcId: string, issuerId: string): number {
    const slot = this.resolveSlot(npcId);
    const issuerSlot = this.resolveSlot(issuerId);
    if (slot < 0 || issuerSlot < 0) return 0;
    const cmds = wasmGetCommandMemory(slot, 30);
    let consecutive = 0;
    for (const c of cmds) {
      if (c.issuerSlot !== issuerSlot) continue;
      if (c.result === 2 || c.result === 3) { consecutive++; }
      else break;
    }
    if (consecutive >= 3) return -25;
    const overachieve = cmds.filter(
      c => c.issuerSlot === issuerSlot && c.result === 0 && c.emotionTag === 1
    ).length;
    if (overachieve > 0) return Math.min(overachieve * 10, 40);
    return 0;
  }

  buildMemoryContext(npcId: string, nameResolver?: (slotOrId: number | string) => string): string {
    const slot = this.resolveSlot(npcId);
    const resolve = (s: number | string): string => {
      if (nameResolver) return nameResolver(s);
      return typeof s === 'number' ? `NPC#${s}` : s;
    };

    const parts: string[] = [];

    if (slot >= 0) {
      const topRel = wasmGetTopRelationships(slot, 5);
      if (topRel.length > 0) {
        parts.push('## 重要关系');
        for (const rel of topRel) {
          const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
          parts.push(`  - ${resolve(rel.targetSlot)}: ${label} (好感度 ${rel.affinity})`);
        }
      }

      const recentInt = wasmGetRecentInteractions(slot, 20);
      if (recentInt.length > 0) {
        parts.push('## 近期互动');
        for (const int of recentInt) {
          const timeStr = new Date(int.timestamp).toLocaleTimeString();
          parts.push(`  - [${timeStr}] 与 ${resolve(int.otherSlot)}: ${int.typeName}`);
        }
      }

      const recentEv = wasmGetWitnessedEvents(slot, 30);
      if (recentEv.length > 0) {
        parts.push('## 见证事件');
        for (const ev of recentEv) {
          const desc = wasmGetEventString(ev.eventIndex);
          if (desc) parts.push(`  - ${desc}`);
        }
      }

      const recentCmd = wasmGetCommandMemory(slot, 30);
      if (recentCmd.length > 0) {
        parts.push('## 近期命令记录');
        for (const cmd of recentCmd) {
          const issuerName = resolve(cmd.issuerSlot);
          const statusLabel =
            cmd.result === 0 ? '已完成' :
            cmd.result === 2 ? '失败' :
            cmd.result === 3 ? '已拒绝' :
            String(cmd.result);
          const tag = cmd.emotionTag === 1 ? ' (超额完成)' : cmd.emotionTag === 2 ? ' (不信任)' : '';
          parts.push(`  - 来自 ${issuerName}: ${statusLabel}${tag}`);
        }
      }
    } else {
      const topRel = this.relationships.getTopRelationships(npcId, 5);
      if (topRel.length > 0) {
        parts.push('## 重要关系');
        for (const rel of topRel) {
          const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
          parts.push(`  - ${resolve(rel.otherId)}: ${label} (好感度 ${rel.affinity})`);
        }
      }

      const recentInt = this.interactions.getRecent(npcId, 20);
      if (recentInt.length > 0) {
        parts.push('## 近期互动');
        for (const int of recentInt) {
          const timeStr = new Date(int.timestamp).toLocaleTimeString();
          parts.push(`  - [${timeStr}] 与 ${resolve(int.otherNpcId)}: ${int.summary}`);
        }
      }

      const recentEv = this.witnessedEvents.getRecent(npcId, 30);
      if (recentEv.length > 0) {
        parts.push('## 见证事件');
        for (const ev of recentEv) {
          parts.push(`  - ${ev.description}`);
        }
      }
    }

    return parts.join('\n');
  }

  toJSON(): any {
    return {
      relationships: this.relationships.toJSON(),
      interactions: this.interactions.toJSON(),
      witnessedEvents: this.witnessedEvents.toJSON(),
    };
  }

  static fromJSON(json: any): NPCMemoryStore {
    const store = new NPCMemoryStore();
    if (!json) return store;
    if (json.relationships) {
      (store as any).relationships = NPCRelationshipMatrix.fromJSON(json.relationships);
    }
    if (json.interactions) {
      (store as any).interactions = NPCInteractionRingBuffer.fromJSON(json.interactions);
    }
    if (json.witnessedEvents) {
      (store as any).witnessedEvents = NPCWitnessedEvents.fromJSON(json.witnessedEvents);
    }
    return store;
  }
}

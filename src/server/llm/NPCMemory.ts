import { CommandStatus } from '../../shared/types/LLMPlanning';

import {
  wasmGetTopRelationships,
  wasmGetRecentInteractions,
  wasmGetCommandMemory,
  wasmGetWitnessedEvents,
  wasmGetEventString,
} from '../../ecs/ECSWasmLoader';

export class NPCMemoryStore {
  private slotMap: Map<string, number> = new Map();

  constructor() {}

  registerSlot(npcId: string, slot: number): void {
    this.slotMap.set(npcId, slot);
  }

  resolveSlot(npcId: string): number {
    return this.slotMap.get(npcId) ?? -1;
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

  /**
   * Build the memory context string for LLM prompt injection.
   * Data is fetched from C++ WASM memory via export functions.
   * @param nameResolver optional function to convert slot numbers to NPC names
   */
  buildMemoryContext(npcId: string, nameResolver?: (slotOrId: number | string) => string): string {
    const slot = this.resolveSlot(npcId);
    if (slot < 0) return '';

    const resolve = (s: number): string => {
      if (nameResolver) return nameResolver(s);
      return `NPC#${s}`;
    };

    const parts: string[] = [];

    const topRel = wasmGetTopRelationships(slot, 5);
    if (topRel.length > 0) {
      parts.push('重要关系:');
      for (const rel of topRel) {
        const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
        parts.push(`  - ${resolve(rel.targetSlot)}: ${label} (好感度 ${rel.affinity})`);
      }
    }

    const recentInt = wasmGetRecentInteractions(slot, 5);
    if (recentInt.length > 0) {
      parts.push('近期互动:');
      for (const int of recentInt) {
        const timeStr = new Date(int.timestamp).toLocaleTimeString();
        parts.push(`  - [${timeStr}] 与 ${resolve(int.otherSlot)}: ${int.typeName}`);
      }
    }

    const recentEv = wasmGetWitnessedEvents(slot, 3);
    if (recentEv.length > 0) {
      parts.push('见证事件:');
      for (const ev of recentEv) {
        const desc = wasmGetEventString(ev.eventIndex);
        if (desc) parts.push(`  - ${desc}`);
      }
    }

    const recentCmd = wasmGetCommandMemory(slot, 3);
    if (recentCmd.length > 0) {
      parts.push('近期命令记录:');
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

    return parts.join('\n');
  }
}

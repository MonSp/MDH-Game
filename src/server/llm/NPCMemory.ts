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
   * Uses 3-tier memory injection rule:
   *   长期记忆全量 + 中期记忆 TOP 10 + 近期记忆全量
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

    // --- Tier 1: 长期记忆 (全量) ---
    // TODO: Replace with wasmGetLongTermMilestones(slot) when WASM export is ready.
    // The C++ side now has MemoryRingComponent.longTerm (RingBuffer<LongTermMilestone, 50>)
    // and recordMilestone() method. Need to add WASM export + TS loader function.
    // For now, long-term memory is not queryable from JS — skip this section.
    // Expected format once WASM export is available:
    //   const longTerm = wasmGetLongTermMilestones(slot);
    //   if (longTerm.length > 0) {
    //     parts.push('## 重要人生事件（长期记忆）');
    //     for (const m of longTerm) {
    //       const typeLabel = MilestoneTypeLabel[m.type] ?? '未知';
    //       parts.push(`  - [${typeLabel}] ${resolve(m.relatedSlot)}: ${...}`);
    //     }
    //   }

    // --- Tier 2: 中期记忆 (TOP 10) ---
    // TODO: Replace with wasmGetTopMidTerm(slot, 10) when WASM export is ready.
    // The C++ side now has MemoryRingComponent.midTerm (RingBuffer<MidTermSummary, 100>)
    // and getTopMidTerm() method. Need to add WASM export + TS loader function.
    // For now, mid-term memory is not queryable from JS — skip this section.
    // Expected format once WASM export is available:
    //   const midTerm = wasmGetTopMidTerm(slot, 10);
    //   if (midTerm.length > 0) {
    //     parts.push('## 中期社交摘要');
    //     for (const m of midTerm) {
    //       const relLabel = m.avgEmotionScore > 0 ? '偏正面' : m.avgEmotionScore < 0 ? '偏负面' : '中性';
    //       parts.push(`  - 与${resolve(m.targetSlot)}: 互动${m.interactionCount}次, 关系${relLabel}`);
    //     }
    //   }

    // --- Tier 3: 近期记忆 (全量) ---
    // Relationships
    const topRel = wasmGetTopRelationships(slot, 5);
    if (topRel.length > 0) {
      parts.push('## 重要关系');
      for (const rel of topRel) {
        const label = rel.affinity > 30 ? '友好' : rel.affinity < -30 ? '敌对' : '中立';
        parts.push(`  - ${resolve(rel.targetSlot)}: ${label} (好感度 ${rel.affinity})`);
      }
    }

    // Recent interactions (full capacity — 20)
    const recentInt = wasmGetRecentInteractions(slot, 20);
    if (recentInt.length > 0) {
      parts.push('## 近期互动');
      for (const int of recentInt) {
        const timeStr = new Date(int.timestamp).toLocaleTimeString();
        parts.push(`  - [${timeStr}] 与 ${resolve(int.otherSlot)}: ${int.typeName}`);
      }
    }

    // Witnessed events (full capacity — 30)
    const recentEv = wasmGetWitnessedEvents(slot, 30);
    if (recentEv.length > 0) {
      parts.push('## 见证事件');
      for (const ev of recentEv) {
        const desc = wasmGetEventString(ev.eventIndex);
        if (desc) parts.push(`  - ${desc}`);
      }
    }

    // Command memory (full capacity — 30)
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

    return parts.join('\n');
  }
}

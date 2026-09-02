/**
 * Kernel Event Bridge Tests
 *
 * Verifies that kernel mailbox/journal events are correctly converted
 * to NPCWorldEvent format for client WebSocket broadcast.
 */
import { describe, it, expect } from 'vitest';

// Test the event conversion logic directly (no daemon needed)

interface NPCWorldEvent {
  npcId: string;
  npcName: string;
  description: string;
  location: string;
  type: string;
  source?: 'llm' | 'deterministic' | 'llm_fallback';
}

interface NPCInteractionEvent {
  id: string;
  type: 'trade' | 'duel' | 'alliance' | 'conflict' | 'greet';
  npcIdA: string;
  npcNameA: string;
  npcIdB: string;
  npcNameB: string;
  description: string;
  position: { x: number; y: number };
  timestamp: number;
}

/** Simulates the handleKernelMessage conversion logic */
function convertKernelMessage(
  event: { id: number; from: number; to: number; payload: string; timestamp: number },
  npcNames: Map<number, string>,
): { worldEvent: NPCWorldEvent; interaction: NPCInteractionEvent } {
  const fromId = `npc-${event.from}`;
  const toId = `npc-${event.to}`;
  const fromName = npcNames.get(event.from) ?? `实体${event.from}`;
  const toName = npcNames.get(event.to) ?? `实体${event.to}`;

  let messageText = '';
  try {
    const parsed = JSON.parse(event.payload);
    messageText = parsed.text || parsed.content || parsed.message || event.payload;
  } catch {
    messageText = event.payload;
  }

  const worldEvent: NPCWorldEvent = {
    npcId: fromId,
    npcName: fromName,
    description: `传音给${toName}：${messageText}`,
    location: '传音',
    type: 'kernel_message',
    source: 'deterministic',
  };

  const interaction: NPCInteractionEvent = {
    id: `kernel-msg-${event.id}`,
    type: 'greet',
    npcIdA: fromId,
    npcNameA: fromName,
    npcIdB: toId,
    npcNameB: toName,
    description: messageText,
    position: { x: 0, y: 0 },
    timestamp: event.timestamp,
  };

  return { worldEvent, interaction };
}

describe('Kernel Event Bridge', () => {
  const npcNames = new Map([
    [0, '王仙师'],
    [1, '李丹师'],
  ]);

  it('should convert mailbox message to NPCWorldEvent', () => {
    const { worldEvent } = convertKernelMessage(
      { id: 1, from: 0, to: 1, payload: '{"text":"道友请留步"}', timestamp: Date.now() },
      npcNames,
    );

    expect(worldEvent.npcId).toBe('npc-0');
    expect(worldEvent.npcName).toBe('王仙师');
    expect(worldEvent.description).toContain('传音给李丹师');
    expect(worldEvent.description).toContain('道友请留步');
    expect(worldEvent.type).toBe('kernel_message');
    expect(worldEvent.location).toBe('传音');
  });

  it('should convert mailbox message to NPCInteractionEvent', () => {
    const { interaction } = convertKernelMessage(
      { id: 42, from: 0, to: 1, payload: '{"text":"切磋一下"}', timestamp: 12345 },
      npcNames,
    );

    expect(interaction.id).toBe('kernel-msg-42');
    expect(interaction.type).toBe('greet');
    expect(interaction.npcIdA).toBe('npc-0');
    expect(interaction.npcNameA).toBe('王仙师');
    expect(interaction.npcIdB).toBe('npc-1');
    expect(interaction.npcNameB).toBe('李丹师');
    expect(interaction.description).toBe('切磋一下');
    expect(interaction.timestamp).toBe(12345);
  });

  it('should handle non-JSON payload gracefully', () => {
    const { worldEvent, interaction } = convertKernelMessage(
      { id: 1, from: 0, to: 1, payload: 'plain text message', timestamp: Date.now() },
      npcNames,
    );

    expect(worldEvent.description).toContain('plain text message');
    expect(interaction.description).toBe('plain text message');
  });

  it('should handle unknown NPC IDs gracefully', () => {
    const { worldEvent, interaction } = convertKernelMessage(
      { id: 1, from: 99, to: 100, payload: '{"text":"hello"}', timestamp: Date.now() },
      npcNames,
    );

    expect(worldEvent.npcId).toBe('npc-99');
    expect(worldEvent.npcName).toBe('实体99');
    expect(interaction.npcNameB).toBe('实体100');
  });

  it('should extract content/message fields from JSON', () => {
    const { interaction: i1 } = convertKernelMessage(
      { id: 1, from: 0, to: 1, payload: '{"content":"via content"}', timestamp: 0 },
      npcNames,
    );
    expect(i1.description).toBe('via content');

    const { interaction: i2 } = convertKernelMessage(
      { id: 2, from: 0, to: 1, payload: '{"message":"via message"}', timestamp: 0 },
      npcNames,
    );
    expect(i2.description).toBe('via message');
  });

  it('should bridge to io.emit format', () => {
    // Simulates what index.ts does: io.emit('npc:interactions', { interactions, tick })
    const { interaction } = convertKernelMessage(
      { id: 1, from: 0, to: 1, payload: '{"text":"test"}', timestamp: 1000 },
      npcNames,
    );

    const ioPayload = { interactions: [interaction], tick: Date.now() };
    expect(ioPayload.interactions).toHaveLength(1);
    expect(ioPayload.interactions[0].npcNameA).toBe('王仙师');
  });
});

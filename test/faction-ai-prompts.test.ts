import { describe, it, expect } from 'vitest';
import { buildFactionSystemPrompt, buildFactionUserPrompt, type FactionDecision } from '../src/server/llm/FactionAIPrompts';

describe('buildFactionSystemPrompt', () => {
  it('returns a non-empty string containing expected commands', () => {
    const prompt = buildFactionSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('war');
    expect(prompt).toContain('alliance');
    expect(prompt).toContain('truce');
    expect(prompt).toContain('none');
  });

  it('mentions JSON output format', () => {
    const prompt = buildFactionSystemPrompt();
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('targetClanId');
    expect(prompt).toContain('action');
    expect(prompt).toContain('reason');
  });
});

describe('buildFactionUserPrompt', () => {
  const clan = { name: '青云宗', type: '3级', reputation: 1500, treasury: 50000 };

  it('renders clan info into the prompt', () => {
    const prompt = buildFactionUserPrompt(clan, []);
    expect(prompt).toContain('青云宗');
    expect(prompt).toContain('3级');
    expect(prompt).toContain('1500');
    expect(prompt).toContain('50000');
  });

  it('renders other clans with their info', () => {
    const others = [
      { id: 'clan-a', name: '血魔教', type: '3级', reputation: 2000, treasury: 30000, currentStatus: '中立' },
      { id: 'clan-b', name: '天机阁', type: '2级', reputation: 800, treasury: 100000, currentStatus: '战争' },
    ];
    const prompt = buildFactionUserPrompt(clan, others);
    expect(prompt).toContain('血魔教');
    expect(prompt).toContain('天机阁');
    expect(prompt).toContain('中立');
    expect(prompt).toContain('战争');
  });

  it('renders "当前外交关系：" header even with empty otherClans', () => {
    const prompt = buildFactionUserPrompt(clan, []);
    expect(prompt).toContain('青云宗');
    expect(prompt).toContain('当前外交关系：');
  });

  it('includes decision factors', () => {
    const prompt = buildFactionUserPrompt(clan, []);
    expect(prompt).toContain('实力差距');
    expect(prompt).toContain('国库');
    expect(prompt).toContain('第三方威胁');
  });
});

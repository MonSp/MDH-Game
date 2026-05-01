import { describe, it, expect } from 'vitest';

// Pure function extracted from Game.tsx handleChoice dialogue branching
function getDialogueText(
  alreadyMet: boolean,
  entry: { text: string; metText?: string }
): string {
  return alreadyMet && entry.metText ? entry.metText : entry.text;
}

// Pure function extracted from Game.tsx handleContinue logging
function formatDialogueLog(npcName: string, dialogueText: string) {
  return { type: 'system' as const, message: `[${npcName}] ${dialogueText}` };
}

describe('getDialogueText', () => {
  const entry = { text: 'first time', metText: 'welcome back' };
  const noMetTextEntry = { text: 'only text' };

  it('returns text when not already met', () => {
    expect(getDialogueText(false, entry)).toBe('first time');
  });

  it('returns metText when already met and metText exists', () => {
    expect(getDialogueText(true, entry)).toBe('welcome back');
  });

  it('returns text when already met but no metText defined', () => {
    expect(getDialogueText(true, noMetTextEntry)).toBe('only text');
  });

  it('returns text when not met and no metText defined', () => {
    expect(getDialogueText(false, noMetTextEntry)).toBe('only text');
  });
});

describe('formatDialogueLog', () => {
  it('formats name and text into log entry', () => {
    const log = formatDialogueLog('小环', '少爷您醒了');
    expect(log).toEqual({
      type: 'system',
      message: '[小环] 少爷您醒了',
    });
  });

  it('handles empty dialogue text', () => {
    const log = formatDialogueLog('某人', '');
    expect(log.message).toBe('[某人] ');
  });

  it('handles special characters in text', () => {
    const log = formatDialogueLog('NPC', "Text with 'quotes' and chinese：测试");
    expect(log.message).toBe("[NPC] Text with 'quotes' and chinese：测试");
  });
});

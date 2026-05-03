import { describe, it, expect } from 'vitest';
import { buildDialogueSystemPrompt, buildDialogueUserPrompt } from '../src/server/llm/DialoguePrompts';

describe('buildDialogueSystemPrompt', () => {
  const npc = {
    name: '林风',
    identity: '宗门大弟子',
    realm: '筑基中期',
    background: '天资聪颖，自幼习武，掌门亲传弟子',
    personality: { ambition: 60, caution: 40, loyalty: 85, greed: 30 },
    emotion: '平静',
    activity: '在后山练功',
  };

  it('includes NPC name and identity', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('林风');
    expect(prompt).toContain('宗门大弟子');
  });

  it('includes realm', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('筑基中期');
  });

  it('includes background', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('天资聪颖');
  });

  it('includes personality trait values', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('野心：60');
    expect(prompt).toContain('谨慎：40');
    expect(prompt).toContain('忠诚：85');
    expect(prompt).toContain('贪婪：30');
  });

  it('includes current emotion and activity', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('情绪：平静');
    expect(prompt).toContain('行为：在后山练功');
  });

  it('uses default background when background is empty', () => {
    const prompt = buildDialogueSystemPrompt({ ...npc, background: '' });
    expect(prompt).toContain('一个普通的修仙者');
  });

  it('uses default background when background is undefined', () => {
    const prompt = buildDialogueSystemPrompt({ ...npc, background: undefined as any });
    expect(prompt).toContain('一个普通的修仙者');
  });

  it('uses default emotion when emotion is undefined', () => {
    const prompt = buildDialogueSystemPrompt({ ...npc, emotion: undefined as any });
    expect(prompt).toContain('情绪：平静');
  });

  it('uses default activity when activity is undefined', () => {
    const prompt = buildDialogueSystemPrompt({ ...npc, activity: undefined as any });
    expect(prompt).toContain('行为：闲逛中');
  });

  it('includes speaking rules — Chinese only', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('你说中文');
  });

  it('includes speaking rules — 50-200 chars', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('50-200字');
  });

  it('includes speaking rules — stay in character', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('不要提及你是AI');
    expect(prompt).toContain('不要超出角色认知范围');
  });

  it('includes personality-driven behavior hints', () => {
    const prompt = buildDialogueSystemPrompt(npc);
    expect(prompt).toContain('野心高的人说话有企图心');
    expect(prompt).toContain('谨慎的人话中留三分');
  });
});

describe('buildDialogueUserPrompt', () => {
  it('includes NPC name and player name', () => {
    const prompt = buildDialogueUserPrompt('林风', '玩家来到练功房', '张三', '');
    expect(prompt).toContain('林风');
    expect(prompt).toContain('张三');
  });

  it('includes scene context when provided', () => {
    const prompt = buildDialogueUserPrompt('林风', '玩家来到练功房', '张三', '');
    expect(prompt).toContain('玩家来到练功房');
  });

  it('uses default scene context when not provided', () => {
    const prompt = buildDialogueUserPrompt('林风', undefined, '张三', '');
    expect(prompt).toContain('前来与林风交谈');
  });

  it('includes memory context header when memory is provided', () => {
    const prompt = buildDialogueUserPrompt('林风', '宗门大殿', '张三', '林风记得张三曾帮助过他');
    expect(prompt).toContain('林风对张三的记忆');
  });

  it('includes memory context body when memory is provided', () => {
    const prompt = buildDialogueUserPrompt('林风', '宗门大殿', '张三', '林风记得张三曾帮助过他');
    expect(prompt).toContain('林风记得张三曾帮助过他');
  });

  it('omits memory section when memory context is empty', () => {
    const prompt = buildDialogueUserPrompt('林风', '宗门大殿', '张三', '');
    expect(prompt).not.toContain('记忆');
  });

  it('omits memory section when memory context is empty string', () => {
    const prompt = buildDialogueUserPrompt('林风', undefined, '张三', '');
    expect(prompt).not.toContain('记忆');
  });

  it('concludes with speaking instruction', () => {
    const prompt = buildDialogueUserPrompt('林风', undefined, '张三', '');
    expect(prompt).toContain('请以林风的身份');
    expect(prompt).toContain('说一段符合当前情境的话');
  });

  it('handles empty scene context string gracefully', () => {
    const prompt = buildDialogueUserPrompt('林风', '', '张三', '');
    // Empty string is truthiness-false, so should use default
    expect(prompt).toContain('前来与林风交谈');
  });
});

interface NPCDialoguePersona {
  name: string;
  identity: string;
  realm: string;
  background: string;
  personality: { ambition: number; caution: number; loyalty: number; greed: number };
  emotion: string;
  activity: string;
}

export function buildDialogueSystemPrompt(npc: NPCDialoguePersona): string {
  return `你是一个修仙世界的NPC角色，以下是你的人设：

## 身份
名字：${npc.name}
身份：${npc.identity}
境界：${npc.realm}

## 背景
${npc.background || '一个普通的修仙者'}

## 性格
野心：${npc.personality.ambition}/100
谨慎：${npc.personality.caution}/100
忠诚：${npc.personality.loyalty}/100
贪婪：${npc.personality.greed}/100

## 当前状态
情绪：${npc.emotion || '平静'}
行为：${npc.activity || '闲逛中'}

## 说话规则
- 你说中文，风格符合你的身份和性格
- 单次回复50-200字，简洁自然
- 保持角色设定——野心高的人说话有企图心，谨慎的人话中留三分
- 不要提及你是AI或语言模型
- 只说角色知道的事情，不要超出角色认知范围`;
}

export function buildDialogueUserPrompt(
  npcName: string,
  sceneContext: string | undefined,
  playerName: string,
  memoryContext: string,
): string {
  const parts: string[] = [];

  parts.push(`## 当前场景`);
  parts.push(sceneContext || `${playerName}前来与${npcName}交谈。`);

  if (memoryContext) {
    parts.push(``);
    parts.push(`## ${npcName}对${playerName}的记忆`);
    parts.push(memoryContext);
  }

  parts.push(``);
  parts.push(`请以${npcName}的身份，对${playerName}说一段符合当前情境的话。`);

  return parts.join('\n');
}

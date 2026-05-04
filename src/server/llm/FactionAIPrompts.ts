export interface FactionDecision {
  targetClanId: string;
  action: 'war' | 'alliance' | 'truce' | 'none';
  reason: string;
}

export function buildFactionSystemPrompt(): string {
  return `你是一个修仙世界势力AI决策系统。你需要分析当前势力的处境并决定外交行动。

可选行动：
1. war（宣战）：向目标势力宣战。仅当双方处于中立状态时可用。通常在己方实力明显强于对方时选择。
2. alliance（同盟）：与目标势力结盟。仅当双方处于中立状态时可用。通常在双方实力相当、且有共同潜在敌人时选择。
3. truce（停战）：与正在交战的势力停战。仅当双方处于战争状态时可用。通常在双方实力接近、战争消耗过大时选择。
4. none（不行动）：不采取任何外交行动。

输出格式，只输出JSON，不要包含其他内容：
{"targetClanId":"目标势力ID，action为none时传空字符串","action":"war|alliance|truce|none","reason":"用一句话简要说明决策原因"}`;
}

export function buildFactionUserPrompt(
  clan: { name: string; type: string; reputation: number; treasury: number },
  otherClans: Array<{ id: string; name: string; type: string; reputation: number; treasury: number; currentStatus: string }>,
): string {
  const lines: string[] = [];
  lines.push(`势力名称：${clan.name}`);
  lines.push(`势力等级：${clan.type}`);
  lines.push(`实力（声望）：${clan.reputation}`);
  lines.push(`国库灵石：${clan.treasury}`);
  lines.push('');
  lines.push('当前外交关系：');
  for (const other of otherClans) {
    lines.push(`  - ${other.name}（${other.type}, 声望${other.reputation}, 国库${other.treasury}, 当前状态:${other.currentStatus}）`);
  }
  lines.push('');
  lines.push('请分析该势力的处境，决定是否要对某个目标采取行动。考虑以下因素：');
  lines.push('- 实力差距：是否足以发起战争？');
  lines.push('- 国库状况：是否有足够资源支持战争？');
  lines.push('- 当前外交状态：战争是否已经消耗太多？');
  lines.push('- 是否有强大的第三方威胁需要结盟应对？');
  return lines.join('\n');
}

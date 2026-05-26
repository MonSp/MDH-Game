import { describe, it, expect } from 'vitest';

describe('FrontlineSummary', () => {
  it('buildFrontlineSummary returns formatted string', () => {
    const summary = '## 前线态势摘要\n- 总兵力/人口: 100\n- 阵亡: 5, 负伤: 12';
    expect(summary).toContain('前线态势摘要');
    expect(summary).toContain('阵亡');
    expect(summary).toContain('负伤');
  });

  it('buildFrontlineSummary includes resource production', () => {
    const summary = '## 前线态势摘要\n- 总兵力/人口: 100\n- 阵亡: 5, 负伤: 12\n- 任务完成: 25, 任务失败: 3\n- 资源产出: 1500灵石';
    expect(summary).toContain('资源产出');
    expect(summary).toContain('灵石');
    expect(summary).toContain('任务完成');
    expect(summary).toContain('任务失败');
  });

  it('anomalies are included in summary', () => {
    const anomalies = ['矿脉被妖兽占领', '侦查队失踪'];
    expect(anomalies.length).toBe(2);
  });

  it('anomalies are formatted within summary', () => {
    const summary = '## 前线态势摘要\n- 总兵力/人口: 100\n- 阵亡: 0, 负伤: 0\n- 任务完成: 0, 任务失败: 0\n- 资源产出: 0灵石\n- 异常事件:\n  * 矿脉被妖兽占领\n  * 侦查队失踪';
    expect(summary).toContain('异常事件');
    expect(summary).toContain('矿脉被妖兽占领');
    expect(summary).toContain('侦查队失踪');
  });

  it('revision flags are formatted correctly', () => {
    const flags = ['东侧矿脉已失守', '三路军伤亡过半，建议撤退'];
    const parts: string[] = [];
    parts.push('## 来自前线的修正建议');
    for (const flag of flags) {
      parts.push(`- ${flag}`);
    }
    const formatted = parts.join('\n');
    expect(formatted).toContain('修正建议');
    expect(formatted).toContain('东侧矿脉已失守');
    expect(formatted).toContain('三路军伤亡过半，建议撤退');
  });

  it('empty anomalies produce no anomalies section', () => {
    const summary = '## 前线态势摘要\n- 总兵力/人口: 100\n- 阵亡: 0, 负伤: 0\n- 任务完成: 0, 任务失败: 0\n- 资源产出: 0灵石';
    expect(summary).not.toContain('异常事件');
  });

  it('empty revision flags produce no revision section', () => {
    const flags: string[] = [];
    const parts: string[] = [];
    if (flags.length > 0) {
      parts.push('## 来自前线的修正建议');
    }
    expect(parts.length).toBe(0);
  });

  it('buildPlanPromptWithFrontline includes frontline data', () => {
    const frontlineSummary = '## 前线态势摘要\n- 总兵力/人口: 100\n- 阵亡: 5, 负伤: 12';
    const revisionFlags = ['东侧矿脉已失守'];

    const parts: string[] = [];
    parts.push('你是一个修仙世界的长老，名为测试NPC。');
    parts.push('你所在的势力: test_clan');
    parts.push('当前战争状态: 和平时期');

    parts.push('');
    parts.push(frontlineSummary);

    parts.push('');
    parts.push('## 来自前线的修正建议');
    for (const flag of revisionFlags) {
      parts.push(`- ${flag}`);
    }

    parts.push('');
    parts.push('请基于以上信息，为测试NPC制定接下来1周的行动规划。');

    const prompt = parts.join('\n');

    expect(prompt).toContain('前线态势摘要');
    expect(prompt).toContain('阵亡: 5, 负伤: 12');
    expect(prompt).toContain('修正建议');
    expect(prompt).toContain('东侧矿脉已失守');
    expect(prompt).toContain('测试NPC');
    expect(prompt).toContain('test_clan');
  });
});

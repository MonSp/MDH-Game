import type { SceneEntry } from '../../shared/types/scene';

export const INTRO_SCENE: SceneEntry[] = [
  {
    id: 'wake_up',
    title: '穿越·初醒',
    description: `你缓缓睁开眼，入目是一间古色古香的厢房。雕花木窗透进几缕晨光，
空气中弥漫着淡淡的檀香味。

你最后的记忆是一片刺目的白光……然后你就出现在了这里。

你低头看向自己的双手——那是一双少年人的手，细嫩、陌生。

你……穿越了。`,
    choices: [
      {
        text: '环顾四周，观察环境',
        nextEntry: 'look_around',
      },
      {
        text: '检查自身，感受这具身体',
        nextEntry: 'check_body',
        effect: { talent: { spiritualRoot: 5 } },
      },
      {
        text: '尝试呼唤他人',
        nextEntry: 'call_someone',
      },
    ],
  },
  {
    id: 'look_around',
    title: '穿越·初醒',
    description: `你环顾四周——房间虽然简朴，但陈设整洁。
靠墙的书架上摆着几卷竹简，窗外传来鸟鸣声。

你注意到床头放着一套青色布衣，叠放整齐。

看起来，这具身体的主人生活清贫但有序。`,
    choices: [
      {
        text: '检查自身，感受这具身体',
        nextEntry: 'check_body',
        effect: { talent: { spiritualRoot: 5 } },
      },
      {
        text: '尝试呼唤他人',
        nextEntry: 'call_someone',
      },
    ],
  },
  {
    id: 'check_body',
    title: '穿越·初醒',
    description: `你闭上双眼，屏息凝神，细细感受这具身体。

一股微弱的灵气在经脉中缓缓流动——你察觉到自己的灵根正在苏醒。
虽然品阶不高，但确实存在。这意味着你确实踏入了修仙之门。

你睁开眼睛，握了握拳。这具身体……以后就是你的了。`,
    choices: [
      {
        text: '环顾四周，观察环境',
        nextEntry: 'look_around',
      },
      {
        text: '尝试呼唤他人',
        nextEntry: 'call_someone',
      },
    ],
  },
  {
    id: 'call_someone',
    title: '穿越·初醒',
    description: `你清了清嗓子，朝门外唤了一声："有人吗？"

门外传来一阵急促的脚步声，一个十五六岁的少年推门而入，
见到你醒了，脸上露出欣喜的神色。

"少爷！您终于醒了！族长大人吩咐过，您醒后立刻去正厅见他。"`,
    choices: [
      {
        text: '询问情况',
        npcDialogue: 'servant_01',
        sceneContext: '玩家刚刚穿越醒来，对周围的一切感到陌生。',
        switchToMap: true,
      },
      {
        text: '起身前往正厅',
        switchToMap: true,
      },
    ],
  },
];

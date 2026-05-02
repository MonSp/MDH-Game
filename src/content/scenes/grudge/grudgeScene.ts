import type { SceneEntry, Choice } from '../../../shared/types/scene';

// 宿怨 prototype NPC IDs
export const LI_SI_ID = 'grudge_lisi';
export const WANG_WU_ID = 'grudge_wangwu';

// Memory states for Li Si
export const LI_SI_UNMET = 'UNMET';
export const LI_SI_ROBBED = 'ROBBED';
export const LI_SI_HELPED = 'HELPED';

/**
 * 宿怨 — NPC Memory Validation Prototype
 *
 * A self-contained 5-10 minute narrative that tests whether NPC memory
 * creates genuine emotional engagement. The player meets Li Si at the
 * village gate, makes a moral choice, then encounters him again after
 * a time skip — his behavior shaped by what the player did.
 *
 * Act 1: Village gate — meet Li Si, binary choice (rob / help)
 * Act 2 (free roam): Village interior, Wang Wu dialogue
 * Time skip: Presentational fade + "三天后..."
 * Act 3: Tavern exit — Li Si returns, consequence
 */

export const GRUDGE_SCENE_ENTRIES: SceneEntry[] = [
  // ═══════════════════════════════════════
  // ACT 1: Village Gate — First Encounter
  // ═══════════════════════════════════════
  {
    id: 'grudge_village_gate',
    title: '青石村·村口',
    description: `你沿着山路走了半日，眼前出现一座小村庄。

村口立着一块青石碑，刻着"青石村"三个字。秋日的阳光洒在石板路上，
几缕炊烟从村舍的屋顶袅袅升起。

一个衣衫褴褛的年轻散修靠在村口的槐树下，面色蜡黄，气息虚浮。
他见到你，眼中闪过一丝希望，踉跄着走上前来。`,
    choices: [
      {
        text: '侧身避开，不予理会',
        nextEntry: 'grudge_village_gate_ignore',
      },
      {
        text: '"你需要什么帮助？"上前询问',
        npcDialogue: 'grudge_lisi_help_ask',
      },
      {
        text: '打量他——这人身上似乎藏着什么',
        nextEntry: 'grudge_lisi_rob',
      },
    ],
  },
  {
    id: 'grudge_lisi_rob',
    title: '村口·抢夺',
    description: `你目光一凝，伸手扣住他的手腕。

他大惊失色，却因虚弱无力反抗，被你轻易制住。你从他怀中搜出一个小包裹，
里面是几块下品灵石和一枚低阶聚气丹。

"求求你……那是我妹妹的救命钱……"他声音颤抖，眼中含泪。

你心中一动，但东西已经到手。`,
    choices: [
      {
        text: '拿走灵石和丹药，转身离开',
        effect: { spiritStone: 50 },
        npcDialogue: 'grudge_lisi_robbed',
      },
      {
        text: '心中不忍，将东西还给他',
        npcDialogue: 'grudge_lisi_give_back',
      },
    ],
  },
  {
    id: 'grudge_village_gate_ignore',
    title: '村口·擦肩而过',
    description: `你侧身绕过他，像绕过路边的一块石头。

他愣在原地，嘴唇动了动，最终什么也没说，默默退回了树荫下。

你头也不回地走进了村子。`,
    choices: [
      {
        text: '前往村中酒馆',
        nextEntry: 'grudge_tavern',
      },
    ],
  },

  // ═══════════════════════════════════════
  // ACT 2: Village Interior — Free Roam / Color
  // ═══════════════════════════════════════
  {
    id: 'grudge_tavern',
    title: '青石村·酒馆',
    description: `推开酒馆的木门，一股麦酒和草药的气味扑面而来。

角落的桌边坐着一个青年，独自喝着闷酒。他衣着虽然朴素，但质料考究，
与这村中粗布麻衣的乡民格格不入。

他见你进来，抬了抬眼皮，目光有些涣散。`,
    choices: [
      {
        text: '在他对面坐下，闲聊几句',
        npcDialogue: 'grudge_wangwu_talk',
      },
      {
        text: '要一碗麦酒，独自喝完离开',
        nextEntry: 'grudge_time_skip',
      },
    ],
  },
  {
    id: 'grudge_leave_village',
    title: '村口·离开',
    description: `你向村口走去。村庄的生活在你身后渐渐远去。

就在这时——`,
    choices: [
      {
        text: '继续前行',
        switchToMap: true,
      },
    ],
  },

  // ═══════════════════════════════════════
  // TIME SKIP: "三天后..."
  // ═══════════════════════════════════════
  {
    id: 'grudge_time_skip',
    title: '……三天后',
    description: `三日时光，转瞬即逝。

这三天里，你在青石村中修养调整，偶尔与村人闲聊。
秋日的阳光依然温暖，村庄的日子平静如水。

但有些账……注定不会这么轻易过去。

你推开酒馆的门，准备离开这个村子。`,
    choices: [
      {
        text: '踏上村口的小路',
        nextEntry: 'grudge_act3_reunion',
      },
    ],
  },

  // ═══════════════════════════════════════
  // ACT 3: Reunion — Memory-Dependent Consequences
  // ═══════════════════════════════════════
  {
    id: 'grudge_act3_reunion',
    title: '村口·狭路相逢',
    description: `你刚走到村口，就看见一个熟悉的身影。

是那个散修——但他不再是三天前那副虚弱的样子。

他身边还站着一个身材魁梧的修士，气息沉稳，修为不低。`,
    choices: [
      {
        // Only show if player robbed Li Si
        text: '（紧张）握紧武器，准备应对',
        condition: { npcMemory: { npcId: LI_SI_ID, equals: LI_SI_ROBBED } },
        npcDialogue: 'grudge_lisi_ambush',
      },
      {
        // Only show if player helped Li Si
        text: '（认出是他）拱手打招呼',
        condition: { npcMemory: { npcId: LI_SI_ID, equals: LI_SI_HELPED } },
        npcDialogue: 'grudge_lisi_reward',
      },
      {
        // Fallback: if player ignored Li Si, different dialogue
        text: '（警惕地看着两人）',
        npcDialogue: 'grudge_lisi_stranger',
      },
    ],
  },
  {
    id: 'grudge_ambush_consequence',
    title: '宿怨·代价',
    description: `"三天前，你抢走我救命的东西时，没想到会有今天吧。"

李四的声音很平静，却让人脊背发凉。

他身旁的师兄向前踏了一步。你根本不是对手。

你眼前一黑——

……

当你醒来时，你躺在村外的草地上，身上的灵石和丹药已经不翼而飞。
只有怀中那片枯叶，似乎在提醒你：这个世界，会记住你的选择。`,
    choices: [
      {
        text: '……（沉默地站起身）',
        nextEntry: 'grudge_epilogue',
        effect: { spiritStone: -30 },
      },
    ],
  },
  {
    id: 'grudge_reward_consequence',
    title: '善缘·回报',
    description: `"恩人！"

李四大步走上前来，脸上带着感激的笑容。他身边的师兄也对你拱手致意。

"那天多谢您出手相助。"李四从怀中取出一张兽皮地图，
"我这几天四处打听，从一个落魄修士那里得了这张地图——
据说上面标注了一处上古秘境的位置。我用不上，但您或许用得上。"

他真诚地将地图塞到你手里。`,
    choices: [
      {
        text: '接过地图，拍了拍他的肩膀',
        effect: { spiritStone: 50 },
        nextEntry: 'grudge_epilogue',
      },
    ],
  },
  {
    id: 'grudge_stranger_consequence',
    title: '擦肩',
    description: `那散修看了你一眼，似乎想说什么，但最终只是别过头去。

他身旁的师兄打量了你一番，目光在你腰间的储物袋上停留了一瞬，
最终也移开了视线。

你们在村口擦肩而过，各自走向不同的方向。`,
    choices: [
      {
        text: '继续上路',
        nextEntry: 'grudge_epilogue',
      },
    ],
  },

  // ═══════════════════════════════════════
  // EPILOGUE
  // ═══════════════════════════════════════
  {
    id: 'grudge_epilogue',
    title: '青石村·远行',
    description: `你回头看了一眼青石村。

村口的槐树在秋风中沙沙作响，那条石板路依然静静地躺在那里。

你想起这三天发生的事——那个散修，那个选择，那些后果。
这个世界里，NPC会记住你对他们做的事。
好的，坏的，都不会被忘记。

前方是更广阔的世界。`,
    choices: [
      {
        text: '踏上旅途（结束此章）',
        switchToMap: true,
      },
    ],
  },
];

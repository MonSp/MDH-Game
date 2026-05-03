import type { SceneEntry } from '../../../shared/types/scene';

// 宿怨 NPC IDs
export const LI_SI_ID = 'grudge_lisi';

// Memory states
export const LI_SI_UNMET = 'UNMET';
export const LI_SI_ROBBED = 'ROBBED';
export const LI_SI_HELPED = 'HELPED';
export const LI_SI_IGNORED = 'IGNORED';

/**
 * 宿怨 — NPC Memory Consequence Event Chain
 *
 * A two-phase event chain demonstrating NPC memory persistence:
 *
 * Phase 1 (trigger: 55,45): Player meets Li Si at a village gate and makes
 *   a moral choice (help / rob / ignore). Sets NPC memory accordingly.
 *   Ends cleanly with switchToMap — player continues normal gameplay.
 *
 * Phase 2 (trigger: 60,50): After ~30+ minutes of real gameplay, the player
 *   walks east from the family compound. Li Si returns with real mechanical
 *   consequences based on the player's earlier choice.
 */

export const GRUDGE_SCENE_ENTRIES: SceneEntry[] = [
  // ═══════════════════════════════════════
  // PHASE 1: Village Gate — First Encounter
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
        effect: { setMemory: { npcId: LI_SI_ID, value: LI_SI_IGNORED } },
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
      {
        // Appears after player clicks "帮助" and hears Li Si's story
        text: '"这些灵石你拿去应急吧"（资助李四）',
        condition: { npcMemory: { npcId: LI_SI_ID, equals: LI_SI_HELPED } },
        effect: { spiritStone: -200 },
        nextEntry: 'grudge_leave_village',
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
      {
        text: '转身离开',
        nextEntry: 'grudge_leave_village',
      },
    ],
  },
  {
    id: 'grudge_village_gate_ignore',
    title: '村口·擦肩而过',
    description: `你侧身绕过他，像绕过路边的一块石头。

他愣在原地，嘴唇动了动，最终什么也没说，默默退回了树荫下。

你头也不回地走进了村子。

身后传来他嘶哑的声音："道友……求你了……我妹妹她……"

你没有回头。风声把他的后半句话吞没了。`,
    choices: [
      {
        text: '在村中信步走走',
        nextEntry: 'grudge_leave_village',
      },
    ],
  },

  // ═══════════════════════════════════════
  // PHASE 1 EXIT — Return to map
  // ═══════════════════════════════════════
  {
    id: 'grudge_leave_village',
    title: '离开青石村',
    description: `你在村子里转了一圈，发现这里只是普通的凡人村落。

几户人家、一片菜畦、一棵老槐树。
除了那个散修，这里没有什么值得停留的。

该上路了。前方还有更广阔的世界等着你。`,
    choices: [
      {
        text: '踏上旅途',
        switchToMap: true,
      },
    ],
  },

  // ═══════════════════════════════════════
  // PHASE 2: Reunion — Memory-Dependent Encounter
  // Triggered at (60,50) when player has NPC memory set
  // ═══════════════════════════════════════

  // ── Branch: Player HELPED Li Si ──
  {
    id: 'grudge_reunion_helped',
    title: '路上·故人重逢',
    description: `你正在林间小道上走着，忽然听到身后传来急促的脚步声。

"恩人！请留步！"

回头一看，竟是李四！他气色好了许多，背上背着一个行囊，
身边还跟着一位温和的中年修士。

"我在这里等了您三天了——向人打听，说您会往这个方向走。"

他深深鞠了一躬："当日若非恩人出手相助，我妹妹恐怕已经……
这份恩情，李四一直记在心里。"

旁边的中年修士微笑点头："我是他族叔。这孩子执意要来找你，
说救命之恩当以身相报。他虽修为不高，但通晓药草医术，
若你不嫌弃，就让他跟着你吧。"`,
    choices: [
      {
        text: '【邀请入队】"好，我正缺一个懂医术的同伴"',
        effect: { spiritStone: -200 },
        nextEntry: 'grudge_joined_squad',
      },
      {
        text: '【收下谢礼】"我独来独往惯了，你回去吧"',
        effect: { addItem: { '中级法器': 1 } },
        nextEntry: 'grudge_got_reward',
      },
    ],
  },

  // ── Branch: Player ROBBED Li Si ──
  {
    id: 'grudge_reunion_robbed',
    title: '路上·冤家路窄',
    description: `你正走在一条僻静的山路上，忽然前方闪出两个人影。

当先一人正是李四——但他不再是你上次见到的那个怯懦散修。
他身旁站着一个身材魁梧的修士，气息沉稳，修为至少在筑基中期。

李四的声音比上次冷了许多："三天前，你抢走我给我妹妹救命的灵石。
我找了你整整三天。"

他师兄缓缓开口："阁下身为修士，欺凌一个炼气初期的散修，
今日我替他讨回这个公道。"`,
    choices: [
      {
        text: '【应战】冷哼一声，握紧武器',
        effect: { hp: -50, removeItem: { count: 1 }, debuff: { name: '颜面扫地', durationMs: 1800000, statPenalty: 0.05 } },
        nextEntry: 'grudge_fought_consequence',
      },
      {
        text: '【求饶】"且慢……有话好说"',
        effect: { loseStonesFraction: 0.5, debuff: { name: '颜面扫地', durationMs: 1800000, statPenalty: 0.05 } },
        nextEntry: 'grudge_humiliation_consequence',
      },
    ],
  },

  // ── Branch: Player ignored Li Si (no memory) ──
  {
    id: 'grudge_reunion_neutral',
    title: '路上·偶遇',
    description: `你走在山路上，前方有一个瘦弱的身影也在赶路。

那人回头看见你，礼貌地点了点头，让到路边。
是个年轻的散修，面色有些苍白，但眼神清澈。

你们擦肩而过，各自赶路。`,
    choices: [
      {
        text: '继续前行',
        switchToMap: true,
      },
    ],
  },

  // ═══════════════════════════════════════
  // PHASE 2 — Consequence follow-ups
  // ═══════════════════════════════════════
  {
    id: 'grudge_joined_squad',
    title: '新同伴',
    description: `李四欣喜地背起行囊，站到了你身后。

"多谢恩人！我一定不会拖后腿的。"

他的族叔拍了拍他的肩膀，又对你拱手道：
"这孩子就托付给道友了。他虽资质平平，但胜在勤奋踏实。"

李四加入了你的队伍。`,
    choices: [
      {
        text: '继续上路（李四加入队伍）',
        switchToMap: true,
      },
    ],
  },
  {
    id: 'grudge_got_reward',
    title: '谢礼',
    description: `李四虽然有些失望，但还是从怀中取出一件物品，双手奉上。

"这是我族叔年轻时用过的一件中级法器，虽不算什么宝物，
但比寻常法器强上几分。恩人务必收下。"

他族叔点头道："你收着吧，比放在我这里积灰强。"`,
    choices: [
      {
        text: '接过法器，点头道别',
        effect: { addItem: { '中级法器': 1 } },
        switchToMap: true,
      },
    ],
  },
  {
    id: 'grudge_paid_compensation',
    title: '了结',
    description: `李四接过灵石，数了数，神色稍霁。

他师兄看了你一眼："此事到此为止。"

两人转身离去。李四走了几步，回头看了你一眼，
那眼神里有怨恨，也有一丝释然。

你摸了摸空了不少的储物袋，继续上路。`,
    choices: [
      {
        text: '继续赶路',
        switchToMap: true,
      },
    ],
  },
  {
    id: 'grudge_fought_consequence',
    title: '代价',
    description: `你摆开架势，但那师兄的身法比你预想的快得多。

三招之内，你胸口便中了一掌，气血翻涌。
李四趁你身形不稳，从你腰间扯下了储物袋。

"够了。"他师兄收手而立，"给他留条命。"

李四从袋中取走了部分灵石和一件物品，将袋子扔还给你。
两人消失在林间小路的尽头。

你擦去嘴角的血迹，忍着伤痛继续前行。`,
    choices: [
      {
        text: '……（继续赶路）',
        switchToMap: true,
      },
    ],
  },

  // ═══════════════════════════════════════
  // CONSEQUENCE: Submit path (robbed branch)
  // ═══════════════════════════════════════
  {
    id: 'grudge_humiliation_consequence',
    title: '屈辱',
    description: `你收起架势，拱了拱手。

李四的师兄冷笑一声："算你识相。"

李四大步上前，一把扯下你腰间的储物袋，
将里面的灵石倒出了大半。

"这是你欠我的。"

他师兄按住他的肩膀，摇了摇头："够了，走吧。"

两人转身消失在林间小路的尽头。

你独自留在原地，感到周围路过的行人投来异样的目光。
这件事很快就会传开——你被一个散修当面羞辱了。`,
    choices: [
      {
        text: '……（继续赶路）',
        switchToMap: true,
      },
    ],
  },

  // ═══════════════════════════════════════
  // DELAYED CONSEQUENCE: Ignore path → death rumor
  // Triggered at (52,42) when LI_SI_IGNORED
  // ═══════════════════════════════════════
  {
    id: 'grudge_lisi_death_rumor',
    title: '酒肆·闲谈',
    description: `你在路边一家简陋的茶肆歇脚，要了一碗粗茶。

邻桌两个行商正在闲聊——

"听说了吗？前几日有人在青石村外的山道上发现了一具散修的尸体。"
"哦？又是不长眼地撞上妖兽了？"
"不是。那人身上没什么外伤，倒像是饿死的……身边还有一封没送出去的信，
信封上写着'吾妹亲启'。听说那散修一直在等什么人，等了三天三夜。"
"啧，这年头散修的日子不好过啊。别管闲事了，喝酒喝酒。"

他们的对话渐渐转到了货价上。你端着茶碗，一时无言。`,
    choices: [
      {
        text: '……（喝完茶，默默上路）',
        effect: { reputation: { family: -2 } },
        switchToMap: true,
      },
    ],
  },
];

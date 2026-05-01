import type { SceneEntry } from '../../shared/types/scene';

/**
 * 家族大院场景连段
 * Play order: corridor → hall → patriarch_audience
 * 入口：从卧室 (intro/call_someone) switchToMap 后，走到家族大院坐标触发
 */

const formatTime = (hour: number) => {
  const 时辰 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return 时辰[Math.floor(hour / 2) % 12];
};

export const FAMILY_SCENES: SceneEntry[] = [
  {
    id: 'family_corridor',
    title: '家族走廊',
    description: `你推开卧室的木门，午后${formatTime(14)}时的阳光洒在回廊上，
廊柱斑驳，檐角挂着几串风铃，随风发出清脆的响声。

这条走廊连接着内院和正厅。你看到前方不远处的庭院里，
几个家族弟子正在练武，呼喝声隐约传来。

走廊尽头，一个丫鬟端着茶盘匆匆走过。`,
    choices: [
      {
        text: '直接前往正厅见族长',
        nextEntry: 'family_hall',
      },
      {
        text: '在廊下驻足片刻，观察家族环境',
        nextEntry: 'family_yard',
      },
      {
        text: '拦住丫鬟，询问家族近况',
        npcDialogue: 'servant_02',
        sceneContext: '玩家刚穿越醒来，在家族走廊遇到丫鬟，想打听家族情况',
      },
    ],
  },
  {
    id: 'family_yard',
    title: '家族院落',
    description: `你踱步到庭院中。几个年轻弟子正在练剑，剑光如织，带起阵阵破风声。
一个约莫十二三岁的少年收剑驻足，好奇地打量你：

"你就是那位从闭关中醒来的族兄？听说你这次昏睡了好几日，族里都在议论。"

他压低声音："他们说你是灵根受损才闭关失败的……但也有不少人说你其实是因祸得福。"`,
    choices: [
      {
        text: '"灵根受损？此话当真？"',
        effect: { talent: { spiritualRoot: -3 } },
        npcDialogue: 'junior_01',
        sceneContext: '玩家在院中听到关于自己灵根的传言',
      },
      {
        text: '谢过少年，转身前往正厅',
        nextEntry: 'family_hall',
      },
      {
        text: '"你说\'因祸得福\'是什么意思？"',
        npcDialogue: 'junior_01',
        sceneContext: '玩家追问因祸得福的含义',
      },
    ],
  },
  {
    id: 'family_hall',
    title: '正厅·家主的召见',
    description: `你步入正厅。迎面是一幅巨大的山水屏风，上面绘着云雾缭绕的仙山。
厅内陈设古朴庄重，两排紫檀木椅分列左右。

一位五十出头的威严男子端坐主位，身着一袭青色长袍，
眉宇间有一股不怒自威的气势。他正是你的三叔——族长 林震天。

他见你进来，放下手中的玉简，目光如电地打量了你一番。`,
    choices: [
      {
        text: '恭敬行礼："族长，您找我？"',
        nextEntry: 'patriarch_audience',
        effect: { reputation: { family: 5 } },
      },
      {
        text: '不卑不亢地直视族长，等待他先开口',
        nextEntry: 'patriarch_audience',
        effect: { talent: { boneConstitution: 3 } },
      },
    ],
  },
  {
    id: 'patriarch_audience',
    title: '正厅·族长的嘱托',
    description: `林震天缓缓开口：

"你这次闭关昏睡了三日，错过了族中选拔。我已与青云宗的外门执事商议过，
给你争取了一个补录名额——三日后随新弟子一同上山。"

他顿了顿，目光变得凝重：

"你知道，我们林家在这苍云城立足三百年，靠的不是家业，是每一代都有人在青云宗站稳脚跟。
如今宗门内派系倾轧，外有魔族蠢蠢欲动……你此去，不只是修行，更是为家族搏一线生机。"

他从袖中取出一枚令牌，隔空掷向你。`,
    choices: [
      {
        text: '接过令牌，郑重承诺："必不负族长所托！"',
        effect: { reputation: { family: 10 }, talent: { comprehension: 3 } },
        switchToMap: true,
      },
      {
        text: '接过令牌，沉默点头（多说无益，用行动证明）',
        effect: { talent: { boneConstitution: 5 } },
        switchToMap: true,
      },
      {
        text: '"族长，青云宗……是什么样的地方？"',
        npcDialogue: 'patriarch_01',
        sceneContext: '玩家询问青云宗的背景信息',
      },
    ],
  },
];

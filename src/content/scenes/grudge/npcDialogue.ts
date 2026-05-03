/**
 * 宿怨 prototype — NPC dialogue entries
 *
 * Scripted NPC responses for the grudge validation prototype.
 * Phase 1: village gate encounter
 * Phase 2: memory-dependent reunion consequences
 */

export interface NpcDialogueEntry {
  name: string;
  role: string;
  text: string;
  metText?: string;
}

export const GRUDGE_NPC_DIALOGUE: Record<string, NpcDialogueEntry> = {
  // ── Phase 1: Village Gate ──
  grudge_lisi_help_ask: {
    name: '李四',
    role: '落魄散修',
    text: `这位道友……在下李四，本是附近青石山脉的散修。

前些日子我妹妹染了寒毒，我耗尽家财才买到一枚驱寒丹，
本想送回家去，却在山中遇了妖兽，逃到这里时已是身无分文。

我看道友气息沉稳，若肯借我些盘缠……在下感激不尽！
我听说东边古道常有妖物作乱，正打算去那边碰碰运气。
若能得些好东西，三日后在古道尽头的小亭相见，
在下一定加倍奉还！`,
  },
  grudge_lisi_robbed: {
    name: '李四',
    role: '落魄散修',
    text: `你……！
你们这些大宗门出来的弟子，就只会欺负我们散修吗？

好，好得很。我记住了。
我大哥就在东边的清风寨修行，有胆子你别走那条道。咱们……走着瞧！`,
  },
  grudge_lisi_give_back: {
    name: '李四',
    role: '落魄散修',
    text: `你……你真的还给我？
（他愣了半晌，深深鞠了一躬）

多谢道友！在下李四，日后若有用得着的地方，赴汤蹈火，在所不辞！`,
  },

  // ── Phase 2: Helped path ──
  grudge_lisi_joinsquad: {
    name: '李四',
    role: '草药散修',
    text: `太好了！多谢恩人成全！

我虽然打架不太行，但从小跟着族叔采药，识得百草，
寻常的跌打损伤、毒虫蛇咬都难不倒我。

对了，这枚聚气丹您先收着——是我自己炼的，虽然品阶不高，
但赶路时补充灵气还是管用的。`,
  },
  grudge_lisi_gift_item: {
    name: '李四',
    role: '草药散修',
    text: `恩人执意如此……李四不敢强求。

这件中级法器是我族叔年轻时用的，虽不是什么神兵利器，
但比寻常法器强上不少。您拿着，也算我一点心意。

若他日路过青石村，随时来坐坐。我李四……欠您一条命。`,
  },

  // ── Phase 2: Robbed path ──
  grudge_lisi_settle: {
    name: '李四',
    role: '落魄散修',
    text: `他师兄接过灵石，掂了掂，点头道："够了。"

李四咬着嘴唇，眼眶微红：
"下次……别再让我遇见你。"

他师兄按住他的肩膀，摇了摇头。两人转身离去。`,
  },
  grudge_lisi_fight: {
    name: '李四的师兄',
    role: '筑基修士',
    text: `"好胆色。"

他身形一晃，已到近前。你抬手格挡，却被一股浑厚的灵力震退数步。

李四在一旁喊道："师兄，他身上有我那袋灵石！"

你这才意识到——他不是一个人来"讨公道"的，
他是来找你"拿回"东西的。这场架，你从一开始就不占理。`,
  },
};

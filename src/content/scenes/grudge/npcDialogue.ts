/**
 * 宿怨 prototype — NPC dialogue entries
 *
 * These are scripted NPC responses for the grudge validation prototype.
 * They follow the same format as NPC_DIALOGUE in Game.tsx but are
 * specific to this prototype so they live in a separate file.
 *
 * Each entry has a `text` for first encounter and an optional `metText`
 * for subsequent encounters — though in this prototype each NPC is
 * typically encountered only once per playthrough.
 */

export interface NpcDialogueEntry {
  name: string;
  role: string;
  text: string;
  metText?: string;
}

export const GRUDGE_NPC_DIALOGUE: Record<string, NpcDialogueEntry> = {
  grudge_lisi_help_ask: {
    name: '李四',
    role: '落魄散修',
    text: `这位道友……在下李四，本是附近青石山脉的散修。

前些日子我妹妹染了寒毒，我耗尽家财才买到一枚驱寒丹，
本想送回家去，却在山中遇了妖兽，逃到这里时已是身无分文。

我看道友气息沉稳，若肯借我些盘缠……来日必当重谢。`,
  },
  grudge_lisi_robbed: {
    name: '李四',
    role: '落魄散修',
    text: `你……！

你们这些大宗门出来的弟子，就只会欺负我们散修吗？

好，好得很。我记住了。`,
  },
  grudge_lisi_give_back: {
    name: '李四',
    role: '落魄散修',
    text: `你……你真的还给我？

（他愣了半晌，深深鞠了一躬）

多谢道友！在下李四，日后若有用得着的地方，赴汤蹈火，在所不辞！`,
  },
  grudge_wangwu_talk: {
    name: '王五',
    role: '落魄世家子弟',
    text: `你来了？坐吧。

我是青石村本地人。祖上也曾阔过，出过一位金丹真人。
可惜……那都是百年前的事了。

如今我王氏一脉只剩我一人，守着几亩薄田和一部残卷。
说来惭愧，连村口那个散修都不如——至少他还有个妹妹要救。`,
  },
  grudge_lisi_ambush: {
    name: '李四',
    role: '落魄散修',
    text: `"师兄，就是他！"

李四指着你，眼中满是怨恨。

"三天前，就是他抢走了我的灵石和丹药——那是我给我妹妹救命的！"

他身旁的师兄冷冷地看着你："阁下身为修士，欺凌一个炼气初期的散修，
不觉得羞耻吗？今日我替他讨回这个公道。"`,
  },
  grudge_lisi_reward: {
    name: '李四',
    role: '落魄散修',
    text: `恩人！我就知道还能见到您！

这位是我的师兄，我托人给他传讯来接我。
我妹妹的毒已经稳住了，多亏了您当日的援手。

我没什么能报答的……但前两天我在山中找到一处奇怪的地方，
画了张地图。感觉那里不是普通的地方，您或许用得上。`,
  },
  grudge_lisi_stranger: {
    name: '李四',
    role: '落魄散修',
    text: `（他看了你一眼，似乎想说什么，但最终别过头去）

师兄，我们走吧。这村子没什么好待的。`,
  },
};

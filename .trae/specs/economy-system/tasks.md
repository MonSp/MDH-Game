# Tasks

- [x] Task 1: 实现多资源背包与境界突破消耗模型
  - [x] SubTask 1.1: 更新 `gameStore.ts` 中的突破逻辑 (`cultivate` 或新增专门的突破函数)，加入各境界所需的灵石消耗（如练气升筑基需 300 灵石）。
  - [x] SubTask 1.2: 若灵石不足，在系统日志中提示突破失败，修为保留但无法进阶。
  - [x] SubTask 1.3: 更新 `HUD.tsx`，在玩家修为满时显示所需的突破材料/灵石提示。

- [x] Task 2: 建立基础坊市与物价系统
  - [x] SubTask 2.1: 在 `gameStore.ts` 中新增全局 `Market` 状态，记录基础商品（洗髓丹、低级法器等）的当前价格和库存。
  - [x] SubTask 2.2: 编写简单的价格波动函数，每次资源点被采空或发生大规模交易时，小幅波动相关物价。
  - [x] SubTask 2.3: 提供 `buyItem` 和 `sellItem` 的 Action 接口，处理灵石扣除/增加，并计算跨国交易的 15% 关税。

- [x] Task 3: 扩展 NPC 商队与家族库房机制
  - [x] SubTask 3.1: 在 `Clan` 接口中新增 `treasury` (库房资金) 字段。
  - [x] SubTask 3.2: 在 NPC 行为树（`evaluateNPCBehavior`）中，为长老或家主级 NPC 新增“坊市跑商”行为：定期低买高卖，并将利润加入 `treasury`。
  - [x] SubTask 3.3: 玩家击杀带有“跑商”状态的 NPC 时，掉落的灵石数量大幅增加，但仇恨值翻倍。

- [x] Task 4: UI 交互接入
  - [x] SubTask 4.1: 在主界面增加一个简易的“进入坊市”按钮或弹窗，供玩家查看当前物价并进行买卖。

# Task Dependencies
- Task 1 是基础，确保货币（灵石）有核心消耗途径。
- Task 2 依赖于 Task 1 的货币体系。
- Task 3 依赖于 Task 2 的物价波动系统。
- Task 4 依赖于 Task 2 提供的交易接口。

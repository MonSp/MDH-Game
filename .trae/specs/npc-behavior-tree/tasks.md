# Tasks

- [x] Task 1: 重构 NPC 数据模型
  - [x] SubTask 1.1: 在 `gameStore.ts` 的 `NPC` 接口中新增属性：`hp`、`maxHp`、`mp`、`maxMp`、`personality` (野心, 谨慎, 忠诚, 贪婪)、`resources` (灵石等)。
  - [x] SubTask 1.2: 更新 `generateNearbyNPCs` 函数，在生成 NPC 时随机初始化这些新增的属性，并根据国家特色给予基础倾向。

- [x] Task 2: 实现行为树评估核心逻辑
  - [x] SubTask 2.1: 在 `gameStore.ts` 中编写一个辅助函数 `evaluateNPCBehavior(npc, state)`，作为行为树的根节点。
  - [x] SubTask 2.2: 实现 **优先级1（生存应急）**：检查血量，若极低则设置为“逃跑/重伤疗伤”状态并远离危险源。
  - [x] SubTask 2.3: 实现 **优先级2（家族职责）**：根据职位（家主、长老、子弟）分配“巡逻”、“闭关”、“后勤”等行为。
  - [x] SubTask 2.4: 实现 **优先级3&4（机缘与日常）**：让 NPC 能够发现附近的资源点并前往采集，或者在资源匮乏时去坊市“打工”或“打坐”。
  - [x] SubTask 2.5: 将国家特质修饰符融入行为评估的概率计算中（例如秦国增加战斗巡逻权重，楚国增加炼丹/后勤权重）。

- [x] Task 3: 替换旧的演化循环并更新 UI
  - [x] SubTask 3.1: 将 `gameStore.ts` 的 `updateNPCs` 函数替换为遍历所有视野内 NPC 并调用 `evaluateNPCBehavior` 进行状态更新的逻辑。
  - [x] SubTask 3.2: 确保 NPC 的 `activity`（如“争夺机缘”、“巡逻边界”、“重伤逃遁”）能正确反映在其头顶的 UI 面板上（修改 `Map2D.tsx`）。

# Task Dependencies
- Task 2 依赖于 Task 1 的数据结构。
- Task 3 依赖于 Task 2 提供的评估逻辑。

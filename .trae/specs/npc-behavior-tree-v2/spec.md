# NPC 行为树 V2 扩展 Spec

## Why
当前 NPC 行为系统仅有 10 种简单活动（巡逻、撤退、后勤、竞争、工作、休息、交易、逃跑、追击、死亡），通过权重轮盘随机选择，极少活动有实际执行逻辑。无法支撑修仙世界中 NPC 的修炼突破、社交互动、命令响应、资源生产等核心玩法。需要一套完善的优先级驱动行为树，覆盖日常、修炼、社交、命令、生产五大维度。

## What Changes
- **BREAKING**: NPCActivity 枚举完全重命名/扩展（从 10 种 → 40+ 种）
- **BREAKING**: BehaviorWeight 结构体重写为优先级层级树
- **BREAKING**: BehaviorTreeSystem `evaluate()` 逻辑从轮盘选择 → 优先级仲裁树
- 新增 RoleCommandComponent（家族指令下发/接收）
- 新增 RelationshipComponent（NPC 间关系：家人、情侣、师徒、敌对）
- 新增 CultivationComponent（修炼进度、瓶颈、突破状态）
- 新增 ResourceNode 类型枚举（矿脉、农田、渔场、林地）
- 重构 `execute()` 分支，为每个新活动添加具体执行逻辑
- WASM 导出层 NPCStateWasm 适配新字段

## Impact
- Affected specs: 无（首次行为系统 spec）
- Affected code:
  - `game/ecs/components/BehaviorComponent.h` — 重写
  - `game/ecs/components/PersonalityComponent.h` — 扩展
  - `game/ecs/components/LLMComponent.h` — ActionType 枚举扩展
  - `game/npc/BehaviorTreeSystem.h` — 完全重写
  - `game/npc/MovementSystem.h` — 新增导航目标类型
  - `game/npc/CombatSystem.h` — 扩展
  - `game/ecs/components/StatsComponent.h` — 扩展修炼相关属性
  - `game/ecs/Registry.h` — 注册新组件
  - `tools/ecs-wasm/src/wasm_exports.cpp` — NPCStateWasm 适配
  - `src/ecs/ECSWasmLoader.ts` — NPCState 接口 + DataView 偏移适配
  - 新增 `game/ecs/components/RelationshipComponent.h`
  - 新增 `game/ecs/components/RoleCommandComponent.h`

---

## ADDED Requirements

### Requirement: 行为优先级仲裁树
系统 SHALL 采用 6 层优先级驱动行为树，高优先级行为可中断低优先级行为。

#### Scenario: 生存优先
- **WHEN** NPC HP < 30% 或处于战斗状态
- **THEN** 忽略所有低优先级行为，执行逃跑/治疗/防御

#### Scenario: 指令优先
- **WHEN** NPC 收到家族高级 NPC 的 RoleCommand
- **THEN** 在指令未过期前，优先执行指令指定的活动

#### Scenario: LLM 计划优先
- **WHEN** NPC 有 ACTIVE 状态的 LLM 计划
- **THEN** 按计划中的 SubTask 顺序执行

#### Scenario: 社交需求
- **WHEN** NPC 的社交欲望值超过阈值
- **THEN** 可能触发访友、约会、家族聚会、请教（师徒）等社交行为

#### Scenario: 修炼需求
- **WHEN** NPC 的修炼进度条积满或触发突破时机
- **THEN** 可能触发闭关修炼、渡劫突破、炼丹、寻访机缘等行为

#### Scenario: 日常循环
- **WHEN** 无任何高优先级触发
- **THEN** 按性格权重选择日常活动（劳作、巡逻、探索、交易、休息）

#### Scenario: 空闲兜底
- **WHEN** 所有活动条件不满足
- **THEN** 默认执行休息

### Requirement: NPCActivity 枚举扩展
NPCActivity 枚举 SHALL 覆盖以下行为类别：

| 类别 | 活动 |
|------|------|
| 生存 | Flee, Heal, Defend |
| 日常 | Eat, Rest, Sleep, Walk, Chat |
| 修炼 | Cultivate, Breakthrough, Tribulation, Meditate, Alchemy, SeekFortune |
| 社交 | VisitFriend, Date, FamilyGathering, MentorTeach, DiscipleAsk, Trade, Gossip |
| 指令执行 | Build, Mine, Farm, Fish, Attack, DefendPosition, Patrol, Escort, Gather, Scout |
| 生产 | Craft, Refine, Cook, Tailor, Construct, Repair |
| 经济 | Buy, Sell, Bargain, Auction |
| 战斗 | Duel, Hunt, Ambush, Assassinate |
| 探索 | Explore, TreasureHunt, MapExplore |
| 状态 | Idle, Dead, Incapacitated |

### Requirement: 每日循环与生理需求
系统 SHALL 为 NPC 维护生理状态，驱动日常活动选择。

#### Scenario: 饥饿驱动进食
- **WHEN** NPC 的饥饿值 > 阈值
- **THEN** NPC 移动到最近的食物来源并执行进食

#### Scenario: 疲劳驱动睡眠
- **WHEN** NPC 的疲劳值 > 阈值 且 当前时间为夜晚
- **THEN** NPC 移动回住所并执行睡眠

#### Scenario: 精力恢复
- **WHEN** NPC 执行休息或睡眠
- **THEN** 精力值逐步恢复，HP/MP 按比例恢复

### Requirement: 修炼系统
系统 SHALL 支持 NPC 自主修炼，包含境界突破和天劫。

#### Scenario: 境界突破
- **WHEN** NPC 修炼进度条积满 且 满足境界突破条件（资源、丹药）
- **THEN** NPC 进入突破状态，根据成功概率判定晋升或失败

#### Scenario: 渡天劫
- **WHEN** NPC 从元婴突破至化神时
- **THEN** 触发天劫事件，周围 NPC 可观察到天雷

#### Scenario: 炼丹
- **WHEN** NPC 拥有炼丹材料且性格偏向谨慎（caution > 60）
- **THEN** 可能触发炼丹行为，消耗材料产出丹药

#### Scenario: 寻访机缘
- **WHEN** NPC 性格 ambition > 70 且已卡瓶颈超过一定时间
- **THEN** 可能触发探索密境行为

### Requirement: 社交关系系统
系统 SHALL 维护 NPC 之间的关系并驱动社交行为。

#### Scenario: 关系类型
- **WHEN** NPC 被创建时
- **THEN** 分配潜在关系：家族成员、情侣候选人、师徒、好友、仇敌

#### Scenario: 访友
- **WHEN** 好友关系 NPC 距离较近且双方空闲
- **THEN** 可能触发访友行为，增加关系亲密度

#### Scenario: 情侣约会
- **WHEN** 情侣关系 NPC 满足约会条件（时间、位置、心情）
- **THEN** 触发约会行为，可能产出后代

#### Scenario: 师徒教导
- **WHEN** 师父 NPC 检测到徒弟存在
- **THEN** 可能触发教导行为，增加徒弟修为

#### Scenario: 家族聚会
- **WHEN** 家族族长/长老发起的聚会指令
- **THEN** 家族成员向指定位置聚集

### Requirement: 家族指令系统
系统 SHALL 支持家族高级 NPC 向低级成员下达指令。

#### Scenario: 指令下发
- **WHEN** 家族族长/长老 NPC 需要执行宏观策略（建城、战争、资源调配）
- **THEN** 生成 RoleCommandComponent 实例，目标为族内特定或全体成员

#### Scenario: 指令执行
- **WHEN** 底层 NPC 收到指令
- **THEN** 优先执行指令，完成后上报指令完成状态

#### Scenario: 指令过期
- **WHEN** 指令超过有效时间未被完成
- **THEN** 自动标记为 FAILED，NPC 恢复自由行为

#### Scenario: 拒绝指令
- **WHEN** NPC 性格 loyalty < 30 且指令有风险
- **THEN** 有一定概率拒绝指令

### Requirement: 资源的采与生产
系统 SHALL 支持 NPC 在世界中采集资源并进行加工生产。

#### Scenario: 挖矿
- **WHEN** NPC 被指令或自主选择挖矿
- **THEN** 移动到最近矿脉，按效率产出矿石

#### Scenario: 种田
- **WHEN** NPC 被指令或自主选择种田
- **THEN** 移动到农田，经过播种→生长→收获周期产出粮食

#### Scenario: 捕鱼
- **WHEN** NPC 被指令或自主选择捕鱼
- **THEN** 移动到最近渔场，按效率产出鱼获

#### Scenario: 建造
- **WHEN** 家族指令 NPC 建造建筑
- **THEN** NPC 移动到建造点，消耗材料并增加建造进度

#### Scenario: 伐木
- **WHEN** NPC 被指令或自主选择伐木
- **THEN** 移动到最近林地，按效率产出木材

### Requirement: 战斗扩展
系统 SHALL 扩展 CombatSystem 支持多种战斗模式。

#### Scenario: 狩猎
- **WHEN** NPC 自主或受命狩猎
- **THEN** 搜索附近可狩猎目标，进行战斗

#### Scenario: 家族攻防
- **WHEN** 家族间发生战争
- **THEN** 参战 NPC 执行进攻/防守指令，增加家族贡献

#### Scenario: 伏击
- **WHEN** 仇敌关系 NPC 相遇且一方 greed > 80
- **THEN** 可能触发伏击行为

### Requirement: WASM NPC 状态结构体适配
NPCStateWasm 结构体 SHALL 包含扩展行为所需的最小字段。

#### Scenario: 结构体扩展
- **WHEN** 导出 NPC 状态到前端
- **THEN** 包含 currentActivity(新枚举值)、relationshipCount、activeCommand 等字段

---

## MODIFIED Requirements

### Requirement: BehaviorTreeSystem 执行周期
原有 evaluate() + execute() 两步调用 SHALL 保持不变，但 evaluate() 内部逻辑从轮盘选择改为优先级仲裁树。execute() 分支从 4 个扩展到覆盖所有新活动类型。

### Requirement: PersonalityComponent 扩展
PersonalityComponent SHALL 新增 `sociability`（社交性）和 `diligence`（勤奋度）两个性格维度，影响社交和修炼/生产行为的权重。

---

## REMOVED Requirements

### Requirement: BehaviorWeight 轮盘选择
**Reason**: 权重轮盘随机选择无法表达优先级驱动的行为树决策逻辑。
**Migration**: 替换为 6 层优先级仲裁树，各层按条件触发。

### Requirement: NPCActivity 旧枚举值
**Reason**: 旧 10 个值（Patrol/Retreat/Logistics/Compete/Work/Rest/Trade/Flee/Chase/Dead）无法表达新行为系统。
**Migration**: 旧值映射到新枚举的对应值：
  Patrol → Patrol, Retreat → Cultivate, Logistics → Logistics, Compete → Duel, Work → Work, Rest → Rest, Trade → Trade, Flee → Flee, Chase → Hunt, Dead → Dead

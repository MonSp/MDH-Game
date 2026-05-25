# Tasks

## Phase 1: 数据模型扩展
- [x] Task 1: 扩展 NPCActivity 枚举（BehaviorComponent.h）
  - 从 10 个旧值扩展为 40+ 个新值，分类组织
  - 保留旧枚举值编号兼容性（通过注释标注旧值映射）
  - 更新 ECSWasmLoader.ts 中的 NPCActivity 映射表

- [x] Task 2: 新增 SocialComponent（社交状态）
  - 文件: `game/ecs/components/SocialComponent.h`
  - 字段: 饥饿值、疲劳值、精力值、社交欲望值、心情值（0-100 范围）
  - 每帧更新逻辑：随时间增减

- [x] Task 3: 新增 RelationshipComponent（NPC 关系）
  - 文件: `game/ecs/components/RelationshipComponent.h`
  - 枚举: RelationType（Family/Lover/MentorDisciple/Friend/Enemy/Neutral）
  - 结构体: Relationship = {targetEntityId, type, intimacy(0-100)}
  - 组件: vector<Relationship> relationships + 预分配关系池

- [x] Task 4: 新增 RoleCommandComponent（指令系统）
  - 文件: `game/ecs/components/RoleCommandComponent.h`
  - 字段: commandType(NPCActivity), issuerEntityId, targetX, targetY, deadline, status(Pending/Executing/Completed/Failed/Rejected)

- [x] Task 5: 新增 CultivationComponent（修炼进度）
  - 文件: `game/ecs/components/CultivationComponent.h`
  - 字段: cultivationProgress(0-1000), bottleneckTimer, hasElixir, isBreakingThrough, tribulationTimer
  - 突破概率: 按境界查表（Mortal→Qi: 90%, Qi→Foundation: 70%, ... Transcension+: 5%）

- [x] Task 6: 扩展 PersonalityComponent
  - 新增字段: sociability(float), diligence(float)
  - 扩展构造函数和默认值

- [x] Task 7: 扩展 StatsComponent
  - 新增字段: cultivationPower(int32_t) — 修炼相关攻击加成
  - 扩展构造函数

## Phase 2: 核心行为树重写
- [x] Task 8: 重写 BehaviorTreeSystem — 优先级仲裁树
  - 文件: `game/npc/BehaviorTreeSystem.h`
  - 6 层优先级:
    1. 生存层 (Survival) — HP < 30% 或战斗中
    2. 指令层 (Command) — 有有效 RoleCommand
    3. LLM 计划层 (LLM) — 有 ACTIVE 状态计划
    4. 社交层 (Social) — 社交欲望 > 阈值
    5. 修炼层 (Cultivation) — 修炼进度满或突破时机
    6. 日常层 (Daily) — 基于 6 维性格权重选择
  - 移除旧的 rouletteSelect() 和 calculateFamilyDutyWeights()
  - 新增每层对应的 evaluate 方法

- [x] Task 9: 实现执行层 execute() — 生存类活动
  - executeFlee(): 向远离威胁方向移动 + 回血
  - executeHeal(): 原地打坐疗伤
  - executeDefend(): 固守当前位置，攻击范围内敌人

- [x] Task 10: 实现执行层 execute() — 修炼类活动
  - executeCultivate(): 静止，增加 cultivationProgress
  - executeBreakthrough(): 判定突破概率，成功晋升/失败受伤
  - executeTribulation(): 持续掉血，度过则晋升
  - executeMeditate(): 缓慢恢复 MP + cultivationProgress
  - executeAlchemy(): 消耗材料，概率产出丹药
  - executeSeekFortune(): 向随机方向移动探索

- [x] Task 11: 实现执行层 execute() — 社交类活动
  - executeVisitFriend(): 向关系 NPC 移动，到达后增加 intimacy
  - executeDate(): 双向移动，到达后增加 intimacy + 可能生育
  - executeFamilyGathering(): 向聚会点移动
  - executeMentorTeach(): 师徒一对多教导，徒弟 cultivationProgress++
  - executeTrade(): 交换物品
  - executeGossip(): 停留原地，影响关系

- [x] Task 12: 实现执行层 execute() — 生产类活动
  - executeMine(): 移动到矿脉，产出矿石
  - executeFarm(): 移动到农田，按生长周期产出粮食
  - executeFish(): 移动到渔场，按效率产出鱼获
  - executeBuild(): 移动到建造点，消耗材料增加进度
  - executeCraft/executeRefine/executeCook/executeConstruct/executeRepair(): 停留原地，消耗材料产出物品

- [x] Task 13: 实现执行层 execute() — 日常/经济/探索类活动
  - executeEat(): 消耗食物恢复饥饿值
  - executeSleep(): 睡眠恢复精力 + HP/MP
  - executeWalk(): 随机漫游
  - executeBuy/Sell/Bargain/Auction(): 简易交易
  - executeExplore(): 向未探索区域移动

- [x] Task 14: 扩展 CombatSystem
  - 新增 executeDuel(): 单挑另一个 NPC
  - 新增 executeHunt(): 搜索并攻击怪物
  - 新增 executeAmbush(): 判定伏击先手
  - 新增 executeAssassinate(): 高风险高回报刺杀

## Phase 3: 集成与适配
- [x] Task 15: 更新 Registry.h — 注册新组件
  - 新增 SocialComponent、RelationshipComponent、RoleCommandComponent、CultivationComponent 的 SoA 数组
  - 更新 getArray() 模板特化
  - 更新 createEntity() 的默认初始化

- [x] Task 16: 适配 NPCCreationSystem
  - createNPC() 初始化新组件的默认值
  - createPersonalityByNation() 增加 sociability/diligence 随机值
  - 预分配关系网络（家族成员间的关系边）

- [x] Task 17: 适配 NPChunkUpdateSystem
  - updateSingleNPC() 中调用 SocialComponent 的每帧更新
  - 正确传递新增组件的指针给 BehaviorTreeSystem

- [x] Task 18: 适配 MovementSystem
  - 新增 ResourceNode 寻路目标类型（矿脉、农田、渔场、林地坐标）
  - 新增 NPC 实体寻路（向另一个 NPC 移动）

- [x] Task 19: 适配 LLMComponent ActionType 枚举
  - 与 NPCActivity 新枚举值对齐映射
  - 更新 translateActionType() 映射表

- [x] Task 20: 适配 WASM 导出层 + TypeScript
  - wasm_exports.cpp: 更新 ecs_getNPCStates() 写入 SocialComponent + currentActivity 新值
  - ECSWasmLoader.ts: 更新 NPCState 接口 + DataView 偏移 + NPCActivity 映射表
  - 保持 NPCStateWasm 128 字节不变

## Phase 4: 验证
- [x] Task 21: 编译验证
  - emcc WASM 编译 zero error
  - TypeScript 类型检查通过
  - g++ 原生语法检查通过

- [x] Task 22: 设计验证
  - 所有 Scenario 对应的代码路径可通过 review 追溯

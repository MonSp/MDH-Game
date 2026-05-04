# 系统实现状态总览

> 最后更新: 2026-05-04 | 版本: 1.8.2.0

---

## 图例

- ✅ **完整实现** — 有状态、逻辑、UI、测试
- ◐ **部分实现** — 核心功能存在但未完全打通
- 🏗️ **骨架/占位** — 结构有但未集成到运行时
- ❌ **未实现** — 尚不存在

---

## 一、核心玩法系统

### ✅ 1. 角色与移动系统

**状态**: `gameStore.ts` — `player`, `movePlayer()`
**UI**: `Game.tsx` (WASD 键盘控制), `Map2D.tsx` (2.5D 地图渲染)
**服务端**: `PlayerService.ts` (状态机: idle/moving/sitting/fighting/dead)
**测试**: `gameStore.test.ts`

**功能清单**:
- [x] WASD 网格移动，赵国有 20% 双倍移动概率
- [x] 位置追踪 (x, y 坐标)
- [x] 服务器端 Player 状态机 (PlayerService)
- [x] 国家文化 buff 加成

---

### ✅ 2. 修炼与突破系统

**状态**: `gameStore.ts` — `cultivate()`, `modifyTalent()`
**UI**: `HUD.tsx` (打坐修炼按钮 + 可突破动画提示)
**服务端**: `CultivationService.ts`
**测试**: `cultivation.test.ts`

**功能清单**:
- [x] 打坐修炼获取经验，受 heaven 倍率、灵根/500、国家 buff、练功房 buff 影响
- [x] 10 大境界：凡人→练气→筑基→金丹→元婴→化神→炼虚→合体→大乘→渡劫
- [x] 自动突破（经验满 + 灵石足够）
- [x] 突破消耗灵石，受悟性折扣影响
- [x] Max realm 受 heaven level 限制
- [x] 境界满后可飞升（Ascension）
- [x] 4 项天赋属性：灵根/根骨/悟性/机缘（0-100，中文评级）

---

### ✅ 3. 战斗系统

**状态**: `gameStore.ts` — `updateNPCs()` 中的战斗逻辑
**UI**: `Map2D.tsx` (怪物渲染 + HP 条 + 伤害数字)
**测试**: `combat.test.ts`

**功能清单**:
- [x] 玩家 vs NPC（攻击/交易/交谈）
- [x] 玩家 vs 怪物（相邻自动战斗）
- [x] NPC vs 怪物（独立战斗 + 撤退/恢复 AI）
- [x] 队员 vs 怪物（藏经阁 buff + 忠诚倍率 + 升级机制）
- [x] 平方伤害公式: `atk²/(atk+def)`，最小 1 点伤害
- [x] 7 种怪物：赤焰蛇→金翅大鹏（练气→合体）
- [x] 怪物生成：15% 概率/tick，5-10 格范围，最多 6 只
- [x] 怪物 AI：向最近实体移动 1 格/tick，超出 20 格消失
- [x] 玩家死亡：回到主城 1 HP
- [x] Qin 国攻击加成
- [x] 执法者追击（作恶后）

---

### ✅ 4. 资源采集系统

**状态**: `gameStore.ts` — `interactWithResource()`
**UI**: `Map2D.tsx` (资源点渲染)
**服务端**: `ResourceService.ts`
**测试**: 无专门测试文件

**功能清单**:
- [x] 3 种资源点：灵田（经验）、矿脉（灵石）、遗迹（灵石+洗髓丹）
- [x] 采集时附近生成新资源点
- [x] 机缘触发双倍收益
- [x] 服务器端 ResourceManager (1000x1000 地图)

---

### ✅ 5. 市场与经济系统

**状态**: `gameStore.ts` — `buyItem()`, `sellItem()`, `updateMarketPrices()`
**UI**: `MarketPanel.tsx`
**服务端**: `EconomyService.ts`, `ItemService.ts`, `MarketService.ts`
**测试**: 无专门测试文件

**功能清单**:
- [x] 5 种商品：洗髓丹、低级法器、回血丹、聚气散、飞升令
- [x] 动态价格波动：每 tick +/-5%
- [x] 跨国产税：非魏国玩家 15% 额外税
- [x] 卖出价 80%
- [x] 价格钳制：基础价 50%-200%

---

### ✅ 6. 物品与道具系统

**状态**: `gameStore.ts` — `useItem()`, 物品栏 `player.items`
**UI**: `HUD.tsx` (使用 洗髓丹)
**服务端**: 物品列表 `items.ts`
**测试**: 无专门测试文件

**功能清单**:
- [x] 洗髓丹：改变体质（凡体→剑体/雷灵体/药王体/战体），丹房 buff 加成
- [x] 体质 7 种：凡体、仙体、神体、剑体、雷灵体、药王体、战体
- [x] 装备道具：低级法器（+10 战力）
- [x] 物品栏：`string → number` 映射

---

## 二、小队系统

### ✅ 7. Squad 队员管理

**状态**: `gameStore.ts` — `squadMembers[]`, `recruitToSquad()`, `dismissFromSquad()`
**UI**: `SquadPanel.tsx`
**测试**: `squad-system.test.ts`, `squad.test.ts`

**功能清单**:
- [x] 从 NPC 招募队员（根据性格自动识别角色）
- [x] 4 种角色：护卫/力士/术士/谋士，各自属性加成
- [x] 解雇队员（装备归还）
- [x] 重新分配角色
- [x] 最大队员数：1/3/7/15（按声望分段）
- [x] 招募条件：声望 + 灵石，角色不同成本不同
- [x] 队员装备：装备/卸下装备
- [x] 队员升级：战斗获得经验升级
- [x] 队员离队：忠诚<20 或士气<30 时 5% 概率
- [x] 阵型跟随：按角色排列在玩家周围

---

## 三、势力与建筑系统

### ✅ 8. 势力创建与管理

**状态**: `gameStore.ts` — `playerFactionId`, `createFaction()`
**UI**: `FactionPanel.tsx`
**测试**: `faction.test.ts`

**功能清单**:
- [x] 创建条件：≥3 队员、≥500 声望、≥100K 灵石
- [x] 初始为 3 级势力，可升级至 2 级/1 级
- [x] 升级消耗：声望 + 灵石
- [x] 领地税收：按领地块数计算
- [x] 任命官员：长老/供奉（仅记录文本，无实际效果）

---

### ✅ 9. 势力建筑

**状态**: `gameStore.ts` — `upgradeBuilding()`, `BUILDING_EFFECTS`
**UI**: `FactionPanel.tsx` (建筑 tab)
**测试**: `building-effects.test.ts`

**功能清单**:
- [x] 6 种建筑，最高 3 级：
  - **议事厅** — 税收效率
  - **练功房** — 修炼速度 x1.1/1.2/1.3
  - **丹房** — 洗髓丹效果 x1.1/1.2/1.3
  - **藏经阁** — 队员攻防 x1.05/1.10/1.15
  - **库房** — 国库容量 + 被动收入
  - **哨塔** — 视野距离 + 地图缩放
- [x] 升级消耗逐级递增（灵石）
- [x] 士气系统：默认 50，税收影响，<20 时警告 + 50% 税收惩罚

---

## 四、外交与战争系统

### ✅ 10. 外交/战争

**状态**: `gameStore.ts` — `clans[].diplomacy`, `setDiplomacy()`, `declareWar()` 等
**UI**: `DiplomacyPanel.tsx`, `Map2D.tsx` (战争脉动光环)
**测试**: `diplomacy.test.ts`

**功能清单**:
- [x] 6 种状态：中立/同盟/战争/停战/臣服/皇族
- [x] 双向状态管理：一方操作自动更新双方
- [x] 宣战：设为战争状态
- [x] 结盟：同盟+时间戳
- [x] 停战：2 分钟自动到期
- [x] 臣服：上缴 10% 国库
- [x] 断盟：移除同盟
- [x] 战争状态 NPC 自动攻击玩家
- [x] 冲突等级：和平/摩擦/局部冲突/全面战争

---

## 五、NPC 系统

### ✅ 11. NPC 世界（LLM 驱动）

**状态**: `NPCWorldService.ts` (服务端), `gameStore.ts` — `nearbyNPCs`, `interactWithNPC()`
**UI**: `Map2D.tsx` (NPC 渲染 + 交互), `ScenePanel.tsx` (对话)
**服务端**: `NPCWorldService.ts`, `NPCMemory.ts`, `PlanParser.ts`, `LLMHttpClient.ts`
**测试**: `npc-world-service.test.ts`, `npc-memory.test.ts`, `llm-http-client-dialogue.test.ts`, `llm-parser.test.ts`

**功能清单**:
- [x] 50 NPC 世界模拟（服务端）
- [x] LLM 驱动的 NPC 规划（Gemini/OpenAI-compatible）
- [x] 确定性 fallback 规划
- [x] NPC 关系矩阵（50x50）、交互记录、见证事件
- [x] LLM NPC 对话（场景中触发）
- [x] 脚本对话 fallback 链：LLM→dialogueMap→通用模板
- [x] 每 NPC 5 分钟冷却防重复调用
- [x] 对话提示注入防御（NPC ID 校验、上下文清洗）
- [x] NPC 出生/行为树评估
- [x] Chronicle WebSocket 事件流

---

## 六、场景与叙事

### ✅ 12. 场景叙事系统

**状态**: `ScenePanel.tsx`, `src/content/scenes/`
**UI**: `ScenePanel.tsx` (3 种状态: CHOOSING/LOADING/DIALOGUE)
**测试**: `scene-panel.test.ts`, `scene-registry.test.ts`, `sceneDialogue.test.ts`, `server-dialogue-utils.test.ts`, `effect-utils.test.ts`

**功能清单**:
- [x] 分支叙事：选项→效果（天赋/修为/灵石/声望/HP/物品/debuff/场景切换/地图跳转）
- [x] NPC 记忆条件选项（`npcMemory` 条件过滤）
- [x] 坐标触发场景（家族大院 55,48、恩怨 55,45 等）
- [x] LLM 驱动的 NPC 对话（15 秒超时）
- [x] 对话 fallback：LLM→脚本→通用模板
- [x] 面包屑导航
- [x] 动画：渐入、毛玻璃背景、标题滑入
- [x] 内容文件：`intro.ts`（4 场景）、`family.ts`、`grudgeScene.ts`（宿怨 二阶段叙事）
  - **Phase 1**: 村口相遇 — 选择帮助/抢劫/无视 → 记忆写入
  - **Phase 2**: 重逢路由 — 按记忆分歧(被抢/被帮/被无视)触发不同场景
  - 李四入队、被动保护（HP<20% 自动回血，30s 冷却）
- [x] 效果引擎纯函数提取：`effectUtils.ts` — 10 个导出函数，100% 分支覆盖
- [x] 效果类型拓展：HP ±、物品增减、debuff（同名去重/属性钳制[0,1]）、灵石百分比损失

---

## 七、飞升与轮回系统

### ✅ 13. 飞升 (Ascension)

**状态**: `gameStore.ts` — `attemptAscension()`
**测试**: `cultivation.test.ts` (覆盖)

**功能清单**:
- [x] 条件：满境界 + 飞升令 x1 + 100K 灵石 + 完成 3 个飞升任务
- [x] 90% 成功率
- [x] 进入下一重天，重置境界到化神
- [x] 3 个飞升任务（晋升任务系统）
- [x] 9 重天境界限制递增

---

### ◐ 14. 轮回 (Cycle Rebirth)

**状态**: `gameStore.ts` — `performCycleRebirth()`
**测试**: 无专门测试

**功能清单**:
- [x] 3 种类型：神念投影（临时分身）、真灵转世（重生凡人）、道统传承（留遗产，捐 50% 灵石）
- [x] 7 天冷却检查
- [ ] 投影分身实际玩法未实现
- [ ] 转世后的世界状态变更未完整测试

---

## 八、存档系统

### ✅ 15. 存档/读档

**状态**: `gameStore.ts` — `saveToSlot()`, `loadFromSlot()`
**模块**: `saveManager.ts`
**测试**: 无专门测试

**功能清单**:
- [x] 3 个存档位（localStorage）
- [x] 自动存档（60 秒间隔）
- [x] 向后兼容（加载时补全新字段）

---

## 九、部分实现的系统

### ◐ 16. 服务器端玩家服务

**文件**: `PlayerService.ts`
**状态**: `player` 类完整实现（状态机、回血、伤害、突破），但通过 Socket.IO 暴露的事件处理不完整。
**问题**: 客户端 `gameStore.ts` 是实际游戏模拟，服务端 PlayerService 是并行体系，两者未完全打通。

### ◐ 17. 服务端 NPC 行为树

**文件**: `NPCService.ts` — `BehaviorTree`, `BehaviorExecutor`
**状态**: 行为树评估逻辑完成，但 `execute*` 方法多数为 stub（patrol, chase, trade, compete）。
**问题**: 客户端侧 `evaluateNPCBehavior()` 是实际运行的 NPC AI，服务端行为树未使用。

### ◐ 18. 服务端死亡/寿命系统

**文件**: `DeathService.ts`
**状态**: 掉落计算、灵魂池、世界恢复池存在，社交影响和通知为 stub。未接入实际 gameplay。

### ◐ 19. 服务端人口系统

**文件**: `PopulationService.ts`
**状态**: PID 控制器完整，平衡控制器有逻辑但使用假数据。未接入实际 gameplay。

### ◐ 20. 飞升后跨天世界

**状态**: ascension 后进入下一重天，重置境界，在新天生成 clan/NPC/资源。但游戏目前只启动在天 9（凡界）。

---

## 十、骨架/未使用系统

### 🏗️ 21. C++ ECS 引擎

**文件**: `src/server/game/ecs/`, `src/server/game/npc/`, `src/server/game/job/`, `src/server/game/ipc/`
**状态**: 完整的 header-only ECS（8 组件、5 系统、3 NPC 子系统、LLM 规划、IPC、线程池）。**未编译，未使用**。

### 🏗️ 22. LLM 网关服务

**文件**: `src/server/game/services/LLMGatewayService.ts`, `LLMIntegrationManager.ts`, `LLMPlanningService.ts`
**状态**: 存在但未从游戏循环中调用。

### 🏗️ 23. 服务端 NPCBehaviorTree

**文件**: `src/server/game/services/NPCBehaviorTree.ts`
**状态**: 与 `gameStore.ts` 的 `evaluateNPCBehavior()` 分离的另一套行为树，未使用。

### 🏗️ 24. 服务端物品数据库

**文件**: `EconomyService.ts` (ItemService)
**状态**: 8 个硬编码物品，但与客户端市场商品清单分离。

---

## 十一、未实现系统

### ❌ 25. 多人联机
- 无多玩家交互。服务器创建玩家但玩家间没有互动。
- 无聊天系统、组队系统、PVP

### ❌ 26. 真实地图
- 玩家在 2D 网格上移动但无碰撞检测、无地形类型、无障碍物
- 无迷雾探索机制

### ❌ 27. 合成/炼丹系统
- 无合成/制造系统
- 体质只做一次性升级

### ❌ 28. 技能/法术系统
- 无技能、法术、功法、战斗技能
- 只有基础攻击（相邻自动攻击）

### ❌ 29. 装备多样性
- 只有 1 件可装备物品（低级法器）
- 无装备栏位、无装备部位概念
- 无装备稀有度/词条系统

### ❌ 30. 任务/活动系统
- 仅飞升任务（3 个晋升任务）
- 无支线任务、日常任务、NPC 任务发布

---

## 十二、测试覆盖统计

```
test/ 目录共计 19 个文件，488 个测试全部通过

building-effects.test.ts         ✅ 建筑效果
combat.test.ts                   ✅ 战斗机制
cultivation.test.ts              ✅ 修炼突破
dialogue-prompts.test.ts         ✅ 对话提示
diplomacy.test.ts                ✅ 外交战争
effect-utils.test.ts             ✅ 效果引擎（56 测试，纯函数 100% 分支覆盖）
faction.test.ts                  ✅ 势力系统
gameStore.test.ts                ✅ 游戏初始化
llm-http-client-dialogue.test.ts ✅ LLM 对话客户端
llm-parser.test.ts               ✅ LLM 响应解析
npc-memory.test.ts               ✅ NPC 记忆
npc-world-service.test.ts        ✅ NPC 世界服务
scene-panel.test.ts              ✅ 场景面板
scene-registry.test.ts           ✅ 场景注册
sceneDialogue.test.ts            ✅ 场景对话
server-dialogue-utils.test.ts    ✅ 服务端对话工具
squad-system.test.ts             ✅ 小队系统
squad.test.ts                    ✅ 小队机制
talent.test.ts                   ✅ 天赋属性

其他测试文件:
test/llm-deterministic-benchmark.ts  ✅ LLM vs 确定性基准
test/llm-parser.smoke.ts             ✅ LLM 解析冒烟测试
```

---

## 总结

| 类别 | 完整实现 | 部分实现 | 骨架 | 未实现 |
|------|---------|---------|------|-------|
| 核心玩法 | 6 | 0 | 0 | 0 |
| 小队系统 | 1 | 0 | 0 | 0 |
| 势力建筑 | 2 | 0 | 0 | 0 |
| 外交战争 | 1 | 0 | 0 | 0 |
| NPC 系统 | 1 | 2 | 2 | 0 |
| 场景叙事 | 1 | 0 | 0 | 0 |
| 飞升轮回 | 1 | 1 | 0 | 0 |
| 存档 | 1 | 0 | 0 | 0 |
| 扩展系统 | 0 | 0 | 0 | 6 |
| **合计** | **14** | **3** | **2** | **6** |

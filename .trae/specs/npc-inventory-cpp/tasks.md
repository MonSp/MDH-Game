# Tasks

- [x] Task 1: 创建 ItemRegistry.h 物品 ID 注册表
  - [x] 1.1 创建 `/src/server/game/economy/ItemRegistry.h`，定义 `ItemId` 命名空间常量（15 种物品）
  - [x] 1.2 实现 `ItemRegistry::getBaseValue(itemId)` 和 `commodityToItem(CommodityType)`
  - **验证**: 编译通过，ItemId 常量可引用

- [x] Task 2: 重构 ResourcesComponent 为 ItemSlot
  - [x] 2.1 新增 `ItemSlot { uint32_t itemId; int32_t count; }` 结构体
  - [x] 2.2 `ResourcesComponent` 中 `std::vector<Item>` → `std::vector<ItemSlot>`
  - [x] 2.3 重写 `addItem(itemId, count)` 支持堆叠
  - [x] 2.4 重写 `removeItem(itemId, count)` 支持部分扣除
  - [x] 2.5 新增 `getItemCount(itemId)` 查询方法
  - [x] 2.6 新增 `getTotalItemKinds()` 返回物品种类数
  - [x] 2.7 添加 `equipmentItemId` 字段（uint32_t，0=无装备）
  - **验证**: 编译通过，addItem/removeItem 逻辑正确

- [x] Task 3: 扩容 NPCStateWasm + 新增 ecs_getNPCItems WASM 导出
  - [x] 3.1 `NPCStateWasm` 中 `_pad[0]` → `uint8_t itemCount`，`_pad[1]` → `uint8_t equipmentItemId`，保持 140 字节
  - [x] 3.2 修改 `ecs_getNPCStates` 填充 itemCount 和 equipmentItemId
  - [x] 3.3 新增 `ecs_getNPCItems(entityId, outBuf, maxSlots)` 函数：输出 [itemId, count] 对
  - [x] 3.4 `ecs_getNPCItems` 附带返回 spiritStones 和 familyContribution
  - **验证**: 编译通过，WASM 导出正确

- [x] Task 4: 生产行为接入 Items
  - [x] 4.1 `exec_mine`: 添加 `resources->addItem(ItemId::ORE, 15)`
  - [x] 4.2 `exec_farm`: 添加 `resources->addItem(ItemId::FOOD, rand(30,60))`
  - [x] 4.3 `exec_fish`: 添加 `resources->addItem(ItemId::FOOD, 10)`
  - [x] 4.4 `exec_lumber`: 添加 `resources->addItem(ItemId::MATERIALS, 8)`
  - [x] 4.5 `exec_gather`: 添加 `resources->addItem(ItemId::MATERIALS, 5)`
  - [x] 4.6 `exec_craft`: `removeItem(ORE, 5)` → `addItem(EQUIPMENT, 1)`
  - [x] 4.7 `exec_refine`: `removeItem(ORE, 8)` → `addItem(MATERIALS, 2)`
  - [x] 4.8 `exec_cook`: `removeItem(FOOD, 2)` → `addItem(FOOD, rand(2,3))`
  - [x] 4.9 `exec_tailor`: `removeItem(MATERIALS, 3)` → `addItem(EQUIPMENT, 1)`
  - [x] 4.10 `exec_alchemy`: `addItem(PILLS, 1)`
  - [x] 4.11 `exec_sell`: `removeItem(EQUIPMENT, 1)` + spiritStones
  - [x] 4.12 `exec_buy`: spiritStones − cost → `addItem(EQUIPMENT, 1)`
  - [x] 4.13 `exec_trade (Social)`: NPC 间物品转移
  - [x] 4.14 行为缺少材料时检查 items 并拒绝执行
  - **验证**: 编译通过，生产行为正确读写 NPC items

- [x] Task 5: TS 端 ECSWasmLoader 适配
  - [x] 5.1 `NPCState` 接口新增 `itemCount: number`，`equipmentItemId: number`
  - [x] 5.2 `readNPCStates()` 解析 offset 133-134 新字段
  - [x] 5.3 新增 `wasmGetNPCItems(entityId, maxSlots)` 封装函数
  - [x] 5.4 新增 `CGetNPCItemsFn` 类型声明
  - [x] 5.5 `initECSWasm` 绑定 `ecs_getNPCItems`
  - **验证**: TS 编译通过

- [x] Task 6: TS 端 NPCResources 数据源切换
  - [x] 6.1 `NPCResources.items` 接口调整：从 `string[]` 改为 `{ itemId: number; name: string; count: number }[]`
  - [x] 6.2 `NPCService` 中物品相关逻辑改为从 WASM `wasmGetNPCItems` 获取
  - [x] 6.3 移除 `NPCService` 中独立的 items 维护逻辑（push/pop/数组操作）
  - [x] 6.4 添加物品名称本地化映射表（ItemId → 中文名）
  - **验证**: TS 编译通过，NPC 物品展示正确

# Task Dependencies
- Task 2 依赖 Task 1（ResourcesComponent 引用 ItemId）
- Task 3 依赖 Task 2（WASM 导出依赖 ItemSlot 结构）
- Task 4 依赖 Task 1, Task 2（生产行为引用 ItemId + ResourcesComponent 新 API）
- Task 5 依赖 Task 3（TS 封装依赖 WASM 导出）
- Task 6 依赖 Task 5（NPCResources 依赖 TS 封装）

# 可并行执行组
**第一组（无依赖）**: Task 1
**第二组（依赖 Task 1，可并行）**: Task 2, Task 4（Task 4 需要 ItemId 但可先写结构）
**第三组（依赖 Task 2）**: Task 3
**第四组（依赖 Task 3）**: Task 5
**第五组（依赖 Task 5）**: Task 6

# NPC 个人物品系统 C++ 迁移 Spec

## Why
当前 NPC 个人物品数据散落在三套独立系统：C++ `ResourcesComponent`（声明了但几乎不用）、WASM `NPCStateWasm`（只导出灵石，物品/装备/贡献全部丢失）、TS `NPCResources`（自己维护了一套）。生产行为绕过 `items` 直接操作 CommodityPool，NPC 之间无法物物交换。需要将 NPC 个人物品系统统一到 C++ 作为唯一数据源，按需通过 WASM 导出到 TS 展示。

## What Changes
- **BREAKING**: `Item` 结构体重构为 `ItemSlot { uint32_t itemId; int32_t count; }`，支持堆叠
- `ResourcesComponent.items` 从 `vector<Item>` 改为 `vector<ItemSlot>`
- `NPCStateWasm` 新增 `itemCount`（uint8_t），利用现有 `_pad` 空间，保持 140 字节不变
- 新增 WASM 导出 `ecs_getNPCItems(entityId, outBuf, maxSlots)` 按需拉取物品详情
- 生产行为接入：`exec_mine` 产出矿石 → `addItem(ORE_ID, 15)`
- NPC 间交易支持物物交换
- TS 端 `NPCResources.items` 改为从 WASM 读取，移除独立维护

## Impact
- Affected specs: economy-system, economy-market-engine, npc-behavior-system-v7.3
- Affected code:
  - C++ 重构: `ResourcesComponent.h`（Item → ItemSlot）
  - C++ 修改: `BehaviorTree_Production.h`（生产行为接入 items）
  - C++ 修改: `wasm_exports.cpp`（扩容 NPCStateWasm + 新增 ecs_getNPCItems）
  - C++ 新增: `ItemRegistry.h`（物品 ID 注册表）
  - TS 修改: `ECSWasmLoader.ts`（NPCState 新增字段 + wasmGetNPCItems）
  - TS 修改: `NPCService.ts`（NPCResources 改为 WASM 数据）
  - TS 修改: `npc.ts`（NPCResources 接口调整）

## ADDED Requirements

### Requirement: ItemSlot — 堆叠物品数据结构
系统 SHALL 使用 `ItemSlot` 替代 `Item` 作为物品存储单元，支持同种物品堆叠。

```
ItemSlot { uint32_t itemId; int32_t count; }
```

#### Item ID 注册表
| itemId | 名称 | 类型 | 基准价值 |
|:---|:---|:---|:---|
| 0 | 空（无物品） | — | 0 |
| 1 | 矿石 | 原料 | 5 |
| 2 | 食物 | 消耗品 | 3 |
| 3 | 材料 | 原料 | 4 |
| 4 | 丹药 | 消耗品 | 80 |
| 5 | 装备 | 装备 | 40 |
| 6 | 练气丹 | 丹药 | 100 |
| 7 | 筑基丹 | 丹药 | 1000 |
| 8 | 洗髓丹 | 丹药 | 500 |
| 9 | 低级法器 | 装备 | 200 |
| 10 | 中级法器 | 装备 | 800 |
| 11 | 聚气散 | 丹药 | 100 |
| 12 | 飞升令 | 特殊 | 10000 |
| 13 | 灵草 | 原料 | 50 |
| 14 | 灵石碎片 | 原料 | 10 |
| 15 | 妖兽材料 | 原料 | 150 |

#### Scenario: NPC 采矿获得矿石
- **WHEN** NPC 完成采矿（exec_mine）
- **THEN** `resources->addItem(1, 15)`，矿石 itemId=1，数量+15
- **THEN** `itemCount` 自动更新

#### Scenario: 同种物品堆叠
- **WHEN** NPC 已有 10 矿石，再次获得 5 矿石
- **THEN** items 中矿石条目 count 从 10 变为 15，而非新增一条

#### Scenario: 移除物品
- **WHEN** NPC 消耗 3 矿石用于锻造
- **THEN** `removeItem(1, 3)`
- **THEN** 若 count 减少到 0，从 items 中删除该条目

---

### Requirement: ResourcesComponent 重构
`ResourcesComponent` SHALL 使用 `vector<ItemSlot>` 存储物品，并提供 count-based 的 addItem/removeItem。

#### Scenario: addItem 堆叠逻辑
- **WHEN** `addItem(itemId, count)` 被调用
- **THEN** 若 items 中已有同 itemId 条目，累加 count
- **THEN** 若不存在，新增 ItemSlot{itemId, count}

#### Scenario: removeItem 扣除逻辑
- **WHEN** `removeItem(itemId, count)` 被调用
- **THEN** 若条目不存在，返回 false
- **THEN** 若 count > 条目 count，返回 false
- **THEN** 若 count == 条目 count，删除该条目
- **THEN** 若 count < 条目 count，减少 count

---

### Requirement: ItemRegistry — 物品 ID 注册表
系统 SHALL 提供 `ItemRegistry` 头文件，定义所有物品 ID 常量和物品元数据查询。

#### 常量定义
```cpp
namespace ItemId {
    static constexpr uint32_t ORE = 1;
    static constexpr uint32_t FOOD = 2;
    static constexpr uint32_t MATERIALS = 3;
    static constexpr uint32_t PILLS = 4;
    static constexpr uint32_t EQUIPMENT = 5;
    static constexpr uint32_t QI_REFINING_PILL = 6;
    static constexpr uint32_t FOUNDATION_PILL = 7;
    static constexpr uint32_t WASH_MARROW_PILL = 8;
    // ...
}
```

#### Scenario: 查询物品信息
- **WHEN** `ItemRegistry::getBaseValue(itemId)` 被调用
- **THEN** 返回该物品的基准价值

#### Scenario: CommodityType 与 ItemId 互转
- **WHEN** 需要从 CommodityType 映射到 ItemId
- **THEN** `ItemRegistry::commodityToItem(CommodityType::Ore)` → `ItemId::ORE`

---

### Requirement: WASM — NPCStateWasm 扩容
`NPCStateWasm` SHALL 在保持 140 字节的前提下，利用 `_pad` 空间新增 `itemCount`，并新增 `familyContribution` 和 `equipmentItemId` 字段。

#### 布局变更
```
offset 133: uint8_t itemCount          (原 _pad[0])
offset 134: uint8_t equipmentItemId    (原 _pad[1])
offset 135: uint8_t _pad               (原 _pad[2])
```

> `familyContribution` 为 int32_t（4 字节），无法放入 3 字节 _pad。改为通过按需拉取 `ecs_getNPCItems` 一并返回。

#### Scenario: 读取 NPCState
- **WHEN** TS 端调用 `readNPCStates()`
- **THEN** 每个 NPCState 包含 `itemCount` 和 `equipmentItemId`
- **THEN** 若 `itemCount > 0`，可调用 `wasmGetNPCItems(entityId, itemCount)` 拉取详情

---

### Requirement: WASM — ecs_getNPCItems 按需拉取
系统 SHALL 新增 WASM 导出函数，按 entityId 拉取该 NPC 的物品列表。

```cpp
void ecs_getNPCItems(uint64_t entityId, int32_t* outBuf, int maxSlots);
```

#### 输出格式
每个物品槽位 3 个 int32：`[itemId, count, familyContribution(仅首槽)]`

#### Scenario: 前端打开 NPC 背包
- **WHEN** TS 端调用 `wasmGetNPCItems(entityId, maxSlots)`
- **THEN** 返回该 NPC 的所有物品条目（itemId + count）
- **THEN** 返回中附带 `familyContribution` 和 `spiritStones`

---

### Requirement: 生产行为接入 Items
所有生产行为 SHALL 在操作 CommodityPool 的同时，向 NPC 的 `ResourcesComponent.items` 写入/移除对应物品。

#### 行为改造映射
| 行为 | items 移除 | items 添加 |
|:---|:---|:---|
| Mine | — | addItem(ItemId::ORE, 15) |
| Farm | — | addItem(ItemId::FOOD, rand(30,60)) |
| Fish | — | addItem(ItemId::FOOD, 10) |
| Lumber | — | addItem(ItemId::MATERIALS, 8) |
| Gather | — | addItem(ItemId::MATERIALS, 5) |
| Craft | removeItem(ItemId::ORE, 5) | addItem(ItemId::EQUIPMENT, 1) |
| Refine | removeItem(ItemId::ORE, 8) | addItem(ItemId::MATERIALS, 2) |
| Cook | removeItem(ItemId::FOOD, 2) | addItem(ItemId::FOOD, rand(2,3)) |
| Tailor | removeItem(ItemId::MATERIALS, 3) | addItem(ItemId::EQUIPMENT, 1) |
| Alchemy | — | addItem(ItemId::PILLS, 1) |
| Sell | removeItem(ItemId::EQUIPMENT, 1) | spiritStones += amount |
| Buy | spiritStones -= amount | addItem(ItemId::EQUIPMENT, 1) |

#### Scenario: NPC 无足够材料时行为失败
- **WHEN** NPC 执行 Craft，但 items 中矿石 < 5
- **THEN** Craft 不执行，NPC 切换到 Rest

---

### Requirement: NPC 间物物交换
`exec_trade` SHALL 支持 NPC 间交换物品和灵石。

#### Scenario: NPC A 向 NPC B 购买装备
- **WHEN** NPC A 执行 Trade
- **THEN** NPC A: `removeSpiritStones(price)`, `addItem(ItemId::EQUIPMENT, 1)`
- **THEN** NPC B: `addSpiritStones(price)`, `removeItem(ItemId::EQUIPMENT, 1)`

---

### Requirement: TS 端数据流改造
`NPCResources.items` SHALL 从 WASM `wasmGetNPCItems` 获取数据，不再独立维护。

#### Scenario: NPCResources 从 WASM 同步
- **WHEN** `NPCService` 需要获取 NPC 的物品信息
- **THEN** 先从 `NPCState.itemCount` 判断是否有物品
- **THEN** 若有物品，调用 `wasmGetNPCItems(entityId, itemCount)` 获取详情
- **THEN** 构建 `NPCResources { spiritStones, items, equipment, familyContribution }`

## MODIFIED Requirements

### Requirement: NPCStateWasm 结构体
来自 wasm_exports.cpp 的 MODIFIED 需求：`NPCStateWasm` SHALL 保持 140 字节，复用 `_pad[3]` 为 `itemCount`(uint8_t) + `equipmentItemId`(uint8_t) + 保留 padding。

### Requirement: ResourcesComponent 接口
来自 ResourcesComponent.h 的 MODIFIED 需求：`addItem` / `removeItem` SHALL 接受 `(uint32_t itemId, int32_t count)` 参数，支持堆叠。

## REMOVED Requirements
N/A

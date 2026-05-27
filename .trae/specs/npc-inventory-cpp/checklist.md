# Checklist

## ItemRegistry
- [x] ItemId 命名空间定义 15 种物品常量（id 0-15）
- [x] getBaseValue(itemId) 返回基准价值
- [x] commodityToItem(CommodityType) 正确映射

## ResourcesComponent (ItemSlot)
- [x] `ItemSlot { itemId: uint32_t, count: int32_t }` 结构体定义
- [x] items 类型为 `std::vector<ItemSlot>`
- [x] addItem(itemId, count) 同 itemId 堆叠
- [x] removeItem(itemId, count) 部分扣除 / 完全删除 / 不足拒回
- [x] getItemCount(itemId) 查询
- [x] equipmentItemId 字段存在（0=无装备）

## WASM NPCStateWasm 扩容
- [x] NPCStateWasm 保持 140 字节不变
- [x] itemCount 位于 offset 133（原 _pad[0]）
- [x] equipmentItemId 位于 offset 134（原 _pad[1]）
- [x] ecs_getNPCStates 填充 itemCount 和 equipmentItemId
- [x] ecs_getNPCItems 函数存在且输出 itemId/count 对
- [x] ecs_getNPCItems 附带 spiritStones 和 familyContribution

## 生产行为接入 Items
- [x] exec_mine 添加 addItem(ORE, 15)
- [x] exec_farm 添加 addItem(FOOD, 30-60)
- [x] exec_fish 添加 addItem(FOOD, 10)
- [x] exec_lumber 添加 addItem(MATERIALS, 8)
- [x] exec_gather 添加 addItem(MATERIALS, 5)
- [x] exec_craft 检查并消耗 ORE，产出 EQUIPMENT
- [x] exec_refine 检查并消耗 ORE，产出 MATERIALS
- [x] exec_cook 检查并消耗 FOOD，产出 FOOD(2,3)
- [x] exec_tailor 检查并消耗 MATERIALS，产出 EQUIPMENT
- [x] exec_alchemy 添加 addItem(PILLS, 1)
- [x] exec_sell 消耗 EQUIPMENT，获得 spiritStones
- [x] exec_buy 消耗 spiritStones，获得 EQUIPMENT
- [x] exec_trade (Social) NPC 间物品灵石转移
- [x] 材料不足时行为拒绝执行

## TS ECSWasmLoader
- [x] NPCState 接口新增 itemCount、equipmentItemId
- [x] readNPCStates 正确解析 offset 133-134
- [x] wasmGetNPCItems 封装函数存在
- [x] CGetNPCItemsFn 类型声明

## TS NPCResources 数据源切换
- [x] NPCResources.items 接口调整
- [x] NPCService 物品逻辑改为从 WASM 获取
- [x] 移除 TS 独立的 items 维护逻辑
- [x] 物品名称本地化映射表

## 编译
- [x] C++ WASM 编译通过（emcc -fsyntax-only，仅 1 个预存 warning）
- [x] TypeScript 编译通过（22 个预存 error，0 个新增 error）

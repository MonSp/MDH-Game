# 建造模式 Spec

## Why
玩家目前只能通过预制的 BuildingDef 与世界建筑交互，无法自由建造。建造模式让玩家能用手边的材料方块在空地上快速搭建建筑，保存为蓝图并在后续重新加载或导出为 TypeScript 代码，便于开发者手摆建筑。

## What Changes
- **新增** `PlayerBuild` 类型与工厂函数（已实现）
- **新增** `BuildModeStore`（Zustand 状态管理，已实现）
- **新增** `BlueprintManager` 工具函数（localStorage 蓝图 CRUD + TS 导出/JSON 导入，已实现）
- **新增** `BuildModeController`（R3F 组件，处理鼠标射线检测、网格吸附、幽灵方块预览、放置/拆除逻辑）
- **新增** `BuildModeUI`（React 覆盖层 UI：材料选择、蓝图存取、导出/导入、退出建造）
- **修改** `Map2D.tsx`：集成建造模式（B 键开关、建造时禁用 CameraControls 与 NPC/怪物/资源交互、建造网格渲染）
- **不修改** 现有建筑系统（BuildingDef / BuildingWorld / VoxelRenderer），PlayerBuild 使用独立的 VoxelGrid

## Impact
- 新增概念：PlayerBuild（玩家建造体），与 BuildingDef 平级
- 新增快捷键：`B` 键开关建造模式
- 建造模式下 WASD/QE 仍然可以移动视角但不能移动角色
- 建造模式下鼠标左键放置方块、右键拆除方块
- 建造模式下 CameraControls 的右键旋转被禁用

## ADDED Requirements

### Requirement: 建造模式状态管理
系统 SHALL 提供一个 Zustand store（BuildModeStore）管理建造模式的开关状态、当前选中的材质、当前正在操作的 PlayerBuild 实例以及鼠标所在的网格坐标。

#### Scenario: 开关建造模式
- **WHEN** 玩家按下 B 键
- **THEN** 如果当前不在建造模式，系统 SHALL 激活建造模式并创建一个新的 32×16×32 空 PlayerBuild
- **AND** 如果已经在建造模式，系统 SHALL 关闭建造模式并保留当前 PlayerBuild 状态
- **AND** 关闭建造模式时若无当前建筑，SHALL 清理 currentBuild

#### Scenario: 切换材质
- **WHEN** 玩家在建造模式下点击 UI 材质按钮（stone/wood/earth/metal/thatch）
- **THEN** 系统 SHALL 更新 selectedMaterial 为对应材质

### Requirement: 放置与拆除方块
系统 SHALL 允许玩家在建造模式下通过点击在体素网格上放置或拆除方块。

#### Scenario: 放置方块
- **WHEN** 建造模式激活，玩家左键点击网格上的某个位置
- **THEN** 系统 SHALL 检查该位置是否在 currentBuild.voxels 范围内
- **AND** 若范围内，SHALL 在该位置创建 selectedMaterial 的方块（health 取 MATERIAL_BASE_HEALTH）
- **AND** 若方块已存在（health > 0），SHALL 覆盖为当前材质

#### Scenario: 拆除方块
- **WHEN** 建造模式激活，玩家右键点击网格上的某个位置
- **THEN** 系统 SHALL 检查该位置是否有方块
- **AND** 若有方块（health > 0），SHALL 将该位置设为 EMPTY_BLOCK

### Requirement: 幽灵方块预览
系统 SHALL 在玩家鼠标悬停位置显示半透明的幽灵方块，指示将要放置/拆除的位置。

#### Scenario: 网格高亮
- **WHEN** 建造模式激活，玩家鼠标悬停在有效网格位置
- **THEN** 系统 SHALL 在该网格位置显示一个半透明的幽灵方块（透明度 ~0.5）
- **AND** 若鼠标移出 Canvas 或移至无效位置，SHALL 隐藏幽灵方块

### Requirement: 建造模式 UI
系统 SHALL 提供一个覆盖层 UI 面板，包含建造模式所需的所有控件。

#### Scenario: 材质选择
- **WHEN** 建造模式激活
- **THEN** UI 面板 SHALL 显示 5 种材质的颜色按钮（stone=#808080, wood=#8B5E3C, earth=#A0522D, metal=#B0B0B0, thatch=#C4A35A）
- **AND** 当前选中的材质 SHALL 有高亮边框

#### Scenario: 保存蓝图
- **WHEN** 玩家点击"保存蓝图"按钮
- **THEN** 系统 SHALL 弹出一个对话框让玩家输入蓝图名称
- **AND** 确认后 SHALL 使用 BlueprintManager.saveBlueprint 将当前 Build 的体素数据保存到 localStorage

#### Scenario: 加载蓝图
- **WHEN** 玩家点击"加载蓝图"按钮
- **THEN** 系统 SHALL 显示已保存的蓝图列表（仅加载与当前 Build 尺寸完全匹配的）
- **AND** 玩家选择后 SHALL 将蓝图的体素数据加载到当前 Build

#### Scenario: 清除建筑
- **WHEN** 玩家点击"清除"按钮
- **THEN** 系统 SHALL 将当前 Build 重置为空的 32×16×32 网格

#### Scenario: 导出代码
- **WHEN** 玩家点击"导出代码"按钮
- **THEN** 系统 SHALL 生成一个 TypeScript 代码片段，包含完整的 VoxelGrid 定义
- **AND** 自动复制到剪贴板

#### Scenario: 导入 JSON
- **WHEN** 玩家点击"导入 JSON"按钮
- **THEN** 系统 SHALL 弹出一个文本输入框让玩家粘贴 JSON
- **AND** 验证后 SHALL 将体素数据加载到当前 Build

#### Scenario: 退出建造模式
- **WHEN** 玩家点击"退出建造"按钮
- **THEN** 系统 SHALL 退出建造模式

### Requirement: 键盘快捷键
系统 SHALL 支持 B 键快捷键在建造模式和普通模式间切换。

#### Scenario: B 键切换
- **WHEN** 玩家在任何模式下按下 B 键
- **THEN** 系统 SHALL 切换建造模式的激活状态
- **AND** 切换建造模式时 SHALL 阻止事件冒泡以避免触发 NPC 交互等

#### Scenario: 建造模式下阻止移动
- **WHEN** 建造模式激活，玩家按下 WASD 或方向键
- **THEN** 系统 SHALL 阻止这些键的默认行为，不移动玩家角色

### Requirement: 建造模式下的场景行为
系统 SHALL 在建造模式下修改 3D 场景中的行为，以确保建造操作不与其他交互冲突。

#### Scenario: 禁用 CameraControls
- **WHEN** 建造模式激活
- **THEN** CameraControls SHALL 禁用鼠标交互（右键旋转、中键平移、滚轮缩放仍然可用？），实际上 spec 要求建造模式独占左右键

#### Scenario: 禁用 NPC/怪物/资源交互
- **WHEN** 建造模式激活
- **THEN** 所有 NPC、怪物、资源点 SHALL 不响应鼠标事件（pointerEvents 禁用）

### Requirement: 蓝图管理系统
系统 SHALL 提供蓝图的保存、加载、列表、删除以及导出/导入功能。

#### Scenario: 保存蓝图
- **WHEN** 玩家保存蓝图
- **THEN** 系统 SHALL 将 VoxelGrid 序列化为 JSON 存入 localStorage（key 前缀 `blueprint_`）
- **AND** 保存元数据（名称、创建时间、方块数量）

#### Scenario: 加载蓝图
- **WHEN** 玩家加载蓝图
- **THEN** 系统 SHALL 从 localStorage 读取对应 key 的数据并反序列化为 VoxelGrid
- **AND** 若数据损坏或不存在，返回 null

#### Scenario: 列出蓝图
- **WHEN** 玩家请求蓝图列表
- **THEN** 系统 SHALL 遍历 localStorage 中所有 `blueprint_` 前缀的 key
- **AND** 返回按创建时间降序排列的 BlueprintMeta 列表

#### Scenario: 删除蓝图
- **WHEN** 玩家删除蓝图
- **THEN** 系统 SHALL 从 localStorage 中移除对应 key

#### Scenario: 导出为 TypeScript
- **WHEN** 玩家导出为代码
- **THEN** 系统 SHALL 生成一个完整的 TypeScript 常量定义，包含 dimX, dimY, dimZ, originX, originY, originZ, blocks 数组
- **AND** 可直接粘贴到项目中作为 BuildingDef 的 voxels 使用

#### Scenario: 从 JSON 导入
- **WHEN** 玩家粘贴 JSON 字符串导入
- **THEN** 系统 SHALL 解析 JSON 并验证包含必需的 dimX, dimY, dimZ, blocks 字段
- **AND** 若验证失败，抛出错误信息

## MODIFIED Requirements

### Requirement: Map2D 场景集成
**变更**: Map2D.tsx 需要集成建造模式组件和逻辑。

#### Scenario: 渲染条件
- **WHEN** 建造模式激活
- **THEN** Map2D 的 Canvas 内部 SHALL 渲染 BuildModeController（含网格平面 + 幽灵方块）
- **AND** Map2D 的 Canvas 外部 SHALL 在 HUD 层上方渲染 BuildModeUI

#### Scenario: 键盘拦截
- **WHEN** 建造模式激活
- **THEN** Map2D 的键盘处理器 SHALL 忽略 WASD/方向键的玩家移动逻辑

## REMOVED Requirements
（无移除项）

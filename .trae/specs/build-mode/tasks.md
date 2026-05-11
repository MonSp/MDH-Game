# 建造模式 - 任务列表

## 任务
- [x] **Task 1**: 创建 PlayerBuild 类型和工厂函数
  - 实现 `PlayerBuild` 接口（id, name, voxels, worldX, worldY）
  - 实现 `createEmptyPlayerBuild()` 创建 32×16×32 空白体素网格
  - 实现 `clonePlayerBuild()` 深度克隆
  - 文件：`src/buildings/PlayerBuild.ts`

- [x] **Task 2**: 创建 BuildModeStore（Zustand 状态管理）
  - 状态：active, selectedMaterial, currentBuild, mouseGridPos
  - Actions：toggleBuildMode, setMaterial, setMouseGridPos, placeBlock, removeBlock, loadVoxels, clearBuild, deactivateBuildMode
  - 文件：`src/buildings/BuildModeStore.ts`

- [x] **Task 3**: 创建 BuildModeController（R3F 组件，含幽灵方块）
  - 使用 `useThree()` 获取 camera/gl 进行射线检测
  - 实现网格地面平面（32×16×32 半透明网格辅助线）
  - 实现鼠标射线与网格平面的碰撞检测 → 计算网格坐标 (lx, ly, lz)
  - 实现幽灵方块（GhostBlock）：半透明方块跟随鼠标悬停在网格位置
  - 实现左键放置方块（调用 store.placeBlock）
  - 实现右键拆除方块（调用 store.removeBlock）
  - 阻止 CameraControls 在建造模式下响应左右键
  - 使用 `useFrame` 进行连续射线检测
  - 文件：`src/components/BuildModeController.tsx`

- [x] **Task 4**: 创建 BuildModeUI（建造模式覆盖层 UI）
  - 材质选择按钮（5 种材质：stone/wood/earth/metal/thatch，带颜色指示器）
  - 功能按钮：保存蓝图、加载蓝图、导出代码、导入 JSON、清除建筑、退出建造
  - 弹窗组件：蓝图命名、蓝图列表选择、JSON 文本输入
  - Tailwind CSS 暗色主题，与其他 UI 一致
  - 文件：`src/components/BuildModeUI.tsx`

- [x] **Task 5**: 创建 BlueprintManager（蓝图 CRUD + 导入导出）
  - 实现 `saveBlueprint` / `loadBlueprint` / `listBlueprints` / `deleteBlueprint`
  - 实现 `exportAsTS`（生成 TypeScript 常量代码）
  - 实现 `importFromJSON`（验证并解析 JSON → VoxelGrid）
  - 文件：`src/buildings/BlueprintManager.ts`

- [x] **Task 6**: 幽灵方块预览（已合并到 Task 3）

- [x] **Task 7**: 集成到 Map2D.tsx
  - 在 Map2D 的 Canvas 内部条件渲染 BuildModeController（建造模式激活时）
  - 在 Map2D 的 Canvas 外部渲染 BuildModeUI
  - 键盘处理器：捕获 B 键切换建造模式
  - 建造模式下阻止 WASD/方向键移动玩家
  - 建造模式下阻止 CameraControls 右键旋转
  - 建造模式下阻止 NPC/怪物/资源点的鼠标交互

- [x] **Task 8**: 验证与测试
  - 验证建造模式可正常开关（B 键/UI 按钮）
  - 验证方块可放置/拆除
  - 验证幽灵方块跟随鼠标
  - 验证蓝图保存/加载/导出/导入流程
  - 验证建造模式下 NPC/怪物/资源交互被禁用
  - 验证退出建造模式后恢复正常游戏操作
  - 验证无控制台错误

## 任务依赖
- Task 1 → Task 2（BuildModeStore 依赖 PlayerBuild）
- Task 2 → Task 3 + Task 4（Controller 和 UI 依赖 Store）
- Task 3 + Task 4 → Task 7（集成依赖组件就绪）
- Task 5 独立，可并行开发
- Task 7 → Task 8（验证在集成之后）

# 建造模式 - 验证检查清单

## 基础文件检查
- [x] [Task 1] PlayerBuild.ts 存在并导出 PlayerBuild 接口、createEmptyPlayerBuild、clonePlayerBuild
- [x] [Task 2] BuildModeStore.ts 存在并导出 useBuildModeStore，包含所有状态和 Actions
- [x] [Task 5] BlueprintManager.ts 存在并导出所有蓝图操作函数

## BuildModeController（Task 3）
- [x] BuildModeController.tsx 在 Canvas 内部正常渲染网格平面
- [x] 鼠标悬停时幽灵方块显示在半透明网格位置
- [x] 左键点击在网格位置放置当前材质方块
- [x] 右键点击拆除网格位置的方块
- [x] 鼠标移出 Canvas 或指向无效位置时幽灵方块隐藏
- [x] 幽灵方块颜色与当前选中的材质一致
- [x] CameraControls 在建造模式下不响应左右键

## BuildModeUI（Task 4）
- [x] 建造模式激活时显示 UI 面板
- [x] 退出建造模式时 UI 面板消失
- [x] 5 种材质按钮可点击切换，选中材质有高亮标识
- [x] 保存蓝图：弹出命名对话框，确认后存入 localStorage
- [x] 加载蓝图：显示已保存蓝图列表，选择后加载到当前 Build
- [x] 清除建筑：重置为空网格
- [x] 导出代码：生成 TypeScript 代码并复制到剪贴板
- [x] 导入 JSON：弹出文本输入框，验证后加载体素数据
- [x] 退出建造按钮：关闭建造模式

## Map2D 集成（Task 7）
- [x] B 键可切换建造模式的开关状态
- [x] 建造模式下 WASD/方向键不移动玩家
- [x] 建造模式下 NPC 不可交互
- [x] 建造模式下资源点不可交互
- [x] 建造模式下怪物不可交互
- [x] 建造模式关闭后恢复正常游戏操作
- [x] 场景中建造网格仅在建造模式下可见

## 端到端流程（Task 8）
- [x] 进入游戏 → 按 B 进入建造模式 → 放置方块 → 保存蓝图 → 清除建筑 → 加载蓝图 → 导出代码 → 退出建造模式
- [x] 控制台无报错
- [x] 多次开关建造模式不产生内存泄漏

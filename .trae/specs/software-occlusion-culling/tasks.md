# Tasks

- [x] Task 1: 实现遮挡缓冲与相机投影工具函数
  - [x] 1.1 在 `occlusion.cpp` 中定义 `gDepthBuffer` 二维浮点数组（默认 256×128），提供 `clearDepthBuffer` 清空接口
  - [x] 1.2 实现 `ProjectVertex` 函数：世界坐标 → 屏幕像素坐标 + 线性深度
  - [x] 1.3 实现 `CameraParams` 结构体：位置、fovY、aspect、near、far，以及 `makeCameraParams` 工厂函数

- [x] Task 2: 实现三角形软件光栅化
  - [x] 2.1 实现 `backfaceCull` 函数：通过法向量与视线方向点积剔除背向面
  - [x] 2.2 实现 `rasterizeTriangle` 函数：屏幕空间包围矩形 + 重心坐标填充 + 深度测试写入遮挡缓冲
  - [x] 2.3 实现 `rasterizeTriangles` 函数：遍历三角形列表调用上述光栅化

- [x] Task 3: 实现体素→遮挡三角形生成
  - [x] 3.1 实现 `generateTrianglesFromVoxels` 函数：输入体素三维布尔数组 + voxelSize + 建筑世界坐标，输出三角形列表
  - [x] 3.2 实现可见面提取：遍历实心体素，检查六方向邻居，对暴露面生成四边形（两个三角形）
  - [x] 3.3 （可选）共面合并优化暂不实现，每帧重生成已足够快

- [x] Task 4: 实现 AABB 可见性测试
  - [x] 4.1 实现 `projectAABB` 函数：8 角点投影 + 最近深度 + 屏幕矩形计算
  - [x] 4.2 实现 `isAABBOccluded` 函数：遍历投影矩形像素查询深度缓冲判定遮挡
  - [x] 4.3 实现相机后方保守处理（任意角点 cz <= 0 → 判定可见）

- [x] Task 5: 重写 `ComputeOcclusion` 主流程
  - [x] 5.1 更新参数解析：支持 `fovY`、`near`、`far`、`aspect` 参数，缺失时使用默认值
  - [x] 5.2 更新建筑数据解析：支持新的体素格式 `{id, solid[][][], voxelSize}`，同时保留旧格式 `{hw, hd, height}` 的回退兼容
  - [x] 5.3 实现新主流程：清空缓冲 → 遮挡体筛选 → 三角形光栅化 → AABB 可见性测试
  - [x] 5.4 实现相机在建筑内部检测（`pointInsideVoxels`）并排除该建筑
  - [x] 5.5 玩家三采样点 AABB 测试（头 Y=1.7、躯干 Y=1.1、脚 Y=0.1）
  - [x] 5.6 树木 AABB 遮挡测试
  - [x] 5.7 结果构造保持 `{ buildingIds, treeKeys }` 格式不变

- [x] Task 6: 更新 JS/TS 调用方
  - [x] 6.1 更新 `WorldGenService.ts` 的 `computeOcclusion` 方法，传递新参数格式（fovY/near/far/aspect）
  - [x] 6.2 更新 `src/server/index.ts` 的 Socket.IO 事件处理，接受并转发新参数
  - [x] 6.3 更新 `src/buildings/BuildingWorld.tsx` 发送相机 FOV/near/far/aspect 数据
  - [x] 6.4 更新 `src/components/Map2D.tsx` 发送相机 FOV/near/far/aspect 数据

- [x] Task 7: 编译与验证
  - [x] 7.1 在 `src/server/addons/` 下执行 `node-gyp rebuild` 编译通过（无警告、无错误）
  - [ ] 7.2 验证遮挡剔除在基础场景下正常工作（玩家站在建筑后应被遮挡）
  - [ ] 7.3 验证体素破坏后遮挡更新正常
  - [ ] 7.4 验证相机在建筑内部时不被错误遮挡

# Task Dependencies
- Task 2 依赖 Task 1（光栅化需要投影函数和深度缓冲）
- Task 4 依赖 Task 1（AABB 测试需要投影函数和深度缓冲）
- Task 5 依赖 Task 2、Task 3、Task 4（主流程整合所有子模块）
- Task 6 依赖 Task 5（先确定 C++ 接口再更新 JS 端）
- Task 7 依赖 Task 5、Task 6（全部代码完成后编译验证）
- Task 1、Task 3 可并行开发（无相互依赖）
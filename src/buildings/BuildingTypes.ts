export type BuildingKind = 'capital' | 'city' | 'fortress' | 'watchtower' | 'camp' | 'palace' | 'manor';

/* ──── 道路 ──── */
export interface CityRoad {
  x: number; y: number;
  width: number; depth: number;
  color: string;
}

/* ──── 单体建筑（宫城/族地手摆） ──── */
export interface InnerBuilding {
  label: string;
  x: number; y: number;
  width: number; depth: number;
  height: number;
  roofType: 'pagoda' | 'sloped' | 'flat';
  color: string;
  roofColor: string;
}

/* ──── 城门 ──── */
export interface CityGate {
  x: number; y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  label: string;
}

/* ──── 郭城网格街区（程序化生成平民建筑） ──── */
export interface GuoGridBlock {
  startX: number; startY: number;
  cols: number; rows: number;
  cellSize: number;
  wallColor: string;
  roofColor: string;
}

/* ──── 宫城区域（围墙+手摆大殿） ──── */
export interface PalaceQuarter {
  x: number; y: number;
  width: number; depth: number;
  wallHeight: number;
  wallColor: string;
  gateX: number; gateY: number;
  gateDir: 'north' | 'south';
  gateLabel: string;
  buildings: InnerBuilding[];
  floorColor?: string;
}

/* ──── 顶层：建筑复合体定义 ──── */
export interface BuildingDef {
  kind: BuildingKind;
  label: string;
  country?: string;
  isCapital: boolean;
  compoundWidth: number;
  compoundDepth: number;
  wallHeight: number;
  wallColor: string;
  gates: CityGate[];
  roads: CityRoad[];
  guoBlocks: GuoGridBlock[];
  palaceQuarter: PalaceQuarter | null;
  noWall?: boolean;
}

/* ──── 体素/材料 ──── */
export type MaterialType = 'stone' | 'wood' | 'earth' | 'metal' | 'thatch';

export const MATERIAL_BASE_HEALTH: Record<MaterialType, number> = {
  stone: 150,
  wood: 40,
  earth: 20,
  metal: 300,
  thatch: 5,
};

export const EMPTY_BLOCK: BlockState = { material: 'stone', health: 0 };

export interface BlockState {
  material: MaterialType;
  health: number;
}

/* ──── 体素网格 ──── */
export interface VoxelGrid {
  dimX: number;
  dimY: number;
  dimZ: number;
  originX: number;
  originY: number;
  originZ: number;
  blocks: BlockState[];
}

/* ──── 体素辅助函数 ──── */
export function cellToWorld(cx: number, cy: number, cz: number): [number, number, number] {
  return [cx * 3, cy * 3, cz * 3];
}

export function blockIndex(lx: number, ly: number, lz: number, dimX: number, dimY: number): number {
  return lx + ly * dimX + lz * dimX * dimY;
}

export function generateWallVoxels(
  wallWidth: number,
  wallHeight: number,
  wallDepth: number,
  material: MaterialType
): VoxelGrid {
  const smallBlockSize = 1 / 3;
  const dimX = Math.ceil(wallWidth / smallBlockSize);
  const dimY = Math.ceil(wallHeight / smallBlockSize);
  const dimZ = Math.ceil(wallDepth / smallBlockSize);

  const health = MATERIAL_BASE_HEALTH[material];
  const blocks: BlockState[] = new Array(dimX * dimY * dimZ);

  for (let i = 0; i < blocks.length; i++) {
    blocks[i] = { material, health };
  }

  return {
    dimX,
    dimY,
    dimZ,
    originX: 0,
    originY: 0,
    originZ: 0,
    blocks,
  };
}

/* ──── 建筑体素生成 ──── */
export function generateBuildingVoxels(
  width: number,
  depth: number,
  height: number,
  wallMaterial: MaterialType = 'wood',
  roofMaterial: MaterialType = 'thatch'
): VoxelGrid {
  const dimX = Math.ceil(width / 0.333);
  const dimY = Math.ceil(height / 0.333);
  const dimZ = Math.ceil(depth / 0.333);
  const totalBlocks = dimX * dimY * dimZ;
  const blocks: BlockState[] = new Array(totalBlocks);
  for (let i = 0; i < totalBlocks; i++) {
    blocks[i] = { ...EMPTY_BLOCK };
  }

  const wallHealth = MATERIAL_BASE_HEALTH[wallMaterial];
  const roofHealth = MATERIAL_BASE_HEALTH[roofMaterial];

  for (let x = 0; x < dimX; x++) {
    for (let z = 0; z < dimZ; z++) {
      const idx = blockIndex(x, 0, z, dimX, dimY);
      blocks[idx] = { material: wallMaterial, health: wallHealth };
    }
  }

  for (let y = 1; y < dimY - 1; y++) {
    for (let x = 0; x < dimX; x++) {
      blocks[blockIndex(x, y, 0, dimX, dimY)] = { material: wallMaterial, health: wallHealth };
      blocks[blockIndex(x, y, dimZ - 1, dimX, dimY)] = { material: wallMaterial, health: wallHealth };
    }
    for (let z = 1; z < dimZ - 1; z++) {
      blocks[blockIndex(0, y, z, dimX, dimY)] = { material: wallMaterial, health: wallHealth };
      blocks[blockIndex(dimX - 1, y, z, dimX, dimY)] = { material: wallMaterial, health: wallHealth };
    }
  }

  for (let x = 0; x < dimX; x++) {
    for (let z = 0; z < dimZ; z++) {
      const idx = blockIndex(x, dimY - 1, z, dimX, dimY);
      blocks[idx] = { material: roofMaterial, health: roofHealth };
    }
  }

  return { dimX, dimY, dimZ, originX: 0, originY: 0, originZ: 0, blocks };
}

/* ──── 树木状态 ──── */
export type TreeState = 'standing' | 'falling' | 'fallen' | 'stump';

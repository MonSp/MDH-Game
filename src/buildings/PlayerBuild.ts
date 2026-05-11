import { VoxelGrid, BlockState, EMPTY_BLOCK, blockIndex } from './BuildingTypes';

export interface PlayerBuild {
  id: string;
  name: string;
  voxels: VoxelGrid;
  worldX: number;
  worldY: number;
}

export function createEmptyPlayerBuild(worldX = 0, worldY = 0): PlayerBuild {
  const dimX = 32;
  const dimY = 16;
  const dimZ = 32;
  const totalBlocks = dimX * dimY * dimZ;
  const blocks: BlockState[] = new Array(totalBlocks);
  for (let i = 0; i < totalBlocks; i++) {
    blocks[i] = { ...EMPTY_BLOCK };
  }

  return {
    id: `player-build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '新建建筑',
    voxels: {
      dimX,
      dimY,
      dimZ,
      originX: 0,
      originY: 0,
      originZ: 0,
      blocks,
    },
    worldX,
    worldY,
  };
}

export function clonePlayerBuild(build: PlayerBuild): PlayerBuild {
  return {
    ...build,
    id: `player-build-copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    voxels: {
      ...build.voxels,
      blocks: [...build.voxels.blocks],
    },
  };
}

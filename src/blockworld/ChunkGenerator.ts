import { createNoise3D } from 'simplex-noise';
import { BlockType, CHUNK_SIZE } from './BlockTypes';
import { ChunkData } from './ChunkData';

const noise3D = createNoise3D();

const TERRAIN_BASE_HEIGHT = 40;
const TERRAIN_AMPLITUDE = 20;
const DIRT_DEPTH = 4;
const WATER_LEVEL = TERRAIN_BASE_HEIGHT - 4;

function terrainHeight(wx: number, wz: number): number {
  const continental = noise3D(wx * 0.003, 0, wz * 0.003) * 25;
  const hills = noise3D(wx * 0.015, 0, wz * 0.015) * 10;
  const detail = noise3D(wx * 0.04, 0, wz * 0.04) * 3;
  return TERRAIN_BASE_HEIGHT + continental + hills + detail;
}

function caveValue(wx: number, wy: number, wz: number): number {
  const main = noise3D(wx * 0.05, wy * 0.07, wz * 0.05);
  const detail = noise3D(wx * 0.1, wy * 0.13, wz * 0.1) * 0.3;
  const depthFactor = Math.max(0, 1 - wy / 30);
  return (main + detail) * depthFactor;
}

export function generateChunk(cx: number, cy: number, cz: number): ChunkData {
  const chunk = new ChunkData(cx, cy, cz);
  const ox = cx * CHUNK_SIZE;
  const oy = cy * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;

  for (let bz = 0; bz < CHUNK_SIZE; bz++) {
    for (let by = 0; by < CHUNK_SIZE; by++) {
      for (let bx = 0; bx < CHUNK_SIZE; bx++) {
        const wx = ox + bx;
        const wy = oy + by;
        const wz = oz + bz;

        const th = terrainHeight(wx, wz);
        const cv = caveValue(wx, wy, wz);

        let block: BlockType = BlockType.AIR;

        if (wy < th) {
          const depth = th - wy;
          if (cv > 0.55) {
            block = BlockType.AIR;
          } else if (depth <= 1) {
            block = BlockType.GRASS;
          } else if (depth <= DIRT_DEPTH) {
            block = BlockType.DIRT;
          } else {
            block = BlockType.STONE;
          }
        } else if (wy < WATER_LEVEL) {
          block = BlockType.WATER;
        }

        chunk.blocks[by * 256 + bz * 16 + bx] = block;
      }
    }
  }

  placeTrees(chunk, ox, oy, oz);

  chunk.isDirty = true;
  return chunk;
}

function placeTrees(chunk: ChunkData, ox: number, oy: number, oz: number): void {
  for (let bz = 0; bz < CHUNK_SIZE; bz++) {
    for (let bx = 0; bx < CHUNK_SIZE; bx++) {
      const wx = ox + bx;
      const wz = oz + bz;
      const th = terrainHeight(wx, wz);
      const topWorldY = Math.floor(th);
      const localTopY = topWorldY - oy;

      if (localTopY < 0 || localTopY >= CHUNK_SIZE - 1) continue;

      const idx = localTopY * 256 + bz * 16 + bx;
      if (chunk.blocks[idx] !== BlockType.GRASS) continue;

      const treeNoise = noise3D(wx * 1.5, 0, wz * 1.5);
      if (treeNoise < 0.55) continue;

      const trunkH = 3 + Math.floor(Math.abs(noise3D(wx * 3, 0, wz * 3)) * 3);

      for (let ty = 0; ty < trunkH; ty++) {
        const ly = localTopY + 1 + ty;
        if (ly >= CHUNK_SIZE) break;
        chunk.blocks[ly * 256 + bz * 16 + bx] = BlockType.WOOD;
      }

      const leafBase = localTopY + 1 + trunkH - 2;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0 && dy < 2) continue;
            const lx = bx + dx;
            const ly = leafBase + dy;
            const lz = bz + dz;
            if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue;
            const leafIdx = ly * 256 + lz * 16 + lx;
            if (chunk.blocks[leafIdx] === BlockType.AIR) {
              chunk.blocks[leafIdx] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }
}

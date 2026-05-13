import { createNoise2D, createNoise3D } from 'simplex-noise';
import { CHUNK_SIZE, BlockType } from './BlockTypes';
import { ChunkData } from './ChunkData';
import { generateStructures } from './StructureGenerator';

const TERRAIN_BASE_HEIGHT = 40;
const TERRAIN_AMPLITUDE = 20;
const DIRT_DEPTH = 4;
const WATER_LEVEL = TERRAIN_BASE_HEIGHT - 4;

function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s) + seed.charCodeAt(i);
    s |= 0;
  }
  return () => {
    s = (s * 16807 + 0) & 0x7fffffff;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

const rand = seededRandom('taigu_world_seed_2025');
const noise2D = createNoise2D(rand);
const noise3D = createNoise3D(rand);

export function getTerrainHeight(wx: number, wz: number): number {
  const continent = noise2D(wx * 0.003, wz * 0.003) * 0.5 + 0.5;
  const hill = noise2D(wx * 0.015, wz * 0.015) * 0.5 + 0.5;
  const detail = noise2D(wx * 0.04, wz * 0.04) * 0.5 + 0.5;

  const raw = continent * 0.6 + hill * 0.3 + detail * 0.1;
  const height = Math.floor(raw * TERRAIN_AMPLITUDE + TERRAIN_BASE_HEIGHT - TERRAIN_AMPLITUDE / 2);
  return Math.max(1, Math.min(height, 100));
}

export function generateChunk(cx: number, cy: number, cz: number): ChunkData {
  const chunk = new ChunkData(cx, cy, cz);

  if (cy > 4) {
    return chunk;
  }

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const surfaceHeight = getTerrainHeight(wx, wz);
      const waterSurface = WATER_LEVEL;

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = cy * CHUNK_SIZE + ly;

        if (wy > surfaceHeight) {
          if (wy <= waterSurface) {
            chunk.setBlock(lx, ly, lz, BlockType.WATER);
          }
          continue;
        }

        if (wy === surfaceHeight) {
          chunk.setBlock(lx, ly, lz, BlockType.GRASS);
        } else if (wy > surfaceHeight - DIRT_DEPTH) {
          chunk.setBlock(lx, ly, lz, BlockType.DIRT);
        } else {
          if (wy > 30) {
            const caveNoise = noise3D(wx * 0.07, wy * 0.07, wz * 0.07);
            const depthFactor = (surfaceHeight - wy) / 20;
            if (caveNoise > 0.55 - depthFactor * 0.15) {
              chunk.setBlock(lx, ly, lz, BlockType.STONE);
            }
          } else {
            chunk.setBlock(lx, ly, lz, BlockType.STONE);
          }
        }
      }
    }
  }

  generateStructures(chunk.blocks, cx, cy, cz, getTerrainHeight);

  return chunk;
}

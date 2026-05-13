export const CHUNK_SIZE = 16;
export const CHUNK_TOTAL = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE; // 4096

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  SAND = 4,
  WATER = 5,
  WOOD = 6,
  LEAVES = 7,
  SNOW = 8,
}

export const BLOCK_COLORS: Record<number, [number, number, number]> = {
  [BlockType.AIR]: [0, 0, 0],
  [BlockType.GRASS]: [0.35, 0.65, 0.28],
  [BlockType.DIRT]: [0.55, 0.38, 0.22],
  [BlockType.STONE]: [0.5, 0.5, 0.5],
  [BlockType.SAND]: [0.85, 0.78, 0.55],
  [BlockType.WATER]: [0.2, 0.4, 0.8],
  [BlockType.WOOD]: [0.45, 0.3, 0.15],
  [BlockType.LEAVES]: [0.15, 0.5, 0.15],
  [BlockType.SNOW]: [0.95, 0.95, 0.98],
};

export function blockIndex(bx: number, by: number, bz: number): number {
  return bx + by * CHUNK_SIZE + bz * CHUNK_SIZE * CHUNK_SIZE;
}

export interface ChunkCoord {
  cx: number;
  cy: number;
  cz: number;
}

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function worldToChunk(wx: number, wy: number, wz: number): ChunkCoord {
  return {
    cx: Math.floor(wx / CHUNK_SIZE),
    cy: Math.floor(wy / CHUNK_SIZE),
    cz: Math.floor(wz / CHUNK_SIZE),
  };
}

export function worldToBlockLocal(wx: number, wy: number, wz: number): { bx: number; by: number; bz: number } {
  const mod = (n: number, d: number) => ((n % d) + d) % d;
  return {
    bx: Math.floor(mod(wx, CHUNK_SIZE)),
    by: Math.floor(mod(wy, CHUNK_SIZE)),
    bz: Math.floor(mod(wz, CHUNK_SIZE)),
  };
}

export function isCollidable(type: BlockType): boolean {
  return type === BlockType.GRASS ||
    type === BlockType.DIRT ||
    type === BlockType.STONE ||
    type === BlockType.SAND ||
    type === BlockType.WOOD ||
    type === BlockType.LEAVES ||
    type === BlockType.SNOW;
}

export function isSolidBlock(type: BlockType): boolean {
  return type !== BlockType.AIR && type !== BlockType.WATER;
}

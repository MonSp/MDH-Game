export const CHUNK_SIZE = 16;
export const CHUNK_TOTAL = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

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
  STONE_BRICK = 9,
  PLANK = 10,
  COBBLESTONE = 11,
  SMOOTH_STONE = 12,
  BRICK = 13,
  OAK_LOG = 14,
  SPRUCE_LOG = 15,
  BIRCH_LOG = 16,
  OAK_LEAVES = 17,
  SPRUCE_LEAVES = 18,
  BIRCH_LEAVES = 19,
  CHERRY_LEAVES = 20,
  ROOF_TILE = 21,
  PILLAR = 22,
  FENCE = 23,
  STONE_PATH = 24,
  WINDOW = 25,
  DOOR = 26,
  LANTERN = 27,
  SMOOTH_SANDSTONE = 28,
  NETHERRACK = 29,
  OBSIDIAN = 30,
  SPIRIT_FIELD = 31,
  SPIRIT_ORE = 32,
  FISH_SPOT = 33,
  LUMBER_FIELD = 34,
}

export const BLOCK_COLORS: Record<BlockType, [number, number, number]> = {
  [BlockType.AIR]: [0, 0, 0],
  [BlockType.GRASS]: [0.4, 0.7, 0.25],
  [BlockType.DIRT]: [0.55, 0.4, 0.25],
  [BlockType.STONE]: [0.5, 0.5, 0.5],
  [BlockType.SAND]: [0.85, 0.8, 0.6],
  [BlockType.WATER]: [0.2, 0.4, 0.8],
  [BlockType.WOOD]: [0.5, 0.3, 0.1],
  [BlockType.LEAVES]: [0.2, 0.6, 0.15],
  [BlockType.SNOW]: [0.95, 0.95, 1.0],
  [BlockType.STONE_BRICK]: [0.55, 0.55, 0.55],
  [BlockType.PLANK]: [0.7, 0.55, 0.3],
  [BlockType.COBBLESTONE]: [0.45, 0.45, 0.45],
  [BlockType.SMOOTH_STONE]: [0.6, 0.6, 0.6],
  [BlockType.BRICK]: [0.7, 0.35, 0.25],
  [BlockType.OAK_LOG]: [0.55, 0.35, 0.15],
  [BlockType.SPRUCE_LOG]: [0.35, 0.25, 0.1],
  [BlockType.BIRCH_LOG]: [0.75, 0.7, 0.55],
  [BlockType.OAK_LEAVES]: [0.25, 0.55, 0.15],
  [BlockType.SPRUCE_LEAVES]: [0.15, 0.4, 0.1],
  [BlockType.BIRCH_LEAVES]: [0.45, 0.7, 0.25],
  [BlockType.CHERRY_LEAVES]: [0.95, 0.6, 0.7],
  [BlockType.ROOF_TILE]: [0.45, 0.25, 0.15],
  [BlockType.PILLAR]: [0.5, 0.45, 0.4],
  [BlockType.FENCE]: [0.55, 0.35, 0.2],
  [BlockType.STONE_PATH]: [0.6, 0.55, 0.5],
  [BlockType.WINDOW]: [0.6, 0.75, 0.85],
  [BlockType.DOOR]: [0.6, 0.4, 0.25],
  [BlockType.LANTERN]: [0.95, 0.6, 0.2],
  [BlockType.SMOOTH_SANDSTONE]: [0.8, 0.75, 0.55],
  [BlockType.NETHERRACK]: [0.4, 0.1, 0.1],
  [BlockType.OBSIDIAN]: [0.15, 0.1, 0.25],
  [BlockType.SPIRIT_FIELD]: [0.3, 0.8, 0.35],
  [BlockType.SPIRIT_ORE]: [0.85, 0.75, 0.2],
  [BlockType.FISH_SPOT]: [0.25, 0.7, 0.85],
  [BlockType.LUMBER_FIELD]: [0.15, 0.5, 0.15],
};

export const SOLID_BLOCK_TYPES = new Set([
  BlockType.GRASS, BlockType.DIRT, BlockType.STONE, BlockType.SAND,
  BlockType.WOOD, BlockType.LEAVES, BlockType.SNOW,
  BlockType.STONE_BRICK, BlockType.PLANK, BlockType.COBBLESTONE,
  BlockType.SMOOTH_STONE, BlockType.BRICK,
  BlockType.OAK_LOG, BlockType.SPRUCE_LOG, BlockType.BIRCH_LOG,
  BlockType.OAK_LEAVES, BlockType.SPRUCE_LEAVES, BlockType.BIRCH_LEAVES,
  BlockType.CHERRY_LEAVES, BlockType.ROOF_TILE, BlockType.PILLAR,
  BlockType.FENCE, BlockType.STONE_PATH, BlockType.WINDOW,
  BlockType.DOOR, BlockType.LANTERN,
  BlockType.SMOOTH_SANDSTONE, BlockType.NETHERRACK, BlockType.OBSIDIAN,
  BlockType.SPIRIT_FIELD, BlockType.SPIRIT_ORE, BlockType.FISH_SPOT, BlockType.LUMBER_FIELD,
]);

export function isSolidBlock(type: BlockType): boolean {
  return SOLID_BLOCK_TYPES.has(type);
}

export function isCollidable(type: BlockType): boolean {
  return type !== BlockType.AIR && type !== BlockType.WATER;
}

export function isOccluding(type: BlockType): boolean {
  return isCollidable(type) && type !== BlockType.WINDOW && type !== BlockType.FENCE && type !== BlockType.LANTERN;
}

export function blockIndex(lx: number, ly: number, lz: number): number {
  return ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
}

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function worldToChunk(wx: number, wy: number, wz: number): { cx: number; cy: number; cz: number } {
  return {
    cx: Math.floor(wx / CHUNK_SIZE),
    cy: Math.floor(wy / CHUNK_SIZE),
    cz: Math.floor(wz / CHUNK_SIZE),
  };
}

export function worldToBlockLocal(wx: number, wy: number, wz: number): { bx: number; by: number; bz: number } {
  return {
    bx: ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    by: ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    bz: ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
  };
}

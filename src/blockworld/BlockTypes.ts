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

  OAK_SLAB = 35,
  STONE_SLAB = 36,
  COBBLESTONE_SLAB = 37,
  STONE_BRICK_SLAB = 38,
  BRICK_SLAB = 39,
  PLANK_SLAB = 40,

  OAK_STAIRS = 41,
  STONE_STAIRS = 42,
  COBBLESTONE_STAIRS = 43,
  STONE_BRICK_STAIRS = 44,
  BRICK_STAIRS = 45,
  PLANK_STAIRS = 46,

  OAK_FENCE = 47,
  SPRUCE_FENCE = 48,
  BIRCH_FENCE = 49,

  GLASS_PANE = 50,
  IRON_BARS = 51,

  GLASS = 52,
  BOOKSHELF = 53,
  CLAY = 54,
  MOSSY_COBBLE = 55,
  GLOWSTONE = 56,
  DARK_PLANK = 57,
  RED_ROOF = 58,
  WOOL_RED = 59,
  WOOL_BLUE = 60,
  SANDSTONE_BRICK = 61,
  CHISELED_STONE = 62,
  THATCH = 63,
}

export function isSlab(type: BlockType): boolean {
  return type >= BlockType.OAK_SLAB && type <= BlockType.PLANK_SLAB;
}

export function isStairs(type: BlockType): boolean {
  return type >= BlockType.OAK_STAIRS && type <= BlockType.PLANK_STAIRS;
}

export function isFence(type: BlockType): boolean {
  return (type >= BlockType.OAK_FENCE && type <= BlockType.BIRCH_FENCE) || type === BlockType.FENCE;
}

export function isPane(type: BlockType): boolean {
  return type === BlockType.GLASS_PANE || type === BlockType.IRON_BARS;
}

export function isNonCubeBlock(type: BlockType): boolean {
  return isSlab(type) || isStairs(type) || isFence(type) || isPane(type);
}

export function getSlabParent(type: BlockType): BlockType {
  switch (type) {
    case BlockType.OAK_SLAB: return BlockType.PLANK;
    case BlockType.STONE_SLAB: return BlockType.STONE;
    case BlockType.COBBLESTONE_SLAB: return BlockType.COBBLESTONE;
    case BlockType.STONE_BRICK_SLAB: return BlockType.STONE_BRICK;
    case BlockType.BRICK_SLAB: return BlockType.BRICK;
    case BlockType.PLANK_SLAB: return BlockType.PLANK;
    default: return type;
  }
}

export function getStairsParent(type: BlockType): BlockType {
  switch (type) {
    case BlockType.OAK_STAIRS: return BlockType.PLANK;
    case BlockType.STONE_STAIRS: return BlockType.STONE;
    case BlockType.COBBLESTONE_STAIRS: return BlockType.COBBLESTONE;
    case BlockType.STONE_BRICK_STAIRS: return BlockType.STONE_BRICK;
    case BlockType.BRICK_STAIRS: return BlockType.BRICK;
    case BlockType.PLANK_STAIRS: return BlockType.PLANK;
    default: return type;
  }
}

export function getFenceParent(type: BlockType): BlockType {
  switch (type) {
    case BlockType.OAK_FENCE: return BlockType.PLANK;
    case BlockType.SPRUCE_FENCE: return BlockType.SPRUCE_LOG;
    case BlockType.BIRCH_FENCE: return BlockType.BIRCH_LOG;
    default: return BlockType.WOOD;
  }
}

export function getPaneParent(type: BlockType): BlockType {
  switch (type) {
    case BlockType.GLASS_PANE: return BlockType.WINDOW;
    case BlockType.IRON_BARS: return BlockType.SMOOTH_STONE;
    default: return type;
  }
}

export function getNonCubeParent(type: BlockType): BlockType {
  if (isSlab(type)) return getSlabParent(type);
  if (isStairs(type)) return getStairsParent(type);
  if (isFence(type)) return getFenceParent(type);
  if (isPane(type)) return getPaneParent(type);
  return type;
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

  [BlockType.OAK_SLAB]: [0.7, 0.55, 0.3],
  [BlockType.STONE_SLAB]: [0.5, 0.5, 0.5],
  [BlockType.COBBLESTONE_SLAB]: [0.45, 0.45, 0.45],
  [BlockType.STONE_BRICK_SLAB]: [0.55, 0.55, 0.55],
  [BlockType.BRICK_SLAB]: [0.7, 0.35, 0.25],
  [BlockType.PLANK_SLAB]: [0.7, 0.55, 0.3],

  [BlockType.OAK_STAIRS]: [0.7, 0.55, 0.3],
  [BlockType.STONE_STAIRS]: [0.5, 0.5, 0.5],
  [BlockType.COBBLESTONE_STAIRS]: [0.45, 0.45, 0.45],
  [BlockType.STONE_BRICK_STAIRS]: [0.55, 0.55, 0.55],
  [BlockType.BRICK_STAIRS]: [0.7, 0.35, 0.25],
  [BlockType.PLANK_STAIRS]: [0.7, 0.55, 0.3],

  [BlockType.OAK_FENCE]: [0.7, 0.55, 0.3],
  [BlockType.SPRUCE_FENCE]: [0.35, 0.25, 0.1],
  [BlockType.BIRCH_FENCE]: [0.75, 0.7, 0.55],

  [BlockType.GLASS_PANE]: [0.6, 0.75, 0.85],
  [BlockType.IRON_BARS]: [0.55, 0.55, 0.55],

  [BlockType.GLASS]: [0.7, 0.85, 0.9],
  [BlockType.BOOKSHELF]: [0.6, 0.4, 0.2],
  [BlockType.CLAY]: [0.65, 0.65, 0.7],
  [BlockType.MOSSY_COBBLE]: [0.4, 0.5, 0.3],
  [BlockType.GLOWSTONE]: [0.95, 0.85, 0.35],
  [BlockType.DARK_PLANK]: [0.35, 0.2, 0.1],
  [BlockType.RED_ROOF]: [0.7, 0.15, 0.1],
  [BlockType.WOOL_RED]: [0.85, 0.25, 0.2],
  [BlockType.WOOL_BLUE]: [0.25, 0.3, 0.75],
  [BlockType.SANDSTONE_BRICK]: [0.85, 0.75, 0.5],
  [BlockType.CHISELED_STONE]: [0.55, 0.55, 0.6],
  [BlockType.THATCH]: [0.75, 0.7, 0.3],
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

  BlockType.OAK_SLAB, BlockType.STONE_SLAB, BlockType.COBBLESTONE_SLAB,
  BlockType.STONE_BRICK_SLAB, BlockType.BRICK_SLAB, BlockType.PLANK_SLAB,

  BlockType.OAK_STAIRS, BlockType.STONE_STAIRS, BlockType.COBBLESTONE_STAIRS,
  BlockType.STONE_BRICK_STAIRS, BlockType.BRICK_STAIRS, BlockType.PLANK_STAIRS,

  BlockType.OAK_FENCE, BlockType.SPRUCE_FENCE, BlockType.BIRCH_FENCE,

  BlockType.GLASS_PANE, BlockType.IRON_BARS,

  BlockType.BOOKSHELF, BlockType.CLAY, BlockType.MOSSY_COBBLE,
  BlockType.GLOWSTONE, BlockType.DARK_PLANK, BlockType.RED_ROOF,
  BlockType.WOOL_RED, BlockType.WOOL_BLUE, BlockType.SANDSTONE_BRICK,
  BlockType.CHISELED_STONE, BlockType.THATCH,
]);

export function isSolidBlock(type: BlockType): boolean {
  return SOLID_BLOCK_TYPES.has(type);
}

export function isCollidable(type: BlockType): boolean {
  return type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.DOOR;
}

export function isOccluding(type: BlockType): boolean {
  return isCollidable(type)
    && type !== BlockType.WINDOW && type !== BlockType.FENCE && type !== BlockType.LANTERN
    && type !== BlockType.GLASS && type !== BlockType.GLOWSTONE
    && type !== BlockType.DOOR
    && !isFence(type) && !isPane(type);
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

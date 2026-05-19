import * as THREE from 'three';
import { BlockType, BLOCK_COLORS } from './BlockTypes';

const ATLAS_SIZE = 128;
const TILE_SIZE = 16;
const COLS = ATLAS_SIZE / TILE_SIZE;

function fillTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: [number, number, number],
  pattern: 'solid' | 'noisy' | 'striped' | 'speckled' | 'checker',
): void {
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const [r, g, b] = color;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const imageData = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
  const data = imageData.data;
  const seed = col * 7 + row * 13;

  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const idx = (py * TILE_SIZE + px) * 4;
      const noise = ((seed * 31 + px * 17 + py * 53) & 0xFF) / 255;
      let noiseVal = 0;

      switch (pattern) {
        case 'noisy':
          noiseVal = (noise - 0.5) * 0.3;
          break;
        case 'striped':
          noiseVal = Math.sin(py * 0.8 + px * 0.1) * 0.1;
          break;
        case 'speckled': {
          const hash = (px * 31 + py * 73 + seed * 11) & 0xFF;
          noiseVal = hash < 40 ? -0.15 : hash < 60 ? 0.1 : 0;
          break;
        }
        case 'checker':
          noiseVal = ((px >> 2) + (py >> 2)) % 2 === 0 ? 0.05 : -0.05;
          break;
        default:
          noiseVal = (noise - 0.5) * 0.08;
      }

      data[idx] = Math.min(255, Math.max(0, r + noiseVal * 255));
      data[idx + 1] = Math.min(255, Math.max(0, g + noiseVal * 255));
      data[idx + 2] = Math.min(255, Math.max(0, b + noiseVal * 255));
    }
  }
  ctx.putImageData(imageData, x, y);
}

let cachedTexture: THREE.CanvasTexture | null = null;

export function getTextureAtlas(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  const patterns: Record<number, 'solid' | 'noisy' | 'striped' | 'speckled' | 'checker'> = {
    [BlockType.AIR]: 'solid',
    [BlockType.GRASS]: 'speckled',
    [BlockType.DIRT]: 'noisy',
    [BlockType.STONE]: 'noisy',
    [BlockType.SAND]: 'speckled',
    [BlockType.WOOD]: 'striped',
    [BlockType.LEAVES]: 'speckled',
    [BlockType.WATER]: 'striped',
    [BlockType.SNOW]: 'checker',
    [BlockType.STONE_BRICK]: 'checker',
    [BlockType.PLANK]: 'striped',
    [BlockType.COBBLESTONE]: 'noisy',
    [BlockType.SMOOTH_STONE]: 'solid',
    [BlockType.BRICK]: 'checker',
    [BlockType.OAK_LOG]: 'striped',
    [BlockType.SPRUCE_LOG]: 'striped',
    [BlockType.BIRCH_LOG]: 'striped',
    [BlockType.OAK_LEAVES]: 'speckled',
    [BlockType.SPRUCE_LEAVES]: 'speckled',
    [BlockType.BIRCH_LEAVES]: 'speckled',
    [BlockType.CHERRY_LEAVES]: 'speckled',
    [BlockType.ROOF_TILE]: 'striped',
    [BlockType.PILLAR]: 'striped',
    [BlockType.FENCE]: 'striped',
    [BlockType.STONE_PATH]: 'noisy',
    [BlockType.WINDOW]: 'solid',
    [BlockType.DOOR]: 'striped',
    [BlockType.LANTERN]: 'speckled',
    [BlockType.SMOOTH_SANDSTONE]: 'solid',
    [BlockType.NETHERRACK]: 'noisy',
    [BlockType.OBSIDIAN]: 'noisy',
    [BlockType.SPIRIT_FIELD]: 'speckled',
    [BlockType.SPIRIT_ORE]: 'checker',
    [BlockType.FISH_SPOT]: 'striped',
    [BlockType.LUMBER_FIELD]: 'striped',
  };

  const blockTypes = [
    BlockType.AIR,
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.SAND,
    BlockType.WOOD,
    BlockType.LEAVES,
    BlockType.WATER,
    BlockType.SNOW,
    BlockType.STONE_BRICK,
    BlockType.PLANK,
    BlockType.COBBLESTONE,
    BlockType.SMOOTH_STONE,
    BlockType.BRICK,
    BlockType.OAK_LOG,
    BlockType.SPRUCE_LOG,
    BlockType.BIRCH_LOG,
    BlockType.OAK_LEAVES,
    BlockType.SPRUCE_LEAVES,
    BlockType.BIRCH_LEAVES,
    BlockType.CHERRY_LEAVES,
    BlockType.ROOF_TILE,
    BlockType.PILLAR,
    BlockType.FENCE,
    BlockType.STONE_PATH,
    BlockType.WINDOW,
    BlockType.DOOR,
    BlockType.LANTERN,
    BlockType.SMOOTH_SANDSTONE,
    BlockType.NETHERRACK,
    BlockType.OBSIDIAN,
    BlockType.SPIRIT_FIELD,
    BlockType.SPIRIT_ORE,
    BlockType.FISH_SPOT,
    BlockType.LUMBER_FIELD,
  ];

  for (let i = 0; i < blockTypes.length; i++) {
    const bt = blockTypes[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const color = BLOCK_COLORS[bt] || [1, 1, 1];
    const pattern = patterns[bt] || 'noisy';
    fillTile(ctx, col, row, [
      Math.round(color[0] * 255),
      Math.round(color[1] * 255),
      Math.round(color[2] * 255),
    ], pattern);
  }

  cachedTexture = new THREE.CanvasTexture(canvas);
  cachedTexture.magFilter = THREE.NearestFilter;
  cachedTexture.minFilter = THREE.NearestMipmapNearestFilter;
  cachedTexture.generateMipmaps = true;
  cachedTexture.wrapS = THREE.RepeatWrapping;
  cachedTexture.wrapT = THREE.RepeatWrapping;
  cachedTexture.colorSpace = THREE.SRGBColorSpace;

  return cachedTexture;
}

export function getUVOffset(blockType: BlockType): [number, number, number, number] {
  const i = blockType as number;
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const uMin = col / COLS;
  const uMax = (col + 1) / COLS;
  const vMin = 1 - (row + 1) / COLS;
  const vMax = 1 - row / COLS;
  return [uMin, uMax, vMin, vMax];
}

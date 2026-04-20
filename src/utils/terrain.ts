import { createNoise2D } from 'simplex-noise';

// 使用固定种子（可更换）初始化噪声生成器，保证同一坐标的地形始终一致
const noise2D = createNoise2D(() => 0.5); // 固定随机种子，让世界地貌确定

export type Biome = 'DEEP_WATER' | 'SHALLOW_WATER' | 'SAND' | 'GRASS' | 'FOREST' | 'ROCK' | 'SNOW';

export interface TerrainTile {
  x: number;
  y: number;
  elevation: number;
  biome: Biome;
  color: string;
  hasTree: boolean;
}

// 定义不同生物群落的颜色和高度阈值
const BIOMES = [
  { type: 'DEEP_WATER', threshold: -0.4, color: '#0369a1', baseHeight: -0.5 }, // 湛蓝
  { type: 'SHALLOW_WATER', threshold: -0.1, color: '#0ea5e9', baseHeight: -0.3 }, // 浅蓝
  { type: 'SAND', threshold: 0.05, color: '#fcd34d', baseHeight: 0.1 }, // 沙滩
  { type: 'GRASS', threshold: 0.4, color: '#4ade80', baseHeight: 0.3 }, // 草地
  { type: 'FOREST', threshold: 0.7, color: '#15803d', baseHeight: 0.4 }, // 森林
  { type: 'ROCK', threshold: 0.9, color: '#78716c', baseHeight: 0.8 }, // 岩石/山脉
  { type: 'SNOW', threshold: Infinity, color: '#f8fafc', baseHeight: 1.2 } // 雪顶
] as const;

export function getTerrainTile(x: number, y: number): TerrainTile {
  // 结合低频（宏观大洲）和高频（微观起伏）噪声
  const macroNoise = noise2D(x * 0.02, y * 0.02);
  const microNoise = noise2D(x * 0.08, y * 0.08) * 0.3;
  const value = macroNoise + microNoise; // 值域大约在 -1.3 到 1.3

  let biome: Biome = 'SNOW';
  let color = '#f8fafc';
  let elevation = 1.2;

  for (const b of BIOMES) {
    if (value <= b.threshold) {
      biome = b.type;
      color = b.color;
      elevation = b.baseHeight + (b.type !== 'DEEP_WATER' && b.type !== 'SHALLOW_WATER' ? microNoise * 0.5 : 0); // 水面平坦，陆地起伏
      break;
    }
  }

  // 决定是否生成树木（仅限草地和森林，且根据独立噪声概率生成）
  let hasTree = false;
  if (biome === 'GRASS' || biome === 'FOREST') {
    const treeNoise = noise2D(x * 0.5, y * 0.5);
    const treeThreshold = biome === 'FOREST' ? 0.3 : 0.8;
    if (treeNoise > treeThreshold) {
      hasTree = true;
    }
  }

  // 如果是在玩家可能的路径上（如城镇附近，简单留些路）
  const isRoad = (Math.abs(x % 8) <= 1 || Math.abs(y % 8) <= 1) && biome !== 'DEEP_WATER' && biome !== 'SHALLOW_WATER';
  if (isRoad) {
    hasTree = false;
    // 强制修路
    if (biome === 'GRASS' || biome === 'FOREST') {
      color = '#a8a29e'; // stone-400 泥路
      elevation = 0.15;
    }
  }

  return { x, y, elevation, biome, color, hasTree };
}
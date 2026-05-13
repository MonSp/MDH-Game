import { BlockType } from './BlockTypes';

export interface HoverTarget {
  worldX: number;
  worldY: number;
  worldZ: number;
  face: number;
  blockType: BlockType;
}

export interface ParticleEvent {
  worldX: number;
  worldY: number;
  worldZ: number;
  blockType: BlockType;
}

export const interactionState = {
  hoverTarget: null as HoverTarget | null,
  miningWorldX: 0,
  miningWorldY: 0,
  miningWorldZ: 0,
  miningFace: 0,
  miningBlockType: BlockType.AIR,
  miningProgress: 0,
  miningActive: false,
};

export const particleQueue: ParticleEvent[] = [];

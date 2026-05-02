import type { SceneEntry } from '../../shared/types/scene';
import { INTRO_SCENE } from './intro';
import { FAMILY_SCENES } from './family';
import { GRUDGE_SCENE_ENTRIES } from './grudge/grudgeScene';

export type SceneArea = 'intro' | 'family' | 'grudge' | 'sect' | 'wild';

export interface SceneRegistryEntry {
  id: string;
  area: SceneArea;
  scene: SceneEntry;
  /** Auto-trigger when player walks within this radius of the coordinate */
  triggerAt?: { x: number; y: number; radius: number };
  /** NPC can initiate this scene via dialogue */
  triggerNpc?: string;
}

const buildRegistry = (): Record<string, SceneRegistryEntry> => {
  const registry: Record<string, SceneRegistryEntry> = {};

  for (const scene of INTRO_SCENE) {
    registry[scene.id] = { id: scene.id, area: 'intro', scene };
  }

  for (const scene of FAMILY_SCENES) {
    const entry: SceneRegistryEntry = { id: scene.id, area: 'family', scene };

    // 家族大院坐标触发 (center of family compound on map)
    if (scene.id === 'family_corridor') {
      entry.triggerAt = { x: 55, y: 48, radius: 3 };
    }

    registry[scene.id] = entry;
  }

  for (const scene of GRUDGE_SCENE_ENTRIES) {
    const entry: SceneRegistryEntry = { id: scene.id, area: 'grudge', scene };
    // Trigger the village gate scene when player approaches coordinates (55,45)
    if (scene.id === 'grudge_village_gate') {
      entry.triggerAt = { x: 55, y: 45, radius: 3 };
    }
    registry[scene.id] = entry;
  }

  return registry;
};

export const SCENE_REGISTRY = buildRegistry();

export function getSceneEntry(id: string): SceneEntry | undefined {
  return SCENE_REGISTRY[id]?.scene;
}

export function getScenesByArea(area: SceneArea): SceneEntry[] {
  return Object.values(SCENE_REGISTRY)
    .filter(e => e.area === area)
    .map(e => e.scene);
}

export function getSceneIdByCoordinate(x: number, y: number): string | undefined {
  for (const entry of Object.values(SCENE_REGISTRY)) {
    if (!entry.triggerAt) continue;
    const dx = x - entry.triggerAt.x;
    const dy = y - entry.triggerAt.y;
    if (dx * dx + dy * dy <= entry.triggerAt.radius * entry.triggerAt.radius) {
      return entry.id;
    }
  }
  return undefined;
}

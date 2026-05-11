import { create } from 'zustand';
import { BuildingDef, BuildingKind, BlockState, VoxelGrid, MaterialType } from './BuildingTypes';
import { getBuildingDef } from './CityRegistry';

export interface BuildingInstance {
  id: string;
  def: BuildingDef;
  worldX: number;
  worldY: number;
  country?: string;
  label?: string;
}

export interface BuildingDestructionState {
  buildingId: string;
  blockStates: Map<string, BlockState>;
}

export interface BuildingStore {
  buildings: BuildingInstance[];

  currentBuildingId: string | null;
  isInside: boolean;

  registerBuilding: (b: BuildingInstance) => void;
  removeBuilding: (id: string) => void;

  enterBuilding: (id: string) => void;
  exitBuilding: () => void;

  destructionStates: Map<string, BuildingDestructionState>;

  applyDamage: (buildingId: string, lx: number, ly: number, lz: number, damage: number) => number;

  updateBlockStates: (buildingId: string, updates: Array<{ lx: number; ly: number; lz: number; material: MaterialType; health: number }>) => void;
}

export function makeBuildingId(kind: BuildingKind, x: number, y: number): string {
  return `${kind}@${x},${y}`;
}

export const useBuildingStore = create<BuildingStore>((set, get) => ({
  buildings: [],
  currentBuildingId: null,
  isInside: false,

  registerBuilding: (b) => {
    set((s) => {
      const exists = s.buildings.findIndex((x) => x.id === b.id);
      if (exists >= 0) {
        const next = [...s.buildings];
        next[exists] = b;
        return { buildings: next };
      }
      return { buildings: [...s.buildings, b] };
    });
  },

  removeBuilding: (id) => {
    set((s) => ({
      buildings: s.buildings.filter((b) => b.id !== id),
      currentBuildingId: s.currentBuildingId === id ? null : s.currentBuildingId,
      isInside: s.currentBuildingId === id ? false : s.isInside,
    }));
  },

  enterBuilding: (id) => {
    set({ currentBuildingId: id, isInside: true });
  },

  exitBuilding: () => {
    set({ currentBuildingId: null, isInside: false });
  },

  destructionStates: new Map(),

  applyDamage: (buildingId, lx, ly, lz, damage) => {
    const state = get().destructionStates;
    let bd = state.get(buildingId);
    if (!bd) {
      bd = { buildingId, blockStates: new Map() };
      state.set(buildingId, bd);
    }
    const key = `${lx},${ly},${lz}`;
    const existing = bd.blockStates.get(key);
    const newHealth = Math.max(0, (existing?.health ?? 0) - damage);
    if (newHealth <= 0) {
      bd.blockStates.delete(key);
    } else {
      bd.blockStates.set(key, { ...(existing || { material: 'stone' }), health: newHealth });
    }
    return newHealth;
  },

  updateBlockStates: (buildingId, updates) => {
    const state = get().destructionStates;
    let bd = state.get(buildingId);
    if (!bd) {
      bd = { buildingId, blockStates: new Map() };
      state.set(buildingId, bd);
    }
    for (const u of updates) {
      const key = `${u.lx},${u.ly},${u.lz}`;
      if (u.health <= 0) {
        bd.blockStates.delete(key);
      } else {
        bd.blockStates.set(key, { material: u.material, health: u.health });
      }
    }
    set({ destructionStates: new Map(state) });
  },
}));

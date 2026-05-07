import { create } from 'zustand';
import { BuildingDef, BuildingKind, getBuildingDef } from './BuildingTypes';

export interface BuildingInstance {
  id: string;
  def: BuildingDef;
  worldX: number;
  worldY: number;
  country?: string;
  label?: string;
}

export interface BuildingStore {
  buildings: BuildingInstance[];

  currentBuildingId: string | null;
  isInside: boolean;

  registerBuilding: (b: BuildingInstance) => void;
  removeBuilding: (id: string) => void;

  enterBuilding: (id: string) => void;
  exitBuilding: () => void;
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
}));

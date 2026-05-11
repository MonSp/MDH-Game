import { create } from 'zustand';
import { MaterialType, MATERIAL_BASE_HEALTH, VoxelGrid, EMPTY_BLOCK, blockIndex } from './BuildingTypes';
import { PlayerBuild, createEmptyPlayerBuild, clonePlayerBuild } from './PlayerBuild';
import { MATERIAL_ITEM_NAMES } from './BuildingItems';
import { useGameStore } from '../store/gameStore';

export interface BuildModeStoreState {
  active: boolean;
  selectedMaterial: MaterialType;
  currentLayer: number;
  currentBuild: PlayerBuild | null;
  mouseGridPos: { lx: number; ly: number; lz: number } | null;

  toggleBuildMode: (playerX?: number, playerY?: number) => void;
  setMaterial: (material: MaterialType) => void;
  setLayer: (layer: number) => void;
  setMouseGridPos: (pos: { lx: number; ly: number; lz: number } | null) => void;
  placeBlock: (lx: number, ly: number, lz: number) => void;
  removeBlock: (lx: number, ly: number, lz: number) => void;
  loadVoxels: (voxels: VoxelGrid) => void;
  clearBuild: () => void;
  deactivateBuildMode: () => void;
  getAvailableCount: (material: MaterialType) => number;
}

export const useBuildModeStore = create<BuildModeStoreState>((set, get) => ({
  active: false,
  selectedMaterial: 'stone' as MaterialType,
  currentLayer: 0,
  currentBuild: null,
  mouseGridPos: null,

  toggleBuildMode: (playerX?: number, playerY?: number) => {
    const state = get();
    if (!state.active) {
      set({ currentBuild: createEmptyPlayerBuild(playerX, playerY) });
    }
    set({ active: !state.active });
  },

  setMaterial: (material) => {
    set({ selectedMaterial: material });
  },

  setLayer: (layer) => {
    set({ currentLayer: layer });
  },

  setMouseGridPos: (pos) => {
    set({ mouseGridPos: pos });
  },

  placeBlock: (lx, ly, lz) => {
    const state = get();
    const build = state.currentBuild;
    if (!build) return;
    const { dimX, dimY, dimZ, blocks } = build.voxels;
    if (lx < 0 || lx >= dimX || ly < 0 || ly >= dimY || lz < 0 || lz >= dimZ) return;
    const idx = blockIndex(lx, ly, lz, dimX, dimY);
    if (blocks[idx].health > 0) return;
    const itemName = MATERIAL_ITEM_NAMES[state.selectedMaterial];
    const player = useGameStore.getState().player;
    if (!player || (player.inventory[itemName] || 0) <= 0) return;
    const newBlocks = [...blocks];
    newBlocks[idx] = { material: state.selectedMaterial, health: MATERIAL_BASE_HEALTH[state.selectedMaterial] };
    set({
      currentBuild: {
        ...build,
        voxels: { ...build.voxels, blocks: newBlocks },
      },
    });
    useGameStore.getState().removeItem(itemName);
  },

  removeBlock: (lx, ly, lz) => {
    const state = get();
    const build = state.currentBuild;
    if (!build) return;
    const { dimX, dimY, dimZ, blocks } = build.voxels;
    if (lx < 0 || lx >= dimX || ly < 0 || ly >= dimY || lz < 0 || lz >= dimZ) return;
    const idx = blockIndex(lx, ly, lz, dimX, dimY);
    if (blocks[idx].health <= 0) return;
    const removedMaterial = blocks[idx].material;
    const newBlocks = [...blocks];
    newBlocks[idx] = { ...EMPTY_BLOCK };
    set({
      currentBuild: {
        ...build,
        voxels: { ...build.voxels, blocks: newBlocks },
      },
    });
    const itemName = MATERIAL_ITEM_NAMES[removedMaterial];
    useGameStore.getState().addItem(itemName);
  },

  loadVoxels: (voxels) => {
    const state = get();
    const build = state.currentBuild;
    if (!build) return;
    for (const block of build.voxels.blocks) {
      if (block.health > 0) {
        const itemName = MATERIAL_ITEM_NAMES[block.material];
        useGameStore.getState().addItem(itemName);
      }
    }
    set({
      currentBuild: {
        ...build,
        voxels,
      },
    });
  },

  clearBuild: () => {
    const state = get();
    const build = state.currentBuild;
    if (build) {
      for (const block of build.voxels.blocks) {
        if (block.health > 0) {
          const itemName = MATERIAL_ITEM_NAMES[block.material];
          useGameStore.getState().addItem(itemName);
        }
      }
    }
    set({
      currentBuild: createEmptyPlayerBuild(build?.worldX, build?.worldY),
    });
  },

  deactivateBuildMode: () => {
    set({ active: false, mouseGridPos: null });
  },

  getAvailableCount: (material) => {
    const player = useGameStore.getState().player;
    if (!player) return 0;
    return player.inventory[MATERIAL_ITEM_NAMES[material]] || 0;
  },
}));

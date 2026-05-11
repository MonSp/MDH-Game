import { MaterialType } from './BuildingTypes';

export const MATERIAL_ITEM_NAMES: Record<MaterialType, string> = {
  stone: '石材',
  wood: '木材',
  earth: '土块',
  metal: '金属块',
  thatch: '茅草',
};

export const ITEM_TO_MATERIAL: Record<string, MaterialType> = {
  '石材': 'stone',
  '木材': 'wood',
  '土块': 'earth',
  '金属块': 'metal',
  '茅草': 'thatch',
};

export const INITIAL_BLOCK_COUNT = 64;

export const MATERIAL_ITEMS = ['石材', '木材', '土块', '金属块', '茅草'] as const;

export const MATERIAL_DISPLAY: { type: MaterialType; label: string; color: string }[] = [
  { type: 'stone', label: '石材', color: '#808080' },
  { type: 'wood', label: '木材', color: '#8B5E3C' },
  { type: 'earth', label: '土块', color: '#A0522D' },
  { type: 'metal', label: '金属块', color: '#B0B0B0' },
  { type: 'thatch', label: '茅草', color: '#C4A35A' },
];

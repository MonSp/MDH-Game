import { VoxelGrid, BlockState, MaterialType } from './BuildingTypes';

export interface BlueprintMeta {
  name: string;
  createdAt: number;
  blockCount: number;
}

export interface BlueprintData {
  meta: BlueprintMeta;
  voxels: VoxelGrid;
}

export function saveBlueprint(name: string, voxels: VoxelGrid): void {
  const blockCount = voxels.blocks.filter(b => b.health > 0).length;
  const meta: BlueprintMeta = {
    name,
    createdAt: Date.now(),
    blockCount,
  };
  const data: BlueprintData = { meta, voxels };
  localStorage.setItem(`blueprint_${name}`, JSON.stringify(data));
}

export function loadBlueprint(name: string): VoxelGrid | null {
  const raw = localStorage.getItem(`blueprint_${name}`);
  if (!raw) return null;
  try {
    const data: BlueprintData = JSON.parse(raw);
    return data.voxels;
  } catch {
    return null;
  }
}

export function listBlueprints(): BlueprintMeta[] {
  const results: BlueprintMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('blueprint_')) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data: BlueprintData = JSON.parse(raw);
        results.push(data.meta);
      } catch {
        continue;
      }
    }
  }
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

export function deleteBlueprint(name: string): void {
  localStorage.removeItem(`blueprint_${name}`);
}

function formatBlock(block: BlockState): string {
  return `{ material: '${block.material}', health: ${block.health} }`;
}

export function exportAsTS(voxels: VoxelGrid): string {
  const indent = '  ';
  const blockLines = voxels.blocks.map(b => `${indent}${indent}${formatBlock(b)},`);
  const blocksBody = blockLines.join('\n');

  return [
    `const voxels: VoxelGrid = {`,
    `${indent}dimX: ${voxels.dimX},`,
    `${indent}dimY: ${voxels.dimY},`,
    `${indent}dimZ: ${voxels.dimZ},`,
    `${indent}originX: ${voxels.originX},`,
    `${indent}originY: ${voxels.originY},`,
    `${indent}originZ: ${voxels.originZ},`,
    `${indent}blocks: [`,
    blocksBody,
    `${indent}],`,
    `};`,
    ``,
    `export default voxels;`,
  ].join('\n');
}

export function importFromJSON(json: string): VoxelGrid {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Failed to parse JSON string');
  }

  if (
    typeof parsed.dimX !== 'number' ||
    typeof parsed.dimY !== 'number' ||
    typeof parsed.dimZ !== 'number' ||
    !Array.isArray(parsed.blocks)
  ) {
    throw new Error('Invalid blueprint JSON: missing required fields dimX, dimY, dimZ, or blocks');
  }

  return parsed as VoxelGrid;
}

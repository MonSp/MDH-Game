import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VoxelGrid, MaterialType, EMPTY_BLOCK } from './BuildingTypes';

interface VoxelRendererProps {
  voxels: VoxelGrid;
  position?: [number, number, number];
  scale?: number;  // default 0.333 (small block visual size in world units)
}

// Material color mapping
const MATERIAL_COLORS: Record<MaterialType, string> = {
  stone: '#808080',
  wood: '#8B5E3C',
  earth: '#A0522D',
  metal: '#B0B0B0',
  thatch: '#C4A35A',
};

const BLOCK_SIZE = 1.0; // unit block, scaled by the component's scale prop

const VoxelRenderer: React.FC<VoxelRendererProps> = ({ voxels, position = [0, 0, 0], scale = 0.333 }) => {
  const blockGeo = useMemo(() => new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), []);
  
  // Group blocks by material type
  const materialGroups = useMemo(() => {
    const groups: Map<MaterialType, InstancedMeshData[]> = new Map();
    const { dimX, dimY, dimZ, blocks } = voxels;
    
    for (let lz = 0; lz < dimZ; lz++) {
      for (let ly = 0; ly < dimY; ly++) {
        for (let lx = 0; lx < dimX; lx++) {
          const idx = lx + ly * dimX + lz * dimX * dimY;
          const block = blocks[idx];
          if (!block || block.health <= 0) continue;
          
          const worldX = lx + 0.5;
          const worldY = ly + 0.5;
          const worldZ = lz + 0.5;
          
          if (!groups.has(block.material)) {
            groups.set(block.material, []);
          }
          groups.get(block.material)!.push({ x: worldX, y: worldY, z: worldZ });
        }
      }
    }
    return groups;
  }, [voxels]);
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {Array.from(materialGroups.entries()).map(([material, instances]) => (
        <MaterialInstancedGroup key={material} material={material} instances={instances} blockGeo={blockGeo} />
      ))}
    </group>
  );
};

type InstancedMeshData = { x: number; y: number; z: number };

const MaterialInstancedGroup: React.FC<{
  material: MaterialType;
  instances: InstancedMeshData[];
  blockGeo: THREE.BoxGeometry;
}> = React.memo(({ material, instances, blockGeo }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = MATERIAL_COLORS[material];
  
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    
    const dummy = new THREE.Object3D();
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);
  
  return (
    <instancedMesh ref={meshRef} args={[blockGeo, undefined, instances.length]}>
      <meshStandardMaterial color={color} roughness={0.85} />
    </instancedMesh>
  );
});

export default VoxelRenderer;

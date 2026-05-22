import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VoxelModel, VOXEL_SIZE } from './VoxelModels';

interface ColorGroup {
  color: string;
  matrices: THREE.Matrix4[];
}

function createBoxGeometry(): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  geo.translate(0, VOXEL_SIZE / 2, 0);
  return geo;
}

const sharedBoxGeo = createBoxGeometry();

function groupByColor(model: VoxelModel): ColorGroup[] {
  const colorMap = new Map<string, THREE.Matrix4[]>();
  for (const block of model.blocks) {
    if (!colorMap.has(block.color)) {
      colorMap.set(block.color, []);
    }
    const mat = new THREE.Matrix4();
    mat.setPosition(block.x * VOXEL_SIZE, block.y * VOXEL_SIZE, block.z * VOXEL_SIZE);
    colorMap.get(block.color)!.push(mat);
  }
  return Array.from(colorMap.entries()).map(([color, matrices]) => ({ color, matrices }));
}

const InstancedColorGroup: React.FC<{ group: ColorGroup }> = ({ group }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = group.matrices.length;
    group.matrices.forEach((mat, i) => {
      mesh.setMatrixAt(i, mat);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [group]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[sharedBoxGeo, new THREE.MeshLambertMaterial({ color: group.color }), 0]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
};

export interface VoxelEntityRendererProps {
  model: VoxelModel;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: (e: any) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export const VoxelEntityRenderer: React.FC<VoxelEntityRendererProps> = ({
  model,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
  onPointerOver,
  onPointerOut,
}) => {
  const groups = useMemo(() => groupByColor(model), [model]);

  return (
    <group
      position={position}
      rotation={new THREE.Euler(rotation[0], rotation[1], rotation[2])}
      scale={[scale, scale, scale]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {groups.map((group, idx) => (
        <InstancedColorGroup key={`${idx}-${group.color}`} group={group} />
      ))}
    </group>
  );
};

export function getModelHeight(model: VoxelModel): number {
  return model.totalHeight * VOXEL_SIZE;
}

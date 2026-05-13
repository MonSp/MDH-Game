import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CHUNK_SIZE } from './BlockTypes';
import { MeshData } from './ChunkMesher';
import { getTextureAtlas } from './TextureAtlas';

interface ChunkMeshProps {
  cx: number;
  cy: number;
  cz: number;
  meshData: MeshData;
}

const textureAtlas = typeof document !== 'undefined' ? getTextureAtlas() : null;

let sharedSolidMaterial: THREE.MeshStandardMaterial | null = null;
function getSolidMaterial(): THREE.MeshStandardMaterial {
  if (!sharedSolidMaterial && textureAtlas) {
    sharedSolidMaterial = new THREE.MeshStandardMaterial({
      map: textureAtlas,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    });
  }
  return sharedSolidMaterial!;
}

let sharedWaterMaterial: THREE.MeshStandardMaterial | null = null;
function getWaterMaterial(): THREE.MeshStandardMaterial {
  if (!sharedWaterMaterial && textureAtlas) {
    sharedWaterMaterial = new THREE.MeshStandardMaterial({
      map: textureAtlas,
      vertexColors: true,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
      depthWrite: true,
    });
    (ChunkMesh as any).__waterMaterial = sharedWaterMaterial;
  }
  return sharedWaterMaterial!;
}

function buildGeometry(meshData: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
  if (meshData.colors.length > 0) {
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
  }
  geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
  return geo;
}

export const ChunkMesh: React.FC<ChunkMeshProps> = React.memo(({ cx, cy, cz, meshData }) => {
  const solidGeometry = useMemo(() => buildGeometry(meshData), [meshData]);

  const waterGeometry = useMemo(() => {
    if (!meshData.waterMesh) return null;
    return buildGeometry(meshData.waterMesh);
  }, [meshData]);

  useEffect(() => {
    return () => {
      solidGeometry.dispose();
      if (waterGeometry) waterGeometry.dispose();
    };
  }, [solidGeometry, waterGeometry]);

  const chunkPos: [number, number, number] = [cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE];

  return (
    <group position={chunkPos}>
      <mesh
        geometry={solidGeometry}
        material={getSolidMaterial()}
        castShadow
        receiveShadow
      />
      {waterGeometry && (
        <mesh
          geometry={waterGeometry}
          material={getWaterMaterial()}
        />
      )}
    </group>
  );
});

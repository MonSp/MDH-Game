import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TreeState } from './BuildingTypes';

interface TreeMeshProps {
  x: number;
  y: number;
  scale?: number;
  variant?: number;
  state?: TreeState;
  trunkColor?: string;
  canopyColor?: string;
}

function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const TreeMesh: React.FC<TreeMeshProps> = ({
  x,
  y,
  scale = 1.0,
  variant = 0,
  state = 'standing',
  trunkColor = '#6b4c3b',
  canopyColor = '#3d6b34',
}) => {
  const trunkGeo = useMemo(() => {
    const w = 0.3 + seededRand(variant * 7 + 1) * 0.1;
    const h = 1.2 + seededRand(variant * 13 + 2) * 0.3;
    const d = 0.3 + seededRand(variant * 19 + 3) * 0.1;
    return new THREE.BoxGeometry(w * scale, h * scale, d * scale);
  }, [variant, scale]);

  const canopyGeo = useMemo(() => {
    const r = 1.2 + seededRand(variant * 23 + 4) * 0.2;
    const h = 2.0 + seededRand(variant * 29 + 5) * 0.4;
    return new THREE.ConeGeometry(r * scale, h * scale, 8);
  }, [variant, scale]);

  const stumpGeo = useMemo(() => {
    const w = 0.3 + seededRand(variant * 7 + 1) * 0.1;
    return new THREE.BoxGeometry(w * scale, 0.3 * scale, w * scale);
  }, [variant, scale]);

  if (state === 'stump') {
    return (
      <group position={[x, 0, y]}>
        <mesh geometry={stumpGeo} position={[0, 0.15 * scale, 0]}>
          <meshStandardMaterial color={trunkColor} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (state === 'fallen') {
    return (
      <group position={[x, 0, y]} rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={trunkGeo} position={[0, 0.15 * scale, 0]}>
          <meshStandardMaterial color={trunkColor} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (state === 'falling') {
    const axis = variant > 0.5 ? 'x' : 'z';
    const rotation = axis === 'x' ? [Math.PI / 3, 0, 0] as const : [0, 0, Math.PI / 3] as const;
    return (
      <group position={[x, -0.3 * scale, y]} rotation={rotation}>
        <mesh geometry={trunkGeo} position={[0, 0.6 * scale, 0]}>
          <meshStandardMaterial color="#5a3c2b" roughness={0.8} />
        </mesh>
        <mesh geometry={canopyGeo} position={[0, 2.0 * scale, 0]}>
          <meshStandardMaterial color="#2d5b24" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, y]}>
      <mesh geometry={trunkGeo} position={[0, 0.6 * scale, 0]}>
        <meshStandardMaterial color={trunkColor} roughness={0.8} />
      </mesh>
      <mesh geometry={canopyGeo} position={[0, 2.0 * scale, 0]}>
        <meshStandardMaterial color={canopyColor} roughness={0.7} />
      </mesh>
    </group>
  );
};

export default TreeMesh;

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

type TreeKind = 'tree_pine' | 'tree_broad' | 'tree_tall';

interface TreeModelProps {
  type: TreeKind;
  position?: [number, number, number];
  scale?: number;
}

const trunkMat = new THREE.MeshLambertMaterial({ color: '#5c3a1e' });
const darkTrunkMat = new THREE.MeshLambertMaterial({ color: '#3d2510' });
const pineMat = new THREE.MeshLambertMaterial({ color: '#2d6b30' });
const darkPineMat = new THREE.MeshLambertMaterial({ color: '#1f4f22' });
const broadMat = new THREE.MeshLambertMaterial({ color: '#3a8c3f' });
const darkBroadMat = new THREE.MeshLambertMaterial({ color: '#2a6b2f' });
const tallMat = new THREE.MeshLambertMaterial({ color: '#4a8a4a' });
const darkTallMat = new THREE.MeshLambertMaterial({ color: '#2d6b2d' });

const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6);
const trunkGeoThin = new THREE.CylinderGeometry(0.06, 0.10, 0.7, 6);
const trunkGeoShort = new THREE.CylinderGeometry(0.10, 0.14, 0.4, 6);
const coneGeo1 = new THREE.ConeGeometry(0.5, 0.45, 6);
const coneGeo2 = new THREE.ConeGeometry(0.35, 0.35, 6);
const coneGeo3 = new THREE.ConeGeometry(0.2, 0.3, 6);
const crownGeo = new THREE.IcosahedronGeometry(0.4, 1);
const tallCrownGeo = new THREE.ConeGeometry(0.28, 0.55, 6);

const TreeModel = ({ type, position = [0, 0, 0], scale = 1 }: TreeModelProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const content = useMemo(() => {
    const s = scale;
    switch (type) {
      case 'tree_pine':
        return (
          <group scale={[s, s, s]}>
            <mesh position={[0, 0.25, 0]} geometry={trunkGeo} material={trunkMat} />
            <mesh position={[0, 0.55, 0]} geometry={coneGeo1} material={pineMat} />
            <mesh position={[0, 0.85, 0]} geometry={coneGeo2} material={darkPineMat} />
            <mesh position={[0, 1.10, 0]} geometry={coneGeo3} material={pineMat} />
          </group>
        );
      case 'tree_broad':
        return (
          <group scale={[s, s, s]}>
            <mesh position={[0, 0.20, 0]} geometry={trunkGeoShort} material={darkTrunkMat} />
            <mesh position={[0, 0.60, 0]} geometry={crownGeo} material={broadMat} />
            <mesh position={[0.25, 0.50, 0.15]} geometry={new THREE.IcosahedronGeometry(0.25, 1)} material={darkBroadMat} />
            <mesh position={[-0.20, 0.45, -0.20]} geometry={new THREE.IcosahedronGeometry(0.22, 1)} material={broadMat} />
          </group>
        );
      case 'tree_tall':
        return (
          <group scale={[s, s, s]}>
            <mesh position={[0, 0.35, 0]} geometry={trunkGeoThin} material={trunkMat} />
            <mesh position={[0, 0.80, 0]} geometry={tallCrownGeo} material={tallMat} />
            <mesh position={[0, 1.10, 0]} geometry={new THREE.ConeGeometry(0.18, 0.35, 6)} material={darkTallMat} />
          </group>
        );
      default:
        return null;
    }
  }, [type, scale]);

  return (
    <group ref={groupRef} position={position}>
      {content}
    </group>
  );
};

export { TreeModel };
export type { TreeKind };

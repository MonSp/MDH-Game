import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { interactionState } from './InteractionState';
import { getCrackTextures } from './CrackTexture';

export const BlockMiningOverlay: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wasActiveRef = useRef(false);

  const material = useMemo(() => {
    const texArray = getCrackTextures();
    return new THREE.MeshBasicMaterial({
      map: texArray[0],
      transparent: true,
      depthTest: true,
      depthWrite: false,
      alphaTest: 0.05,
      color: 0x111111,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, []);

  useFrame(() => {
    const state = interactionState;
    const mesh = meshRef.current!;

    if (!state.miningActive) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        mesh.visible = false;
      }
      return;
    }

    wasActiveRef.current = true;
    mesh.visible = true;

    mesh.position.set(
      state.miningWorldX + 0.5,
      state.miningWorldY + 0.5,
      state.miningWorldZ + 0.5,
    );

    const stage = Math.min(Math.floor(state.miningProgress * 10), 9);
    const texArray = getCrackTextures();
    if (material.map !== texArray[stage]) {
      material.map = texArray[stage];
      material.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} material={material} visible={false} renderOrder={999}>
      <boxGeometry args={[1.002, 1.002, 1.002]} />
    </mesh>
  );
};

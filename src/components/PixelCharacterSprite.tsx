import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateCharacterSprite } from '../utils/pixelSpriteGenerator';
import type { Realm, BodyType } from '../store/gameConstants';

interface PixelCharacterSpriteProps {
  realm: Realm;
  bodyType: BodyType;
  role: string;
  isMoving?: boolean;
  isFloating?: boolean;
  scale?: number;
}

export const PixelCharacterSprite = ({ realm, bodyType, role, isMoving = false, isFloating = false, scale = 1 }: PixelCharacterSpriteProps) => {
  const texture = useMemo(() => generateCharacterSprite(realm, bodyType, role), [realm, bodyType, role]);
  const spriteRef = useRef<THREE.Sprite>(null);
  const animOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  // Base Y offset: half sprite height so bottom aligns with origin
  const baseYOffset = scale * 0.45;

  useFrame((state) => {
    if (!spriteRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isMoving) {
      spriteRef.current.position.y = baseYOffset + Math.abs(Math.sin(t * 15)) * 0.15;
      spriteRef.current.scale.y = scale * (0.98 + Math.abs(Math.sin(t * 15)) * 0.04);
    } else if (isFloating) {
      spriteRef.current.position.y = baseYOffset + Math.sin(t * 2 + animOffset) * 0.05;
      spriteRef.current.scale.y = scale * (0.99 + Math.sin(t * 3 + animOffset) * 0.01);
    } else {
      spriteRef.current.position.y = baseYOffset + Math.sin(t * 3 + animOffset) * 0.02;
      spriteRef.current.scale.y = scale * (0.99 + Math.sin(t * 3 + animOffset) * 0.01);
    }
  });

  return (
    <sprite
      ref={spriteRef}
      scale={[scale * 0.7, scale * 0.9, 1]}
      position={[0, baseYOffset, 0]}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
      />
    </sprite>
  );
};

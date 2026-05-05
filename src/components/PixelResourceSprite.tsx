import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateResourceSprite } from '../utils/pixelSpriteGenerator';

interface PixelResourceSpriteProps {
  type: string;
  scale?: number;
}

export const PixelResourceSprite = ({ type, scale = 1 }: PixelResourceSpriteProps) => {
  const texture = useMemo(() => generateResourceSprite(type), [type]);
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (!spriteRef.current) return;
    // Gentle rotation effect via scale oscillation
    const t = state.clock.getElapsedTime();
    spriteRef.current.scale.x = scale * (0.7 + Math.sin(t * 2) * 0.02);
    spriteRef.current.scale.y = scale * (0.7 + Math.sin(t * 2 + 1) * 0.02);
  });

  return (
    <sprite ref={spriteRef} scale={[scale * 0.7, scale * 0.7, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
      />
    </sprite>
  );
};

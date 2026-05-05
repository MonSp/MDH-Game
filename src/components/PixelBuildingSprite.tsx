import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateBuildingSprite, type BuildingSpriteType } from '../utils/pixelSpriteGenerator';

interface PixelBuildingSpriteProps {
  type: BuildingSpriteType;
  country?: string;
  scale?: number;
}

export const PixelBuildingSprite = ({ type, country, scale = 1 }: PixelBuildingSpriteProps) => {
  const texture = useMemo(() => generateBuildingSprite(type, country), [type, country]);
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (!spriteRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle idle bob (0.5px amplitude)
    spriteRef.current.position.y = Math.sin(t * 1.5 + type.charCodeAt(0) * 0.5) * 0.02;
    // Subtle scale pulse
    spriteRef.current.scale.y = scale * (1 + Math.sin(t * 2 + type.charCodeAt(0)) * 0.005);
  });

  return (
    <sprite ref={spriteRef} scale={[scale, scale, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
};
